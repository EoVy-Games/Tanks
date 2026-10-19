// Tanks! — game engine. Texts live in js/i18n.js, maps in js/levels.js.
(() => {
'use strict';

// ================================================================ utils
let W = 22, H = 17;
const MAXW = 22, MAXH = 17, TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rr = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const store = {
  get(k, d) { try { const v = localStorage.getItem('tdb_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('tdb_' + k, JSON.stringify(v)); } catch (e) { } }
};
const $ = id => document.getElementById(id);
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = v => Math.round(v * 100) / 100;
const wx = x => x - W / 2, wz = z => z - H / 2;

// ================================================================ tank types
const TYPES = {
  player: { name: 'Toi', color: 0x2f6be0, speed: 1.9, turn: 8.5, bullets: 5, bounces: 1, bspd: 4.5, rocket: false, mines: 2 },
  brown:  { name: 'Brun', desc: 'Immobile, tir lent', color: 0x8d5a30, speed: 0, turn: 5, fireCd: 3.3, bullets: 1, bounces: 1, bspd: 4.5, mines: 0, turret: 1.3, samples: 10, noise: 0.2, lead: 0, style: 'static', dodge: 0 },
  grey:   { name: 'Gris', desc: 'Lent et prudent', color: 0x7c8189, speed: 1.0, turn: 5, fireCd: 2.6, bullets: 1, bounces: 1, bspd: 4.5, mines: 0, turret: 1.9, samples: 18, noise: 0.11, lead: 0.3, style: 'defensive', pref: 7, dodge: 0.3, react: 0.5 },
  teal:   { name: 'Turquoise', desc: 'Obus rapides, sans rebond', color: 0x23a59d, speed: 1.0, turn: 5, fireCd: 2.3, bullets: 1, bounces: 0, bspd: 8.4, rocket: true, mines: 0, turret: 2.2, samples: 6, noise: 0.05, lead: 0.6, style: 'defensive', pref: 8, dodge: 0.35, react: 0.5 },
  yellow: { name: 'Jaune', desc: "Sème jusqu'à 4 mines", color: 0xe9bd2a, speed: 1.8, turn: 6, fireCd: 2.4, bullets: 1, bounces: 1, bspd: 4.5, mines: 4, mineRate: 0.45, turret: 2.0, samples: 18, noise: 0.1, lead: 0.4, style: 'wander', pref: 6, dodge: 0.4, react: 0.45 },
  red:    { name: 'Rouge', desc: 'Rafales de 3 obus', color: 0xd8413a, speed: 1.7, turn: 6, fireCd: 0.3, reload: 1.9, bullets: 3, bounces: 1, bspd: 4.5, mines: 0, turret: 3, samples: 32, noise: 0.06, lead: 0.7, style: 'offensive', pref: 4, dodge: 0.5, react: 0.4 },
  green:  { name: 'Vert', desc: 'Immobile, tireur d’élite, 2 rebonds', color: 0x3c9c38, speed: 0, turn: 5, fireCd: 1.5, bullets: 2, bounces: 2, bspd: 8.4, rocket: true, mines: 0, turret: 3.2, samples: 96, noise: 0, lead: 1, style: 'static', dodge: 0 },
  purple: { name: 'Violet', desc: 'Rapide, 5 obus et des mines', color: 0x8a4ec7, speed: 2.0, turn: 7, fireCd: 0.42, reload: 1.2, bullets: 5, bounces: 1, bspd: 4.5, mines: 2, mineRate: 0.18, turret: 3.6, samples: 44, noise: 0.05, lead: 0.8, style: 'offensive', pref: 4.5, dodge: 0.55, react: 0.35 },
  white:  { name: 'Blanc', desc: 'Invisible : suis ses traces', color: 0xf2f0e8, speed: 1.85, turn: 7, fireCd: 0.42, reload: 1.2, bullets: 5, bounces: 1, bspd: 4.5, mines: 2, mineRate: 0.18, turret: 3.6, samples: 44, noise: 0.05, lead: 0.8, style: 'offensive', pref: 4.5, dodge: 0.55, react: 0.35, invisible: true },
  black:  { name: 'Noir', desc: 'Le plus rapide, il fonce', color: 0x2a2a2f, speed: 2.6, turn: 8, fireCd: 0.55, reload: 0.9, bullets: 2, bounces: 0, bspd: 8.4, rocket: true, mines: 2, mineRate: 0.28, turret: 4.6, samples: 24, noise: 0.04, lead: 0.9, style: 'offensive', pref: 1.8, dodge: 0.6, react: 0.32 },
};
// Pace: everything moves and fires a notch faster than the original feel.
const PACE = { move: 1.3, turn: 1.3, shell: 6.2, rocket: 10.8, fire: 0.82, turret: 1.35 };
for (const [key, t] of Object.entries(TYPES)) {
  if (key === 'player') { t.speed *= PACE.move; t.turn *= PACE.turn; } // enemies keep their original driving speed
  t.bspd = t.rocket ? PACE.rocket : PACE.shell;
  if (t.fireCd) t.fireCd *= PACE.fire;
  if (t.reload) t.reload *= PACE.fire;
  if (t.turret) t.turret *= PACE.turret;
}
// Global AI knobs: rebalance every enemy at once.
//   dodge: multiplies each type's chance to dodge a shell   react: multiplies its reaction delay
//   fire: multiplies time between shots (above 1 = slower)  noise: extra aim error, in radians
const AI_TUNE = { dodge: 1, react: 1, fire: 1, noise: 0 };
// ================================================================ PvP tank classes
// One entry per selectable tank in online matches. To add a class, add an entry; to rebalance,
// change its numbers. The id travels over the network, so keep ids stable once published.
//   speed    driving speed, relative to the standard tank (1 = standard)
//   bullets  shells on the field at once          shotGap  minimum seconds between two shots
//   bounces  ricochets per shell                  shell    'normal' or 'rocket' (faster)
//   mines    mines on the field at once           armor    extra hits it can take (0 = one-shot)
//   cloak    invisible to opponents except for a moment after firing or being hit
//   look     campaign tank whose colour is the class default
//   name/desc  French fallback; the displayed texts come from js/i18n.js (keys cls.<id>.name / .desc)
const PVP_CLASSES = [
  { id: 'standard', name: 'Standard', look: 'player', desc: 'Polyvalent : la référence.',            speed: 1,    bullets: 5, shotGap: 0.12, bounces: 1, shell: 'normal', mines: 2, armor: 0 },
  { id: 'ricochet', name: 'Ricochet', look: 'brown',  desc: 'Obus à double rebond, mais lent.',      speed: 0.8,  bullets: 3, shotGap: 0.18, bounces: 2, shell: 'normal', mines: 1, armor: 0 },
  { id: 'foudre',   name: 'Foudre',   look: 'black',  desc: 'Rapide, roquettes sans rebond.',        speed: 1.25, bullets: 2, shotGap: 0.35, bounces: 0, shell: 'rocket', mines: 1, armor: 0 },
  { id: 'mineur',   name: 'Mineur',   look: 'yellow', desc: 'Jusqu’à 4 mines, mais peu d’obus.',     speed: 1,    bullets: 3, shotGap: 0.15, bounces: 1, shell: 'normal', mines: 4, armor: 0 },
  { id: 'blinde',   name: 'Blindé',   look: 'grey',   desc: 'Encaisse un tir de plus, mais lent.',   speed: 0.8,  bullets: 4, shotGap: 0.15, bounces: 1, shell: 'normal', mines: 2, armor: 1 },
  { id: 'fantome',  name: 'Fantôme',  look: 'white',  desc: 'Invisible tant qu’il ne tire pas.',     speed: 0.95, bullets: 3, shotGap: 0.2,  bounces: 1, shell: 'normal', mines: 1, armor: 0, cloak: true },
];
const PVP_BY_ID = Object.fromEntries(PVP_CLASSES.map(c => [c.id, c]));
const pvpClass = id => PVP_BY_ID[id] || PVP_CLASSES[0];
const clsName = c => tr('cls.' + c.id + '.name', null, c.name);
const clsDesc = c => tr('cls.' + c.id + '.desc', null, c.desc);
const typeName = k => tr('type.' + k + '.name', null, TYPES[k].name);
const typeDesc = k => tr('type.' + k + '.desc', null, TYPES[k].desc);
for (const c of PVP_CLASSES) {
  const base = TYPES.player;
  TYPES['pvp_' + c.id] = {
    ...base, name: c.name, color: TYPES[c.look].color,
    speed: base.speed * c.speed, turn: base.turn * (0.8 + 0.2 * c.speed),
    bullets: c.bullets, shotGap: c.shotGap, bounces: c.bounces, mines: c.mines,
    rocket: c.shell === 'rocket', bspd: c.shell === 'rocket' ? PACE.rocket : PACE.shell,
    armor: c.armor || 0, cloak: !!c.cloak,
  };
}
// Colours a player can pick; -1 means "the class colour".
const TANK_COLORS = [0x2f6be0, 0xd8413a, 0x3c9c38, 0xee8a1c, 0x8a4ec7, 0xe9bd2a, 0x23a59d, 0xe0679b, 0x7c8189, 0x8d5a30, 0xf2f0e8, 0x2a2a2f];
const MY_TANK = (() => {
  const v = store.get('pvpTank', null) || {};
  return { cls: PVP_BY_ID[v.cls] ? v.cls : 'standard', color: TANK_COLORS.includes(v.color) ? v.color : -1 };
})();
const classColor = id => TYPES[pvpClass(id).look].color;
const wantedColor = (cls, color) => (TANK_COLORS.includes(color) ? color : classColor(cls));
// Give each player their colour, or the next free one when someone earlier already has it.
function resolveColors(list) {
  const used = new Set();
  return list.map(({ cls, color }) => {
    let c = wantedColor(cls, color);
    if (used.has(c)) c = [classColor(cls), ...TANK_COLORS].find(x => !used.has(x)) ?? c;
    used.add(c);
    return c;
  });
}
const TYPE_ORDER = ['brown', 'grey', 'teal', 'yellow', 'red', 'green', 'purple', 'white', 'black'];
const UNLOCK = { brown: 1, grey: 2, teal: 5, yellow: 8, red: 10, green: 12, purple: 15, white: 20, black: 50 };
const CHAR_TYPE = { b: 'brown', g: 'grey', t: 'teal', y: 'yellow', r: 'red', G: 'green', v: 'purple', w: 'white', k: 'black' };
const hex = c => '#' + c.toString(16).padStart(6, '0');

function tankIcon(color, w = 30) {
  const c = hex(color);
  return `<svg viewBox="0 0 40 26" width="${w}" height="${Math.round(w * 0.65)}" aria-hidden="true">
  <rect x="2.5" y="15" width="33" height="9" rx="4.5" fill="#29241f"/>
  <circle cx="8" cy="19.5" r="2.2" fill="#6a6158"/><circle cx="15" cy="19.5" r="2.2" fill="#6a6158"/><circle cx="22" cy="19.5" r="2.2" fill="#6a6158"/><circle cx="29" cy="19.5" r="2.2" fill="#6a6158"/>
  <rect x="5" y="10" width="28" height="6.5" rx="2.4" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
  <rect x="22" y="6" width="16" height="3.4" rx="1.5" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
  <path d="M11.5 10.5a7.5 6.5 0 0 1 15 0z" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="1"/></svg>`;
}

// ================================================================ levels
// grid codes: 0 floor, 1 wood, 2 tall wood, 3 pink, 4 hole. Each level carries its own size (w × h).
function trimRows(rows) {
  // drop empty border rows/columns, keeping one empty lane against the frame
  const empty = r => /^\.*$/.test(r);
  const colEmpty = (rs, i) => rs.every(r => r[i] === '.');
  rows = rows.slice();
  while (rows.length > 9 && empty(rows[0]) && empty(rows[1])) rows.shift();
  while (rows.length > 9 && empty(rows[rows.length - 1]) && empty(rows[rows.length - 2])) rows.pop();
  while (rows[0].length > 12 && colEmpty(rows, 0) && colEmpty(rows, 1)) rows = rows.map(r => r.slice(1));
  while (rows[0].length > 12 && colEmpty(rows, rows[0].length - 1) && colEmpty(rows, rows[0].length - 2)) rows = rows.map(r => r.slice(0, -1));
  return rows;
}
function parseLevel(str) {
  const rows = trimRows(str.split('\n'));
  const w = rows[0].length, h = rows.length;
  const grid = new Uint8Array(w * h);
  let player = { x: 2.5, z: (h >> 1) + 0.5 };
  const enemies = [];
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const c = rows[z][x];
    let v = 0;
    if (c === '#') v = 1; else if (c === 'H') v = 2; else if (c === 'p') v = 3; else if (c === 'o') v = 4;
    else if (c === '1') player = { x: x + 0.5, z: z + 0.5 };
    else if (CHAR_TYPE[c]) enemies.push({ type: CHAR_TYPE[c], x: x + 0.5, z: z + 0.5 });
    grid[z * w + x] = v;
  }
  return { grid, w, h, player, enemies };
}

function bfsReach(g, w, h, sx, sz) {
  const seen = new Uint8Array(w * h);
  const q = [sz * w + sx]; seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) {
    const k = q[i], x = k % w, z = (k / w) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      const nk = nz * w + nx;
      if (seen[nk] || g[nk]) continue;
      seen[nk] = 1; q.push(nk);
    }
  }
  return seen;
}

function enemyComposition(m, R) {
  const unlocked = TYPE_ORDER.filter(t => UNLOCK[t] <= m);
  const d = clamp((m - 20) / 80, 0, 1);
  let n = Math.min(7, 3 + Math.floor((m - 20) / 16) + (R() < 0.5 ? 1 : 0));
  if (m % 10 === 0) n = Math.min(7, n + 1);
  const center = 0.25 + 0.7 * d;
  const weights = unlocked.map(t => {
    const s = TYPE_ORDER.indexOf(t) / 8;
    return Math.exp(-((s - center) ** 2) / 0.05) + 0.04;
  });
  const pick = () => {
    let sum = weights.reduce((a, b) => a + b, 0), r = R() * sum;
    for (let i = 0; i < unlocked.length; i++) { r -= weights[i]; if (r <= 0) return unlocked[i]; }
    return unlocked[unlocked.length - 1];
  };
  const kinds = [];
  const k = n <= 4 ? 2 : 3;
  for (let i = 0; i < k * 4 && kinds.length < k; i++) { const t = pick(); if (!kinds.includes(t)) kinds.push(t); }
  const out = [];
  for (let i = 0; i < n; i++) out.push(kinds[i % kinds.length]);
  // no more than 4 invisible tanks
  let w = 0;
  return out.map(t => (t === 'white' && ++w > 4) ? 'purple' : t);
}

function generateLevel(m) {
  const R = mulberry32(m * 7919 + 13);
  const comp0 = enemyComposition(m, mulberry32(m * 131 + 7));
  for (let attempt = 0; attempt < 80; attempt++) {
    // arena size: varies per mission, larger when more enemies are coming
    const big = comp0.length >= 6, mid = comp0.length >= 4;
    const w = big ? 20 + 2 * Math.floor(R() * 2) : mid ? 18 + 2 * Math.floor(R() * 3) : 16 + 2 * Math.floor(R() * 4);
    const h = big ? 15 + 2 * Math.floor(R() * 2) : mid ? 13 + 2 * Math.floor(R() * 3) : 11 + 2 * Math.floor(R() * 4);
    const half = h >> 1;
    const g = new Uint8Array(w * h);
    const set = (x, z, c) => {
      if (x < 0 || z < 0 || x >= w || z > half) return;
      g[z * w + x] = c; g[(h - 1 - z) * w + x] = c;
    };
    const pieces = Math.round((4 + R() * 5) * (w * h) / (22 * 17)) + 2;
    for (let p = 0; p < pieces; p++) {
      const kind = R();
      const x0 = 4 + Math.floor(R() * (w - 6)), z0 = Math.floor(R() * (half + 1));
      const c = R() < 0.2 ? 3 : (R() < 0.3 ? 2 : 1);
      if (kind < 0.24) { const len = 2 + Math.floor(R() * 5); for (let i = 0; i < len; i++) set(x0 + i, z0, c); }
      else if (kind < 0.48) { const len = 2 + Math.floor(R() * 4); for (let i = 0; i < len; i++) set(x0, z0 + i, c); }
      else if (kind < 0.62) { const a = 2 + Math.floor(R() * 3), b = 2 + Math.floor(R() * 3), sx = R() < 0.5 ? 1 : -1; for (let i = 0; i < a; i++) set(x0 + i * sx, z0, c); for (let i = 0; i < b; i++) set(x0, z0 + i, c); }
      else if (kind < 0.76) { set(x0, z0, c); set(x0 + 1, z0, c); set(x0, z0 + 1, c); set(x0 + 1, z0 + 1, c); }
      else if (kind < 0.9) { const len = 2 + Math.floor(R() * 4), hz = R() < 0.5; for (let i = 0; i < len; i++) hz ? set(x0 + i, z0, 4) : set(x0, z0 + i, 4); }
      else { for (let i = 0; i < 4; i++) set(x0 + i * 2, z0, c); }
    }
    for (let z = half - 3; z <= half + 3; z++) for (let x = 0; x <= 3; x++) if (z >= 0 && z < h) g[z * w + x] = 0;
    const px = 1 + Math.floor(R() * 2), pz = half;
    const reach = bfsReach(g, w, h, px, pz);
    let cnt = 0; for (let i = 0; i < w * h; i++) if (reach[i]) cnt++;
    if (cnt < w * h * 0.55) continue;
    for (let i = 0; i < w * h; i++) if (!reach[i] && g[i] === 0) g[i] = 1;
    const comp = comp0;
    const cands = [];
    for (let z = 0; z < h; z++) for (let x = Math.floor(w / 2); x < w; x++) if (reach[z * w + x]) cands.push([x, z]);
    const chosen = [], minD = w * 0.38;
    for (let tries = 0; tries < 500 && chosen.length < comp.length; tries++) {
      const [x, z] = cands[Math.floor(R() * cands.length)];
      if (Math.hypot(x - px, z - pz) < minD) continue;
      if (chosen.some(([a, b]) => Math.hypot(a - x, b - z) < 2.4)) continue;
      chosen.push([x, z]);
    }
    if (chosen.length < comp.length) continue;
    return { grid: g, w, h, player: { x: px + 0.5, z: pz + 0.5 }, enemies: comp.map((t, i) => ({ type: t, x: chosen[i][0] + 0.5, z: chosen[i][1] + 0.5 })) };
  }
  const L = parseLevel(LEVELS[19]);
  L.enemies = L.enemies.map(e => ({ ...e, type: 'purple' }));
  return L;
}
const getLevel = m => m <= LEVELS.length ? parseLevel(LEVELS[m - 1]) : generateLevel(m);

// ================================================================ renderer & graphics quality
// Software WebGL (remote desktop, VMs, no GPU driver) draws every pixel on the CPU: start low there.
const GL_INFO = (() => {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { name: '', soft: false };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return { name, soft: /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|\bwarp\b/i.test(name) };
  } catch (e) { return { name: '', soft: false }; }
})();
// budget: max rendered pixels per frame; shadows: 0 off, 1 hard, 2 soft; fx: share of particles kept
const QUALITY = {
  high:   { label: 'Haute',   budget: 3.7e6,  maxDpr: 2,   shadows: 2, shadowSize: 2048, fx: 1 },
  medium: { label: 'Moyenne', budget: 2.1e6,  maxDpr: 1.5, shadows: 1, shadowSize: 1024, fx: 0.7 },
  low:    { label: 'Basse',   budget: 0.95e6, maxDpr: 1,   shadows: 0, shadowSize: 512,  fx: 0.45 },
};
let qualityPref = store.get('quality', 'auto');
if (!['auto', 'high', 'medium', 'low'].includes(qualityPref)) qualityPref = 'auto';
const autoTier = () => (GL_INFO.soft ? 'low' : 'high');
let qTier = qualityPref === 'auto' ? autoTier() : qualityPref;
let dynScale = 1, FXQ = QUALITY[qTier].fx;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: !GL_INFO.soft && qTier === 'high', powerPreference: 'high-performance' });
} catch (e) {
  $('err').hidden = false; $('err').textContent = tr('err.webgl');
  return;
}
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = QUALITY[qTier].shadows > 0;
renderer.shadowMap.type = QUALITY[qTier].shadows === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
$('stage').appendChild(renderer.domElement);
renderer.domElement.tabIndex = 0;
const MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1c10);
scene.fog = new THREE.Fog(0x2a1c10, 34, 70);
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);

// ================================================================ textures
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function canvasTex(c, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = MAX_ANISO;
  return t;
}
function grain(g, x, y, w, h, R, o) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = o.base; g.fillRect(x, y, w, h);
  for (let i = 0; i < 7; i++) {
    const yy = y + R() * h, hh = h * (0.08 + R() * 0.3);
    g.fillStyle = `rgba(${R() < 0.6 ? o.dark : o.light},${0.035 + R() * 0.06})`;
    g.fillRect(x, yy, w, hh);
  }
  const lines = o.lines || 16;
  for (let i = 0; i < lines; i++) {
    const y0 = y + R() * h, amp = 1 + R() * h * 0.07, f = 0.002 + R() * 0.007, ph = R() * TAU;
    g.strokeStyle = R() < 0.75 ? `rgba(${o.dark},${0.08 + R() * 0.17})` : `rgba(${o.light},${0.08 + R() * 0.14})`;
    g.lineWidth = (0.6 + R() * 2.2) * (o.lw || 1);
    g.beginPath();
    let first = true;
    for (let xx = x - 12; xx <= x + w + 12; xx += 12) {
      const yy = y0 + Math.sin(xx * f + ph) * amp + Math.sin(xx * f * 3.3 + ph * 1.7) * amp * 0.35;
      if (first) { g.moveTo(xx, yy); first = false; } else g.lineTo(xx, yy);
    }
    g.stroke();
  }
  if (R() < (o.knot || 0)) {
    const kx = x + w * (0.15 + R() * 0.7), ky = y + h * (0.3 + R() * 0.4), kr = h * (0.06 + R() * 0.09);
    for (let k = 6; k > 0; k--) {
      g.strokeStyle = `rgba(${o.dark},${0.06 + 0.035 * k})`; g.lineWidth = 1.3;
      g.beginPath(); g.ellipse(kx, ky, kr * k * 1.25, kr * k * 0.5, 0, 0, TAU); g.stroke();
    }
    g.fillStyle = `rgba(${o.dark},0.55)`; g.beginPath(); g.ellipse(kx, ky, kr * 0.9, kr * 0.45, 0, 0, TAU); g.fill();
  }
  g.restore();
}

