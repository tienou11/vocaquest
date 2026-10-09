import assert from 'node:assert/strict';
process.env.LOCAL_STORE_DIR = '.data-test';
process.env.INVITE_CODE = 'famille'; process.env.ADMIN_CODE = 'admin-test'; process.env.MCP_SECRET = 'sec';
const fs = await import('node:fs/promises'); await fs.rm('.data-test', { recursive: true, force: true });
const { handleApi } = await import('../server/http.mjs');
const { handleMcp } = await import('../server/mcp.mjs');
const call = async (method, path, body, token) => {
  const r = await handleApi(new Request('http://x/api' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }));
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
};
const mcp = async (method, params, id = 1) => { const r = await handleMcp(new Request('http://x/mcp/sec', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) })); return r.json(); };

let r = await call('POST', '/profile', { invite: 'mauvais' }); assert.equal(r.status, 403);
r = await call('POST', '/profile', { invite: 'famille' }); assert.equal(r.status, 200); const tok = r.j.token; const rc = r.j.profile.rc;
r = await call('GET', '/me', null, tok); assert.equal(r.j.profile.role, 'user');
r = await call('GET', '/words?lang=en', null, tok); assert.equal(r.j.words.length, 514); const lvl1 = r.j.words.filter(w => w.level === 1); assert.equal(lvl1.length, 50);
// 5 parties parfaites sans couvrir tous les mots -> pas de montée
for (let i = 0; i < 5; i++) { r = await call('POST', '/finish', { mode: 'my_level', lang: 'en', score: 20, total: 20, day: '2026-10-0' + (i + 1) }, tok); }
assert.equal(r.j.levelChange, 0); assert.equal(r.j.remaining, 50); assert.equal(r.j.profile.streak, 5);
for (const w of lvl1) await call('POST', '/answer', { id: w.id, ok: true }, tok);
r = await call('POST', '/finish', { mode: 'my_level', lang: 'en', score: 20, total: 20, day: '2026-10-06' }, tok);
assert.equal(r.j.levelChange, 1); assert.equal(r.j.profile.prog.en.level, 2);
// leçon : 1 mot connu + 2 nouveaux
r = await call('POST', '/lessons', { name: 'Leçon 4', lang: 'en', date: '2026-10-08', rows: [{ t: ['A cat'], f: ['un chat'] }, { t: ['a giraffe', 'a camelopard'], f: ['une girafe'], level: 2, type: 'nom', theme: 'animaux' }, { t: ['to roar'], f: ['rugir'] }] }, tok);
assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.created, 2); assert.ok(r.j.lesson.words.includes('en-C001'));
const giraffe = r.j.lesson.words.find(id => id.startsWith('u-'));
r = await call('GET', '/words?lang=en', null, tok); assert.equal(r.j.words.length, 516);
// autre profil ne voit pas les mots à vérifier, mais les retrouve s'il ajoute le même
let r2 = await call('POST', '/profile', { invite: 'famille' }); const tok2 = r2.j.token;
r2 = await call('GET', '/words?lang=en', null, tok2); assert.equal(r2.j.words.length, 514);
r2 = await call('POST', '/lessons', { name: 'L', lang: 'en', rows: [{ t: ['a Giraffe'], f: ['une girafe'] }] }, tok2); assert.equal(r2.j.created, 0); assert.equal(r2.j.lesson.words[0], giraffe);
// transfert
r = await call('POST', '/transfer', {}, tok); const code = r.j.code;
r = await call('POST', '/redeem', { code }); assert.equal(r.status, 200); const tok3 = r.j.token;
r = await call('GET', '/me', null, tok); assert.equal(r.status, 401);
r = await call('GET', '/me', null, tok3); assert.equal(r.status, 200);
r = await call('POST', '/redeem', { code: rc.toLowerCase() }); assert.equal(r.status, 200); assert.ok(r.j.newRecovery); const tok4 = r.j.token;
r = await call('GET', '/me', null, tok3); assert.equal(r.status, 401);
// admin
r = await call('GET', '/admin/summary', null, tok4); assert.equal(r.status, 403);
r = await call('POST', '/admin/claim', { code: 'admin-test' }, tok4); assert.equal(r.j.profile.role, 'admin');
r = await call('GET', '/admin/summary', null, tok4); assert.equal(r.j.langs.en.to_check, 2);
r = await call('POST', '/admin/request', { scope: 'to_check' }, tok4); assert.ok(r.j.id);
// MCP
let m = await mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } }); assert.equal(m.result.protocolVersion, '2025-06-18');
m = await mcp('tools/list', {}); assert.ok(m.result.tools.length >= 8);
m = await mcp('tools/call', { name: 'list_requests', arguments: {} }); assert.equal(JSON.parse(m.result.content[0].text).length, 1);
m = await mcp('tools/call', { name: 'list_words', arguments: { status: 'to_check' } }); const tc = JSON.parse(m.result.content[0].text); assert.equal(tc.total, 2);
m = await mcp('tools/call', { name: 'update_word', arguments: { id: giraffe, t: ['a giraffe'], f: ['une girafe'], note: 'grand animal au long cou', status: 'validated', sources: ['https://www.larousse.fr'] } });
const up = JSON.parse(m.result.content[0].text); assert.equal(up.word.status, 'validated');
r2 = await call('GET', '/words?lang=en', null, tok2); assert.ok(r2.j.words.some(w => w.id === giraffe && w.status === 'validated'));
m = await mcp('tools/call', { name: 'update_word', arguments: { id: 'en-C002', t: ['a dog', 'a hound'], f: ['un chien', 'un toutou'], sources: [] } });
const rv = JSON.parse(m.result.content[0].text).review.id;
r = await call('POST', '/admin/revert', { id: rv }, tok4); assert.equal(r.j.reverted, true);
r = await call('GET', '/admin/words?q=dog', null, tok4); assert.deepEqual(r.j.words[0].t, ['a dog']);
const roar = (await mcp('tools/call', { name: 'list_words', arguments: { status: 'to_check' } })).result.content[0].text;
const roarId = JSON.parse(roar).words[0].id;
m = await mcp('tools/call', { name: 'merge_words', arguments: { keep_id: 'en-C001', drop_id: roarId } }); assert.ok(JSON.parse(m.result.content[0].text).merged);
m = await mcp('tools/call', { name: 'complete_request', arguments: { id: JSON.parse((await mcp('tools/call', { name: 'list_requests', arguments: {} })).result.content[0].text)[0].id, summary: 'ok' } });
m = await mcp('tools/call', { name: 'overview', arguments: {} }); assert.equal(JSON.parse(m.result.content[0].text).pendingRequests, 0);
r = await call('GET', '/admin/export?lang=en', null, tok4); assert.ok(String(r.j).includes('terme_1'));
const bad = await handleMcp(new Request('http://x/mcp/nope', { method: 'POST', body: '{}' })); assert.equal(bad.status, 404);
console.log('TOUS LES TESTS API PASSENT');
await fs.rm('.data-test', { recursive: true, force: true });
