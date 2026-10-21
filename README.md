# Play here : https://tanks.eovy.fr/

Notes de version : [CHANGELOG.md](CHANGELOG.md)

## Structure du projet

```
index.html       écrans et styles du jeu
config.js        adresse du relais multijoueur
js/i18n.js       tous les textes, en français et en anglais
js/levels.js     missions de la campagne et arènes en ligne
js/changelog.js  notes de version (affichées dans le jeu)
js/game.js       moteur du jeu (rendu, IA, réseau, menus)
server/          relais multijoueur (Cloudflare Worker), voir server/README.md
tools/           outil qui génère CHANGELOG.md
```

Aucune compilation : GitHub Pages sert ces fichiers tels quels.

- **Textes** : chaque texte a une clé dans `js/i18n.js`, une fois en `fr` et une fois en `en`.
- **Types de tank en ligne** : table `PVP_CLASSES` en haut de `js/game.js`. Ajouter un type, c'est ajouter une ligne, plus son nom et sa description dans `js/i18n.js` (`cls.<id>.name` et `cls.<id>.desc`).
- **Difficulté de l'IA** : réglages globaux `AI_TUNE` en haut de `js/game.js`.
- **Mise en ligne** : après une modification d'un fichier `js/`, change le `?v=` des balises `<script>` en bas de `index.html` (par exemple la date du jour). Les navigateurs chargeront alors la nouvelle version au lieu de celle en cache.
- **Notes de version** : une nouvelle version s'ajoute en tête de `js/changelog.js`, en français et en anglais. `node tools/changelog.mjs` réécrit ensuite `CHANGELOG.md`. Une fois la modification fusionnée dans `main`, GitHub publie automatiquement la Release correspondante (`.github/workflows/release.yml`).