function makeFloorTextures() {
  const S = 2048, unit = 256, ph = S / 10;
  const c = cnv(S, S), g = c.getContext('2d');
  const b = cnv(S, S), bg = b.getContext('2d');
  bg.fillStyle = '#fff'; bg.fillRect(0, 0, S, S);
  const R = mulberry32(11);
  for (let r = 0; r < S / ph; r++) {
    const y = r * ph;
    let x = R() * S;
    const end = x + S;
    while (x < end) {
      const len = Math.min(unit * (3.2 + R() * 3.6), end - x);
      const hue = 29 + R() * 6, sat = 40 + R() * 10, lig = 46 + R() * 7;
      const opt = { base: `hsl(${hue},${sat}%,${lig}%)`, dark: '86,46,16', light: '255,226,180', lines: 30, knot: 0.3 };
      const seed = Math.floor(R() * 1e9);
      for (const ox of [x, x - S]) {
        if (ox + len < 0 || ox > S) continue;
        grain(g, ox, y, len, ph, mulberry32(seed), opt);
        g.fillStyle = 'rgba(48,24,6,0.6)'; g.fillRect(ox, y, 3, ph);
        g.fillStyle = 'rgba(255,230,190,0.15)'; g.fillRect(ox + 3, y, 2, ph);
        bg.fillStyle = '#000'; bg.fillRect(ox - 1, y, 5, ph);
      }
      x += len;
    }
    g.fillStyle = 'rgba(42,20,5,0.62)'; g.fillRect(0, y, S, 3);
    g.fillStyle = 'rgba(255,232,196,0.13)'; g.fillRect(0, y + 3, S, 2);
    bg.fillStyle = '#000'; bg.fillRect(0, y - 1, S, 5);
  }
  return { map: canvasTex(c, 1, 1), bump: canvasTex(b, 1, 1, false) };
}

function makeBlockTexture(o, seed) {
  const S = 512, c = cnv(S, S), g = c.getContext('2d');
  const R = mulberry32(seed);
  grain(g, 0, 0, S, S, R, o);
  // gentle edge darkening so cubes read as cut wood
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(60,30,10,0.18)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return canvasTex(c, 1, 1);
}

function makeTreadTexture() {
  const c = cnv(128, 32), g = c.getContext('2d');
  g.fillStyle = '#2a2724'; g.fillRect(0, 0, 128, 32);
  for (let x = 0; x < 128; x += 16) {
    g.fillStyle = '#4b4641'; g.fillRect(x + 2, 0, 9, 32);
    g.fillStyle = '#5d5751'; g.fillRect(x + 2, 0, 9, 3);
    g.fillStyle = '#1b1917'; g.fillRect(x + 11, 0, 2, 32);
  }
  return canvasTex(c, 1.4, 1);
}

function radialTex(stops, size = 128) {
  const c = cnv(size, size), g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  return c;
}
function makeSmokeTex() {
  const S = 128, c = cnv(S, S), g = c.getContext('2d');
  const R = mulberry32(5);
  for (let i = 0; i < 14; i++) {
    const x = S / 2 + (R() - 0.5) * S * 0.35, y = S / 2 + (R() - 0.5) * S * 0.35, r = S * (0.18 + R() * 0.2);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
  }
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.6, 'rgba(0,0,0,0.8)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); return t;
}
function makeHoleTex() {
  const S = 256, c = cnv(S, S), g = c.getContext('2d');
  const r = S * 0.47;
  g.save(); g.beginPath(); g.arc(S / 2, S / 2, r, 0, TAU); g.clip();
  // inner wall seen on the far side (canvas top maps to the far side of the board)
  const wall = g.createLinearGradient(0, S / 2 - r, 0, S / 2 + r * 0.2);
  wall.addColorStop(0, '#9a6638'); wall.addColorStop(0.45, '#5a3518'); wall.addColorStop(1, '#1c0e05');
  g.fillStyle = wall; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(40,20,6,${0.08 + (i % 3) * 0.05})`; g.fillRect(S / 2 - r + i * r * 0.23, 0, 2, S); }
  const pit = g.createRadialGradient(S / 2, S / 2 + r * 0.42, r * 0.2, S / 2, S / 2 + r * 0.42, r * 1.05);
  pit.addColorStop(0, '#000'); pit.addColorStop(0.8, '#060302'); pit.addColorStop(1, '#140a04');
  g.fillStyle = pit; g.beginPath(); g.arc(S / 2, S / 2 + r * 0.42, r * 1.02, 0, TAU); g.fill();
  g.restore();
  g.lineWidth = 6; g.strokeStyle = 'rgba(46,24,8,0.9)'; g.beginPath(); g.arc(S / 2, S / 2, r - 1, 0, TAU); g.stroke();
  g.lineWidth = 4; g.strokeStyle = 'rgba(255,226,180,0.4)'; g.beginPath(); g.arc(S / 2, S / 2, r + 4, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
  g.lineWidth = 4; g.strokeStyle = 'rgba(30,14,4,0.35)'; g.beginPath(); g.arc(S / 2, S / 2, r + 4, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const TEX = {};
{
  const f = makeFloorTextures();
  TEX.floor = f.map; TEX.floorBump = f.bump;
  TEX.block = makeBlockTexture({ base: 'hsl(38,52%,66%)', dark: '128,78,32', light: '255,244,210', lines: 26, knot: 0.35 }, 21);
  TEX.blockTop = makeBlockTexture({ base: 'hsl(36,50%,63%)', dark: '128,78,32', light: '255,244,210', lines: 22, knot: 0.2 }, 23);
  TEX.pink = makeBlockTexture({ base: 'hsl(345,62%,74%)', dark: '150,52,80', light: '255,235,240', lines: 18, knot: 0.15 }, 31);
  TEX.frame = makeBlockTexture({ base: 'hsl(24,46%,34%)', dark: '36,16,4', light: '240,190,140', lines: 30, knot: 0.4, lw: 1.2 }, 41);
  TEX.frame.repeat.set(1, 1);
  TEX.tread = makeTreadTexture();
  TEX.smoke = makeSmokeTex();
  TEX.fire = new THREE.CanvasTexture(radialTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]));
  TEX.blob = new THREE.CanvasTexture(radialTex([[0, 'rgba(0,0,0,0.75)'], [0.45, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]));
  TEX.hole = makeHoleTex();
}

// ================================================================ geometry
function roundedBox(width, height, depth, segments, radius, uvWorld) {
  segments = segments * 2 + 1;
  radius = Math.min(width / 2, height / 2, depth / 2, radius);
  const base = new THREE.BoxGeometry(1, 1, 1, segments, segments, segments);
  const geo = base.toNonIndexed(); base.dispose();
  const tmpN = new THREE.Vector3();
  function getUv(faceDir, normal, uvAxis, projAxis, rad, sideLength) {
    const totArc = 2 * Math.PI * rad / 4, centerLen = Math.max(sideLength - 2 * rad, 0), halfArc = Math.PI / 4;
    tmpN.copy(normal); tmpN[projAxis] = 0; tmpN.normalize();
    const arcUv = 0.5 * totArc / (totArc + centerLen);
    const arcAng = 1.0 - (tmpN.angleTo(faceDir) / halfArc);
    if (Math.sign(tmpN[uvAxis]) === 1) return arcAng * arcUv;
    const lenUv = centerLen / (totArc + centerLen);
    return lenUv + arcUv + arcUv * (1.0 - arcAng);
  }
  const position = new THREE.Vector3(), normal = new THREE.Vector3(), fd = new THREE.Vector3();
  const box = new THREE.Vector3(width, height, depth).divideScalar(2).subScalar(radius);
  const P = geo.attributes.position.array, N = geo.attributes.normal.array, U = geo.attributes.uv.array;
  const faceTris = P.length / 6, half = 0.5 / segments;
  for (let i = 0, j = 0; i < P.length; i += 3, j += 2) {
    position.fromArray(P, i);
    normal.copy(position);
    normal.x -= Math.sign(normal.x) * half; normal.y -= Math.sign(normal.y) * half; normal.z -= Math.sign(normal.z) * half;
    normal.normalize();
    P[i] = box.x * Math.sign(position.x) + normal.x * radius;
    P[i + 1] = box.y * Math.sign(position.y) + normal.y * radius;
    P[i + 2] = box.z * Math.sign(position.z) + normal.z * radius;
    N[i] = normal.x; N[i + 1] = normal.y; N[i + 2] = normal.z;
    const side = Math.floor(i / faceTris);
    let u, v, su = 1, sv = 1;
    switch (side) {
      case 0: fd.set(1, 0, 0); u = getUv(fd, normal, 'z', 'y', radius, depth); v = 1 - getUv(fd, normal, 'y', 'z', radius, height); su = depth; sv = height; break;
      case 1: fd.set(-1, 0, 0); u = 1 - getUv(fd, normal, 'z', 'y', radius, depth); v = 1 - getUv(fd, normal, 'y', 'z', radius, height); su = depth; sv = height; break;
      case 2: fd.set(0, 1, 0); u = 1 - getUv(fd, normal, 'x', 'z', radius, width); v = getUv(fd, normal, 'z', 'x', radius, depth); su = width; sv = depth; break;
      case 3: fd.set(0, -1, 0); u = 1 - getUv(fd, normal, 'x', 'z', radius, width); v = 1 - getUv(fd, normal, 'z', 'x', radius, depth); su = width; sv = depth; break;
      case 4: fd.set(0, 0, 1); u = 1 - getUv(fd, normal, 'x', 'y', radius, width); v = 1 - getUv(fd, normal, 'y', 'x', radius, height); su = width; sv = height; break;
      default: fd.set(0, 0, -1); u = getUv(fd, normal, 'x', 'y', radius, width); v = 1 - getUv(fd, normal, 'y', 'x', radius, height); su = width; sv = height; break;
    }
    if (uvWorld) { u *= su; v *= sv; }
    U[j] = u; U[j + 1] = v;
  }
  geo.computeBoundingSphere();
  return geo;
}

// ================================================================ lights & static scene
const hemi = new THREE.HemisphereLight(0xfff2de, 0x5a3a1e, 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.7);
sun.position.set(-7, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(QUALITY[qTier].shadowSize, QUALITY[qTier].shadowSize);
sun.shadow.camera.left = -15; sun.shadow.camera.right = 15; sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -13;
sun.shadow.camera.near = 5; sun.shadow.camera.far = 50;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025;
sun.shadow.radius = 3;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xffd6a8, 0.45); fill.position.set(10, 8, -6); scene.add(fill);
const flash = new THREE.PointLight(0xff9a3c, 0, 9, 2); flash.position.set(0, 1.2, 0); scene.add(flash);

const floorMat = new THREE.MeshStandardMaterial({ map: TEX.floor, bumpMap: TEX.floorBump, bumpScale: 1.4, roughness: 0.74, metalness: 0 });
TEX.floor.repeat.set(10, 10); TEX.floorBump.repeat.set(10, 10);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
scene.add(floor);

const blockMat = new THREE.MeshStandardMaterial({ map: TEX.block, roughness: 0.62, metalness: 0 });
const pinkMat = new THREE.MeshStandardMaterial({ map: TEX.pink, roughness: 0.55, metalness: 0 });
const frameMat = new THREE.MeshStandardMaterial({ map: TEX.frame, roughness: 0.55, metalness: 0 });

// arena frame: four beams, rebuilt for each arena size
const frameMeshes = [];
let frameKey = '';
function buildFrame() {
  if (frameKey === W + 'x' + H) return;
  frameKey = W + 'x' + H;
  for (const m of frameMeshes) { scene.remove(m); m.geometry.dispose(); }
  frameMeshes.length = 0;
  const beams = [
    [W / 2, -0.5, W + 2, 1], [W / 2, H + 0.5, W + 2, 1],
    [-0.5, H / 2, 1, H], [W + 0.5, H / 2, 1, H]
  ];
  for (const [cx, cz, sx, sz] of beams) {
    const m = new THREE.Mesh(roundedBox(sx - 0.02, 1.0, sz - 0.02, 3, 0.08, true), frameMat);
    m.position.set(wx(cx), 0.5, wz(cz)); m.castShadow = true; m.receiveShadow = true;
    scene.add(m); frameMeshes.push(m);
  }
}

const blockGeo = roundedBox(0.985, 0.985, 0.985, 3, 0.07);
const blockMesh = new THREE.InstancedMesh(blockGeo, blockMat, MAXW * MAXH * 2);
blockMesh.castShadow = true; blockMesh.receiveShadow = true; blockMesh.count = 0;
const pinkMesh = new THREE.InstancedMesh(blockGeo, pinkMat, MAXW * MAXH);
pinkMesh.castShadow = true; pinkMesh.receiveShadow = true; pinkMesh.count = 0;
scene.add(blockMesh, pinkMesh);
const holeGeo = new THREE.CircleGeometry(0.47, 40); holeGeo.rotateX(-Math.PI / 2);
const holeMat = new THREE.MeshBasicMaterial({ map: TEX.hole, transparent: true, depthWrite: false });
const holeMesh = new THREE.InstancedMesh(holeGeo, holeMat, MAXW * MAXH);
holeMesh.count = 0; holeMesh.renderOrder = 2;
scene.add(holeMesh);

// ================================================================ ground decals
const AO_PX = 32, AO_M = 2;
const MK_PX = 48;
let aoCanvas, aoCtx, aoTex, mkCanvas, mkCtx, mkTex, decalKey = '';
const aoPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0.85 }));
aoPlane.rotation.x = -Math.PI / 2; aoPlane.position.y = 0.002; aoPlane.renderOrder = 1;
const mkPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
mkPlane.rotation.x = -Math.PI / 2; mkPlane.position.y = 0.004; mkPlane.renderOrder = 1;
scene.add(aoPlane, mkPlane);
let mkDirty = false, mkTimer = 0;
function resizeDecals() {
  if (decalKey === W + 'x' + H) return;
  decalKey = W + 'x' + H;
  if (aoTex) aoTex.dispose();
  if (mkTex) mkTex.dispose();
  aoCanvas = cnv((W + AO_M * 2) * AO_PX, (H + AO_M * 2) * AO_PX); aoCtx = aoCanvas.getContext('2d');
  aoTex = new THREE.CanvasTexture(aoCanvas);
  aoPlane.material.map = aoTex; aoPlane.material.needsUpdate = true;
  aoPlane.scale.set(W + AO_M * 2, H + AO_M * 2, 1);
  mkCanvas = cnv(W * MK_PX, H * MK_PX); mkCtx = mkCanvas.getContext('2d');
  mkTex = new THREE.CanvasTexture(mkCanvas); mkTex.colorSpace = THREE.SRGBColorSpace; mkTex.anisotropy = MAX_ANISO;
  mkPlane.material.map = mkTex; mkPlane.material.needsUpdate = true;
  mkPlane.scale.set(W, H, 1);
}

const Decals = {
  clear() { mkCtx.clearRect(0, 0, mkCanvas.width, mkCanvas.height); mkDirty = true; },
  track(x, z, a) {
    const g = mkCtx; g.save(); g.translate(x * MK_PX, z * MK_PX); g.rotate(a);
    g.fillStyle = 'rgba(58,34,14,0.2)';
    const lw = 0.11 * MK_PX, lh = 0.15 * MK_PX, off = 0.31 * MK_PX;
    g.fillRect(-lw / 2, -off - lh / 2, lw, lh); g.fillRect(-lw / 2, off - lh / 2, lw, lh);
    g.restore(); mkDirty = true;
  },
  cross(x, z) {
    const g = mkCtx, s = 0.3 * MK_PX;
    g.save(); g.translate(x * MK_PX, z * MK_PX); g.lineCap = 'round';
    g.strokeStyle = 'rgba(30,16,6,0.8)'; g.lineWidth = 0.13 * MK_PX;
    g.beginPath(); g.moveTo(-s, -s); g.lineTo(s, s); g.moveTo(s, -s); g.lineTo(-s, s); g.stroke();
    g.restore(); mkDirty = true;
  },
  scorch(x, z, r) {
    const g = mkCtx, px = x * MK_PX, pz = z * MK_PX, pr = r * MK_PX;
    const grd = g.createRadialGradient(px, pz, 0, px, pz, pr);
    grd.addColorStop(0, 'rgba(20,10,4,0.45)'); grd.addColorStop(0.6, 'rgba(30,14,4,0.2)'); grd.addColorStop(1, 'rgba(30,14,4,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(px, pz, pr, 0, TAU); g.fill(); mkDirty = true;
  }
};

function drawAO(grid) {
  const g = aoCtx, s = AO_PX, OFF = 20000;
  g.clearRect(0, 0, aoCanvas.width, aoCanvas.height);
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.62)'; g.shadowBlur = s * 0.5; g.shadowOffsetX = OFF;
  g.fillStyle = '#000';
  g.beginPath();
  const pad = 0.06 * s;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const c = grid[z * W + x];
    if (c >= 1 && c <= 3) g.rect((x + AO_M) * s - pad - OFF, (z + AO_M) * s - pad, s + pad * 2, s + pad * 2);
  }
  // frame
  g.rect((AO_M - 1) * s - OFF, (AO_M - 1) * s, (W + 2) * s, s);
  g.rect((AO_M - 1) * s - OFF, (AO_M + H) * s, (W + 2) * s, s);
  g.rect((AO_M - 1) * s - OFF, AO_M * s, s, H * s);
  g.rect((AO_M + W) * s - OFF, AO_M * s, s, H * s);
  g.fill();
  g.restore();
  aoTex.needsUpdate = true;
}

// ================================================================ particles
class Particles {
  constructor(max, additive, tex) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    this.s = []; // state
    for (let i = 0; i < max; i++) this.s.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, s0: 1, s1: 1, r: 1, g: 1, b: 1, r1: 1, g1: 1, b1: 1, a0: 1, a1: 0, drag: 0, grav: 0 });
    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos); geo.setAttribute('pcolor', this.aCol); geo.setAttribute('psize', this.aSize);
    geo.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 600 } },
      vertexShader: `attribute float psize; attribute vec4 pcolor; varying vec4 vC; uniform float scale;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = psize * scale / -mv.z; gl_Position = projectionMatrix * mv; vC = pcolor; }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vC;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); float a = vC.a * t.a; if(a < 0.004) discard; gl_FragColor = vec4(vC.rgb * t.rgb, a); }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 6 : 5;
    this.geo = geo;
    scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a0, a1, drag = 0, grav = 0, r1, g1, b1) {
    if (this.n >= this.max || (FXQ < 1 && Math.random() > FXQ)) return;
    const p = this.s[this.n++];
    p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = 0; p.max = life;
    p.s0 = s0; p.s1 = s1; p.r = r; p.g = g; p.b = b; p.a0 = a0; p.a1 = a1; p.drag = drag; p.grav = grav;
    p.r1 = r1 == null ? r : r1; p.g1 = g1 == null ? g : g1; p.b1 = b1 == null ? b : b1;
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      const p = this.s[i];
      p.life += dt;
      if (p.life >= p.max) { this.n--; const t = this.s[i]; this.s[i] = this.s[this.n]; this.s[this.n] = t; continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy = p.vy * k - p.grav * dt; p.vz *= k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02) { p.y = 0.02; p.vy *= -0.3; }
      const t = p.life / p.max;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 4] = lerp(p.r, p.r1, t); this.col[i * 4 + 1] = lerp(p.g, p.g1, t); this.col[i * 4 + 2] = lerp(p.b, p.b1, t);
      const fadeIn = Math.min(1, p.life / Math.min(0.06, p.max * 0.2));
      this.col[i * 4 + 3] = lerp(p.a0, p.a1, t) * fadeIn;
      this.size[i] = lerp(p.s0, p.s1, Math.sqrt(t));
      i++;
    }
    this.geo.setDrawRange(0, this.n);
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true;
  }
}
const smokeFX = new Particles(2600, false, TEX.smoke);
const fireFX = new Particles(1800, true, TEX.fire);

// debris (instanced chunks)
const DEB_MAX = 220;
const debrisMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.07, 0.12), new THREE.MeshStandardMaterial({ roughness: 0.5 }), DEB_MAX);
debrisMesh.castShadow = true; debrisMesh.count = 0;
debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
debrisMesh.setColorAt(0, new THREE.Color(1, 1, 1));
scene.add(debrisMesh);
const debris = [];
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function spawnDebris(x, z, color, n, power = 1, y = 0.3) {
  for (let i = 0; i < n; i++) {
    if (debris.length >= DEB_MAX) debris.shift();
    const a = Math.random() * TAU, sp = rr(1, 3.2) * power;
    debris.push({ x, y: y + Math.random() * 0.2, z, vx: Math.cos(a) * sp, vy: rr(2.5, 5.5) * power, vz: Math.sin(a) * sp, rx: Math.random() * 6, ry: Math.random() * 6, wx: rr(-12, 12), wy: rr(-12, 12), s: rr(0.6, 1.5), life: 0, max: rr(1.6, 2.6), color: Array.isArray(color) ? color[i % color.length] : color, rest: false });
  }
}
function updateDebris(dt) {
  let n = 0;
  for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.life += dt; if (d.life > d.max) debris.splice(i, 1); }
  for (const d of debris) {
    if (!d.rest) {
      d.vy -= 14 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.rx += d.wx * dt; d.ry += d.wy * dt;
      if (d.y < 0.035) { d.y = 0.035; d.vy *= -0.35; d.vx *= 0.55; d.vz *= 0.55; d.wx *= 0.5; d.wy *= 0.5; if (Math.abs(d.vy) < 0.4) { d.rest = true; } }
    }
    const fade = d.life > d.max - 0.4 ? (d.max - d.life) / 0.4 : 1;
    _e.set(d.rx, d.ry, 0); _q.setFromEuler(_e); _v.set(wx(d.x), d.y, wz(d.z)); _s.setScalar(d.s * fade);
    _m4.compose(_v, _q, _s); debrisMesh.setMatrixAt(n, _m4); _c.setHex(d.color); debrisMesh.setColorAt(n, _c); n++;
  }
  debrisMesh.count = n;
  debrisMesh.instanceMatrix.needsUpdate = true;
  if (debrisMesh.instanceColor) debrisMesh.instanceColor.needsUpdate = true;
}

