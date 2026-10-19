# Play here : https://tanks.eovy.fr/

## Structure du projet

```
index.html       écrans et styles du jeu
config.js        adresse du relais multijoueur
js/i18n.js       tous les textes, en français et en anglais
js/levels.js     missions de la campagne et arènes en ligne
js/game.js       moteur du jeu (rendu, IA, réseau, menus)
server/          relais multijoueur (Cloudflare Worker), voir server/README.md
```

Aucune compilation : GitHub Pages sert ces fichiers tels quels.

- **Textes** : chaque texte a une clé dans `js/i18n.js`, une fois en `fr` et une fois en `en`.
- **Types de tank en ligne** : table `PVP_CLASSES` en haut de `js/game.js`. Ajouter un type, c'est ajouter une ligne, plus son nom et sa description dans `js/i18n.js` (`cls.<id>.name` et `cls.<id>.desc`).
- **Difficulté de l'IA** : réglages globaux `AI_TUNE` en haut de `js/game.js`.
- **Mise en ligne** : après une modification d'un fichier `js/`, change le `?v=` des balises `<script>` en bas de `index.html` (par exemple la date du jour). Les navigateurs chargeront alors la nouvelle version au lieu de celle en cache.
