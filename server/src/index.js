// Tanks! — relais multijoueur (Cloudflare Worker + Durable Object).
//
// Chaque partie est un Durable Object nommé d'après son code. Les joueurs s'y connectent
// en WebSocket (wss://…/room/<code>?role=host|guest) et chacun publie un petit objet
// « présence » que le relais retransmet aux autres. Toute la logique de jeu reste dans le
// navigateur de l'hôte : le serveur ne fait que transmettre.

import { DurableObject } from 'cloudflare:workers';

const MAX_SOCKETS = 8;          // 4 joueurs + spectateurs
const MAX_MSG_BYTES = 8192;     // une présence fait au plus ~4 Ko
const MAX_MSG_PER_SEC = 60;     // le jeu envoie 20 messages/s par joueur
const ATTACH_MAX = 1800;        // taille max conservée pendant l'hibernation
const CODE_RE = /^[a-z0-9]{4,8}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });
}

function originAllowed(request, env) {
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
  if (!list.length) return true;
  const origin = request.headers.get('Origin');
  return !!origin && list.includes(origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'tanks-relay' });
    }
    const m = url.pathname.match(/^\/room\/([^/]+)$/);
    if (!m) return json({ error: 'not_found' }, 404);
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected_websocket' }, 426);
    const code = m[1].toLowerCase();
    const role = url.searchParams.get('role') === 'host' ? 'host' : 'guest';
    const allowed = originAllowed(request, env);
    const valid = CODE_RE.test(code);
    // Codes invalides et sites non autorisés : on répond quand même en WebSocket pour que
    // le jeu puisse afficher un message clair (un refus HTTP est illisible côté navigateur).
    if (!allowed || !valid) return refuse(allowed ? 'bad_code' : 'origin');
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    const fwd = new URL(request.url);
    fwd.searchParams.set('role', role);
    return stub.fetch(new Request(fwd.toString(), request));
  },
};

function refuse(code) {
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  server.send(JSON.stringify({ t: 'error', code }));
  server.close(4000, code);
  return new Response(null, { status: 101, webSocket: client });
}

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.pres = new Map();   // id -> dernière présence connue (mémoire)
    this.rate = new Map();   // ws -> { sec, n }
    // Les « ping » du client gardent la connexion ouverte à travers les proxys
    // sans réveiller l'objet (aucune facturation de durée pendant l'attente).
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  sockets(except) {
    return this.ctx.getWebSockets().filter(ws => ws !== except && ws.readyState === 1);
  }

  info(ws) {
    try { return ws.deserializeAttachment() || null; } catch (e) { return null; }
  }

  presenceOf(ws) {
    const a = this.info(ws);
    if (!a) return {};
    return this.pres.get(a.id) || a.p || {};
  }

  broadcast(msg, except) {
    const data = typeof msg === 'string' ? msg : JSON.stringify(msg);
    for (const ws of this.sockets(except)) {
      try { ws.send(data); } catch (e) { /* socket fermé entre-temps */ }
    }
  }

  async fetch(request) {
    const role = new URL(request.url).searchParams.get('role') === 'host' ? 'host' : 'guest';
    const open = this.sockets();
    const hasHost = open.some(ws => (this.info(ws) || {}).role === 'host');
    let error = null;
    if (role === 'host' && hasHost) error = 'code_taken';
    else if (role === 'guest' && !hasHost) error = 'no_game';
    else if (open.length >= MAX_SOCKETS) error = 'room_full';

    const [client, server] = Object.values(new WebSocketPair());
    if (error) {
      server.accept();
      server.send(JSON.stringify({ t: 'error', code: error }));
      server.close(4000, error);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (role === 'host') this.pres.clear();
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id, role, p: {} });
    this.pres.set(id, {});

    const peers = open.map(ws => {
      const a = this.info(ws) || {};
      return [a.id, this.presenceOf(ws), a.role];
    }).filter(p => p[0]);
    server.send(JSON.stringify({ t: 'welcome', id, role, peers }));
    this.broadcast({ t: 'pres', id, p: {} }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > MAX_MSG_BYTES) {
      ws.close(1009, 'too_big');
      return;
    }
    // limite de débit par connexion
    const now = Math.floor(Date.now() / 1000);
    const r = this.rate.get(ws) || { sec: now, n: 0 };
    if (r.sec !== now) { r.sec = now; r.n = 0; }
    r.n++;
    this.rate.set(ws, r);
    if (r.n > MAX_MSG_PER_SEC) return;

    let msg;
    try { msg = JSON.parse(message); } catch (e) { return; }
    if (!msg || msg.t !== 'pres' || !msg.p || typeof msg.p !== 'object' || Array.isArray(msg.p)) return;
    const a = this.info(ws);
    if (!a) return;
    this.pres.set(a.id, msg.p);
    // la présence du salon (petite) survit à l'hibernation ; l'état de partie (gros) non :
    // il est renvoyé 20 fois par seconde tant que la partie tourne.
    const small = JSON.stringify(msg.p);
    if (small.length <= ATTACH_MAX) ws.serializeAttachment({ id: a.id, role: a.role, p: msg.p });
    this.broadcast(JSON.stringify({ t: 'pres', id: a.id, p: msg.p }), ws);
  }

  async webSocketClose(ws, code) {
    this.drop(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye'); } catch (e) { /* déjà fermé */ }
  }

  async webSocketError(ws) {
    this.drop(ws);
  }

  drop(ws) {
    const a = this.info(ws);
    this.rate.delete(ws);
    if (!a) return;
    this.pres.delete(a.id);
    this.broadcast({ t: 'left', id: a.id }, ws);
  }
}
