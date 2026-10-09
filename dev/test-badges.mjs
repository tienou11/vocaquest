// Test de la perte des badges après un mois sans partie.
import fs from 'node:fs';
import assert from 'node:assert/strict';
process.env.LOCAL_STORE_DIR = '/tmp/vq-badges-test';
fs.rmSync(process.env.LOCAL_STORE_DIR, { recursive: true, force: true });
const C = await import('../server/core.mjs');
const { kv } = await import('../server/store.mjs');
const s = await kv();
const { profile } = await C.createProfile({ invite: '' });
const P = async () => s.get(`p/${profile.id}`);
let r = await C.finish(await P(), { mode: 'my_level', lang: 'en', score: 20, total: 20, day: '2026-10-01' });
assert.deepEqual(r.newBadges.sort(), ['first_game', 'perfect'].sort());
await C.createLesson(await P(), { name: 'L1', lang: 'en', rows: [{ t: ['a cat'], f: ['un chat'] }] });
let p = await P();
assert.ok(p.badges.lesson1 && !p.badges.lesson1.lost);
// Recule les dates : dernière partie il y a 65 jours, leçon gagnée après la partie.
p.sessions.forEach((x) => { x.at = new Date(Date.now() - 65 * 864e5).toISOString(); });
p.badges.first_game.at = new Date(Date.now() - 65 * 864e5).toISOString();
p.badges.perfect.at = new Date(Date.now() - 65 * 864e5 + 1000).toISOString();
p.badges.lesson1.at = new Date(Date.now() - 64 * 864e5).toISOString();
p.lessons.forEach((l) => { l.created = new Date(Date.now() - 64 * 864e5).toISOString(); });
await s.set(`p/${profile.id}`, p);
let me = await C.getMe(await P());
const lost = Object.entries(me.badges).filter(([, v]) => v.lost).map(([k]) => k);
assert.deepEqual(lost.sort(), ['lesson1', 'perfect'].sort(), 'deux mois = deux badges perdus, les plus récents');
assert.deepEqual(me.badgeNews.sort(), ['lesson1', 'perfect'].sort());
// Relire ne retire rien de plus.
me = await C.getMe(await P());
assert.equal(Object.values(me.badges).filter((v) => v.lost).length, 2);
// Rejouer (sans 20/20) regagne seulement ce qui est refait.
r = await C.finish(await P(), { mode: 'my_level', lang: 'en', score: 12, total: 20, day: '2026-12-10' });
p = await P();
assert.ok(p.badges.perfect.lost, '20/20 pas refait');
assert.ok(p.badges.lesson1.lost, 'pas de nouvelle leçon');
r = await C.finish(await P(), { mode: 'my_level', lang: 'en', score: 20, total: 20, day: '2026-12-10' });
assert.deepEqual(r.newBadges, ['perfect']);
await C.updateMe(await P(), { badgeAck: true });
assert.deepEqual((await P()).badgeNews, []);
console.log('TESTS BADGES OK');