// ================================================================ effects
let shake = 0, flashI = 0;
const FX = {
  smokePuff(x, z, y = 0.45, n = 1, spread = 0.05, size = 0.4, dark = 0.86, life = 0.8) {
    for (let i = 0; i < n; i++) smokeFX.spawn(wx(x) + rr(-spread, spread), y + rr(-0.03, 0.03), wz(z) + rr(-spread, spread), rr(-0.15, 0.15), rr(0.15, 0.4), rr(-0.15, 0.15), life * rr(0.8, 1.2), size * 0.45, size, dark, dark * 0.98, dark * 0.95, 0.55, 0, 1.5, -0.05);
  },
  muzzle(x, z, a, rocket) {
    const mx = x + Math.cos(a) * 0.58, mz = z + Math.sin(a) * 0.58;
    for (let i = 0; i < 7; i++) {
      const sp = rr(0.4, 1.6), aa = a + rr(-0.6, 0.6);
      smokeFX.spawn(wx(mx), 0.46, wz(mz), Math.cos(aa) * sp, rr(0.1, 0.5), Math.sin(aa) * sp, rr(0.4, 0.8), 0.18, 0.55, 0.9, 0.88, 0.84, 0.6, 0, 4);
    }
    for (let i = 0; i < 4; i++) fireFX.spawn(wx(mx), 0.46, wz(mz), Math.cos(a) * rr(0.5, 2), 0, Math.sin(a) * rr(0.5, 2), 0.09, rocket ? 0.45 : 0.32, 0.1, 1, 0.75, 0.35, 0.9, 0, 3);
  },
  spark(x, z, n = 7) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = rr(1, 3.5); fireFX.spawn(wx(x), 0.46, wz(z), Math.cos(a) * sp, rr(0.5, 2.5), Math.sin(a) * sp, rr(0.15, 0.3), 0.09, 0.03, 1, 0.85, 0.5, 1, 0, 2, 6); }
    FX.smokePuff(x, z, 0.46, 2, 0.05, 0.3, 0.9, 0.5);
  },
  pop(x, z) {
    for (let i = 0; i < 8; i++) { const a = Math.random() * TAU, sp = rr(0.3, 1.2); smokeFX.spawn(wx(x), 0.46, wz(z), Math.cos(a) * sp, rr(0.1, 0.6), Math.sin(a) * sp, rr(0.4, 0.7), 0.2, 0.5, 0.92, 0.9, 0.86, 0.7, 0, 3); }
    for (let i = 0; i < 5; i++) { const a = Math.random() * TAU; fireFX.spawn(wx(x), 0.46, wz(z), Math.cos(a), 0.5, Math.sin(a), 0.12, 0.3, 0.05, 1, 0.8, 0.4, 0.9, 0); }
  },
  explosion(x, z, size, tint) {
    const X = wx(x), Z = wz(z);
    for (let i = 0; i < 46 * size; i++) {
      const a = Math.random() * TAU, sp = rr(0.4, 3.2) * size, up = rr(0.5, 3.5) * size;
      fireFX.spawn(X, rr(0.2, 0.6), Z, Math.cos(a) * sp, up, Math.sin(a) * sp, rr(0.25, 0.65), rr(0.5, 1.0) * size, 0.15, 1, rr(0.75, 0.95), rr(0.3, 0.5), 1, 0, 3.2, -0.5, 0.9, 0.25, 0.05);
    }
    for (let i = 0; i < 36 * size; i++) {
      const a = Math.random() * TAU, sp = rr(0.2, 2.0) * size;
      const d = rr(0.18, 0.35);
      smokeFX.spawn(X + rr(-0.2, 0.2), rr(0.2, 0.8), Z + rr(-0.2, 0.2), Math.cos(a) * sp, rr(0.6, 1.8), Math.sin(a) * sp, rr(1.3, 2.4), 0.5 * size, rr(1.2, 1.9) * size, d, d * 0.95, d * 0.9, 0.85, 0, 1.6, -0.15, 0.62, 0.6, 0.57);
    }
    for (let i = 0; i < 26 * size; i++) {
      const a = Math.random() * TAU, sp = rr(2, 6) * size;
      fireFX.spawn(X, 0.4, Z, Math.cos(a) * sp, rr(1, 5), Math.sin(a) * sp, rr(0.3, 0.7), 0.12, 0.03, 1, 0.9, 0.55, 1, 0, 1, 9);
    }
    // ground shock ring
    for (let i = 0; i < 28 * size; i++) {
      const a = (i / (28 * size)) * TAU, sp = 3.2 * size;
      smokeFX.spawn(X + Math.cos(a) * 0.3, 0.08, Z + Math.sin(a) * 0.3, Math.cos(a) * sp, 0.2, Math.sin(a) * sp, 0.7, 0.35, 0.9 * size, 0.78, 0.7, 0.6, 0.45, 0, 3.5);
    }
    flash.position.set(X, 1.2, Z); flashI = Math.max(flashI, 32 * size);
    shake = Math.max(shake, 0.18 * size);
  },
  dust(x, z, col) {
    for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, sp = rr(0.3, 1.6); smokeFX.spawn(wx(x) + rr(-0.4, 0.4), rr(0.2, 0.9), wz(z) + rr(-0.4, 0.4), Math.cos(a) * sp, rr(0.2, 1), Math.sin(a) * sp, rr(0.8, 1.4), 0.4, 1.1, col[0], col[1], col[2], 0.7, 0, 2); }
  },
  sparkle(x, z) {
    for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, sp = rr(0.2, 1.2); fireFX.spawn(wx(x), rr(0.2, 0.7), wz(z), Math.cos(a) * sp, rr(0.2, 1.4), Math.sin(a) * sp, rr(0.4, 0.8), 0.14, 0.02, 0.85, 0.95, 1, 0.9, 0, 1); }
  }
};

// ================================================================ audio (all synthesized)
const SFX = (() => {
  let ctx = null, master, sfx, mus, nbuf;
  let muted = store.get('muted', false);
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85; master.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0.3; mus.connect(master);
    nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const ok = () => ctx && ctx.state === 'running';
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function out(node, x, dest) {
    let n = node;
    if (x != null && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp((x / W) * 2 - 1, -1, 1) * 0.6; n.connect(p); n = p; }
    n.connect(dest || sfx);
  }
  function noise(t, dur, o = {}) {
    const s = ctx.createBufferSource(); s.buffer = nbuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t + dur); fl.Q.value = o.q || 0.7;
    const g = ctx.createGain(); env(g, t, o.attack || 0.002, o.gain || 0.4, dur);
    s.connect(fl); fl.connect(g); out(g, o.x, o.dest);
    s.start(t, Math.random() * 1.5); s.stop(t + (o.attack || 0.002) + dur + 0.05);
  }
  function tone(t, freq, dur, o = {}) {
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    const g = ctx.createGain(); env(g, t, o.attack || 0.004, o.gain || 0.3, dur);
    let n = g;
    if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; g.connect(fl); n = fl; }
    osc.connect(g); out(n, o.x, o.dest);
    osc.start(t); osc.stop(t + (o.attack || 0.004) + dur + 0.05);
  }
  const NOTE = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
  const fq = n => { const m = n.match(/^([A-G][#b]?)(\d)$/); return 440 * Math.pow(2, (NOTE[m[1]] + (parseInt(m[2]) + 1) * 12 - 69) / 12); };

  // --- music (original march) ---
  const BPM = 118, STEP = 60 / BPM / 4;
  const BASS = [['C2', 'G2', 'C2', 'G2'], ['F2', 'C3', 'F2', 'C3'], ['G2', 'D3', 'G2', 'D3'], ['C2', 'G2', 'C2', 'E2']];
  const MEL = [['E5', 'G5', 'E5', 'C5', 'D5', 'E5', 'G5', null], ['A5', 'G5', 'F5', 'A5', 'G5', 'F5', 'E5', null], ['D5', 'E5', 'F5', 'D5', 'B4', 'D5', 'G5', 'F5'], ['E5', 'D5', 'C5', 'G4', 'C5', null, 'C5', null]];
  const BRASS = [['C4', 'E4'], ['F4', 'A4'], ['G4', 'B4'], ['E4', 'C4']];
  const ALT = [['G4', null, 'C5', 'B4', 'C5', null, 'E5', null], ['F4', null, 'A4', 'G4', 'A4', null, 'C5', null], ['G4', null, 'B4', 'A4', 'B4', null, 'D5', null], ['C5', 'B4', 'C5', 'D5', 'E5', null, null, null]];
  const SN_ACC = new Set([4, 12]), SN_GHOST = new Set([2, 7, 10, 14, 15]);
  let mOn = false, mStep = 0, mNext = 0, mTimer = null, layers = {};
  function playStep(step, t) {
    const bar = (step >> 4) & 3, s = step & 15;
    if (SN_ACC.has(s)) { noise(t, 0.14, { type: 'highpass', f: 1500, gain: 0.32, dest: mus }); tone(t, 200, 0.06, { type: 'triangle', f1: 150, gain: 0.1, dest: mus }); }
    else if (SN_GHOST.has(s)) noise(t, 0.06, { type: 'highpass', f: 2200, gain: 0.08, dest: mus });
    if (s === 0 || s === 8 || (bar === 3 && s === 10)) tone(t, 110, 0.18, { f1: 42, gain: 0.55, dest: mus });
    if ((s & 3) === 0) { const f = fq(BASS[bar][s >> 2]); tone(t, f, 0.24, { type: 'triangle', gain: 0.34, dest: mus }); tone(t, f, 0.18, { type: 'square', gain: 0.04, lp: 600, dest: mus }); }
    if (layers.wood && (s & 1) === 0) { const n = MEL[bar][s >> 1]; if (n) { const f = fq(n); tone(t, f, 0.15, { type: 'triangle', gain: 0.13, dest: mus }); tone(t, f * 2, 0.1, { type: 'sine', gain: 0.035, dest: mus }); } }
    if (!layers.wood && (s & 1) === 0) { const n = ALT[bar][s >> 1]; if (n) tone(t, fq(n), 0.12, { type: 'sine', gain: 0.09, dest: mus }); }
    if (layers.brass && (s === 0 || s === 8)) { const f = fq(BRASS[bar][s >> 3]); tone(t, f, STEP * 7, { type: 'sawtooth', gain: 0.06, attack: 0.06, lp: 1100, dest: mus }); tone(t, f * 1.5, STEP * 7, { type: 'sawtooth', gain: 0.035, attack: 0.08, lp: 900, dest: mus }); }
    if (layers.tension) { noise(t, 0.025, { type: 'highpass', f: 7500, gain: (s & 3) === 2 ? 0.08 : 0.035, dest: mus }); if ((s & 3) === 2) tone(t, 82, 0.12, { type: 'triangle', f1: 60, gain: 0.25, dest: mus }); }
  }
  function sched() { if (!mOn || !ctx) return; while (mNext < ctx.currentTime + 0.15) { playStep(mStep, mNext); mNext += STEP; mStep = (mStep + 1) % 64; } }
  function jingle(seq, bpm = 140, gain = 0.16) {
    if (!ok()) return; const b = 60 / bpm, t0 = ctx.currentTime + 0.05;
    for (const [n, st, du, kind] of seq) {
      const t = t0 + st * b;
      if (n === 'snare') { noise(t, 0.08, { type: 'highpass', f: 1600, gain: 0.25, dest: mus }); continue; }
      const f = fq(n);
      tone(t, f, du * b, { type: 'triangle', gain, attack: 0.01, dest: mus });
      tone(t, f, du * b, { type: 'sawtooth', gain: gain * 0.35, attack: 0.02, lp: 1400, dest: mus });
      if (kind === 'low') tone(t, f / 2, du * b, { type: 'triangle', gain: gain * 0.8, dest: mus });
    }
  }
  return {
    ensure,
    get muted() { return muted; },
    toggleMute() { muted = !muted; store.set('muted', muted); if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.02); return muted; },
    shot(x, rocket) { if (!ok()) return; const t = ctx.currentTime; if (rocket) { noise(t, 0.4, { f: 3200, f1: 500, type: 'bandpass', q: 1.1, gain: 0.55, x }); tone(t, 560, 0.28, { type: 'sawtooth', f1: 160, gain: 0.07, lp: 2000, x }); } else { noise(t, 0.12, { f: 2400, f1: 400, gain: 0.55, x }); tone(t, 190, 0.13, { f1: 55, gain: 0.5, x }); } },
    ricochet(x) { if (!ok()) return; const t = ctx.currentTime; tone(t, 2100, 0.12, { type: 'triangle', f1: 1150, gain: 0.16, x }); noise(t, 0.04, { f: 5000, type: 'highpass', gain: 0.12, x }); },
    pop(x) { if (!ok()) return; noise(ctx.currentTime, 0.09, { f: 1600, f1: 300, gain: 0.32, x }); },
    boom(x, big) { if (!ok()) return; const t = ctx.currentTime; noise(t, big ? 1.5 : 1.0, { f: big ? 1800 : 2600, f1: 70, gain: big ? 1.0 : 0.85, attack: 0.004, x }); tone(t, big ? 85 : 120, big ? 0.9 : 0.55, { f1: 28, gain: 0.9, x }); noise(t, 0.25, { f: 6000, f1: 1200, type: 'bandpass', gain: 0.22, x }); },
    mineLay(x) { if (!ok()) return; const t = ctx.currentTime; tone(t, 680, 0.05, { type: 'square', gain: 0.07, lp: 2500, x }); tone(t + 0.07, 940, 0.06, { type: 'square', gain: 0.07, lp: 2500, x }); },
    beep(x) { if (!ok()) return; tone(ctx.currentTime, 1700, 0.05, { gain: 0.06, x }); },
    crumble(x) { if (!ok()) return; const t = ctx.currentTime; for (let i = 0; i < 5; i++) noise(t + i * 0.035, 0.14, { f: 700 + Math.random() * 900, f1: 180, type: 'bandpass', q: 1.4, gain: 0.3, x }); },
    vanish() { if (!ok()) return; const t = ctx.currentTime; for (let i = 0; i < 5; i++) tone(t + i * 0.05, 1200 + i * 260, 0.12, { type: 'sine', gain: 0.05 }); },
    click() { if (!ok()) return; tone(ctx.currentTime, 900, 0.03, { type: 'square', gain: 0.04, lp: 3000 }); },
    music(l) { if (!ok()) return; layers = l || {}; if (!mOn) { mOn = true; mStep = 0; mNext = ctx.currentTime + 0.08; } if (!mTimer) mTimer = setInterval(sched, 25); },
    stopMusic() { mOn = false; },
    jStart() { jingle([['snare', 0, 0], ['snare', 0.25, 0], ['snare', 0.5, 0], ['snare', 0.75, 0], ['G4', 1, 0.5], ['C5', 1.5, 0.5], ['E5', 2, 0.5], ['G5', 2.5, 1.2, 'low']], 150); },
    jClear() { jingle([['C5', 0, 0.4], ['E5', 0.5, 0.4], ['G5', 1, 0.4], ['C6', 1.5, 0.9, 'low'], ['G5', 2.5, 0.4], ['C6', 3, 1.4, 'low']], 160, 0.15); },
    jLose() { jingle([['G4', 0, 0.5], ['Eb4', 0.6, 0.5], ['C4', 1.2, 1.4, 'low']], 120, 0.15); },
    jOver() { jingle([['C5', 0, 0.8], ['B4', 1, 0.8], ['Bb4', 2, 0.8], ['A4', 3, 2.2, 'low']], 110, 0.14); },
    jWin() { jingle([['C5', 0, 0.3], ['C5', 0.35, 0.3], ['C5', 0.7, 0.3], ['E5', 1.05, 0.7], ['D5', 1.8, 0.3], ['E5', 2.15, 0.3], ['G5', 2.5, 1.6, 'low']], 140, 0.16); }
  };
})();

// ================================================================ tank meshes
const TG = {
  hull: roundedBox(0.8, 0.2, 0.5, 3, 0.07),
  deck: roundedBox(0.62, 0.06, 0.42, 2, 0.03),
  tread: roundedBox(0.9, 0.2, 0.16, 3, 0.08, true),
  ring: new THREE.CylinderGeometry(0.21, 0.24, 0.1, 28),
  dome: new THREE.SphereGeometry(0.205, 28, 14, 0, TAU, 0, Math.PI / 2),
  barrel: new THREE.CylinderGeometry(0.05, 0.056, 0.42, 16),
  muzzle: new THREE.CylinderGeometry(0.068, 0.068, 0.075, 16),
  hatch: new THREE.CylinderGeometry(0.07, 0.075, 0.03, 18),
  wheel: new THREE.CylinderGeometry(0.055, 0.055, 0.02, 14),
  blob: new THREE.PlaneGeometry(1.35, 1.35)
};
TG.barrel.rotateZ(-Math.PI / 2); TG.muzzle.rotateZ(-Math.PI / 2); TG.wheel.rotateX(Math.PI / 2); TG.blob.rotateX(-Math.PI / 2);
const treadMatBase = new THREE.MeshStandardMaterial({ map: TEX.tread, roughness: 0.8, metalness: 0.05 });
const wheelMatBase = new THREE.MeshStandardMaterial({ color: 0x8a837a, roughness: 0.5, metalness: 0.3 });
const blobMat = new THREE.MeshBasicMaterial({ map: TEX.blob, transparent: true, depthWrite: false, opacity: 0.6 });

const shieldGeo = new THREE.TorusGeometry(0.6, 0.04, 8, 48); shieldGeo.rotateX(Math.PI / 2);
const shieldMat = new THREE.MeshStandardMaterial({ color: 0xf0b93a, emissive: 0x5a3a00, roughness: 0.3, metalness: 0.7 });
function buildTank(color, opts = {}) {
  const group = new THREE.Group();
  const c = new THREE.Color(color);
  const hsl = {}; c.getHSL(hsl);
  const hullMat = new THREE.MeshPhysicalMaterial({ color: c.clone().offsetHSL(0, 0, -0.04), roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35 });
  const topMat = new THREE.MeshPhysicalMaterial({ color: c.clone().offsetHSL(0, 0, 0.03), roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: c.clone().offsetHSL(0, -0.05, -0.18), roughness: 0.5 });
  const wheelMat = wheelMatBase.clone();
  const mats = [hullMat, topMat, darkMat, wheelMat];
  const hull = new THREE.Mesh(TG.hull, hullMat); hull.position.y = 0.23;
  const deck = new THREE.Mesh(TG.deck, topMat); deck.position.y = 0.34;
  const treadMats = [treadMatBase.clone(), treadMatBase.clone()];
  treadMats.forEach(m => { m.map = TEX.tread.clone(); m.map.needsUpdate = true; });
  const tL = new THREE.Mesh(TG.tread, treadMats[0]); tL.position.set(0, 0.11, -0.31);
  const tR = new THREE.Mesh(TG.tread, treadMats[1]); tR.position.set(0, 0.11, 0.31);
  group.add(hull, deck, tL, tR);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(TG.wheel, wheelMat); w.position.set(-0.3 + i * 0.2, 0.11, side * 0.395); group.add(w);
  }
  const turret = new THREE.Group(); turret.position.y = 0.36;
  const ring = new THREE.Mesh(TG.ring, darkMat); ring.position.y = 0.04;
  const dome = new THREE.Mesh(TG.dome, topMat); dome.position.y = 0.08; dome.scale.y = 0.78;
  const barrel = new THREE.Mesh(TG.barrel, topMat); barrel.position.set(0.3, 0.1, 0);
  const muzzle = new THREE.Mesh(TG.muzzle, darkMat); muzzle.position.set(0.52, 0.1, 0);
  const hatch = new THREE.Mesh(TG.hatch, darkMat); hatch.position.set(-0.04, 0.24, 0);
  turret.add(ring, dome, barrel, muzzle, hatch);
  group.add(turret);
  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const blob = new THREE.Mesh(TG.blob, blobMat); blob.position.y = 0.006; blob.renderOrder = 1;
  let shield = null;
  if (opts.armor) { shield = new THREE.Mesh(shieldGeo, shieldMat); shield.position.y = 0.3; shield.castShadow = true; group.add(shield); }
  group.scale.setScalar(1.12);
  scene.add(group); scene.add(blob);
  return { group, turret, barrel, muzzle, blob, shield, treadMats, mats: [...mats, ...treadMats] };
}

// ================================================================ bullets & mines meshes
const shellGeo = new THREE.CapsuleGeometry(0.055, 0.13, 4, 10); shellGeo.rotateZ(Math.PI / 2);
const rocketGeo = new THREE.CapsuleGeometry(0.06, 0.2, 4, 10); rocketGeo.rotateZ(Math.PI / 2);
const shellMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.3, metalness: 0.35 });
const rocketMat = new THREE.MeshStandardMaterial({ color: 0xc94a2c, roughness: 0.35, metalness: 0.3, emissive: 0x401000 });
const bulletPool = { shell: [], rocket: [] };
function getBulletMesh(rocket) {
  const pool = rocket ? bulletPool.rocket : bulletPool.shell;
  for (const m of pool) if (!m.visible) { m.visible = true; return m; }
  const m = new THREE.Mesh(rocket ? rocketGeo : shellGeo, rocket ? rocketMat : shellMat);
  m.castShadow = true; scene.add(m); pool.push(m); return m;
}
const mineBaseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.07, 28);
const mineTopGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.05, 24);
const mineLightGeo = new THREE.SphereGeometry(0.055, 14, 8);
const mineBaseMat = new THREE.MeshStandardMaterial({ color: 0xe0b331, roughness: 0.45, metalness: 0.2 });
const mineTopMat = new THREE.MeshStandardMaterial({ color: 0x3a332b, roughness: 0.6 });
const minePool = [];
function getMineMesh() {
  for (const m of minePool) if (!m.group.visible) { m.group.visible = true; return m; }
  const group = new THREE.Group();
  const base = new THREE.Mesh(mineBaseGeo, mineBaseMat); base.position.y = 0.035;
  const top = new THREE.Mesh(mineTopGeo, mineTopMat); top.position.y = 0.09;
  const lightMat = new THREE.MeshStandardMaterial({ color: 0x661010, emissive: 0xff2010, emissiveIntensity: 0 });
  const light = new THREE.Mesh(mineLightGeo, lightMat); light.position.y = 0.12;
  group.add(base, top, light);
  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(group);
  const m = { group, lightMat }; minePool.push(m); return m;
}

// aim dots
const DOTS = 40;
const dotMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.045, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.55, depthWrite: false }), DOTS);
dotMesh.count = 0; dotMesh.renderOrder = 3; dotMesh.frustumCulled = false;
scene.add(dotMesh);

// ================================================================ game state
const G = {
  mode: 'campaign', state: 'boot', mission: 1, lives: 3, timer: 0, playTime: 0,
  grid: new Uint8Array(W * H), level: null, alive: [],
  tanks: [], bullets: [], mines: [], player: null,
  kills: {}, totalKills: 0, best: store.get('best', 1),
  invuln: false, pdist: new Int16Array(W * H), pdistTimer: 0, cellIndex: new Int32Array(W * H)
};

function bSolid(x, z) { const i = Math.floor(x), j = Math.floor(z); if (i < 0 || j < 0 || i >= W || j >= H) return true; const c = G.grid[j * W + i]; return c >= 1 && c <= 3; }
function tSolidCell(i, j) { if (i < 0 || j < 0 || i >= W || j >= H) return true; return G.grid[j * W + i] !== 0; }
const BR = 0.09;
function wallHit(x, z, dx, dz, s) {
  const nx = x + dx * s, nz = z + dz * s, sx = dx > 0 ? BR : -BR, sz = dz > 0 ? BR : -BR;
  const hx = bSolid(nx + sx, z), hz = bSolid(x, nz + sz);
  if (hx || hz) return (hx ? 1 : 0) | (hz ? 2 : 0);
  if (bSolid(nx + sx, nz + sz)) return 3;
  return 0;
}
function traceShot(x, z, dx, dz, bounces, maxLen, step, visit) {
  let d = 0, b = 0, guard = 0;
  while (d < maxLen && guard++ < 2000) {
    const h = wallHit(x, z, dx, dz, step);
    if (h) { if (b >= bounces) return -1; b++; if (h & 1) dx = -dx; if (h & 2) dz = -dz; continue; }
    x += dx * step; z += dz * step; d += step;
    const r = visit(x, z, d, b, dx, dz); if (r) return r;
  }
  return 0;
}

