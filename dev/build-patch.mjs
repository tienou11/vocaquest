// Construit server/patches.mjs à partir du travail de synonymes (fichier « id|EN|DE|ES|FR|indice|alerte »).
// Usage : node dev/build-patch.mjs <synonymes.txt>
import fs from 'node:fs';
import { SEED } from '../server/seed.mjs';

const src = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n');
const sp = (s) => (s || '').split(';').map((x) => x.trim()).filter(Boolean);

// Indices pour les mots dont la note existante ne concerne qu'une langue.
const HINTS = {
  C015: 'chiffre 1', C112: "le temps qu'il fait", C137: 'patience', C153: 'le lieu de travail', C164: 'prendre en location',
  C216: 'nature, écologie', C230: 'prévision', C242: 'temps présent', C266: 'comédie', C285: 'animal', C327: 'cire ou moteur',
  C342: 'dans un livre, un dictionnaire', C370: 'partie de la jambe', C396: 'du téléphone', C416: 'thé, bière',
  C423: 'partie du corps, assis', C440: 'service, usage', C470: 'balance', C478: "d'argent, de provisions",
  C482: 'de roue ; au figuré « plaque tournante »', C493: 'familier, tricherie', C501: 'proposition conditionnelle', C504: 'vulgaire',
};
// Corrections de traductions existantes (alertes vérifiées).
const RM = {
  C007: { de: ['der Hase'] },
  C298: { fr: ['une nichée'] },
  C301: { fr: ['les flageolets'] },
  C313: { de: ['die Branchen'], fr: ['les filières'] },
  C317: { fr: ['une lettre de motivation'] },
  C355: { fr: ['borné'] },
  C392: { en: ['to peer at'] },
  C447: { fr: ['étroitement'] },
  C512: { de: ['der Angsthase'], fr: ['une poule mouillée'] },
};
const RP = { C319: { fr: { presser: 'se presser' } } };

const data = {};
for (const l of src) {
  const [id, en, de, es, fr, hint] = l.split('|');
  const e = {};
  for (const [k, v] of Object.entries({ en, de, es, fr })) { const a = sp(v); if (a.length) e[k] = a; }
  const h = (HINTS[id] || hint || '').trim();
  if (h) e.h = h;
  if (RM[id]) e.rm = RM[id];
  if (RP[id]) e.rp = RP[id];
  if (Object.keys(e).length) data[id] = e;
}
if (Object.keys(data).length < 500) throw new Error('données incomplètes');
const out = `// Correctifs de la base initiale, appliqués une seule fois par langue (voir core.mjs, applyPatches).
// syn-2026-10 : 1 à 2 synonymes par langue ou indice de sens (R17), et 10 corrections de traductions.
export const PATCHES = [{ id: 'syn-2026-10', data: ${JSON.stringify(data)} }];
`;
fs.writeFileSync(new URL('../server/patches.mjs', import.meta.url), out);
console.log('patches.mjs :', Object.keys(data).length, 'entrées,', Math.round(out.length / 1024), 'Ko');
