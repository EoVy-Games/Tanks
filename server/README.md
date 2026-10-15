# Relais multijoueur (Cloudflare Worker)

Le multijoueur de Tanks! passe par ce petit relais WebSocket hébergé sur Cloudflare (Worker + Durable Object). Chaque partie a son propre salon, identifié par son code. Le relais ne fait que retransmettre les messages : la partie tourne dans le navigateur de l'hôte.

## Déploiement automatique depuis GitHub

À faire une seule fois, dans le tableau de bord Cloudflare :

1. **Workers & Pages → Create application**, puis importer un dépôt Git existant : `EoVy-Games/Tanks`.
2. Réglages du projet :
   - **Nom** : `tanks-relay` (doit correspondre au `name` de `wrangler.toml`)
   - **Root directory** : `server`
   - **Build command** : vide
   - **Deploy command** : `npx wrangler deploy` (valeur par défaut)
3. **Deploy**. Une fois terminé, la page du Worker affiche son adresse, du type `https://tanks-relay.<compte>.workers.dev`. L'URL `/health` doit répondre `{"ok":true,...}`.
4. Dans `config.js`, à la racine du dépôt, renseigne cette adresse en `wss://` :
   ```js
   window.TANKS_RELAY = 'wss://tanks-relay.<compte>.workers.dev';
   ```

Ensuite, chaque commit sur `main` redéploie le Worker automatiquement.

## Réglages

- `ALLOWED_ORIGINS` (dans `wrangler.toml`) : sites autorisés à se connecter, séparés par des virgules. Il vaut `https://tanks.eovy.fr`. À modifier dans le fichier et non dans le tableau de bord, car chaque déploiement réapplique la valeur du fichier.
- Limites intégrées : 8 connexions par salon, 60 messages par seconde par connexion, 8 Ko par message.

## Tester en local

Avec Node.js 22 ou plus :

```
cd server
npm install
npx wrangler dev
```

Mets ensuite `window.TANKS_RELAY = 'ws://127.0.0.1:8787';` dans `config.js`, et vide `ALLOWED_ORIGINS` le temps du test.

## Coût

L'offre gratuite de Cloudflare donne 100 000 requêtes par jour aux Durable Objects. Un message reçu par le relais compte pour 1/20 de requête, et les messages qu'il envoie sont gratuits. Le jeu envoie 20 messages par seconde et par joueur, ce qui fait environ 14 heures de duel ou 7 heures de mêlée à 4 par jour. Le compteur repart à zéro chaque jour à minuit UTC.