// ---------------------------------------------------------------- level build
function buildLevel(L) {
  const resized = L.w !== W || L.h !== H;
  W = L.w; H = L.h;
  G.grid = new Uint8Array(L.grid);
  if (G.cellIndex.length !== W * H) { G.cellIndex = new Int32Array(W * H); G.pdist = new Int16Array(W * H); }
  buildFrame(); resizeDecals();
  if (resized) fitCamera();
  let nb = 0, np = 0, nh = 0;
  G.cellIndex.fill(-1);
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const c = G.grid[z * W + x];
    if (c === 1 || c === 2) {
      const tint = 0.9 + ((x * 7 + z * 13) % 10) / 70;
      for (let k = 0; k < (c === 2 ? 2 : 1); k++) {
        _m4.makeRotationY(((x * 3 + z * 5 + k) % 4) * Math.PI / 2); _m4.setPosition(wx(x + 0.5), 0.4925 + k * 0.985, wz(z + 0.5));
        blockMesh.setMatrixAt(nb, _m4); _c.setRGB(tint, tint * 0.98, tint * 0.96); blockMesh.setColorAt(nb, _c); nb++;
      }
    } else if (c === 3) {
      _m4.makeRotationY(((x + z) % 4) * Math.PI / 2); _m4.setPosition(wx(x + 0.5), 0.4925, wz(z + 0.5));
      pinkMesh.setMatrixAt(np, _m4); G.cellIndex[z * W + x] = np; np++;
    } else if (c === 4) {
      _m4.makeRotationY(camOff.x < 0 ? -Math.PI / 2 : 0); _m4.setPosition(wx(x + 0.5), 0.003, wz(z + 0.5)); holeMesh.setMatrixAt(nh++, _m4);
    }
  }
  blockMesh.count = nb; pinkMesh.count = np; holeMesh.count = nh;
  blockMesh.instanceMatrix.needsUpdate = true; if (blockMesh.instanceColor) blockMesh.instanceColor.needsUpdate = true;
  pinkMesh.instanceMatrix.needsUpdate = true; holeMesh.instanceMatrix.needsUpdate = true;
  blockMesh.computeBoundingSphere(); pinkMesh.computeBoundingSphere(); holeMesh.computeBoundingSphere();
  drawAO(G.grid);
}

function breakPink(i, j) {
  const k = j * W + i;
  if (G.grid[k] !== 3) return;
  G.grid[k] = 0;
  vsEv('b', i, j);
  const idx = G.cellIndex[k];
  if (idx >= 0) { _m4.makeScale(0, 0, 0); pinkMesh.setMatrixAt(idx, _m4); pinkMesh.instanceMatrix.needsUpdate = true; }
  spawnDebris(i + 0.5, j + 0.5, [0xf0a0b8, 0xe58aa5, 0xd8b48a], 12, 0.9, 0.5);
  FX.dust(i + 0.5, j + 0.5, [0.95, 0.75, 0.8]);
  SFX.crumble(i + 0.5);
  drawAO(G.grid);
}

// ---------------------------------------------------------------- entities
class Tank {
  constructor(key, x, z, team, spawn, color) {
    this.key = key; this.type = TYPES[key]; this.team = team; this.spawn = spawn;
    this.x = x; this.z = z; this.r = 0.4;
    this.body = team === 'P' ? 0 : Math.PI; this.turret = this.body;
    this.vx = 0; this.vz = 0; this.alive = true; this.rev = false;
    this.fireCd = rr(1.0, 2.2); this.mineCd = rr(2, 4); this.burst = 0;
    this.aimAngle = this.turret; this.hasShot = false; this.aimTimer = rr(0, 0.3);
    this.path = []; this.planTimer = rr(0.2, 1.0); this.dodgeTimer = 0; this.dodgeVec = null; this.dodgeCheck = rr(0, 0.15);
    this.stuckT = 0; this.lastX = x; this.lastZ = z;
    this.trackDist = 0; this.trackRot = 0; this.treadL = 0; this.treadR = 0; this.recoil = 0;
    this.fade = -1; this.hidden = false; this.idlePhase = Math.random() * TAU;
    this.smooth = false; this.slot = -1; this.localView = false;
    this.hp = 1 + (this.type.armor || 0); this.reveal = 0; this.shotCd = 0; this.hitFlash = 0; this.cloakO = 1;
    this.m = buildTank(color != null ? color : this.type.color, { armor: this.type.armor });
    this.resetDisplay();
  }
  resetDisplay() { this.rx = this.x; this.rz = this.z; this.rb = this.body; this.rt = this.turret; }
  dispose() {
    scene.remove(this.m.group); scene.remove(this.m.blob);
    this.m.mats.forEach(m => { if (m.map && m.map !== TEX.tread) m.map.dispose(); m.dispose(); });
  }
  sync(dt) {
    const g = this.m.group;
    if (this.smooth) {
      const k = 1 - Math.exp(-dt * 16);
      this.rx += (this.x - this.rx) * k; this.rz += (this.z - this.rz) * k;
      this.rb += angDiff(this.body, this.rb) * k; this.rt += angDiff(this.turret, this.rt) * k;
      if (Math.abs(this.x - this.rx) + Math.abs(this.z - this.rz) > 3) this.resetDisplay();
    } else this.resetDisplay();
    g.position.set(wx(this.rx), 0, wz(this.rz));
    g.rotation.y = -this.rb;
    this.m.turret.rotation.y = -(this.rt - this.rb);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.m.barrel.position.x = 0.3 - this.recoil * 0.08; this.m.muzzle.position.x = 0.52 - this.recoil * 0.08;
    this.m.treadMats[0].map.offset.x = -this.treadL * 1.6;
    this.m.treadMats[1].map.offset.x = -this.treadR * 1.6;
    this.m.blob.position.set(wx(this.rx), 0.006, wz(this.rz));
    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      const f = this.hitFlash > 0 && Math.sin(this.hitFlash * 40) > 0 ? 0.6 : 0;
      for (const mt of this.m.mats) if (mt.emissive) mt.emissive.setRGB(f, f * 0.8, f * 0.5);
    }
    if (this.type.cloak) {
      // invisible to opponents unless it just fired or got hit; its own player sees a ghost
      this.reveal = Math.max(0, this.reveal - dt);
      const target = this.reveal > 0 ? 1 : this.localView ? 0.4 : 0;
      this.cloakO += (target - this.cloakO) * Math.min(1, dt * 10);
      for (const mt of this.m.mats) { if (!mt.transparent) { mt.transparent = true; mt.needsUpdate = true; } mt.opacity = this.cloakO; }
      g.visible = this.cloakO > 0.03; this.m.blob.visible = g.visible;
    }
    if (this.fade >= 0) {
      this.fade -= dt;
      const o = Math.max(0, this.fade / 0.7);
      for (const mt of this.m.mats) { if (!mt.transparent) { mt.transparent = true; mt.needsUpdate = true; } mt.opacity = o; }
      this.m.blob.visible = o > 0.05;
      if (this.fade <= 0) { this.fade = -1; this.hidden = true; g.visible = false; this.m.blob.visible = false; }
    }
  }
}

function activeBullets(t) { let n = 0; for (const b of G.bullets) if (b.alive && b.owner === t) n++; return n; }
function activeMines(t) { let n = 0; for (const m of G.mines) if (!m.dead && m.owner === t) n++; return n; }

function fire(t) {
  const a = t.turret, rocket = !!t.type.rocket;
  vsEv('s', r2(t.x), r2(t.z), r2(a), rocket ? 1 : 0, t.slot);
  const b = { id: nextBulletId++, x: t.x, z: t.z, dx: Math.cos(a), dz: Math.sin(a), speed: t.type.bspd, bounces: t.type.bounces, owner: t, team: t.team, traveled: 0, bounced: false, alive: true, rocket, trail: 0, mesh: getBulletMesh(rocket) };
  G.bullets.push(b);
  t.recoil = 1; t.reveal = 1.3; t.shotCd = t.type.shotGap || 0;
  FX.muzzle(t.x, t.z, a, rocket);
  SFX.shot(t.x, rocket);
  moveBullet(b, 0.5);
  syncBullet(b);
}
function killBullet(b, pop) {
  if (!b.alive) return;
  b.alive = false; b.mesh.visible = false;
  if (pop) { FX.pop(b.x, b.z); SFX.pop(b.x); vsEv('p', r2(b.x), r2(b.z)); }
}
function moveBullet(b, dist) {
  let rem = dist;
  while (rem > 1e-6 && b.alive) {
    const s = Math.min(0.05, rem); rem -= s;
    const h = wallHit(b.x, b.z, b.dx, b.dz, s);
    if (h) {
      if (b.bounces <= 0) { killBullet(b, true); return; }
      b.bounces--; b.bounced = true;
      if (h & 1) b.dx = -b.dx; if (h & 2) b.dz = -b.dz;
      FX.spark(b.x, b.z); SFX.ricochet(b.x); vsEv('r', r2(b.x), r2(b.z));
      continue;
    }
    b.x += b.dx * s; b.z += b.dz * s; b.traveled += s;
    for (const t of G.tanks) {
      if (!t.alive) continue;
      if (t === b.owner && !b.bounced && b.traveled < 0.7) continue;
      const ex = t.x - b.x, ez = t.z - b.z;
      if (ex * ex + ez * ez < 0.42 * 0.42) {
        killBullet(b, false);
        if (!(t.team === 'P' && G.invuln)) damageTank(t, b.owner); else FX.pop(b.x, b.z);
        return;
      }
    }
    for (const m of G.mines) {
      if (m.dead) continue;
      const ex = m.x - b.x, ez = m.z - b.z;
      if (ex * ex + ez * ez < 0.3 * 0.3) { killBullet(b, false); triggerMine(m, 0); return; }
    }
  }
}
function syncBullet(b) {
  b.mesh.position.set(wx(b.x), 0.46, wz(b.z));
  b.mesh.rotation.y = -Math.atan2(b.dz, b.dx);
}
function updateBullets(dt) {
  for (const b of G.bullets) {
    if (!b.alive) continue;
    moveBullet(b, b.speed * dt);
    if (!b.alive) continue;
    syncBullet(b);
    b.trail -= dt;
    if (b.trail <= 0) {
      b.trail = b.rocket ? 0.018 : 0.03;
      const tx = b.x - b.dx * 0.16, tz = b.z - b.dz * 0.16;
      if (b.rocket) {
        smokeFX.spawn(wx(tx), 0.46, wz(tz), rr(-0.1, 0.1), rr(0.1, 0.3), rr(-0.1, 0.1), rr(0.7, 1.0), 0.16, 0.5, 0.75, 0.72, 0.68, 0.55, 0, 1.2, -0.05);
        fireFX.spawn(wx(tx), 0.46, wz(tz), -b.dx * 0.8, 0, -b.dz * 0.8, 0.14, 0.3, 0.06, 1, 0.65, 0.2, 0.95, 0, 0, 0, 1, 0.3, 0.05);
      } else {
        smokeFX.spawn(wx(tx), 0.46, wz(tz), rr(-0.05, 0.05), rr(0.05, 0.2), rr(-0.05, 0.05), rr(0.5, 0.75), 0.11, 0.34, 0.95, 0.94, 0.9, 0.42, 0, 1.2, -0.04);
      }
    }
  }
  // bullet vs bullet
  const bs = G.bullets;
  for (let i = 0; i < bs.length; i++) {
    const a = bs[i]; if (!a.alive) continue;
    for (let j = i + 1; j < bs.length; j++) {
      const c = bs[j]; if (!c.alive) continue;
      const ex = a.x - c.x, ez = a.z - c.z;
      if (ex * ex + ez * ez < 0.22 * 0.22) { killBullet(a, true); killBullet(c, false); break; }
    }
  }
  G.bullets = G.bullets.filter(b => b.alive);
}

// ---------------------------------------------------------------- mines
const MINE_R = 1.75;
function layMine(t) {
  const mm = getMineMesh();
  const m = { id: nextMineId++, x: t.x, z: t.z, owner: t, team: t.team, age: 0, fuse: 8, dead: false, mesh: mm, lit: false };
  vsEv('l', r2(t.x));
  mm.group.position.set(wx(m.x), 0, wz(m.z));
  G.mines.push(m);
  SFX.mineLay(m.x);
}
function triggerMine(m, delay) { if (!m.dead) m.fuse = Math.min(m.fuse, m.age + delay); }
function explodeMine(m) {
  if (m.dead) return;
  m.dead = true; m.mesh.group.visible = false;
  mineBlast(m.x, m.z);
  vsEv('m', r2(m.x), r2(m.z));
  for (const t of G.tanks) {
    if (!t.alive) continue;
    if (Math.hypot(t.x - m.x, t.z - m.z) < MINE_R + 0.15) { if (!(t.team === 'P' && G.invuln)) damageTank(t, m.owner); }
  }
  for (const b of G.bullets) if (b.alive && Math.hypot(b.x - m.x, b.z - m.z) < MINE_R) killBullet(b, false);
  for (const o of G.mines) if (!o.dead && o !== m && Math.hypot(o.x - m.x, o.z - m.z) < MINE_R) triggerMine(o, 0.12);
  const i0 = Math.floor(m.x - MINE_R - 1), i1 = Math.floor(m.x + MINE_R + 1), j0 = Math.floor(m.z - MINE_R - 1), j1 = Math.floor(m.z + MINE_R + 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (i < 0 || j < 0 || i >= W || j >= H) continue;
    if (G.grid[j * W + i] === 3 && Math.hypot(i + 0.5 - m.x, j + 0.5 - m.z) < MINE_R + 0.4) breakPink(i, j);
  }
}
function updateMines(dt) {
  for (const m of G.mines) {
    if (m.dead) continue;
    m.age += dt;
    if (m.age > 1.0) {
      for (const t of G.tanks) {
        if (!t.alive || t.team === m.team) continue;
        if (Math.hypot(t.x - m.x, t.z - m.z) < 1.05) triggerMine(m, 0.12);
      }
    }
    if (m.age >= m.fuse) { explodeMine(m); continue; }
    const left = m.fuse - m.age;
    const on = left < 2.5 ? Math.sin(m.age * 22) > 0 : Math.sin(m.age * 4) > 0.75;
    if (on && !m.lit && left < 2.5) SFX.beep(m.x);
    m.lit = on;
    m.mesh.lightMat.emissiveIntensity = on ? 3.2 : 0.05;
    const pulse = left < 2.5 && on ? 1.08 : 1;
    m.mesh.group.scale.set(pulse, 1, pulse);
  }
  G.mines = G.mines.filter(m => !m.dead);
}

// ---------------------------------------------------------------- tanks movement & collision
function collideTank(t) {
  const r = t.r;
  t.x = clamp(t.x, r, W - r); t.z = clamp(t.z, r, H - r);
  const i0 = Math.floor(t.x - r - 0.5), i1 = Math.floor(t.x + r + 0.5), j0 = Math.floor(t.z - r - 0.5), j1 = Math.floor(t.z + r + 0.5);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (i < 0 || j < 0 || i >= W || j >= H) continue;
    const c = G.grid[j * W + i]; if (!c) continue;
    if (c === 4) {
      const cx = i + 0.5, cz = j + 0.5, ex = t.x - cx, ez = t.z - cz, d = Math.hypot(ex, ez), min = r + 0.36;
      if (d < min && d > 1e-5) { t.x = cx + ex / d * min; t.z = cz + ez / d * min; }
      continue;
    }
    const px = clamp(t.x, i, i + 1), pz = clamp(t.z, j, j + 1), ex = t.x - px, ez = t.z - pz, d2 = ex * ex + ez * ez;
    if (d2 < r * r) {
      if (d2 > 1e-9) { const d = Math.sqrt(d2); t.x = px + ex / d * r; t.z = pz + ez / d * r; }
      else {
        const l = t.x - i, rgt = i + 1 - t.x, u = t.z - j, dn = j + 1 - t.z, mn = Math.min(l, rgt, u, dn);
        if (mn === l) t.x = i - r; else if (mn === rgt) t.x = i + 1 + r; else if (mn === u) t.z = j - r; else t.z = j + 1 + r;
      }
    }
  }
}
function separateTanks() {
  const ts = G.tanks;
  for (let i = 0; i < ts.length; i++) {
    const a = ts[i]; if (!a.alive) continue;
    for (let j = i + 1; j < ts.length; j++) {
      const b = ts[j]; if (!b.alive) continue;
      const ex = b.x - a.x, ez = b.z - a.z, d = Math.hypot(ex, ez), min = a.r + b.r;
      if (d < min && d > 1e-5) {
        const push = (min - d) / 2, nx = ex / d, nz = ez / d;
        a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
        collideTank(a); collideTank(b);
      }
    }
  }
}
function drive(t, mx, mz, dt) {
  const len = Math.hypot(mx, mz);
  const sp = t.type.speed;
  if (len < 0.08 || sp <= 0) { t.moving = 0; return 0; }
  mx /= len; mz /= len;
  const mag = Math.min(1, len);
  const a = Math.atan2(mz, mx);
  const dF = angDiff(a, t.body), dB = angDiff(a + Math.PI, t.body);
  t.rev = t.rev ? Math.abs(dB) < Math.abs(dF) + 0.35 : Math.abs(dB) + 0.35 < Math.abs(dF);
  const d = t.rev ? dB : dF;
  const maxTurn = t.type.turn * dt;
  const turn = clamp(d, -maxTurn, maxTurn);
  t.body += turn;
  const rem = Math.abs(d - turn);
  const factor = rem > 0.6 ? 0 : Math.cos(rem);
  const speed = sp * mag * factor * (t.rev ? -1 : 1);
  t.x += Math.cos(t.body) * speed * dt; t.z += Math.sin(t.body) * speed * dt;
  t.treadL += (speed - turn / dt * 0.3) * dt; t.treadR += (speed + turn / dt * 0.3) * dt;
  t.trackRot += Math.abs(turn);
  t.moving = 1;
  return speed;
}
function stampTracks(t) {
  const dx = t.x - t.lastX, dz = t.z - t.lastZ;
  const moved = Math.hypot(dx, dz);
  t.trackDist += moved;
  if (t.smooth) { t.treadL += moved; t.treadR += moved; }
  if (t.trackDist > 0.15 || t.trackRot > 0.25) { Decals.track(t.x, t.z, t.body); t.trackDist = 0; t.trackRot = 0; }
}

