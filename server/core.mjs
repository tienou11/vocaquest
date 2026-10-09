// Logique métier de VocaQuest (indépendante du transport HTTP / MCP).
import { randomBytes, createHash, randomInt } from 'node:crypto';
import { kv, update } from './store.mjs';
import { norm, wordKey } from './norm.mjs';
import { SEED } from './seed.mjs';
import { PATCHES } from './patches.mjs';
import { awardBadges, decayBadges } from './badges.mjs';

export const LANGS = ['en', 'de', 'es'];
const TYPES = ['nom', 'verbe', 'adjectif', 'adverbe', 'expression', ''];

export class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

const sha = (s) => createHash('sha256').update(s).digest('hex');
const nowIso = () => new Date().toISOString();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rid = (n = 9) => randomBytes(n).toString('base64url').replace(/[-_]/g, 'x');

function cleanTerms(arr, max = 3) {
  const list = Array.isArray(arr) ? arr : typeof arr === 'string' ? arr.split('/') : [];
  const out = [];
  for (const x of list) {
    const v = String(x || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (v && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out.slice(0, max);
}

// ---------- Mots ----------

function seedWords(lang) {
  const words = {};
  for (const r of SEED) {
    const id = `${lang}-${r.c}`;
    words[id] = {
      id, lang, level: r.l, t: r[lang], f: r.fr, type: r.ty || '', theme: '',
      note: r.nl === lang ? r.n : '', status: 'validated', src: 'base', by: null, at: '2026-10-09T00:00:00Z', rv: null,
    };
  }
  return { words };
}

export async function baseDoc(lang) {
  if (!LANGS.includes(lang)) throw new HttpError(400, 'langue inconnue');
  const s = await kv();
  let doc = await s.get(`words/${lang}`);
  if (!doc) {
    await s.set(`words/${lang}`, seedWords(lang), { onlyIfNew: true });
    doc = await s.get(`words/${lang}`);
  }
  const done = doc.patches || [];
  if (PATCHES.some((p) => !done.includes(p.id))) doc = await applyPatches(lang);
  return doc;
}

function mergeTerms(base, add, max = 3) {
  const out = [...base];
  for (const a of add || []) if (!out.some((o) => o.toLowerCase() === a.toLowerCase())) out.push(a);
  return out.slice(0, max);
}

// Applique une seule fois chaque correctif ; un mot déjà relu ou corrigé (rv) n'est pas modifié.
async function applyPatches(lang) {
  return update(`words/${lang}`, (doc) => {
    doc.patches = doc.patches || [];
    for (const p of PATCHES) {
      if (doc.patches.includes(p.id)) continue;
      for (const [c, e] of Object.entries(p.data)) {
        const w = doc.words[`${lang}-${c}`];
        if (!w || w.src !== 'base' || w.rv) continue;
        const rm = e.rm || {}; const rp = e.rp || {};
        const fix = (terms, k) => {
          let out = terms.filter((x) => !(rm[k] || []).includes(x)).map((x) => (rp[k] && rp[k][x]) || x);
          if (!out.length) out = terms;
          return mergeTerms(out, e[k]);
        };
        w.t = fix(w.t, lang);
        w.f = fix(w.f, 'fr');
        if (!w.note && e.h) w.note = e.h;
      }
      doc.patches.push(p.id);
    }
    return doc;
  });
}

async function userWord(id) {
  const s = await kv();
  return s.get(`u/${id}`);
}

// Retrouve un mot (base ou ajouté par un utilisateur) et sa localisation.
export async function findWord(id) {
  const lang = id.startsWith('u-') ? id.split('-')[1] : id.split('-')[0];
  if (!LANGS.includes(lang)) return null;
  const doc = await baseDoc(lang);
  if (doc.words[id]) return { word: doc.words[id], where: 'base', lang };
  const uw = await userWord(id);
  if (uw) return { word: uw, where: 'user', lang };
  return null;
}

async function allUserWords(lang) {
  const s = await kv();
  const keys = await s.keys('u/');
  const docs = await Promise.all(keys.map((k) => s.get(k)));
  return docs.filter((w) => w && (!lang || w.lang === lang));
}

// ---------- Profils et appareils ----------

const RC_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRecovery() {
  let s = '';
  for (let i = 0; i < 12; i++) s += RC_ALPHA[randomInt(RC_ALPHA.length)];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}
const rcKey = (code) => `r/${sha(String(code).toUpperCase().replace(/[^A-Z0-9]/g, ''))}`;

export function publicProfile(p) {
  const { dev, ...rest } = p;
  return rest;
}

export async function createProfile({ invite }) {
  const inv = (process.env.INVITE_CODE || '').trim().toLowerCase();
  const adm = (process.env.ADMIN_CODE || '').trim().toLowerCase();
  const code = String(invite || '').trim().toLowerCase();
  let role = 'user';
  if (adm && code === adm) role = 'admin';
  else if (inv && code !== inv) throw new HttpError(403, "Ce code d'invitation n'est pas valable. Vérifie-le auprès de la personne qui te l'a envoyé.");
  const s = await kv();
  const id = 'p' + rid(9);
  const token = randomBytes(32).toString('base64url');
  const rc = newRecovery();
  const p = {
    id, created: nowIso(), name: '', avatar: randomInt(6), lang: 'en', dir: 'mixed', sound: true,
    xp: 0, streak: 0, best: 0, lastDay: null, role, dev: sha(token), rc, rcAck: false, setup: false,
    prog: {}, w: {}, lessons: [], mine: [], sessions: [], events: [],
  };
  await s.set(`p/${id}`, p);
  await s.set(`d/${sha(token)}`, { pid: id });
  await s.set(rcKey(rc), { pid: id });
  return { token, profile: publicProfile(p) };
}

export async function auth(req) {
  const hdr = req.headers.get('authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'non connecté');
  const s = await kv();
  const dev = await s.get(`d/${sha(token)}`);
  if (!dev) throw new HttpError(401, 'appareil inconnu');
  const p = await s.get(`p/${dev.pid}`);
  if (!p || p.dev !== sha(token)) throw new HttpError(401, 'appareil remplacé');
  return p;
}

const pkey = (p) => `p/${p.id}`;

// Lecture du profil : initialise les badges (anciens profils) et applique la perte après un mois sans partie.
export async function getMe(p) {
  const needInit = !p.badges;
  const last = p.sessions.length ? p.sessions[p.sessions.length - 1].at : null;
  const months = last ? Math.floor((Date.now() - Date.parse(last)) / (30 * 864e5)) : 0;
  const decayDone = p.decay && p.decay.since === last ? p.decay.n : 0;
  if (!needInit && months <= decayDone) return publicProfile(p);
  return update(pkey(p), (q) => {
    if (!q.badges) awardBadges(q, nowIso());
    decayBadges(q, Date.now());
    return publicProfile(q);
  });
}

export async function updateMe(p, b) {
  return update(pkey(p), (q) => {
    if (typeof b.name === 'string') q.name = b.name.trim().slice(0, 30);
    if (Number.isInteger(b.avatar)) q.avatar = clamp(b.avatar, 0, 5);
    if (LANGS.includes(b.lang)) q.lang = b.lang;
    if (['mixed', 'to_fr', 'from_fr'].includes(b.dir)) q.dir = b.dir;
    if (typeof b.sound === 'boolean') q.sound = b.sound;
    if (b.setup === true) q.setup = true;
    if (b.rcAck === true) q.rcAck = true;
    if (b.badgeAck === true) q.badgeNews = [];
    return publicProfile(q);
  });
}

function prog(q, lang) {
  if (!q.prog[lang]) q.prog[lang] = { level: 1, perf: 0, low: 0 };
  return q.prog[lang];
}

export async function setLevel(p, { lang, level }) {
  if (!LANGS.includes(lang)) throw new HttpError(400, 'langue inconnue');
  const lv = clamp(parseInt(level, 10) || 1, 1, 10);
  return update(pkey(p), (q) => {
    const pr = prog(q, lang);
    if (pr.level !== lv) q.events.push({ at: nowIso(), lang, from: pr.level, to: lv, why: 'manual' });
    pr.level = lv; pr.perf = 0; pr.low = 0;
    q.events = q.events.slice(-200);
    return publicProfile(q);
  });
}

// ---------- Mots visibles par un profil ----------

export async function wordsFor(p, lang) {
  const doc = await baseDoc(lang);
  const out = Object.values(doc.words).filter((w) => w.status !== 'to_check' || w.by === p.id);
  const ids = new Set();
  for (const l of p.lessons) if (l.lang === lang) for (const id of l.words) if (id.startsWith('u-')) ids.add(id);
  for (const id of p.mine) if (id.startsWith(`u-${lang}-`)) ids.add(id);
  const extra = await Promise.all([...ids].map((id) => userWord(id)));
  for (const w of extra) if (w && !doc.words[w.id]) out.push(w);
  return out;
}

// ---------- Réponses et parties ----------

export async function answer(p, { id, ok }) {
  if (typeof id !== 'string' || id.length > 40) throw new HttpError(400, 'mot invalide');
  return update(pkey(p), (q) => {
    const st = q.w[id] || (q.w[id] = { s: 0, a: 0, e: 0, c: 0 });
    st.a += 1;
    if (ok) { st.c += 1; st.s = clamp(st.s + 1, -10, 5); q.xp += 10; } else { st.e += 1; st.s = clamp(st.s - 1, -10, 5); }
    st.f = st.f || nowIso();
    st.l = nowIso();
    return { stat: st, xp: q.xp };
  });
}

export async function toggleReview(p, { id, on }) {
  return update(pkey(p), (q) => {
    const st = q.w[id] || (q.w[id] = { s: 0, a: 0, e: 0, c: 0 });
    st.r = !!on;
    return { stat: st };
  });
}

function prevDay(day) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function finish(p, b) {
  const lang = LANGS.includes(b.lang) ? b.lang : p.lang;
  const total = clamp(parseInt(b.total, 10) || 0, 0, 50);
  const score = clamp(parseInt(b.score, 10) || 0, 0, total);
  const mode = String(b.mode || 'custom').slice(0, 20);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(b.day || '') ? b.day : nowIso().slice(0, 10);
  const levelWords = mode === 'my_level' ? Object.values((await baseDoc(lang)).words).filter((w) => w.status !== 'to_check') : [];
  return update(pkey(p), (q) => {
    const pr = prog(q, lang);
    let lc = 0; let remaining = 0; let bonus = 0;
    const level = pr.level;
    if (mode === 'my_level' && total > 0) {
      if (score === total) pr.perf += 1; else pr.perf = 0;
      if (score * 2 < total) pr.low += 1; else pr.low = 0;
      if (pr.perf >= 5) {
        const lw = levelWords.filter((w) => w.level === pr.level);
        remaining = lw.filter((w) => !(q.w[w.id] && q.w[w.id].c >= 1)).length;
        if (remaining === 0 && pr.level < 10) {
          q.events.push({ at: nowIso(), lang, from: pr.level, to: pr.level + 1, why: 'auto_up' });
          pr.level += 1; pr.perf = 0; pr.low = 0; lc = 1; bonus += 100;
        }
      }
      if (pr.low >= 5 && pr.level > 1) {
        q.events.push({ at: nowIso(), lang, from: pr.level, to: pr.level - 1, why: 'auto_down' });
        pr.level -= 1; pr.perf = 0; pr.low = 0; lc = -1;
      }
    }
    if (total >= 5 && score === total) bonus += 50;
    q.xp += bonus;
    if (q.lastDay !== day) {
      q.streak = q.lastDay === prevDay(day) ? q.streak + 1 : 1;
      q.best = Math.max(q.best || 0, q.streak);
      q.lastDay = day;
    }
    const now = nowIso();
    q.sessions.push({ at: now, day, lang, mode, level, score, total, lc, lesson: b.lesson || null, xp: score * 10 + bonus });
    q.sessions = q.sessions.slice(-300);
    q.events = q.events.slice(-200);
    const newBadges = awardBadges(q, now);
    return { profile: publicProfile(q), levelChange: lc, remaining, bonus, newBadges };
  });
}

// ---------- Leçons ----------

export async function createLesson(p, b) {
  const lang = LANGS.includes(b.lang) ? b.lang : p.lang;
  const name = String(b.name || '').trim().slice(0, 60) || 'Ma leçon';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : nowIso().slice(0, 10);
  const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 200);
  if (!rows.length) throw new HttpError(400, 'aucun mot');
  const s = await kv();
  const doc = await baseDoc(lang);
  const baseIdx = new Map();
  for (const w of Object.values(doc.words)) baseIdx.set(wordKey(lang, w.t[0], w.f[0]), w.id);
  const ids = [];
  const created = [];
  for (const r of rows) {
    const t = cleanTerms(r.t);
    const f = cleanTerms(r.f);
    if (!t.length || !f.length) continue;
    const key = wordKey(lang, t[0], f[0]);
    let id = baseIdx.get(key);
    if (!id) {
      const idx = (await s.get(`ui/${lang}`)) || {};
      id = idx[key];
    }
    if (!id) {
      id = `u-${lang}-${rid(6)}`;
      const w = {
        id, lang, level: clamp(parseInt(r.level, 10) || 1, 1, 10), t, f,
        type: TYPES.includes(r.type) ? r.type : '', theme: String(r.theme || '').trim().slice(0, 30),
        note: String(r.note || '').trim().slice(0, 120), status: 'to_check', src: 'user', by: p.id, at: nowIso(), rv: null,
      };
      await s.set(`u/${id}`, w);
      await update(`ui/${lang}`, (idx) => { if (!idx[key]) idx[key] = id; else id = idx[key]; }, () => ({}));
      if (id === w.id) created.push(id); else await s.del(`u/${w.id}`);
    }
    if (!ids.includes(id)) ids.push(id);
  }
  if (!ids.length) throw new HttpError(400, 'aucun mot valable');
  const lesson = { id: 'l' + rid(6), name, lang, date, created: nowIso(), words: ids };
  const today = nowIso().slice(0, 10);
  const prof = await update(pkey(p), (q) => {
    q.lessons.push(lesson);
    for (const id of ids) {
      const st = q.w[id] || (q.w[id] = { s: 0, a: 0, e: 0, c: 0 });
      if (!st.d) st.d = today;
    }
    for (const id of created) if (!q.mine.includes(id)) q.mine.push(id);
    awardBadges(q, nowIso());
    return publicProfile(q);
  });
  return { lesson, profile: prof, created: created.length };
}

export async function deleteLesson(p, { id }) {
  return update(pkey(p), (q) => {
    q.lessons = q.lessons.filter((l) => l.id !== id);
    return publicProfile(q);
  });
}

// ---------- Transfert d'appareil ----------

export async function transferCode(p) {
  const s = await kv();
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  await s.set(`t/${code}`, { pid: p.id, exp: Date.now() + 10 * 60 * 1000, tries: 0 });
  return { code, expiresInSec: 600 };
}

async function bindNewDevice(pid, regenerateRc) {
  const s = await kv();
  const token = randomBytes(32).toString('base64url');
  let newRc = null;
  let oldDev = null;
  let oldRc = null;
  await update(`p/${pid}`, (q) => {
    oldDev = q.dev; q.dev = sha(token);
    if (regenerateRc) { oldRc = q.rc; newRc = newRecovery(); q.rc = newRc; q.rcAck = false; }
  });
  if (oldDev) await s.del(`d/${oldDev}`);
  await s.set(`d/${sha(token)}`, { pid });
  if (regenerateRc) { await s.del(rcKey(oldRc)); await s.set(rcKey(newRc), { pid }); }
  return { token, newRecovery: newRc };
}

export async function redeem({ code }) {
  const s = await kv();
  const c = String(code || '').trim();
  if (/^\d{3}\s?\d{3}$/.test(c)) {
    const k = `t/${c.replace(/\s/g, '')}`;
    const t = await s.get(k);
    if (!t || t.exp < Date.now()) throw new HttpError(400, 'Code inconnu ou expiré. Demande un nouveau code sur ton ancien appareil.');
    await s.del(k);
    return bindNewDevice(t.pid, false);
  }
  const r = await s.get(rcKey(c));
  if (!r) throw new HttpError(400, 'Code de secours inconnu.');
  return bindNewDevice(r.pid, true);
}

// ---------- Administration (appli) ----------

export function requireAdmin(p) {
  if (p.role !== 'admin') throw new HttpError(403, 'réservé à l’administrateur');
}

export async function claimAdmin(p, { code }) {
  if (!process.env.ADMIN_CODE || String(code || '').trim().toLowerCase() !== process.env.ADMIN_CODE.trim().toLowerCase()) throw new HttpError(403, 'Code administrateur incorrect.');
  return update(pkey(p), (q) => { q.role = 'admin'; return publicProfile(q); });
}

export async function listWords({ lang, status, level, missing_synonyms, q, ids, limit = 100, offset = 0 } = {}) {
  const langs = lang ? [lang] : LANGS;
  let all = [];
  for (const l of langs) {
    const doc = await baseDoc(l);
    all.push(...Object.values(doc.words));
    all.push(...(await allUserWords(l)).filter((w) => !doc.words[w.id]));
  }
  if (Array.isArray(ids) && ids.length) all = all.filter((w) => ids.includes(w.id));
  if (status && status !== 'all') all = all.filter((w) => w.status === status);
  if (level) all = all.filter((w) => w.level === Number(level));
  if (missing_synonyms) all = all.filter((w) => (w.t.length < 2 || w.f.length < 2) && !w.note);
  if (q) { const n = norm(q); all = all.filter((w) => [...w.t, ...w.f].some((x) => norm(x).includes(n))); }
  const total = all.length;
  const lim = clamp(parseInt(limit, 10) || 100, 1, 300);
  const off = Math.max(0, parseInt(offset, 10) || 0);
  return { total, words: all.slice(off, off + lim) };
}

export async function summary() {
  const out = { langs: {}, pendingRequests: 0, lastReviews: [] };
  for (const l of LANGS) {
    const doc = await baseDoc(l);
    const base = Object.values(doc.words);
    const uw = (await allUserWords(l)).filter((w) => !doc.words[w.id]);
    const all = [...base, ...uw];
    out.langs[l] = {
      total: all.length,
      to_check: all.filter((w) => w.status === 'to_check').length,
      flagged: all.filter((w) => w.status === 'flagged').length,
      missing_synonyms: all.filter((w) => (w.t.length < 2 || w.f.length < 2) && !w.note).length,
    };
  }
  const reqs = await listRequests({ pending_only: true });
  out.pendingRequests = reqs.length;
  out.lastReviews = await recentReviews({ limit: 30 });
  return out;
}

const FIELDS = ['t', 'f', 'level', 'type', 'theme', 'note', 'status'];

function applyPatch(w, patch) {
  if (patch.t !== undefined) { const t = cleanTerms(patch.t); if (t.length) w.t = t; }
  if (patch.f !== undefined) { const f = cleanTerms(patch.f); if (f.length) w.f = f; }
  if (patch.level !== undefined) w.level = clamp(parseInt(patch.level, 10) || w.level, 1, 10);
  if (patch.type !== undefined && TYPES.includes(patch.type)) w.type = patch.type;
  if (patch.theme !== undefined) w.theme = String(patch.theme || '').trim().slice(0, 30);
  if (patch.note !== undefined) w.note = String(patch.note || '').trim().slice(0, 160);
  if (patch.status !== undefined && ['to_check', 'validated', 'flagged'].includes(patch.status)) w.status = patch.status;
  w.rv = nowIso();
}

async function logReview(entry) {
  const s = await kv();
  const id = `${Date.now().toString(36)}-${rid(4)}`;
  const e = { id, at: nowIso(), ...entry };
  await s.set(`rv/${id}`, e);
  return e;
}

// Met à jour un mot ; un mot utilisateur validé ou à arbitrer rejoint la base commune.
export async function updateWord({ id, sources, comment, by = 'claude', ...patch }) {
  const found = await findWord(String(id || ''));
  if (!found) throw new HttpError(404, `mot ${id} introuvable`);
  const s = await kv();
  const before = JSON.parse(JSON.stringify(found.word));
  let after;
  if (found.where === 'base') {
    after = await update(`words/${found.lang}`, (doc) => { const w = doc.words[id]; applyPatch(w, patch); return w; });
  } else {
    const w = JSON.parse(JSON.stringify(found.word));
    applyPatch(w, patch);
    if (w.status === 'to_check') {
      await s.set(`u/${id}`, w);
    } else {
      await update(`words/${found.lang}`, (doc) => { doc.words[id] = w; });
      await s.del(`u/${id}`);
      await update(`ui/${found.lang}`, (idx) => { for (const k of Object.keys(idx)) if (idx[k] === id) delete idx[k]; }, () => ({}));
    }
    after = w;
  }
  const changed = FIELDS.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  const action = changed.length === 0 ? 'checked' : changed.length === 1 && changed[0] === 'status' ? after.status : 'corrected';
  const review = await logReview({ wid: id, by, action, before, after, changed, sources: Array.isArray(sources) ? sources.slice(0, 6) : [], comment: String(comment || '').slice(0, 300) });
  return { word: after, review: { id: review.id, action, changed } };
}

export async function mergeWords({ keep_id, drop_id, sources, comment, by = 'claude' }) {
  if (!keep_id || !drop_id || keep_id === drop_id) throw new HttpError(400, 'identifiants invalides');
  const keep = await findWord(keep_id);
  const drop = await findWord(drop_id);
  if (!keep || !drop) throw new HttpError(404, 'mot introuvable');
  if (keep.lang !== drop.lang) throw new HttpError(400, 'langues différentes');
  const s = await kv();
  const pkeys = await s.keys('p/');
  let touched = 0;
  for (const k of pkeys) {
    const p = await s.get(k);
    if (!p) continue;
    const uses = p.w[drop_id] || p.lessons.some((l) => l.words.includes(drop_id)) || p.mine.includes(drop_id);
    if (!uses) continue;
    touched += 1;
    await update(k, (q) => {
      const d = q.w[drop_id];
      if (d) {
        const kk = q.w[keep_id];
        if (!kk) q.w[keep_id] = d;
        else {
          kk.s = Math.min(kk.s, d.s); kk.a += d.a; kk.e += d.e; kk.c += d.c;
          kk.d = [kk.d, d.d].filter(Boolean).sort()[0]; kk.r = kk.r || d.r;
          kk.f = [kk.f, d.f].filter(Boolean).sort()[0];
        }
        delete q.w[drop_id];
      }
      for (const l of q.lessons) {
        if (l.words.includes(drop_id)) l.words = [...new Set(l.words.map((x) => (x === drop_id ? keep_id : x)))];
      }
      q.mine = q.mine.filter((x) => x !== drop_id);
    });
  }
  if (drop.where === 'base') await update(`words/${drop.lang}`, (doc) => { delete doc.words[drop_id]; });
  else {
    await s.del(`u/${drop_id}`);
    await update(`ui/${drop.lang}`, (idx) => { for (const k of Object.keys(idx)) if (idx[k] === drop_id) delete idx[k]; }, () => ({}));
  }
  const review = await logReview({ wid: keep_id, dropped: drop_id, by, action: 'merged', before: drop.word, after: keep.word, changed: [], sources: sources || [], comment: String(comment || '').slice(0, 300) });
  return { merged: true, profilesUpdated: touched, review: review.id };
}

export async function recentReviews({ limit = 50 } = {}) {
  const s = await kv();
  const keys = (await s.keys('rv/')).sort().reverse().slice(0, clamp(parseInt(limit, 10) || 50, 1, 200));
  return (await Promise.all(keys.map((k) => s.get(k)))).filter(Boolean);
}

export async function revertReview({ id }) {
  const s = await kv();
  const r = await s.get(`rv/${id}`);
  if (!r) throw new HttpError(404, 'correction introuvable');
  if (r.reverted) throw new HttpError(400, 'déjà annulée');
  if (r.action === 'merged') throw new HttpError(400, 'Une fusion ne peut pas être annulée automatiquement.');
  const b = r.before;
  await updateWord({ id: r.wid, by: 'admin', comment: `annulation de ${id}`, t: b.t, f: b.f, level: b.level, type: b.type, theme: b.theme, note: b.note, status: b.status });
  await s.set(`rv/${id}`, { ...r, reverted: nowIso() });
  return { reverted: true };
}

export async function createRequest(p, { scope, value }) {
  const s = await kv();
  const id = `${Date.now().toString(36)}-${rid(4)}`;
  const sc = ['to_check', 'language', 'level', 'all', 'missing_synonyms'].includes(scope) ? scope : 'to_check';
  const r = { id, at: nowIso(), by: p ? p.id : 'mcp', scope: sc, value: value == null ? null : String(value).slice(0, 10), done: null, summary: null };
  await s.set(`rq/${id}`, r);
  return r;
}

export async function listRequests({ pending_only = true } = {}) {
  const s = await kv();
  const keys = (await s.keys('rq/')).sort().reverse().slice(0, 100);
  const all = (await Promise.all(keys.map((k) => s.get(k)))).filter(Boolean);
  return pending_only ? all.filter((r) => !r.done) : all;
}

export async function completeRequest({ id, summary: sum }) {
  return update(`rq/${id}`, (r) => { r.done = nowIso(); r.summary = String(sum || '').slice(0, 4000); return r; });
}

export async function rotationSample({ lang, n = 50 }) {
  const doc = await baseDoc(lang);
  const words = Object.values(doc.words).filter((w) => w.status === 'validated');
  words.sort((a, b) => (a.rv || '').localeCompare(b.rv || ''));
  return { words: words.slice(0, clamp(parseInt(n, 10) || 50, 1, 150)) };
}

export async function exportCsv({ lang }) {
  const { words } = await listWords({ lang, limit: 300, offset: 0 });
  let all = words;
  let off = 300;
  for (;;) {
    const more = await listWords({ lang, limit: 300, offset: off });
    if (!more.words.length) break;
    all = all.concat(more.words); off += 300;
  }
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['id', 'langue', 'niveau', 'terme_1', 'terme_2', 'terme_3', 'fr_1', 'fr_2', 'fr_3', 'type', 'theme', 'note', 'statut'];
  const lines = [head.join(';')];
  for (const w of all) {
    lines.push([w.id, w.lang, w.level, w.t[0], w.t[1], w.t[2], w.f[0], w.f[1], w.f[2], w.type, w.theme, w.note, w.status].map(q).join(';'));
  }
  return '﻿' + lines.join('\n');
}
