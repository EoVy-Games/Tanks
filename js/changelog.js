// Tanks! — patch notes. Newest version first.
// This file is the single source for the in-game patch notes, CHANGELOG.md and the GitHub releases:
//   - add a new entry at the top when a push is a new version;
//   - run `node tools/changelog.mjs` to rewrite CHANGELOG.md;
//   - on GitHub, merging it into main creates the release (see .github/workflows/release.yml).
// Each version is written twice, in French (fr) and English (en), as short lines for players.
const CHANGELOG = [
  {
    version: '0.4.0',
    date: '2026-10-21',
    title: { fr: 'Notes de version', en: 'Patch notes' },
    notes: {
      fr: [
        'Bouton « Notes de version » sur l’écran titre, avec l’historique de toutes les versions.',
        'Un point signale une nouvelle version depuis ta dernière visite.',
      ],
      en: [
        '“Patch notes” button on the title screen, with the history of every version.',
        'A dot shows when a new version came out since your last visit.',
      ],
    },
  },
  {
    version: '0.3.0',
    date: '2026-10-19',
    title: { fr: 'Tanks personnalisés et français / anglais', en: 'Custom tanks, French and English' },
    notes: {
      fr: [
        'En ligne : choisis ton type de tank et sa couleur. Six types : Standard, Ricochet, Foudre, Mineur, Blindé (encaisse un tir de plus) et Fantôme (invisible tant qu’il ne tire pas).',
        'L’IA esquive beaucoup moins : une seule décision par obus, après un temps de réaction.',
        'Missions générées : 7 ennemis au maximum au lieu de 8.',
        'Le jeu est disponible en français et en anglais (choix sur l’écran titre).',
      ],
      en: [
        'Online: pick your tank type and color. Six types: Standard, Ricochet, Lightning, Miner, Armored (takes one extra hit) and Ghost (invisible until it fires).',
        'The AI dodges much less: one decision per shell, after a reaction delay.',
        'Generated missions: at most 7 enemies instead of 8.',
        'The game is available in French and English (choose on the title screen).',
      ],
    },
  },
  {
    version: '0.2.0',
    date: '2026-10-15',
    title: { fr: 'Serveur multijoueur et performances', en: 'Multiplayer server and performance' },
    notes: {
      fr: [
        'Le multijoueur passe par un serveur relais : il fonctionne aussi sur les réseaux d’entreprise.',
        'Réglage Graphismes (Auto, Haute, Moyenne, Basse) et résolution adaptative : beaucoup plus fluide sur grand écran et en bureau à distance.',
        'Le jeu garde sa vitesse même quand l’ordinateur peine.',
      ],
      en: [
        'Multiplayer now goes through a relay server, so it also works on company networks.',
        'Graphics setting (Auto, High, Medium, Low) and adaptive resolution: much smoother on large screens and over remote desktop.',
        'The game keeps its speed even when the computer struggles.',
      ],
    },
  },
  {
    version: '0.1.0',
    date: '2026-10-15',
    title: { fr: 'Première version', en: 'First release' },
    notes: {
      fr: [
        'Campagne de 100 missions sur 5 mondes, avec une carte pour suivre ta progression.',
        '9 types de tanks ennemis, avec une IA qui vise par rebond, esquive et pose des mines.',
        'Obus qui ricochent, mines, blocs roses destructibles et traces de chenilles.',
        'Multijoueur en ligne : duel ou mêlée jusqu’à 4 joueurs, avec un code de partie.',
        'Arènes de tailles variées, rythme nerveux.',
        'Graphismes de jouets en bois, musique et sons originaux.',
        'Clavier et souris, manette et écran tactile.',
      ],
      en: [
        '100-mission campaign across 5 worlds, with a map to track your progress.',
        '9 enemy tank types, with an AI that aims with bounces, dodges and lays mines.',
        'Bouncing shells, mines, breakable pink blocks and tank tracks.',
        'Online multiplayer: duel or free-for-all with up to 4 players, using a game code.',
        'Arenas of varying sizes, fast pace.',
        'Wooden toy graphics, original music and sounds.',
        'Keyboard and mouse, gamepad and touch screen.',
      ],
    },
  },
];
const GAME_VERSION = CHANGELOG[0].version;
if (typeof module !== 'undefined') module.exports = { CHANGELOG, GAME_VERSION };