// ---------------------------------------------------------------- AI
const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function computePlayerDist() {
  const d = G.pdist; d.fill(-1);
  const P = G.player; if (!P || !P.alive) return;
  const si = clamp(Math.floor(P.x), 0, W - 1), sj = clamp(Math.floor(P.z), 0, H - 1);
  const q = [sj * W + si]; d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const k = q[h], x = k % W, z = (k / W) | 0;
    for (let n = 0; n < 4; n++) {
      const nx = x + NB8[n][0], nz = z + NB8[n][1];
      if (tSolidCell(nx, nz)) continue;
      const nk = nz * W + nx; if (d[nk] >= 0) continue;
      d[nk] = d[k] + 1; q.push(nk);
    }
  }
}
function mineDanger(x, z, rad) {
  for (const m of G.mines) if (!m.dead && Math.hypot(m.x - x, m.z - z) < rad) return true;
  return false;
}
function planPath(t) {
  const si = clamp(Math.floor(t.x), 0, W - 1), sj = clamp(Math.floor(t.z), 0, H - 1);
  const depth = new Int16Array(W * H).fill(-1), parent = new Int32Array(W * H).fill(-1);
  const start = sj * W + si; depth[start] = 0;
  const q = [start];
  const maxD = t.type.style === 'offensive' ? 7 : 5;
  for (let h = 0; h < q.length; h++) {
    const k = q[h], x = k % W, z = (k / W) | 0;
    if (depth[k] >= maxD) continue;
    for (const [dx, dz] of NB8) {
      const nx = x + dx, nz = z + dz;
      if (tSolidCell(nx, nz)) continue;
      if (dx && dz && (tSolidCell(x + dx, z) || tSolidCell(x, z + dz))) continue;
      const nk = nz * W + nx; if (depth[nk] >= 0) continue;
      if (mineDanger(nx + 0.5, nz + 0.5, MINE_R + 0.5)) continue;
      depth[nk] = depth[k] + 1; parent[nk] = k; q.push(nk);
    }
  }
  const P = G.player, st = t.type;
  let best = -1, bestS = -1e9;
  for (const k of q) {
    const x = k % W + 0.5, z = ((k / W) | 0) + 0.5;
    const e = P ? Math.hypot(P.x - x, P.z - z) : 8;
    const pd = G.pdist[k] >= 0 ? G.pdist[k] : 30;
    let s;
    if (st.style === 'offensive') s = -Math.abs(pd - st.pref) * 1.1 + Math.random() * 2.2;
    else if (st.style === 'defensive') s = -Math.abs(e - st.pref) + Math.random() * 2.6;
    else s = -Math.abs(e - st.pref) * 0.45 + Math.random() * 3.2;
    for (const o of G.tanks) if (o !== t && o.alive && o.team === t.team && Math.hypot(o.x - x, o.z - z) < 1.6) s -= 2;
    if (k === start) s -= 0.8;
    if (s > bestS) { bestS = s; best = k; }
  }
  const path = [];
  let k = best;
  while (k >= 0 && k !== start) { path.push({ x: k % W + 0.5, z: ((k / W) | 0) + 0.5 }); k = parent[k]; }
  path.reverse();
  t.path = path;
  t.planTimer = rr(1.4, 3.0);
}
function evaluateAim(t) {
  const P = G.player;
  if (!P || !P.alive || P.hidden) { t.hasShot = false; return; }
  const st = t.type, lead = st.lead || 0;
  const tx = P.x, tz = P.z, vx = P.vx, vz = P.vz;
  let best = null;
  const tryAngle = (a) => {
    let res = null;
    traceShot(t.x, t.z, Math.cos(a), Math.sin(a), st.bounces, 26, 0.1, (x, z, d, bn) => {
      const tt = d / st.bspd * lead;
      const ex = tx + vx * tt - x, ez = tz + vz * tt - z;
      if (ex * ex + ez * ez < 0.36 * 0.36) { res = { a, d, bn }; return 1; }
      for (const o of G.tanks) {
        if (!o.alive || o.team !== t.team) continue;
        if (o === t && d < 0.85) continue;
        const fx = o.x - x, fz = o.z - z;
        if (fx * fx + fz * fz < 0.6 * 0.6) return 2;
      }
      return 0;
    });
    if (res) {
      const s = res.d + res.bn * 1.5 + Math.abs(angDiff(a, t.turret)) * 1.3;
      if (!best || s < best.s) { best = res; best.s = s; }
    }
  };
  const direct = Math.atan2(tz - t.z, tx - t.x);
  tryAngle(direct);
  const dist = Math.hypot(tx - t.x, tz - t.z);
  if (lead > 0) { const tt = dist / st.bspd * lead; tryAngle(Math.atan2(tz + vz * tt - t.z, tx + vx * tt - t.x)); }
  const N = st.samples, off = Math.random() * TAU / N;
  for (let i = 0; i < N; i++) tryAngle(off + i * TAU / N);
  if (best && N >= 20) { const a0 = best.a; for (const k of [-0.035, -0.018, 0.018, 0.035]) tryAngle(a0 + k); }
  if (best) { t.hasShot = true; t.aimAngle = best.a + (Math.random() * 2 - 1) * (st.noise + AI_TUNE.noise); }
  else {
    t.hasShot = false;
    t.aimAngle = st.style === 'static' && t.key === 'brown' ? direct + Math.sin(G.playTime * 0.7 + t.idlePhase) * 0.9 : direct;
  }
}
function verifyShot(t) {
  const st = t.type;
  let bad = false;
  traceShot(t.x, t.z, Math.cos(t.turret), Math.sin(t.turret), st.bounces, 12, 0.12, (x, z, d) => {
    for (const o of G.tanks) {
      if (!o.alive || o.team !== t.team) continue;
      if (o === t && d < 0.85) continue;
      if ((o.x - x) ** 2 + (o.z - z) ** 2 < 0.55 * 0.55) { bad = true; return 1; }
    }
    return 0;
  });
  return !bad;
}
function threatDodge(t) {
  let best = null, bestT = 1e9;
  const react = (t.type.react || 0.4) * AI_TUNE.react, chance = (t.type.dodge || 0) * AI_TUNE.dodge;
  if (!t.rolls || t.rolls.size > 48) t.rolls = new Map();
  for (const b of G.bullets) {
    if (!b.alive) continue;
    if (b.owner === t && b.traveled < 1) continue;
    if (b.traveled / b.speed < react) continue;            // not noticed yet
    if (Math.abs(b.x - t.x) + Math.abs(b.z - t.z) > 9) continue;
    let roll = t.rolls.get(b.id);
    if (roll === undefined) { roll = Math.random() < chance; t.rolls.set(b.id, roll); }
    if (!roll) continue;                                    // this shell was not read in time
    const look = Math.min(b.speed * 0.8, 5.5);
    traceShot(b.x, b.z, b.dx, b.dz, b.bounces, look, 0.15, (x, z, d, bn, dx, dz) => {
      const ex = t.x - x, ez = t.z - z;
      if (ex * ex + ez * ez < 0.9 * 0.9) {
        const tt = d / b.speed;
        if (tt < bestT) {
          bestT = tt;
          let side = Math.sign(-dz * ex + dx * ez); if (!side) side = Math.random() < 0.5 ? 1 : -1;
          best = { x: -dz * side, z: dx * side };
        }
        return 1;
      }
      return 0;
    });
  }
  return best;
}
function mineFlee(t) {
  let fx = 0, fz = 0, any = false;
  for (const m of G.mines) {
    if (m.dead) continue;
    const ex = t.x - m.x, ez = t.z - m.z, d = Math.hypot(ex, ez);
    if (d < MINE_R + 0.6) { any = true; const w = 1 / Math.max(0.2, d); fx += (d > 0.01 ? ex / d : rr(-1, 1)) * w; fz += (d > 0.01 ? ez / d : rr(-1, 1)) * w; }
  }
  return any ? { x: fx, z: fz } : null;
}
function updateAI(t, dt) {
  const st = t.type, P = G.player;
  // --- aim & fire
  t.aimTimer -= dt;
  if (t.aimTimer <= 0) { t.aimTimer = rr(0.18, 0.32); evaluateAim(t); }
  const diff = angDiff(t.aimAngle, t.turret), stp = st.turret * dt;
  t.turret += clamp(diff, -stp, stp);
  t.fireCd -= dt;
  if (t.hasShot && Math.abs(angDiff(t.aimAngle, t.turret)) < 0.05 && t.fireCd <= 0 && activeBullets(t) < st.bullets && G.playTime > 0.9 && P && P.alive) {
    if (verifyShot(t)) {
      fire(t);
      t.burst++;
      if (st.reload && t.burst >= st.bullets) { t.burst = 0; t.fireCd = st.reload * AI_TUNE.fire * rr(0.8, 1.3); }
      else t.fireCd = st.fireCd * AI_TUNE.fire * rr(0.85, 1.3);
      t.hasShot = false; t.aimTimer = Math.min(t.aimTimer, 0.1);
    }
  }
  if (st.speed <= 0) return;
  // --- mines
  if (st.mines > 0) {
    t.mineCd -= dt;
    if (t.mineCd <= 0) {
      t.mineCd = rr(0.9, 1.4);
      const pd = P ? Math.hypot(P.x - t.x, P.z - t.z) : 99;
      const p = st.mineRate * (pd < 6 ? 2.2 : 1) * 1.2;
      const friendNear = G.tanks.some(o => o !== t && o.alive && o.team === t.team && Math.hypot(o.x - t.x, o.z - t.z) < 2.6);
      if (Math.random() < p && activeMines(t) < st.mines && !friendNear && !mineDanger(t.x, t.z, 1.6) && G.playTime > 2) { layMine(t); t.path = []; }
    }
  }
  // --- movement
  let mx = 0, mz = 0;
  const flee = mineFlee(t);
  t.dodgeCheck -= dt; t.dodgeCd = (t.dodgeCd || 0) - dt;
  if (t.dodgeCheck <= 0 && t.dodgeCd <= 0 && st.dodge > 0) {
    t.dodgeCheck = 0.1;
    const d = threatDodge(t);
    if (d) { t.dodgeVec = d; t.dodgeTimer = 0.28; t.dodgeCd = 0.75; }
  }
  if (flee) { mx = flee.x; mz = flee.z; t.path = []; }
  else if (t.dodgeTimer > 0) { t.dodgeTimer -= dt; mx = t.dodgeVec.x; mz = t.dodgeVec.z; }
  else {
    t.planTimer -= dt;
    if (t.planTimer <= 0 || (!t.path.length && t.planTimer < 1.0)) planPath(t);
    if (t.path.length) {
      const wp = t.path[0], ex = wp.x - t.x, ez = wp.z - t.z, d = Math.hypot(ex, ez);
      if (d < 0.2) t.path.shift(); else { mx = ex / d; mz = ez / d; }
    }
  }
  drive(t, mx, mz, dt);
  // stuck detection
  t.stuckT += dt;
  if (t.stuckT > 1.0) {
    if (Math.hypot(t.x - t.sx0, t.z - t.sz0) < 0.08 && t.path.length) { t.path = []; t.planTimer = 0; }
    t.stuckT = 0; t.sx0 = t.x; t.sz0 = t.z;
  }
}

// ---------------------------------------------------------------- destruction
// A hit removes one armor point; the last one destroys the tank.
function damageTank(t, killer) {
  if (!t.alive) return;
  if (t.hp > 1) { t.hp--; armorHit(t); vsEv('h', t.slot); return; }
  destroyTank(t, killer);
}
function armorHit(t) {
  t.hitFlash = 0.5; t.reveal = Math.max(t.reveal, 0.8);
  if (t.hp <= 1 && t.m.shield) t.m.shield.visible = false;
  FX.spark(t.x, t.z, 14); FX.pop(t.x, t.z); SFX.ricochet(t.x); shake = Math.max(shake, 0.12);
  spawnDebris(t.x, t.z, [0xf0b93a, 0xc88f1a], 6, 0.7);
}
function destroyTank(t, killer) {
  if (!t.alive) return;
  t.alive = false;
  vsEv('k', t.slot, killer ? killer.slot : -1, r2(t.x), r2(t.z));
  t.m.group.visible = false; t.m.blob.visible = false;
  FX.explosion(t.x, t.z, 1.0);
  const c = t.m.mats[0].color.getHex();
  spawnDebris(t.x, t.z, [c, c, 0x2a2724, 0x8a837a], 14, 1);
  Decals.cross(t.x, t.z);
  Decals.scorch(t.x, t.z, 0.8);
  SFX.boom(t.x, false);
  if (G.mode === 'campaign' && t.team === 'E') {
    G.alive[t.spawn] = false;
    G.kills[t.key] = (G.kills[t.key] || 0) + 1; G.totalKills++;
    updateHUD();
  }
}

// ================================================================ input
const keys = {};
const input = { ndcX: 0.3, ndcY: 0, mode: 'mouse', padAim: null, joy: null, touchAim: null };
let fireQueued = false, mineQueued = false;
addEventListener('keydown', e => {
  const tg = e.target;
  if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
  if (e.repeat && e.code === 'Space') return;
  keys[e.code] = true;
  const inGame = G.state === 'play' || G.state === 'intro' || G.mode === 'versus';
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && inGame) e.preventDefault();
  if (e.code === 'Space' || e.code === 'KeyE') mineQueued = true;
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  if (e.code === 'KeyM') toggleSound();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  if (G.mode === 'campaign' && G.state === 'play') togglePause();
});
const cv = renderer.domElement;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') { handleTouchMove(e); return; }
  input.mode = 'mouse';
  input.ndcX = (e.clientX / innerWidth) * 2 - 1; input.ndcY = -(e.clientY / innerHeight) * 2 + 1;
});
cv.addEventListener('pointerdown', e => {
  SFX.ensure();
  if (e.pointerType === 'touch') { handleTouchStart(e); return; }
  input.mode = 'mouse';
  input.ndcX = (e.clientX / innerWidth) * 2 - 1; input.ndcY = -(e.clientY / innerHeight) * 2 + 1;
  if (e.button === 0) fireQueued = true;
  if (e.button === 2) mineQueued = true;
  cv.focus({ preventScroll: true });
});
cv.addEventListener('pointerup', e => { if (e.pointerType === 'touch') handleTouchEnd(e); });
cv.addEventListener('pointercancel', e => { if (e.pointerType === 'touch') handleTouchEnd(e); });

// touch
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const joyEl = $('joy'), knobEl = $('joyKnob');
function handleTouchStart(e) {
  input.mode = 'touch';
  if (e.clientX < innerWidth * 0.42 && !input.joy) {
    input.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
    joyEl.hidden = false; joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; knobEl.style.transform = '';
  } else {
    input.touchAim = { x: (e.clientX / innerWidth) * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 };
    fireQueued = true;
  }
}
function handleTouchMove(e) {
  const j = input.joy;
  if (j && j.id === e.pointerId) {
    let dx = e.clientX - j.ox, dy = e.clientY - j.oy; const d = Math.hypot(dx, dy), max = 50;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    j.x = dx / max; j.y = dy / max;
    knobEl.style.transform = `translate(${dx}px,${dy}px)`;
  }
}
function handleTouchEnd(e) { const j = input.joy; if (j && j.id === e.pointerId) { input.joy = null; joyEl.hidden = true; } }
$('mineBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); SFX.ensure(); mineQueued = true; });

// gamepad
const padPrev = {};
let PADS = [], padsBlocked = false;
function safeGamepads() {
  if (padsBlocked || !navigator.getGamepads) return [];
  try { return [...navigator.getGamepads()]; } catch (e) { padsBlocked = true; return []; }
}
function readPads() {
  const out = [];
  const pads = safeGamepads();
  for (const p of pads) {
    if (!p || !p.connected) continue;
    const prev = padPrev[p.index] || (padPrev[p.index] = {});
    const btn = i => !!(p.buttons[i] && p.buttons[i].pressed);
    const edge = i => { const now = btn(i), was = prev[i]; prev[i] = now; return now && !was; };
    const ax = p.axes;
    const aim = ax.length >= 4 && Math.hypot(ax[2], ax[3]) > 0.35 ? [ax[2], ax[3]] : null;
    const fire = edge(7) | edge(5), mine = edge(6) | edge(0) | edge(4), start = edge(9);
    out[p.index] = { mx: Math.abs(ax[0]) > 0.18 ? ax[0] : 0, mz: Math.abs(ax[1]) > 0.18 ? ax[1] : 0, aim, fire: !!fire, mine: !!mine, start };
  }
  return out;
}

// ================================================================ camera fit
const camTarget = new THREE.Vector3();
let camDist = 30, camIntro = 0;
const camOff = { x: 0, z: 1 }; // horizontal direction from target to camera
function screenToBoard(sx, sy) { const fx = -camOff.x, fz = -camOff.z; return { x: -fz * sx - fx * sy, z: fx * sx - fz * sy }; }
const PITCH = THREE.MathUtils.degToRad(60);
// Render resolution: screen size × pixel density, capped to the quality budget, then scaled by
// the automatic adjustment. The canvas is stretched back to full screen by CSS.
const _resV = new THREE.Vector2();
function applyResolution() {
  const q = QUALITY[qTier], w = innerWidth, h = innerHeight;
  let pr = Math.min(window.devicePixelRatio || 1, q.maxDpr);
  if (w * h * pr * pr > q.budget) pr = Math.sqrt(q.budget / (w * h));
  pr = Math.max(0.35, pr * dynScale);
  const cur = renderer.getSize(_resV);
  if (Math.abs(renderer.getPixelRatio() - pr) > 0.005 || cur.x !== w || cur.y !== h) {
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
  }
  updatePerfInfo();
  smokeFX.mat.uniforms.scale.value = fireFX.mat.uniforms.scale.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
}
function applyQuality() {
  const q = QUALITY[qTier];
  FXQ = q.fx;
  const on = q.shadows > 0, type = q.shadows === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  if (renderer.shadowMap.enabled !== on || renderer.shadowMap.type !== type) {
    renderer.shadowMap.enabled = on; renderer.shadowMap.type = type;
    scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
  }
  if (sun.shadow.mapSize.x !== q.shadowSize) {
    sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  sun.shadow.radius = q.shadows === 2 ? 3 : 1;
  applyResolution();
}
// Auto mode: measure frames per second and lower the render resolution, then the quality tier,
// while the game runs too slowly. If lowering the resolution does not help (the screen refresh rate
// or the CPU is the limit), go back and stop trying for a while.
const perf = { acc: 0, frames: 0, fps: 0, slow: 0, fast: 0, pending: false, before: 0, lockedUntil: 0 };
function perfTick(raw, now) {
  if (raw > 0.5 || document.hidden) { perf.acc = 0; perf.frames = 0; return; }
  perf.acc += raw; perf.frames++;
  if (perf.acc < 1) return;
  perf.fps = perf.frames / perf.acc; perf.acc = 0; perf.frames = 0;
  if (!$('pauseScreen').hidden) updatePerfInfo();
  if (qualityPref !== 'auto' || now < perf.lockedUntil) return;
  if (perf.pending) {
    perf.pending = false;
    if (perf.fps < perf.before * 1.05) { dynScale = Math.min(1, dynScale / 0.85); applyResolution(); perf.lockedUntil = now + 60000; return; }
  }
  if (perf.fps < 45) { perf.slow++; perf.fast = 0; }
  else if (perf.fps > 56) { perf.fast++; perf.slow = 0; }
  else { perf.slow = 0; perf.fast = 0; }
  if (perf.slow >= 2) {
    perf.slow = 0;
    if (dynScale > 0.62) { perf.before = perf.fps; dynScale *= 0.85; perf.pending = true; applyResolution(); }
    else if (qTier !== 'low') { qTier = qTier === 'high' ? 'medium' : 'low'; dynScale = 1; applyQuality(); }
  } else if (perf.fast >= 8 && dynScale < 1) {
    perf.fast = 0; dynScale = Math.min(1, dynScale / 0.9); applyResolution();
  }
}
function setQuality(v) {
  qualityPref = v; store.set('quality', v);
  qTier = v === 'auto' ? autoTier() : v;
  dynScale = 1; perf.lockedUntil = 0; perf.pending = false; perf.slow = perf.fast = 0;
  applyQuality(); syncQualityUI();
}
function syncQualityUI() {
  for (const id of ['qualitySeg', 'qualitySeg2']) {
    const el = $(id); if (!el) continue;
    for (const b of el.querySelectorAll('button')) { const on = b.dataset.v === qualityPref; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }
  updatePerfInfo();
}
function updatePerfInfo() {
  const el = $('perfInfo'); if (!el) return;
  const c = renderer.domElement;
  el.textContent = `${tr('perf.render', { w: c.width, h: c.height })} · ${tr('q.' + qTier).toLowerCase()}${qualityPref === 'auto' ? ' (auto)' : ''}${perf.fps ? ` · ${tr('perf.fps', { n: Math.round(perf.fps) })}` : ''}${GL_INFO.soft ? ` · ${tr('perf.soft')}` : ''}`;
}

function fitCamera() {
  const w = innerWidth, h = innerHeight;
  applyResolution();
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const corners = [];
  // fit the arena, but never zoom in past a mid-size board so small arenas keep the same scale feel
  const fw = Math.max(W, 19) / 2 + 1, fh = Math.max(H, 14) / 2 + 1;
  for (const x of [-fw, fw]) for (const z of [-fh, fh]) for (const y of [0, 1]) corners.push(new THREE.Vector3(x, y, z));
  const portrait = w / h < 0.9;
  camOff.x = portrait ? -1 : 0; camOff.z = portrait ? 0 : 1;
  const topLimit = portrait ? 0.8 : 0.84, botLimit = portrait ? -0.82 : -0.96, side = 0.97;
  let tz = 0.4;
  const place = (d, tzz) => {
    camTarget.set(-camOff.x * tzz, 0, camOff.z * tzz);
    camera.position.set(camTarget.x + camOff.x * Math.cos(PITCH) * d, Math.sin(PITCH) * d, camTarget.z + camOff.z * Math.cos(PITCH) * d);
    camera.lookAt(camTarget); camera.updateMatrixWorld();
  };
  const measure = () => {
    let minX = 9, maxX = -9, minY = 9, maxY = -9;
    for (const c of corners) { const p = c.clone().project(camera); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    return { minX, maxX, minY, maxY };
  };
  for (let pass = 0; pass < 3; pass++) {
    let lo = 5, hi = 300;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2; place(mid, tz); const m = measure();
      const fits = m.minX >= -side && m.maxX <= side && (m.maxY - m.minY) <= (topLimit - botLimit);
      if (fits) hi = mid; else lo = mid;
    }
    camDist = hi; place(camDist, tz);
    const m = measure();
    const mid = (m.maxY + m.minY) / 2, want = (topLimit + botLimit) / 2;
    tz += (mid - want) * camDist * 0.18;
  }
  place(camDist, tz);
  scene.fog.near = camDist + 8; scene.fog.far = camDist + 45;
  camera.far = camDist + 120; camera.updateProjectionMatrix();
}
addEventListener('resize', () => { const was = camOff.x; fitCamera(); if (was !== camOff.x && G.level) { const keep = new Uint8Array(G.grid); buildLevel({ grid: keep, w: W, h: H }); } });

const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.46);
const _hit = new THREE.Vector3();
function ndcToWorld(x, y) {
  raycaster.setFromCamera({ x, y }, camera);
  if (raycaster.ray.intersectPlane(aimPlane, _hit)) return { x: _hit.x + W / 2, z: _hit.z + H / 2 };
  return null;
}

// ================================================================ HUD & screens
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function updateHUD() {
  if (G.mode === 'versus') {
    $('hudLeft').innerHTML = `<div class="plate"><span class="lbl">${tr('hud.round')}</span><span class="num">${pad2(Math.max(0, VS.round))}</span><span class="lbl sub">${tr('hud.to', { n: VS.target })}</span></div>`;
    $('hudRight').innerHTML = VS.players.map(p => `<div class="plate${p.gone ? ' gone' : ''}" title="${esc(p.nick)}">${tankIcon(pColor(p), 28)}<span class="pn">${esc(p.nick)}</span><span class="num">${p.score}</span></div>`).join('');
    return;
  }
  const left = G.tanks.filter(t => t.team === 'E' && t.alive).length;
  $('hudLeft').innerHTML = `<div class="plate"><span class="lbl">${tr('hud.mission')}</span><span class="num">${pad2(G.mission)}</span></div>`;
  $('hudRight').innerHTML = `<div class="plate" title="${esc(tr('hud.enemiesLeft'))}">${tankIcon(0x8d5a30, 30)}<span class="num">${left}</span></div>`
    + `<div class="plate" title="${esc(tr('hud.reserve'))}">${tankIcon(TYPES.player.color, 30)}<span class="x">×</span><span class="num">${G.lives}</span></div>`;
}
function typeCounts(list) {
  const counts = {};
  for (const e of list) counts[e] = (counts[e] || 0) + 1;
  return TYPE_ORDER.filter(t => counts[t]).map(t => `<span title="${esc(typeName(t))}">${tankIcon(TYPES[t].color, 34)}×${counts[t]}</span>`).join('');
}
let bannerTimer = null;
function showBanner(eyebrow, title, sub, icons = '') {
  $('bEyebrow').textContent = eyebrow; $('bTitle').textContent = title; $('bSub').innerHTML = sub; $('bIcons').innerHTML = icons;
  const r = $('ribbon'); r.style.animation = 'none'; void r.offsetWidth; r.style.animation = '';
  $('banner').hidden = false;
}
function hideBanner() { $('banner').hidden = true; }
const SCREENS = ['titleScreen', 'pauseScreen', 'overScreen', 'onlineScreen', 'roomScreen', 'vsOverScreen', 'mapScreen', 'garageScreen'];
function showScreen(id) { for (const s of SCREENS) $(s).hidden = s !== id; }
function setupPreview() { G.mode = 'campaign'; loadMission(1, false); G.state = 'title'; }
function setSoundLabels() { const l = tr(SFX.muted ? 'sound.off' : 'sound.on'); $('soundBtn').textContent = l; $('soundBtn2').textContent = l; }
function toggleSound() { SFX.ensure(); SFX.toggleMute(); setSoundLabels(); }

function buildTitle() {
  const keysList = isTouch && !matchMedia('(pointer: fine)').matches ? [
    ['key.joy', 'act.move'], ['key.tap', 'act.aimFire'], ['key.mineBtn', 'act.mine']
  ] : [
    ['key.move', 'act.move'], ['key.mouse', 'act.aim'], ['key.lclick', 'act.fire'], ['key.rclick', 'act.mine'], ['key.pause', 'act.pause'], ['key.mute', 'act.mute'], ['key.pad', 'act.pad']
  ];
  $('keysList').innerHTML = keysList.map(([k, v]) => `<kbd>${esc(tr(k))}</kbd><span>${esc(tr(v))}</span>`).join('');
  $('roster').innerHTML = TYPE_ORDER.map(t => `<div class="unit">${tankIcon(TYPES[t].color, 32)}<div><b>${esc(typeName(t))}</b><small>${esc(typeDesc(t))} · ${tr('roster.mission', { n: UNLOCK[t] })}</small></div></div>`).join('');
  const best = G.best;
  $('playBtn').textContent = best > 1 ? tr('btn.continue', { n: Math.min(best, 100) }) : tr('btn.play');
  setSoundLabels();
}

// ================================================================ mission flow
function clearEntities() {
  for (const t of G.tanks) t.dispose();
  G.tanks = []; G.player = null;
  for (const b of G.bullets) b.mesh.visible = false; G.bullets = [];
  for (const m of G.mines) m.mesh.group.visible = false; G.mines = [];
  smokeFX.clear(); fireFX.clear(); debris.length = 0; updateDebris(0);
  for (const b of VS.gb.values()) b.mesh.visible = false; VS.gb.clear();
  for (const m of VS.gm.values()) m.mesh.group.visible = false; VS.gm.clear();
}
function loadMission(m, retry) {
  clearEntities();
  G.mission = m;
  const L = getLevel(m);
  G.level = L;
  buildLevel(L);
  Decals.clear();
  if (!retry) G.alive = L.enemies.map(() => true);
  L.enemies.forEach((e, i) => { if (!G.alive[i]) Decals.cross(e.x, e.z); });
  G.player = new Tank('player', L.player.x, L.player.z, 'P', -1);
  G.tanks.push(G.player);
  L.enemies.forEach((e, i) => { if (G.alive[i]) G.tanks.push(new Tank(e.type, e.x, e.z, 'E', i)); });
  // face the player initially
  for (const t of G.tanks) { if (t.team === 'E') { t.turret = t.aimAngle = Math.atan2(G.player.z - t.z, G.player.x - t.x); } t.lastX = t.x; t.lastZ = t.z; t.sx0 = t.x; t.sz0 = t.z; t.sync(0); }
  G.player.turret = Math.atan2(H / 2 - G.player.z, W / 2 - G.player.x);
  G.invuln = false; G.playTime = 0;
  updateHUD();
}
function enemyTypesAlive() { return G.tanks.filter(t => t.team === 'E' && t.alive).map(t => t.key); }
function musicLayers() {
  const ks = new Set(enemyTypesAlive());
  return { wood: ['teal', 'yellow', 'red', 'green', 'purple', 'white', 'black'].some(k => ks.has(k)), brass: ['red', 'green', 'purple', 'white', 'black'].some(k => ks.has(k)), tension: ks.has('white') || ks.has('black') };
}
function startIntro(retry) {
  G.state = 'intro'; G.timer = retry ? 1.6 : 2.1; camIntro = 1;
  const list = enemyTypesAlive();
  showBanner(tr('banner.mission'), pad2(G.mission), tr('banner.enemies', { n: list.length }) + (retry ? tr('banner.reserve', { n: G.lives }) : ''), typeCounts(list));
  $('hud').hidden = false;
  SFX.stopMusic(); SFX.jStart();
}
function releaseFocus() { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); cv.focus({ preventScroll: true }); }
function beginPlay() {
  G.state = 'play'; G.playTime = 0; hideBanner(); releaseFocus();
  for (const t of G.tanks) if (t.type.invisible && t.alive) { t.fade = 0.7; FX.sparkle(t.x, t.z); }
  if (G.tanks.some(t => t.type.invisible && t.alive)) SFX.vanish();
  SFX.music(musicLayers());
}
function startGame(m) {
  SFX.ensure();
  G.lives = 3; G.kills = {}; G.totalKills = 0;
  showScreen(null);
  $('touch').hidden = !isTouch;
  loadMission(m, false);
  startIntro(false);
}
function onCleared() {
  G.state = 'cleared'; G.timer = 2.3; G.invuln = true;
  SFX.stopMusic(); SFX.jClear();
  let sub = tr('banner.clearedSub');
  if (G.mission % 5 === 0 && G.mission < 100) { G.lives++; sub = tr('banner.bonus'); updateHUD(); }
  if (G.mission === 20) sub += tr('banner.first20');
  showBanner(tr('banner.mission') + ' ' + pad2(G.mission), tr('banner.cleared'), sub);
  if (G.mission + 1 > G.best && G.mission < 100) { G.best = G.mission + 1; store.set('best', G.best); }
}
function onDeath() {
  G.state = 'dead'; G.timer = 2.1;
  SFX.stopMusic();
  setTimeout(() => { if (G.state === 'dead') SFX.jLose(); }, 500);
}
function gameOver(win) {
  G.state = 'over';
  hideBanner(); $('hud').hidden = true; $('touch').hidden = true;
  SFX.stopMusic(); win ? SFX.jWin() : SFX.jOver();
  $('overTitle').textContent = win ? tr('over.win') : tr('over.title');
  $('overMission').textContent = G.mission;
  $('overKills').textContent = G.totalKills;
  $('overBest').textContent = G.best;
  $('overStats').innerHTML = TYPE_ORDER.filter(t => G.kills[t]).map(t => `<div class="stat">${tankIcon(TYPES[t].color, 34)}<span>${G.kills[t]}</span></div>`).join('') || `<div class="stat">${tr('over.none')}</div>`;
  $('retryBtn').textContent = win ? tr('over.replay100') : tr('over.retry', { n: G.mission });
  showScreen('overScreen');
}
function togglePause() {
  if (G.mode === 'versus') {
    if (!$('pauseScreen').hidden) {
      showScreen(null);
      if (VS.phase === 'play') releaseFocus();
      return;
    }
    if (VS.phase === 'matchEnd' || !$('vsOverScreen').hidden) return;
    $('pauseInfo').textContent = tr('pause.online', { code: Net.code.toUpperCase() });
    $('quitBtn').textContent = tr('btn.quitGame');
    setSoundLabels();
    showScreen('pauseScreen'); updatePerfInfo();
    return;
  }
  $('quitBtn').textContent = tr('btn.menu');
  if (G.state === 'play' || G.state === 'intro') {
    G.prevState = G.state; G.state = 'pause'; SFX.stopMusic();
    $('pauseInfo').textContent = tr('pause.info', { m: G.mission, e: G.tanks.filter(x => x.team === 'E' && x.alive).length, l: G.lives });
    setSoundLabels();
    showScreen('pauseScreen'); updatePerfInfo();
  } else if (G.state === 'pause') {
    G.state = G.prevState; showScreen(null);
    if (G.state === 'play') SFX.music(musicLayers());
    releaseFocus();
  }
}
function toMenu() {
  if (Net.game) Net.leaveGame();
  VS.inGame = false; VS.paused = false; VS.phase = 'idle';
  for (const b of VS.gb.values()) b.mesh.visible = false; VS.gb.clear();
  for (const m of VS.gm.values()) m.mesh.group.visible = false; VS.gm.clear();
  G.mode = 'campaign';
  G.state = 'title'; SFX.stopMusic(); hideBanner(); $('hud').hidden = true; $('touch').hidden = true;
  loadMission(1, false);
  buildTitle(); showScreen('titleScreen');
}

$('playBtn').addEventListener('click', openMap);
$('soundBtn').addEventListener('click', toggleSound);
$('soundBtn2').addEventListener('click', toggleSound);
$('resumeBtn').addEventListener('click', togglePause);
$('quitBtn').addEventListener('click', toMenu);
$('pauseBtn').addEventListener('click', () => { SFX.ensure(); togglePause(); });
$('retryBtn').addEventListener('click', () => startGame(Math.min(G.mission, 100)));
$('restartBtn').addEventListener('click', openMap);
$('menuBtn').addEventListener('click', toMenu);
$('onlineBtn').addEventListener('click', () => { SFX.ensure(); openOnline(); });
$('onlineBack').addEventListener('click', () => { buildTitle(); showScreen('titleScreen'); });
$('hostBtn').addEventListener('click', () => { SFX.ensure(); Net.settings.mode = segValue('modeSeg') || 'duel'; Net.settings.target = +segValue('winSeg') || 5; Net.host(); });
$('joinBtn').addEventListener('click', () => { SFX.ensure(); Net.join($('codeInput').value); });
$('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') { SFX.ensure(); Net.join($('codeInput').value); } });
$('nickInput').addEventListener('change', () => { Net.setNick($('nickInput').value); $('nickInput').value = Net.nick(); });
$('startBtn').addEventListener('click', hostStart);
$('roomLeave').addEventListener('click', () => { Net.leaveGame(); openOnline(); });
$('copyCode').addEventListener('click', () => {
  const code = Net.code.toUpperCase();
  try { navigator.clipboard.writeText(code).then(() => toast(tr('toast.copied', { code })), () => toast(tr('toast.code', { code }))); } catch (e) { toast(tr('toast.code', { code })); }
});
$('vsAgain').addEventListener('click', () => {
  if (VS.role === 'host') { VS.players = VS.players.filter(p => !p.gone); VS.players.forEach((p, i) => { p.slot = i; }); }
  vsStartMatch();
});
$('vsLobby').addEventListener('click', hostBackToRoom);
$('vsQuit').addEventListener('click', toMenu);
wireSeg('modeSeg'); wireSeg('winSeg');
wireSeg('qualitySeg', setQuality); wireSeg('qualitySeg2', setQuality);
// language: every text comes from js/i18n.js; switching re-renders whatever is on screen
function syncLangUI() {
  for (const b of $('langSeg').querySelectorAll('button')) { const on = b.dataset.v === LANG; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
}
function setLang(l) {
  if (l !== 'fr' && l !== 'en') return;
  LANG = l; store.set('lang', l);
  applyStaticText(); syncLangUI();
  buildTitle(); setSoundLabels(); syncQualityUI(); updateHUD(); renderTankSummaries();
  renderOnline(); renderRoom();
  if (!$('mapScreen').hidden) renderMap();
  if (!$('garageScreen').hidden) renderGarage();
}
wireSeg('langSeg', setLang);
applyStaticText(); syncLangUI();
syncQualityUI();

// ================================================================ versus (online)
const pColor = p => (p && Number.isFinite(p.col) ? p.col : TANK_COLORS[(p && p.slot) | 0]);
function pvpLevel(idx) {
  const def = PVP_MAPS[((idx % PVP_MAPS.length) + PVP_MAPS.length) % PVP_MAPS.length];
  const swap = { '1': '2', '3': '4' };
  const rows = [...def.top];
  for (let k = def.top.length - 2; k >= 0; k--) rows.push(def.top[k].split('').reverse().map(c => swap[c] || c).join(''));
  const w = rows[0].length, h = rows.length;
  const grid = new Uint8Array(w * h), spawns = [];
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const c = rows[z][x]; let v = 0;
    if (c === '#') v = 1; else if (c === 'H') v = 2; else if (c === 'p') v = 3; else if (c === 'o') v = 4;
    else if ('1234'.includes(c)) spawns[+c - 1] = { x: x + 0.5, z: z + 0.5 };
    grid[z * w + x] = v;
  }
  return { grid, w, h, spawns, name: def.name };
}

