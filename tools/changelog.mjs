// Builds CHANGELOG.md (and GitHub release texts) from js/changelog.js.
//   node tools/changelog.mjs              rewrite CHANGELOG.md
//   node tools/changelog.mjs --version    print the newest version number
//   node tools/changelog.mjs --title V    print the French title of version V
//   node tools/changelog.mjs --notes V    print the release text of version V (French, then English)
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { CHANGELOG, GAME_VERSION } = createRequire(import.meta.url)(join(root, 'js/changelog.js'));
const find = v => CHANGELOG.find(e => e.version === String(v).replace(/^v/, ''));

const frDate = iso => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso + 'T12:00:00'));
const list = lines => lines.map(l => `- ${l}`).join('\n');
const releaseText = e => `${list(e.notes.fr)}\n\n**English: ${e.title.en}**\n\n${list(e.notes.en)}\n`;

const [cmd, arg] = process.argv.slice(2);
if (cmd === '--version') {
  console.log(GAME_VERSION);
} else if (cmd === '--title' || cmd === '--notes') {
  const e = find(arg);
  if (!e) { console.error(`Version ${arg} introuvable dans js/changelog.js`); process.exit(1); }
  process.stdout.write(cmd === '--title' ? e.title.fr + '\n' : releaseText(e));
} else {
  const md = ['# Notes de version', '',
    'Historique des versions de Tanks!. Ce fichier est généré à partir de `js/changelog.js` avec `node tools/changelog.mjs` : modifie plutôt ce fichier-là.', '',
    ...CHANGELOG.map(e => `## v${e.version} · ${e.title.fr}\n\n*${frDate(e.date)}*\n\n${releaseText(e)}`)].join('\n');
  writeFileSync(join(root, 'CHANGELOG.md'), md);
  console.log(`CHANGELOG.md : ${CHANGELOG.length} versions, dernière v${GAME_VERSION}`);
}
