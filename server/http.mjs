// Routeur de l'API /api/* de l'appli.
import * as C from './core.mjs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const ROUTES = {
  'POST /profile': ({ body }) => C.createProfile(body),
  'POST /redeem': ({ body }) => C.redeem(body),
  'GET /me': async ({ p }) => ({ profile: C.publicProfile(p) }),
  'POST /me': async ({ p, body }) => ({ profile: await C.updateMe(p, body) }),
  'POST /level': async ({ p, body }) => ({ profile: await C.setLevel(p, body) }),
  'GET /words': async ({ p, q }) => ({ words: await C.wordsFor(p, q.lang || p.lang) }),
  'POST /answer': ({ p, body }) => C.answer(p, body),
  'POST /review': ({ p, body }) => C.toggleReview(p, body),
  'POST /finish': ({ p, body }) => C.finish(p, body),
  'POST /lessons': ({ p, body }) => C.createLesson(p, body),
  'POST /lessons/delete': async ({ p, body }) => ({ profile: await C.deleteLesson(p, body) }),
  'POST /transfer': ({ p }) => C.transferCode(p),
  'POST /admin/claim': async ({ p, body }) => ({ profile: await C.claimAdmin(p, body) }),
  'GET /admin/summary': ({ p }) => { C.requireAdmin(p); return C.summary(); },
  'GET /admin/words': ({ p, q }) => { C.requireAdmin(p); return C.listWords({ ...q, missing_synonyms: q.missing_synonyms === '1' }); },
  'POST /admin/word': ({ p, body }) => { C.requireAdmin(p); return C.updateWord({ ...body, by: 'admin' }); },
  'POST /admin/request': ({ p, body }) => { C.requireAdmin(p); return C.createRequest(p, body); },
  'POST /admin/revert': ({ p, body }) => { C.requireAdmin(p); return C.revertReview(body); },
  'GET /admin/export': async ({ p, q }) => {
    C.requireAdmin(p);
    const csv = await C.exportCsv({ lang: q.lang });
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="vocaquest-${q.lang || 'tout'}.csv"` } });
  },
};

const PUBLIC = new Set(['POST /profile', 'POST /redeem']);

export async function handleApi(req) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
    const key = `${req.method} ${path}`;
    const route = ROUTES[key];
    if (!route) return json({ error: 'route inconnue' }, 404);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const q = Object.fromEntries(url.searchParams);
    const p = PUBLIC.has(key) ? null : await C.auth(req);
    const out = await route({ req, body, q, p });
    return out instanceof Response ? out : json(out);
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    return json({ error: status >= 500 ? 'Erreur du serveur, réessaie dans un instant.' : e.message }, status);
  }
}