const VS = {
  role: 'host', mode: 'duel', target: 5, players: [], round: 0, mapIdx: 0, mapBase: 0, matchId: 0,
  phase: 'idle', timer: 0, settle: 0, roundWinner: -1, matchWinner: -1, paused: false,
  evLog: [], eid: 0, lastEid: -1, tick: 0, pubAcc: 0, mySlot: -1, fireCount: 0, mineCount: 0,
  gb: new Map(), gm: new Map(), lastPres: null, hostMissing: 0, aimTank: null, inGame: false
};
let nextBulletId = 1, nextMineId = 1;
function vsEv(...a) {
  if (G.mode !== 'versus' || VS.role !== 'host') return;
  VS.evLog.push([++VS.eid, ...a]);
  if (VS.evLog.length > 24) VS.evLog.shift();
}
const vsPlayer = slot => VS.players.find(p => p.slot === slot);
const isMine = p => (VS.role === 'guest' ? p.slot === VS.mySlot : !!p.dev);
function scoreLine() { return VS.players.map(p => `${esc(p.nick)} <b>${p.score}</b>`).join(' &nbsp;·&nbsp; '); }
function vsIcons() { return VS.players.filter(p => !p.gone).map(p => `<span>${tankIcon(pColor(p), 34)}${esc(p.nick)}</span>`).join(''); }
function mineBlast(x, z) {
  FX.explosion(x, z, 1.5); Decals.scorch(x, z, 1.6); SFX.boom(x, true); shake = Math.max(shake, 0.32);
}
function tryLayMine(t) {
  if (activeMines(t) < t.type.mines && !G.mines.some(m => !m.dead && Math.hypot(m.x - t.x, m.z - t.z) < 0.7)) layMine(t);
}
function spawnTrail(x, z, dx, dz, rocket) {
  const tx = x - dx * 0.16, tz = z - dz * 0.16;
  if (rocket) {
    smokeFX.spawn(wx(tx), 0.46, wz(tz), rr(-0.1, 0.1), rr(0.1, 0.3), rr(-0.1, 0.1), rr(0.7, 1.0), 0.16, 0.5, 0.75, 0.72, 0.68, 0.55, 0, 1.2, -0.05);
    fireFX.spawn(wx(tx), 0.46, wz(tz), -dx * 0.8, 0, -dz * 0.8, 0.14, 0.3, 0.06, 1, 0.65, 0.2, 0.95, 0, 0, 0, 1, 0.3, 0.05);
  } else {
    smokeFX.spawn(wx(tx), 0.46, wz(tz), rr(-0.05, 0.05), rr(0.05, 0.2), rr(-0.05, 0.05), rr(0.5, 0.75), 0.11, 0.34, 0.95, 0.94, 0.9, 0.42, 0, 1.2, -0.04);
  }
}

// --- one round: arena + tanks
function setupRound() {
  clearEntities();
  const L = pvpLevel(VS.mapIdx);
  G.level = L;
  buildLevel(L);
  Decals.clear();
  G.invuln = false;
  VS.aimTank = null; G.player = null; VS.settle = 0;
  for (const p of VS.players) {
    p.tank = null; p.lastF = null; p.lastM = null;
    if (p.gone) continue;
    const s = L.spawns[p.slot];
    const t = new Tank('pvp_' + pvpClass(p.cls).id, s.x, s.z, 'P' + p.slot, -1, p.col);
    t.slot = p.slot;
    t.localView = !!p.dev || (VS.role === 'guest' && p.slot === VS.mySlot);
    t.body = t.turret = Math.atan2(H / 2 - s.z, W / 2 - s.x);
    t.smooth = VS.role === 'host' ? !p.dev : VS.role === 'guest' ? p.slot !== VS.mySlot : false;
    t.resetDisplay();
    t.lastX = t.x; t.lastZ = t.z; t.sx0 = t.x; t.sz0 = t.z;
    p.tank = t; G.tanks.push(t);
    if (p.dev || (VS.role === 'guest' && p.slot === VS.mySlot)) { VS.aimTank = t; G.player = t; }
    t.sync(0);
  }
  updateHUD();
}

// --- authority side (online host)
function vsStartMatch() {
  for (const p of VS.players) p.score = 0;
  VS.round = 0; VS.matchId++; VS.mapBase = Math.floor(Math.random() * PVP_MAPS.length);
  VS.matchWinner = -1; VS.roundWinner = -1; VS.evLog = []; VS.paused = false; VS.inGame = true;
  G.mode = 'versus'; G.state = 'versus';
  showScreen(null); $('hud').hidden = false; $('touch').hidden = !isTouch;
  vsNextRound();
}
function vsNextRound() {
  VS.round++;
  VS.mapIdx = (VS.mapBase + VS.round - 1) % PVP_MAPS.length;
  setupRound();
  vsSetPhase('countdown', 2.0);
}
function vsSetPhase(ph, t) { VS.phase = ph; VS.timer = t || 0; onVsPhase(); syncBackgroundTicker(); }
function onVsPhase() {
  const ph = VS.phase;
  if (ph === 'countdown') {
    if (!$('vsOverScreen').hidden) showScreen(null);
    const arena = PVP_MAPS[VS.mapIdx].name;
    showBanner(tn('vs.firstTo', VS.target), tr('vs.round', { n: VS.round }), tr('vs.arena', { name: tr('arena.' + arena, null, arena) }), vsIcons());
    SFX.stopMusic(); SFX.jStart();
  } else if (ph === 'play') {
    hideBanner();
    if ($('pauseScreen').hidden) releaseFocus();
    SFX.music({ wood: true, brass: true, tension: VS.players.length > 2 });
  } else if (ph === 'roundEnd') {
    SFX.stopMusic();
    const w = vsPlayer(VS.roundWinner);
    showBanner(tr('vs.round', { n: VS.round }), w ? tr('vs.wins', { name: w.nick }) : tr('vs.draw'), scoreLine());
    if (w && isMine(w)) SFX.jClear(); else SFX.jLose();
  } else if (ph === 'matchEnd') {
    hideBanner(); SFX.stopMusic(); SFX.jWin();
    showVsOver();
  }
  updateHUD();
}
function readLocal(t, dt) {
  let mx = 0, mz = 0, fireNow = false, mineNow = false;
  if (keys.KeyW || keys.ArrowUp) mz -= 1;
  if (keys.KeyS || keys.ArrowDown) mz += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (input.joy) { mx += input.joy.x; mz += input.joy.y; }
  const pad = PADS.find(Boolean);
  if (pad) {
    mx += pad.mx; mz += pad.mz;
    if (pad.aim) { input.mode = 'pad'; input.padAim = pad.aim; }
    if (pad.fire) fireNow = true;
    if (pad.mine) mineNow = true;
  }
  if (fireQueued) { fireNow = true; fireQueued = false; }
  if (mineQueued) { mineNow = true; mineQueued = false; }
  if (input.mode === 'mouse') { const p = ndcToWorld(input.ndcX, input.ndcY); if (p) t.turret = Math.atan2(p.z - t.z, p.x - t.x); }
  else if (input.mode === 'pad' && input.padAim) { const v = screenToBoard(input.padAim[0], input.padAim[1]); t.turret = Math.atan2(v.z, v.x); }
  else if (input.mode === 'touch' && input.touchAim) { const p = ndcToWorld(input.touchAim.x, input.touchAim.y); if (p) t.turret = Math.atan2(p.z - t.z, p.x - t.x); }
  const bd = screenToBoard(mx, mz);
  drive(t, bd.x, bd.z, dt);
  return { fire: fireNow, mine: mineNow };
}
function applyRemoteInputs() {
  const peers = Net.game ? Net.game.peers() : [];
  for (const p of VS.players) {
    if (p.dev || p.gone || !p.tank) continue;
    const peer = peers.find(x => x.peer === p.peer);
    const pres = peer && peer.presence, inp = pres && pres.inp;
    if (!inp || pres.r !== VS.round || pres.mi !== VS.matchId) continue;
    const t = p.tank, f = inp.f | 0, m = inp.m | 0;
    if (p.lastF == null) { p.lastF = f; p.lastM = m; }
    if (!t.alive) { p.lastF = f; p.lastM = m; continue; }
    if (Number.isFinite(inp.x) && Number.isFinite(inp.z)) { t.x = clamp(inp.x, 0.4, W - 0.4); t.z = clamp(inp.z, 0.4, H - 0.4); }
    if (Number.isFinite(inp.b)) t.body = inp.b;
    if (Number.isFinite(inp.t)) t.turret = inp.t;
    collideTank(t);
    if (f > p.lastF) { p.pend = Math.min(2, (p.pend || 0) + f - p.lastF); p.lastF = f; }
    if (m > p.lastM) { p.lastM = m; tryLayMine(t); }
  }
}
function vsUpdateAuthority(dt) {
  if (VS.phase === 'countdown') { VS.timer -= dt; if (VS.timer <= 0) vsSetPhase('play'); }
  else if (VS.phase === 'roundEnd') {
    VS.timer -= dt;
    if (VS.timer <= 0) {
      const champ = VS.players.find(p => p.score >= VS.target);
      if (champ) { VS.matchWinner = champ.slot; vsSetPhase('matchEnd'); } else vsNextRound();
    }
  }
  for (const t of G.tanks) { t.lastX = t.x; t.lastZ = t.z; t.shotCd = Math.max(0, t.shotCd - dt); }
  if (VS.phase === 'play') {
    for (const p of VS.players) {
      const t = p.tank;
      if (!p.dev || !t || !t.alive) continue;
      const a = readLocal(t, dt);
      if (a.fire && t.shotCd <= 0 && activeBullets(t) < t.type.bullets) fire(t);
      if (a.mine) tryLayMine(t);
    }
    if (VS.role === 'host') applyRemoteInputs();
    for (const p of VS.players) {
      const t = p.tank;
      if (!t || !t.alive || !p.pend) continue;
      if (t.shotCd <= 0.05 && activeBullets(t) < t.type.bullets) { p.pend--; fire(t); }
      else if (activeBullets(t) >= t.type.bullets) p.pend = 0;
    }
  } else { fireQueued = mineQueued = false; }
  for (const t of G.tanks) if (t.alive) collideTank(t);
  separateTanks();
  for (const t of G.tanks) if (t.alive) stampTracks(t);
  if (VS.phase === 'play' || VS.phase === 'roundEnd') { updateBullets(dt); updateMines(dt); }
  for (const t of G.tanks) if (t.alive) t.sync(dt);
  if (VS.phase === 'play') {
    const active = VS.players.filter(p => !p.gone);
    if (VS.role === 'host' && active.length < 2) {
      VS.matchWinner = active.length ? active[0].slot : -1; vsSetPhase('matchEnd');
    } else {
      const alive = active.filter(p => p.tank && p.tank.alive);
      if (alive.length <= 1) {
        VS.settle += dt;
        if (VS.settle > 0.8) {
          const w = alive.length === 1 ? alive[0] : null;
          VS.roundWinner = w ? w.slot : -1;
          if (w) w.score++;
          vsSetPhase('roundEnd', 2.5);
        }
      } else VS.settle = 0;
    }
  }
  if (VS.role === 'host') { VS.pubAcc += dt; if (VS.pubAcc >= 0.05) { VS.pubAcc = 0; Net.publishMatch(); } }
}
function buildSnap() {
  return {
    k: ++VS.tick,
    T: VS.players.filter(p => p.tank).map(p => [p.slot, r2(p.tank.x), r2(p.tank.z), r2(p.tank.body), r2(p.tank.turret), p.tank.alive ? 1 : 0]),
    B: G.bullets.filter(b => b.alive).map(b => [b.id, r2(b.x), r2(b.z), r2(b.dx), r2(b.dz), b.rocket ? 1 : 0, b.owner.slot]),
    M: G.mines.filter(m => !m.dead).map(m => [m.id, r2(m.x), r2(m.z), Math.round((m.fuse - m.age) * 10)]),
    E: VS.evLog.slice()
  };
}

// --- guest side (online, not the host)
function enterGuestGame() {
  G.mode = 'versus'; G.state = 'versus'; VS.role = 'guest'; VS.inGame = true; VS.paused = false;
  VS.lastEid = -1; VS.round = -1; VS.matchIdSeen = -1; VS.phase = '';
  showScreen(null); $('hud').hidden = false; $('touch').hidden = !isTouch;
}
function syncPlayers(pl) {
  const old = new Map(VS.players.map(p => [p.slot, p]));
  VS.players = pl.map(([slot, nick, score, gone, peer, cls, col]) => {
    const p = old.get(slot) || { slot, tank: null };
    p.nick = cleanNick(nick); p.score = score | 0; p.gone = !!gone; p.peer = peer; p.dev = null;
    p.cls = pvpClass(cls).id; p.col = Number.isFinite(col) ? col : classColor(p.cls);
    return p;
  });
  VS.mySlot = -1;
  for (const p of VS.players) if (p.peer && p.peer === Net.myPeer) VS.mySlot = p.slot;
  for (const p of VS.players) if (p.gone && p.tank && p.tank.alive) destroyTank(p.tank);
}
function guestApply(pres) {
  const m = pres && pres.match;
  if (!m) {
    if (VS.inGame) leaveVersusToRoom();
    renderRoom();
    return;
  }
  if (!Array.isArray(m.pl)) return;
  VS.target = m.tg | 0; VS.mode = m.md === 'ffa' ? 'ffa' : 'duel';
  syncPlayers(m.pl);
  if (!VS.inGame) enterGuestGame();
  if (m.rd !== VS.round || m.mp !== VS.mapIdx || m.mi !== VS.matchIdSeen) {
    VS.round = m.rd; VS.mapIdx = m.mp | 0; VS.matchIdSeen = m.mi; VS.matchId = m.mi;
    setupRound(); VS.phase = '';
  }
  VS.roundWinner = m.rw; VS.matchWinner = m.mw;
  if (m.ph !== VS.phase) { VS.phase = m.ph; onVsPhase(); }
  else updateHUD();
  if (pres.snap) guestSnap(pres.snap);
}
function guestEvent(ev) {
  const [, ty, a, b, c, d, e] = ev;
  if (ty === 's') { if (e !== VS.mySlot) { FX.muzzle(a, b, c, !!d); SFX.shot(a, !!d); const p = vsPlayer(e); if (p && p.tank) { p.tank.recoil = 1; p.tank.reveal = 1.3; } } }
  else if (ty === 'h') { const p = vsPlayer(a); if (p && p.tank && p.tank.alive && p.tank.hp > 1) { p.tank.hp--; armorHit(p.tank); } }
  else if (ty === 'r') { FX.spark(a, b); SFX.ricochet(a); }
  else if (ty === 'p') { FX.pop(a, b); SFX.pop(a); }
  else if (ty === 'm') mineBlast(a, b);
  else if (ty === 'k') { const p = vsPlayer(a); if (p && p.tank && p.tank.alive) { p.tank.x = c; p.tank.z = d; p.tank.rx = c; p.tank.rz = d; destroyTank(p.tank); } }
  else if (ty === 'b') breakPink(a | 0, b | 0);
  else if (ty === 'l') SFX.mineLay(a);
}
function guestSnap(s) {
  const now = performance.now() / 1000;
  if (Array.isArray(s.E)) {
    if (VS.lastEid < 0) VS.lastEid = s.E.length ? s.E[s.E.length - 1][0] : 0;
    else for (const ev of s.E) if (ev[0] > VS.lastEid) { VS.lastEid = ev[0]; guestEvent(ev); }
  }
  if (Array.isArray(s.T)) for (const [slot, x, z, b, tu, al] of s.T) {
    const p = vsPlayer(slot), t = p && p.tank;
    if (!t) continue;
    if (slot === VS.mySlot) { if (!al && t.alive) destroyTank(t); continue; }
    if (!t.alive) continue;
    if (al) { t.x = x; t.z = z; t.body = b; t.turret = tu; } else destroyTank(t);
  }
  const seen = new Set();
  if (Array.isArray(s.B)) for (const [id, x, z, dx, dz, rk, ow] of s.B) {
    let b = VS.gb.get(id);
    if (!b) { b = { mesh: getBulletMesh(!!rk), rocket: !!rk, trail: 0, init: false, x, z }; VS.gb.set(id, b); }
    b.sx = x; b.sz = z; b.dx = dx; b.dz = dz; b.st = now; b.owner = ow; seen.add(id);
  }
  for (const [id, b] of VS.gb) if (!seen.has(id)) { b.mesh.visible = false; VS.gb.delete(id); }
  const ms = new Set();
  if (Array.isArray(s.M)) for (const [id, x, z, left] of s.M) {
    let m = VS.gm.get(id);
    if (!m) { m = { mesh: getMineMesh(), x, z }; m.mesh.group.position.set(wx(x), 0, wz(z)); m.mesh.group.scale.set(1, 1, 1); VS.gm.set(id, m); }
    m.left = left / 10; m.lt = now; ms.add(id);
  }
  for (const [id, m] of VS.gm) if (!ms.has(id)) { m.mesh.group.visible = false; VS.gm.delete(id); }
}
function guestRenderProjectiles(dt) {
  const now = performance.now() / 1000;
  for (const b of VS.gb.values()) {
    const sp = b.rocket ? PACE.rocket : PACE.shell, age = Math.min(0.15, now - b.st);
    const tx = b.sx + b.dx * sp * age, tz = b.sz + b.dz * sp * age;
    if (b.init) { const k = Math.min(1, dt * 20); b.x += (tx - b.x) * k; b.z += (tz - b.z) * k; } else { b.x = tx; b.z = tz; b.init = true; }
    b.mesh.position.set(wx(b.x), 0.46, wz(b.z)); b.mesh.rotation.y = -Math.atan2(b.dz, b.dx);
    b.trail -= dt;
    if (b.trail <= 0) { b.trail = b.rocket ? 0.018 : 0.03; spawnTrail(b.x, b.z, b.dx, b.dz, b.rocket); }
  }
  for (const m of VS.gm.values()) {
    const left = m.left - (now - m.lt);
    const on = left < 2.5 ? Math.sin(now * 22) > 0 : Math.sin(now * 4) > 0.75;
    m.mesh.lightMat.emissiveIntensity = on ? 3.2 : 0.05;
  }
}
function pushSelf(t) {
  for (const o of G.tanks) {
    if (o === t || !o.alive) continue;
    const ex = t.x - o.x, ez = t.z - o.z, d = Math.hypot(ex, ez), min = t.r + o.r;
    if (d < min && d > 1e-5) { t.x += ex / d * (min - d); t.z += ez / d * (min - d); }
  }
}
function vsUpdateGuest(dt) {
  for (const t of G.tanks) { t.lastX = t.x; t.lastZ = t.z; }
  const me = vsPlayer(VS.mySlot), t = me && me.tank;
  if (t) t.shotCd = Math.max(0, t.shotCd - dt);
  if (t && t.alive && VS.phase === 'play') {
    const a = readLocal(t, dt);
    let ownB = 0; for (const b of VS.gb.values()) if (b.owner === VS.mySlot) ownB++;
    if (a.fire && t.shotCd <= 0 && ownB < t.type.bullets) {
      VS.fireCount++; FX.muzzle(t.x, t.z, t.turret, !!t.type.rocket); SFX.shot(t.x, !!t.type.rocket);
      t.recoil = 1; t.reveal = 1.3; t.shotCd = t.type.shotGap || 0;
    }
    if (a.mine) VS.mineCount++;
    collideTank(t); pushSelf(t); collideTank(t);
  } else { fireQueued = mineQueued = false; }
  for (const x of G.tanks) if (x.alive) { stampTracks(x); x.sync(dt); }
  guestRenderProjectiles(dt);
  VS.pubAcc += dt;
  if (VS.pubAcc >= 0.05) { VS.pubAcc = 0; if (t) Net.publishInput(t); }
}
function leaveVersusToRoom() {
  VS.inGame = false; VS.phase = 'idle'; VS.paused = false;
  G.mode = 'campaign'; G.state = 'title';
  SFX.stopMusic(); hideBanner(); $('hud').hidden = true; $('touch').hidden = true;
  for (const b of VS.gb.values()) b.mesh.visible = false; VS.gb.clear();
  for (const m of VS.gm.values()) m.mesh.group.visible = false; VS.gm.clear();
  clearEntities(); setupPreview();
  openRoom();
}

// --- name tags above tanks
const tagsEl = $('tags'), tagMap = new Map();
function updateTags() {
  if (G.mode !== 'versus') { if (tagMap.size) { tagsEl.innerHTML = ''; tagMap.clear(); } return; }
  for (const [slot, el] of tagMap) if (!vsPlayer(slot)) { el.remove(); tagMap.delete(slot); }
  for (const p of VS.players) {
    let el = tagMap.get(p.slot);
    if (!el) { el = document.createElement('div'); el.className = 'ptag'; tagsEl.appendChild(el); tagMap.set(p.slot, el); }
    const label = `${p.nick}${isMine(p) ? tr('vs.tagYou') : ''} · ${clsName(pvpClass(p.cls))}`;
    if (el._l !== label) { el.textContent = label; el._l = label; el.style.borderBottomColor = hex(pColor(p)); }
    const t = p.tank;
    if (!t || !t.alive || VS.phase === 'matchEnd' || (t.type.cloak && t.cloakO < 0.3)) { el.hidden = true; continue; }
    _v.set(wx(t.rx), 1.08, wz(t.rz)).project(camera);
    el.hidden = false;
    el.style.transform = `translate(${((_v.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px,${((-_v.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%,-100%)`;
  }
}

// ================================================================ network (claude.ai room)
function cleanNick(n) {
  return String(n == null ? '' : n).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤﻿]/g, '').trim().slice(0, 14) || tr('nick.default');
}
function randomCode() { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
function netErr(e) {
  const c = e && e.code;
  if (['no_game', 'code_taken', 'room_full', 'bad_code', 'origin'].includes(c)) return tr('err.' + c);
  if (c === 'upstream_error') return tr('err.upstream');
  return tr('err.generic');
}
const Net = {
  ns: null, status: 'off', game: null, code: '', isHost: false, myPeer: null,
  slots: [], settings: { mode: 'duel', target: 5 }, gameUnsub: null, waitHost: 0,
  _nick: null,
  nick() {
    if (this._nick) return this._nick;
    let n = store.get('nick', '');
    if (!n) { n = tr('nick.default') + ' ' + (10 + Math.floor(Math.random() * 90)); store.set('nick', n); }
    return (this._nick = cleanNick(n));
  },
  setNick(n) { this._nick = cleanNick(n); store.set('nick', this._nick); if (this.game) { this.game.presence({ nick: this.nick() }).catch(() => { }); if (this.isHost) this.refreshSlots(); } },
  max() { return this.settings.mode === 'duel' ? 2 : 4; },
  init() {
    if (this.status !== 'off') return;
    const base = relayBase();
    this.status = base ? 'ready' : 'unavailable';
    if (base) this.ns = makeRelayTransport(base);
    renderOnline();
  },
  async host() {
    if (!this.ns || this.game) return;
    if (this.busy) return;
    this.busy = true; renderOnline();
    let g = null, code = '';
    for (let tries = 0; tries < 3 && !g; tries++) {
      code = randomCode();
      try { g = await this.ns.join(code, 'host'); }
      catch (e) { if (!(e && e.code === 'code_taken') || tries === 2) { this.busy = false; renderOnline(); toast(netErr(e)); return; } }
    }
    this.busy = false;
    if (this.game) { try { g.leave(); } catch (e) { } return; }
    this.game = g; this.code = code; this.isHost = true; this.slots = []; this.myPeer = null;
    this.gameUnsub = g.onPeers(ch => this.onGamePeers(ch), e => this.onGameError(e));
    g.presence({ nick: this.nick(), role: 'host', lobby: null, match: null, snap: null }).catch(() => { });
    openRoom();
  },
  async join(code) {
    if (!this.ns || this.game) return;
    code = String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    if (code.length < 4) { toast(tr('toast.enterCode')); return; }
    if (this.busy) return;
    this.busy = true; renderOnline();
    let g;
    try { g = await this.ns.join(code, 'guest'); }
    catch (e) { this.busy = false; renderOnline(); toast(netErr(e)); return; }
    this.busy = false;
    if (this.game || $('onlineScreen').hidden) { try { g.leave(); } catch (e) { } return; }
    this.game = g; this.code = code; this.isHost = false; this.myPeer = null;
    VS.inGame = false; VS.lastPres = null; VS.hostMissing = 0; VS.fireCount = 0; VS.mineCount = 0;
    this.gameUnsub = g.onPeers(ch => this.onGamePeers(ch), e => this.onGameError(e));
    g.presence({ nick: this.nick(), role: 'guest', tank: [MY_TANK.cls, MY_TANK.color], inp: null, r: -1 }).catch(() => { });
    openRoom();
  },
  onGameError() { if (!this.game) return; toast(tr('toast.lost')); this.leaveGame(); if (VS.inGame) toMenu(); else openOnline(); },
  onGamePeers(ch) {
    const me = ch.peers.find(p => p.sameTab);
    if (me) this.myPeer = me.peer;
    if (!this.isHost) { renderRoom(); return; }
    const ids = new Set(ch.peers.map(p => p.peer));
    if (!VS.inGame) this.refreshSlots();
    else for (const pl of VS.players) {
      if (pl.dev || pl.gone || ids.has(pl.peer)) continue;
      pl.gone = true;
      if (pl.tank && pl.tank.alive) destroyTank(pl.tank);
      toast(tr('toast.left', { name: pl.nick }));
      updateHUD();
    }
  },
  refreshSlots() {
    if (!this.game || !this.myPeer) return;
    const peers = this.game.peers(), ids = new Set(peers.map(p => p.peer));
    this.slots = this.slots.filter(s => ids.has(s.p));
    const mine = this.slots.find(s => s.p === this.myPeer);
    if (mine) Object.assign(mine, { n: this.nick(), k: MY_TANK.cls, c: MY_TANK.color });
    else this.slots.unshift({ p: this.myPeer, n: this.nick(), k: MY_TANK.cls, c: MY_TANK.color });
    for (const p of peers) {
      if (p.sameTab || !p.presence || p.presence.role !== 'guest') continue;
      const tk = Array.isArray(p.presence.tank) ? p.presence.tank : [];
      const info = { n: cleanNick(p.presence.nick), k: pvpClass(tk[0]).id, c: TANK_COLORS.includes(tk[1]) ? tk[1] : -1 };
      const ex = this.slots.find(s => s.p === p.peer);
      if (ex) Object.assign(ex, info);
      else if (this.slots.length < this.max()) this.slots.push({ p: p.peer, ...info });
    }
    this.slots = this.slots.slice(0, this.max());
    const cols = resolveColors(this.slots.map(s => ({ cls: s.k, color: s.c })));
    this.slots.forEach((s, i) => { s.col = cols[i]; });
    this.publishLobby();
    renderRoom();
  },
  publishLobby() {
    if (!this.game || !this.isHost) return;
    const lobby = { md: this.settings.mode, tg: this.settings.target, sl: this.slots.map(s => [s.p, s.n, s.k, s.col]) };
    this.game.presence({ nick: this.nick(), role: 'host', lobby, match: null, snap: null }).catch(() => { });
  },
  publishMatch() {
    if (!this.game) return;
    const m = { mi: VS.matchId, ph: VS.phase, rd: VS.round, mp: VS.mapIdx, tg: VS.target, md: VS.mode, rw: VS.roundWinner, mw: VS.matchWinner, pl: VS.players.map(p => [p.slot, p.nick, p.score, p.gone ? 1 : 0, p.peer || '', p.cls, p.col]) };
    const s = buildSnap();
    while (JSON.stringify(m).length + JSON.stringify(s).length > 3600) { if (s.E.length > 4) s.E.shift(); else if (s.B.length) s.B.pop(); else break; }
    this.game.presence({ lobby: null, match: m, snap: s }).catch(() => { });
  },
  publishInput(t) {
    if (!this.game) return;
    this.game.presence({ inp: { x: r2(t.x), z: r2(t.z), b: r2(t.body), t: r2(t.turret), f: VS.fireCount, m: VS.mineCount }, r: VS.round, mi: VS.matchId }).catch(() => { });
  },
  hostPeer() { return this.game ? this.game.peers().find(p => !p.sameTab && p.presence && p.presence.role === 'host') || null : null; },
  tick(dt) {
    if (!this.game || this.isHost) return;
    const host = this.hostPeer();
    if (!host) {
      VS.hostMissing += dt;
      if (VS.hostMissing > (VS.lastPres ? 4 : 7)) {
        const wasIn = VS.inGame;
        toast(VS.lastPres ? tr('toast.hostLeft') : tr('toast.noGame'));
        this.leaveGame();
        if (wasIn) { leaveVersusToRoomSilently(); }
        openOnline();
      }
      return;
    }
    VS.hostMissing = 0;
    if (host.presence !== VS.lastPres) { VS.lastPres = host.presence; guestApply(host.presence); }
  },
  async leaveGame() {
    const g = this.game; this.game = null;
    if (this.gameUnsub) { try { this.gameUnsub(); } catch (e) { } this.gameUnsub = null; }
    if (g) { try { await g.leave(); } catch (e) { } }
    this.isHost = false; this.slots = []; VS.lastPres = null;
  }
};
function leaveVersusToRoomSilently() {
  VS.inGame = false; VS.phase = 'idle'; G.mode = 'campaign'; G.state = 'title';
  SFX.stopMusic(); hideBanner(); $('hud').hidden = true; $('touch').hidden = true;
  for (const b of VS.gb.values()) b.mesh.visible = false; VS.gb.clear();
  for (const m of VS.gm.values()) m.mesh.group.visible = false; VS.gm.clear();
  clearEntities(); setupPreview();
}

// ================================================================ relay transport (Cloudflare Worker, WebSocket)
// Same surface the game already uses (presence, peers, onPeers, leave). Every player opens one
// WebSocket to the relay (wss on port 443, plain web traffic) and the relay forwards presences.
function relayBase() {
  let u = String(window.TANKS_RELAY || '').trim().replace(/\/+$/, '');
  if (!u || /TON-SOUS-DOMAINE|YOUR-SUBDOMAIN/i.test(u)) return '';
  if (/^https?:\/\//i.test(u)) u = u.replace(/^http/i, 'ws');
  if (!/^wss?:\/\//i.test(u)) u = 'wss://' + u;
  return u;
}
function makeRelayTransport(base) {
  return { relay: true, join: (code, role) => relayRoom(base, code, role) };
}
function relayRoom(base, code, role) {
  return new Promise((resolve, reject) => {
    const pres = new Map(), listeners = new Set(), errListeners = new Set();
    let ws, myId = null, settled = false, dead = false, snapshot = Object.freeze([]), myPres = {}, sendTimer = null, pingTimer = null;
    const rebuild = () => {
      snapshot = Object.freeze([...pres].map(([id, p]) => Object.freeze({ peer: id, by: null, isMe: id === myId, sameTab: id === myId, kind: 'viewer', guest: false, presence: p, updatedAt: Date.now() })));
    };
    const notify = () => { rebuild(); for (const fn of listeners) { try { fn({ peers: snapshot, joined: [], left: [], updated: [] }); } catch (e) { console.error(e); } } };
    const flush = () => { sendTimer = null; if (!dead && ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'pres', p: myPres })); };
    const stop = () => { dead = true; clearTimeout(sendTimer); clearInterval(pingTimer); clearTimeout(timer); };
    const fail = (codeName, message) => {
      if (!settled) { settled = true; stop(); try { ws.close(); } catch (e) { } reject({ code: codeName, message }); return; }
      if (dead) return;
      stop();
      for (const fn of errListeners) { try { fn({ code: codeName, message }); } catch (e) { } }
    };
    const api = {
      name: code,
      presence(patch) {
        if (dead) return Promise.reject({ code: 'upstream_error', message: 'room closed' });
        const next = { ...myPres };
        for (const k in patch) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
        myPres = next;
        if (myId) { pres.set(myId, Object.freeze(JSON.parse(JSON.stringify(next)))); rebuild(); }
        if (!sendTimer) sendTimer = setTimeout(flush, 30);
        return Promise.resolve();
      },
      peers: () => snapshot,
      onPeers(fn, onErr) {
        listeners.add(fn); if (onErr) errListeners.add(onErr);
        setTimeout(() => { if (listeners.has(fn)) fn({ peers: snapshot, joined: snapshot, left: [], updated: [] }); }, 0);
        return () => { listeners.delete(fn); if (onErr) errListeners.delete(onErr); };
      },
      connected: () => !dead && ws && ws.readyState === 1,
      onConnection(fn) { setTimeout(() => fn(!dead), 0); return () => { }; },
      async leave() {
        if (dead) return;
        listeners.clear(); errListeners.clear();
        stop();
        try { ws.close(1000, 'leave'); } catch (e) { }
      }
    };
    const timer = setTimeout(() => fail('upstream_error', 'timeout'), 12000);
    try { ws = new WebSocket(`${base}/room/${encodeURIComponent(code)}?role=${role}`); }
    catch (e) { clearTimeout(timer); reject({ code: 'upstream_error', message: String(e) }); return; }
    ws.onmessage = ev => {
      if (dead || typeof ev.data !== 'string' || ev.data === 'pong') return;
      let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'error') { fail(String(msg.code || 'upstream_error'), 'refused'); return; }
      if (msg.t === 'welcome') {
        myId = String(msg.id);
        pres.set(myId, Object.freeze({}));
        if (Array.isArray(msg.peers)) for (const [id, p] of msg.peers) if (id && p && typeof p === 'object') pres.set(String(id), Object.freeze(p));
        rebuild();
        settled = true; clearTimeout(timer);
        pingTimer = setInterval(() => { if (ws.readyState === 1) ws.send('ping'); }, 20000);
        resolve(api);
        if (Object.keys(myPres).length) flush();
        notify();
        return;
      }
      if (msg.t === 'pres' && msg.id && msg.p && typeof msg.p === 'object' && !Array.isArray(msg.p)) {
        pres.set(String(msg.id), Object.freeze(msg.p)); notify();
      } else if (msg.t === 'left' && msg.id) {
        if (pres.delete(String(msg.id))) notify();
      }
    };
    ws.onerror = () => { };
    ws.onclose = () => fail('upstream_error', 'closed');
  });
}

// Keep the host's simulation running while its tab is in the background
// (animation frames stop there; a worker's messages keep arriving).
let bgWorker = null;
function syncBackgroundTicker() {
  const need = document.hidden && G.mode === 'versus' && VS.role === 'host';
  if (need && !bgWorker) {
    try {
      const src = 'let t=null;onmessage=e=>{clearInterval(t);t=null;if(e.data)t=setInterval(()=>postMessage(0),33)}';
      bgWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      bgWorker.onmessage = () => {
        if (!document.hidden) return;
        const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
        update(dt);
      };
    } catch (e) { bgWorker = null; }
  }
  if (bgWorker) bgWorker.postMessage(need);
}
document.addEventListener('visibilitychange', syncBackgroundTicker);

// ================================================================ menus for versus
let toastTimer = null;
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3800);
}
function segValue(id) { const b = $(id).querySelector('.on'); return b ? b.dataset.v : null; }
function wireSeg(id, onChange) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    for (const x of $(id).querySelectorAll('button')) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }
    if (onChange) onChange(b.dataset.v);
  });
}
function openOnline() {
  showScreen('onlineScreen');
  renderTankSummaries();
  $('nickInput').value = Net.nick();
  Net.init();
  renderOnline();
}
function renderOnline() {
  if ($('onlineScreen').hidden) return;
  const ready = Net.status === 'ready';
  $('netStatus').textContent = Net.busy ? tr('net.busy')
    : ready ? tr('net.ready')
    : tr('TANKS_RELAY' in window ? 'net.noRelay' : 'net.hosted');
  $('netStatus').classList.toggle('warn', !ready);
  $('hostBtn').disabled = !ready || !!Net.busy; $('joinBtn').disabled = !ready || !!Net.busy;
}
function openRoom() { showScreen('roomScreen'); renderTankSummaries(); renderRoom(); }
function renderRoom() {
  if ($('roomScreen').hidden) return;
  $('roomCode').textContent = Net.code.toUpperCase();
  let md, tg, sl;
  if (Net.isHost) { md = Net.settings.mode; tg = Net.settings.target; sl = Net.slots.map(s => [s.p, s.n, s.k, s.col]); }
  else { const lb = VS.lastPres && VS.lastPres.lobby; md = lb ? lb.md : null; tg = lb ? lb.tg : null; sl = lb && Array.isArray(lb.sl) ? lb.sl : []; }
  $('roomInfo').textContent = md ? tr('room.firstTo', { mode: tr(md === 'ffa' ? 'room.ffa' : 'room.duel'), n: tg | 0 }) : tr('room.searching');
  const box = $('roomPlayers'); box.textContent = '';
  sl.slice(0, 4).forEach(([peer, nick, cls, col], i) => {
    const row = document.createElement('div'); row.className = 'prow';
    row.innerHTML = tankIcon(Number.isFinite(col) ? col : classColor(cls), 34);
    const n = document.createElement('span'); n.className = 'pn'; n.textContent = cleanNick(nick) + (peer === Net.myPeer ? tr('room.you') : '') + (i === 0 ? tr('room.host') : '');
    const k = document.createElement('small'); k.textContent = clsName(pvpClass(cls));
    row.append(n, k); box.appendChild(row);
  });
  const max = md === 'ffa' ? 4 : 2;
  for (let i = sl.length; i < max; i++) { const row = document.createElement('div'); row.className = 'prow empty'; row.textContent = tr('room.free'); box.appendChild(row); }
  const inSlots = sl.some(s => s[0] === Net.myPeer);
  $('startBtn').hidden = !Net.isHost;
  $('startBtn').disabled = !(Net.isHost && sl.length >= 2 && (md === 'ffa' || sl.length === 2));
  $('roomWait').textContent = Net.isHost
    ? tr(sl.length < 2 ? 'room.share' : 'room.ready')
    : tr(md && !inSlots && sl.length >= max ? 'room.full' : 'room.wait');
}
function hostStart() {
  const sl = Net.slots;
  if (sl.length < 2) { toast(tr('toast.need2')); return; }
  VS.role = 'host'; VS.mode = Net.settings.mode; VS.target = Net.settings.target;
  VS.players = sl.map((s, i) => ({ slot: i, nick: s.n, cls: pvpClass(s.k).id, col: s.col, score: 0, gone: false, peer: s.p, dev: s.p === Net.myPeer ? 'any' : null, tank: null }));
  VS.inGame = true;
  Net.publishLobby();
  vsStartMatch();
}
function hostBackToRoom() {
  VS.inGame = false; VS.phase = 'idle';
  G.mode = 'campaign'; G.state = 'title';
  SFX.stopMusic(); hideBanner(); $('hud').hidden = true; $('touch').hidden = true;
  clearEntities(); setupPreview();
  Net.refreshSlots();
  openRoom();
}
function showVsOver() {
  const w = vsPlayer(VS.matchWinner);
  $('vsOverTitle').textContent = w ? tr('vs.winner', { name: w.nick }) : tr('vs.ended');
  $('vsOverTag').textContent = tr('vs.tag', { mode: tr(VS.mode === 'ffa' ? 'vs.mode.ffa' : 'vs.mode.duel'), n: VS.target });
  const box = $('vsOverScores'); box.textContent = '';
  for (const p of [...VS.players].sort((a, b) => b.score - a.score)) {
    const row = document.createElement('div'); row.className = 'prow';
    row.innerHTML = tankIcon(pColor(p), 34);
    const n = document.createElement('span'); n.className = 'pn'; n.textContent = p.nick + (p.gone ? tr('vs.gone') : '') + (isMine(p) ? tr('room.you') : '');
    const s = document.createElement('b'); s.className = 'num'; s.textContent = p.score;
    row.append(n, s); box.appendChild(row);
  }
  const role = VS.role;
  $('vsAgain').hidden = role === 'guest';
  $('vsAgain').textContent = tr('btn.rematch');
  $('vsAgain').disabled = role === 'host' && VS.players.filter(p => !p.gone).length < 2;
  $('vsLobby').hidden = role !== 'host';
  $('vsQuit').textContent = tr('btn.leave');
  $('vsOverWait').textContent = role === 'guest' ? tr('vs.hostRematch') : '';
  showScreen('vsOverScreen');
}


// ================================================================ garage (PvP tank choice)
const GARAGE = { cls: MY_TANK.cls, color: MY_TANK.color, back: 'onlineScreen' };
const fmtNum = v => String(+v.toFixed(2)).replace('.', LANG === 'fr' ? ',' : '.');
function shotScore(gap) { return clamp(Math.round(5 - (gap - 0.12) * 8.5), 1, 5); }
function statBar(label, value, max, text) {
  let segs = '';
  for (let i = 0; i < max; i++) segs += `<i class="${i < value ? 'on' : ''}"></i>`;
  return `<div class="g-stat"><span>${label}</span><span class="g-bar" aria-hidden="true">${segs}</span><b>${text}</b></div>`;
}
function myTankSummary() {
  const c = pvpClass(MY_TANK.cls);
  return `${tankIcon(wantedColor(MY_TANK.cls, MY_TANK.color), 40)}<span><b>${esc(clsName(c))}</b><small>${esc(clsDesc(c))}</small></span>`;
}
function renderTankSummaries() {
  for (const id of ['myTankSummary', 'roomTankSummary']) { const el = $(id); if (el) el.innerHTML = myTankSummary(); }
}
function openGarage(back) {
  GARAGE.cls = MY_TANK.cls; GARAGE.color = MY_TANK.color; GARAGE.back = back || 'onlineScreen';
  showScreen('garageScreen');
  renderGarage();
}
function renderGarage() {
  const c = pvpClass(GARAGE.cls), col = wantedColor(GARAGE.cls, GARAGE.color);
  $('gIcon').innerHTML = tankIcon(col, 150);
  $('gName').textContent = clsName(c);
  $('gDesc').textContent = clsDesc(c);
  const speedPips = clamp(Math.round((c.speed - 0.5) / 0.2), 1, 5);
  $('gStats').innerHTML =
    statBar(tr('st.speed'), speedPips, 5, `×${fmtNum(c.speed)}`) +
    statBar(tr('st.bullets'), c.bullets, 5, c.bullets) +
    statBar(tr('st.rate'), shotScore(c.shotGap), 5, `${fmtNum(c.shotGap)} s`) +
    statBar(tr('st.bounces'), c.bounces, 2, c.bounces) +
    statBar(tr('st.mines'), c.mines, 4, c.mines);
  const tags = [];
  if (c.shell === 'rocket') tags.push(tr('tag.rocket'));
  if (c.armor) tags.push(tr('tag.armor', { n: c.armor }));
  if (c.cloak) tags.push(tr('tag.cloak'));
  $('gTags').innerHTML = tags.map(t => `<span>${t}</span>`).join('');
  $('gClasses').innerHTML = PVP_CLASSES.map(k => `<button data-k="${k.id}" class="${k.id === c.id ? 'on' : ''}" aria-pressed="${k.id === c.id}">${tankIcon(TYPES[k.look].color, 36)}<span>${esc(clsName(k))}</span></button>`).join('');
  const sw = [`<button data-c="-1" class="auto${GARAGE.color === -1 ? ' on' : ''}" aria-pressed="${GARAGE.color === -1}" title="${esc(tr('garage.autoTitle'))}" style="--sw:${hex(classColor(c.id))}"><span>${tr('garage.auto')}</span></button>`]
    .concat(TANK_COLORS.map(x => `<button data-c="${x}" class="${GARAGE.color === x ? 'on' : ''}" aria-pressed="${GARAGE.color === x}" aria-label="${esc(tr('garage.colorAria', { c: hex(x) }))}" style="--sw:${hex(x)}"></button>`));
  $('gColors').innerHTML = sw.join('');
}
$('gClasses').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; GARAGE.cls = b.dataset.k; SFX.click(); renderGarage(); });
$('gColors').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; GARAGE.color = +b.dataset.c; SFX.click(); renderGarage(); });
$('gOk').addEventListener('click', () => {
  MY_TANK.cls = pvpClass(GARAGE.cls).id; MY_TANK.color = TANK_COLORS.includes(GARAGE.color) ? GARAGE.color : -1;
  store.set('pvpTank', { cls: MY_TANK.cls, color: MY_TANK.color });
  if (Net.game && !VS.inGame) {
    if (Net.isHost) Net.refreshSlots();
    else Net.game.presence({ tank: [MY_TANK.cls, MY_TANK.color] }).catch(() => { });
  }
  renderTankSummaries();
  if (GARAGE.back === 'roomScreen' && Net.game) openRoom(); else openOnline();
});
$('myTankBtn').addEventListener('click', () => openGarage('onlineScreen'));
$('roomTankBtn').addEventListener('click', () => openGarage('roomScreen'));

// ================================================================ campaign map (world map of missions)
const WORLDS = [
  { name: 'La salle de jeu', from: 1 },
  { name: 'L’atelier', from: 21 },
  { name: 'Le grenier', from: 41 },
  { name: 'La cave', from: 61 },
  { name: 'Le hangar', from: 81 },
];
const MAP = { world: 0, sel: 1 };
const FIRST_SEEN = Object.fromEntries(Object.entries(UNLOCK).map(([k, m]) => [m, k]));
const mStatus = m => (m < G.best ? 'done' : m === G.best ? 'current' : 'locked');
function openMap() {
  SFX.ensure();
  const cur = Math.min(G.best, 100);
  MAP.world = Math.floor((cur - 1) / 20);
  MAP.sel = cur;
  showScreen('mapScreen');
  renderMap();
}
function mapCols() { const w = $('mapBoard').clientWidth || innerWidth; return w >= 680 ? 5 : w >= 470 ? 4 : 3; }
function renderMap() {
  if ($('mapScreen').hidden) return;
  const done = Math.min(100, G.best - 1);
  $('mapProgress').textContent = tr('map.progress', { n: done });
  // world tabs
  $('worldTabs').innerHTML = WORLDS.map((w, i) => {
    const open = G.best >= w.from;
    return `<button data-w="${i}" class="${i === MAP.world ? 'on' : ''}" aria-pressed="${i === MAP.world}">`
      + `<b>${tr('map.world', { n: i + 1 })}</b><small>${open ? esc(tr('world.' + i, null, w.name)) : tr('map.worldLocked')}</small></button>`;
  }).join('');
  // board
  const cols = mapCols(), rows = Math.ceil(20 / cols);
  const sx = 170, sy = 108, padX = 90, padY = 72;
  const Wd = padX * 2 + sx * (cols - 1), Hd = padY * 2 + sy * (rows - 1);
  const world = WORLDS[MAP.world];
  const pts = [];
  for (let i = 0; i < 20; i++) {
    const r = Math.floor(i / cols), c = i % cols, cc = r % 2 ? cols - 1 - c : c;
    pts.push({ m: world.from + i, x: padX + cc * sx, y: padY + r * sy });
  }
  let road = '';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const st = mStatus(b.m) === 'locked' ? 'locked' : 'open';
    let d;
    if (a.y === b.y) d = `M${a.x},${a.y} L${b.x},${b.y}`;
    else { const side = a.x > Wd / 2 ? 1 : -1, bx = a.x + side * 62; d = `M${a.x},${a.y} C${bx},${a.y} ${bx},${b.y} ${b.x},${b.y}`; }
    road += `<path class="road-bed" d="${d}"/><path class="road ${st}" d="${d}"/>`;
  }
  let nodes = '';
  for (const p of pts) {
    const st = mStatus(p.m), big = p.m % 5 === 0, r = big ? 30 : 25, sel = p.m === MAP.sel;
    const label = tr('map.node', { n: p.m, st: tr('map.st.' + st) });
    nodes += `<g class="node ${st}${sel ? ' sel' : ''}" data-m="${p.m}" tabindex="0" role="button" aria-label="${label}" transform="translate(${p.x},${p.y})">`;
    if (st === 'current') nodes += `<circle class="pulse" r="${r + 8}"/>`;
    if (sel) nodes += `<circle class="ring" r="${r + 7}"/>`;
    nodes += `<circle class="hit" r="${r + 14}"/><circle class="shadow" r="${r}" cy="5"/><circle class="disc" r="${r}"/>`;
    if (big) nodes += `<circle class="inner" r="${r - 6}"/>`;
    nodes += `<text class="num" y="1" dominant-baseline="middle" text-anchor="middle">${p.m}</text>`;
    if (FIRST_SEEN[p.m] && p.m > 1) {
      const t = FIRST_SEEN[p.m];
      nodes += `<g class="newfoe" transform="translate(${-19},${-r - 34})"><title>${esc(tr('map.newFoe', { name: typeName(t).toLowerCase() }))}</title>${tankIcon(TYPES[t].color, 38).replace('<svg ', '<svg x="0" y="0" ')}</g>`;
    }
    nodes += `</g>`;
  }
  const end = pts[pts.length - 1];
  const nextTxt = MAP.world < 4 ? tr('map.next', { n: MAP.world + 2 }) : tr('map.end');
  const flag = `<g class="flag" transform="translate(${end.x},${end.y + 54})"><text text-anchor="middle" dominant-baseline="middle">${nextTxt}</text></g>`;
  $('mapBoard').innerHTML = `<svg viewBox="0 0 ${Wd} ${Hd}" role="group" aria-label="${esc(tr('map.aria', { a: world.from, b: world.from + 19 }))}">${road}${nodes}${flag}</svg>`;
  renderMapDetail();
}
function renderMapDetail() {
  const m = MAP.sel, st = mStatus(m);
  $('mdTitle').textContent = `${tr('hud.mission')} ${m}`;
  const chip = $('mdChip');
  chip.textContent = tr('map.chip.' + st);
  chip.className = 'chip ' + st;
  const box = $('mdFoes');
  if (st === 'locked') {
    box.innerHTML = `<p class="empty">${esc(tr('map.lockedMsg', { n: G.best }))}</p>`;
  } else {
    const L = getLevel(m), counts = {};
    for (const e of L.enemies) counts[e.type] = (counts[e.type] || 0) + 1;
    box.innerHTML = TYPE_ORDER.filter(t => counts[t]).map(t => `<span title="${esc(typeName(t))}">${tankIcon(TYPES[t].color, 34)}<b>×${counts[t]}</b></span>`).join('')
      + `<small>${tn('map.foes', L.enemies.length)}${m % 5 === 0 ? tr('map.bonus') : ''}</small>`;
  }
  $('mdPlay').disabled = st === 'locked';
  $('mdPlay').textContent = st === 'done' ? tr('btn.replay') : tr('btn.launch');
}
$('worldTabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  MAP.world = +b.dataset.w;
  const w = WORLDS[MAP.world];
  MAP.sel = clamp(G.best, w.from, w.from + 19);
  if (G.best < w.from) MAP.sel = w.from;
  SFX.click(); renderMap();
});
function pickNode(g) {
  if (!g) return;
  MAP.sel = +g.dataset.m;
  SFX.click();
  renderMap();
  const again = $('mapBoard').querySelector(`.node[data-m="${MAP.sel}"]`);
  if (again) again.focus({ preventScroll: true });
}
$('mapBoard').addEventListener('click', e => pickNode(e.target.closest('.node')));
$('mapBoard').addEventListener('dblclick', e => { const g = e.target.closest('.node'); if (g && mStatus(+g.dataset.m) !== 'locked') startGame(+g.dataset.m); });
$('mapBoard').addEventListener('keydown', e => {
  const g = e.target.closest('.node'); if (!g) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (+g.dataset.m === MAP.sel && mStatus(MAP.sel) !== 'locked') startGame(MAP.sel); else pickNode(g);
  }
});
$('mdPlay').addEventListener('click', () => { if (mStatus(MAP.sel) !== 'locked') startGame(MAP.sel); });
$('mapBack').addEventListener('click', () => { buildTitle(); showScreen('titleScreen'); });
addEventListener('resize', () => { if (!$('mapScreen').hidden) renderMap(); });

// ================================================================ main update
function updatePlayer(dt) {
  const t = G.player; if (!t || !t.alive) return;
  const a = readLocal(t, dt);
  if (a.fire && activeBullets(t) < t.type.bullets) fire(t);
  if (a.mine) tryLayMine(t);
}
function updateAimDots() {
  const t = G.mode === 'versus' ? VS.aimTank : G.player;
  const playing = G.mode === 'versus' ? VS.phase === 'play' && !VS.paused : G.state === 'play';
  if (!t || !t.alive || !playing || input.mode === 'touch') { dotMesh.count = 0; return; }
  let len = 6;
  if (input.mode === 'mouse') { const p = ndcToWorld(input.ndcX, input.ndcY); if (p) len = Math.min(18, Math.hypot(p.x - t.x, p.z - t.z)); }
  const n = Math.min(DOTS, Math.floor((len - 0.6) / 0.38));
  const ca = Math.cos(t.turret), sa = Math.sin(t.turret);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const d = 0.75 + i * 0.38, x = t.x + ca * d, z = t.z + sa * d;
    if (bSolid(x, z)) break;
    _m4.makeTranslation(wx(x), 0.012, wz(z)); dotMesh.setMatrixAt(k++, _m4);
  }
  dotMesh.count = k; dotMesh.instanceMatrix.needsUpdate = true;
}

function updateWorld(dt) {
  const live = G.state === 'play' || G.state === 'cleared' || G.state === 'dead';
  if (G.state === 'play') {
    G.playTime += dt;
    G.pdistTimer -= dt;
    if (G.pdistTimer <= 0) { G.pdistTimer = 0.35; computePlayerDist(); }
  }
  for (const t of G.tanks) { t.lastX = t.x; t.lastZ = t.z; }
  if (G.state === 'play') {
    updatePlayer(dt);
    for (const t of G.tanks) if (t.alive && t.team === 'E') updateAI(t, dt);
  } else { fireQueued = false; mineQueued = false; }
  if (live) {
    for (const t of G.tanks) if (t.alive) collideTank(t);
    separateTanks();
    for (const t of G.tanks) {
      if (!t.alive) continue;
      t.vx = dt > 0 ? (t.x - t.lastX) / dt : 0; t.vz = dt > 0 ? (t.z - t.lastZ) / dt : 0;
      stampTracks(t);
    }
    updateBullets(dt);
    updateMines(dt);
  }
  for (const t of G.tanks) if (t.alive) t.sync(dt);
  updateAimDots();
  // state transitions
  if (G.state === 'play') {
    if (!G.player.alive) onDeath();
    else if (!G.tanks.some(t => t.team === 'E' && t.alive)) onCleared();
  }
}

function update(dt) {
  PADS = readPads();
  if (PADS.some(p => p && p.start)) togglePause();
  Net.tick(dt);
  if (G.mode === 'versus') {
    if (VS.paused) return;
    if (VS.role === 'guest') vsUpdateGuest(dt); else vsUpdateAuthority(dt);
    if (G.mode !== 'versus') return;
    updateAimDots();
    smokeFX.update(dt); fireFX.update(dt); updateDebris(dt);
    mkTimer -= dt;
    if (mkDirty && mkTimer <= 0) { mkTex.needsUpdate = true; mkDirty = false; mkTimer = 0.08; }
    return;
  }
  if (G.state === 'pause' || G.state === 'over') return;
  if (G.state === 'intro') { G.timer -= dt; if (G.timer <= 0) beginPlay(); }
  else if (G.state === 'cleared') {
    G.timer -= dt;
    if (G.timer <= 0) {
      if (G.mission >= 100) { gameOver(true); return; }
      hideBanner(); loadMission(G.mission + 1, false); startIntro(false);
    }
  } else if (G.state === 'dead') {
    G.timer -= dt;
    if (G.timer <= 1.4 && $('banner').hidden && G.lives > 1) showBanner(tr('banner.mission') + ' ' + pad2(G.mission), tr('banner.hit'), tn('banner.left', G.lives - 1));
    if (G.timer <= 0) {
      G.lives--;
      if (G.lives <= 0) { gameOver(false); return; }
      hideBanner(); loadMission(G.mission, true); startIntro(true);
    }
  }
  updateWorld(dt);
  smokeFX.update(dt); fireFX.update(dt); updateDebris(dt);
  // decal upload throttle
  mkTimer -= dt;
  if (mkDirty && mkTimer <= 0) { mkTex.needsUpdate = true; mkDirty = false; mkTimer = 0.08; }
}

// ================================================================ render loop
let last = performance.now(), frameN = 0;
const nextFrame = window.__testLoop ? (f => setTimeout(() => f(performance.now()), 16)) : (f => requestAnimationFrame(f));
let heldDrawn = false;
function frame(now) {
  if (window.__hold) { if (!heldDrawn) { heldDrawn = true; camera.updateMatrixWorld(); updateTags(); renderer.render(scene, camera); } setTimeout(() => frame(performance.now()), 100); last = performance.now(); return; }
  heldDrawn = false;
  nextFrame(frame);
  const raw = (now - last) / 1000; last = now;
  perfTick(raw, now);
  const dt = Math.min(window.__testFast ? 0.2 : 0.1, raw);
  // fixed-size substeps: a slow machine skips frames instead of slowing the game down
  const steps = Math.max(1, Math.ceil(dt * 60 - 0.05));
  for (let i = 0; i < steps; i++) update(dt / steps);
  // camera: intro dolly + shake
  camIntro = Math.max(0, camIntro - dt * 1.3);
  const ease = camIntro * camIntro * (3 - 2 * camIntro);
  const d = camDist * (1 + ease * 0.08);
  shake = Math.max(0, shake - dt * 0.9);
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  camera.position.set(camTarget.x + camOff.x * Math.cos(PITCH) * d + sx, Math.sin(PITCH) * d + sy, camTarget.z + camOff.z * Math.cos(PITCH) * d);
  camera.lookAt(camTarget.x + sx * 0.5, 0, camTarget.z);
  flashI *= Math.exp(-dt * 9); flash.intensity = flashI;
  camera.updateMatrixWorld();
  updateTags();
  if (!window.__skipRender || (frameN++ % 20) === 0) renderer.render(scene, camera);
}


fitCamera();
loadMission(1, false);
G.state = 'title';
buildTitle();
showScreen('titleScreen');
$('hint').hidden = true;
nextFrame(frame);

// debug hook for automated checks
window.__tanks = { G, VS, Net, destroyTank, damageTank, startGame, loadMission, TYPES, input, queueFire() { fireQueued = true; }, step(n, dt = 1 / 60, draw = true) { for (let i = 0; i < n; i++) update(dt); if (draw) { mkTex.needsUpdate = true; renderer.render(scene, camera); } } };
})();
