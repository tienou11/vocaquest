// Construit une version de démonstration autonome (un seul fichier HTML) :
// le serveur tourne dans le navigateur, les données restent sur l'appareil.
// Usage : node dev/build-demo.mjs <fichier-sortie.html>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const out = process.argv[2] || path.join(root, 'demo.html');

function moduleOf(name, file) {
  let src = read(file);
  const exportsList = [...src.matchAll(/^export (?:async )?(?:function|const|class|let) (\w+)/gm)].map((m) => m[1]);
  src = src.replace(/^import \* as (\w+) from '([^']+)';$/gm, (_, id, from) => `const ${id} = MOD['${from}'];`);
  src = src.replace(/^import \{([^}]+)\} from '([^']+)';$/gm, (_, ids, from) => `const {${ids}} = MOD['${from}'];`);
  src = src.replace(/^export /gm, '');
  return `MOD['./${path.basename(file)}'] = (() => {\n${src}\nreturn { ${exportsList.join(', ')} };\n})();\n`;
}

const shim = `
window.VQ_DEMO = true;
const process = { env: { ADMIN_CODE: 'admin' } };
const MOD = {};
MOD['node:crypto'] = (() => {
  const bytes = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; };
  const enc = (a, e) => {
    if (e === 'hex') return Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
    let s = ''; for (const b of a) s += String.fromCharCode(b);
    return btoa(s).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
  };
  const fnv = (str, seed) => { let h = seed >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); };
  return {
    randomBytes: (n) => { const a = bytes(n); return { toString: (e) => enc(a, e) }; },
    randomInt: (a, b) => { if (b === undefined) { b = a; a = 0; } return a + Math.floor(Math.random() * (b - a)); },
    createHash: () => { let d = ''; const h = { update(s) { d += s; return h; }, digest() { return fnv(d, 2166136261) + fnv(d, 33554467) + fnv(d, 1099511) + fnv(d, 97); } }; return h; },
  };
})();
MOD['./store.mjs'] = (() => {
  const KEY = 'vq_demo_kv';
  let m = new Map();
  try { const raw = localStorage.getItem(KEY); if (raw) m = new Map(JSON.parse(raw)); } catch (e) { /* stockage indisponible */ }
  if (m.size === 0) { try { localStorage.removeItem('vq_token'); } catch (e) { /* idem */ } }
  const tags = new Map(); let n = 0; let t = null;
  const flush = () => { clearTimeout(t); t = null; try { localStorage.setItem(KEY, JSON.stringify(Array.from(m))); } catch (e) { /* idem */ } };
  const save = () => { clearTimeout(t); t = setTimeout(flush, 150); };
  window.addEventListener('pagehide', () => { if (t) flush(); });
  document.addEventListener('visibilitychange', () => { if (t) flush(); });
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const s = {
    async get(k) { return m.has(k) ? clone(m.get(k)) : null; },
    async getE(k) { return m.has(k) ? { data: clone(m.get(k)), etag: tags.get(k) || 'e0' } : null; },
    async set(k, v, o = {}) {
      if (o.onlyIfNew && m.has(k)) return false;
      if (o.onlyIfMatch && (!m.has(k) || (tags.get(k) || 'e0') !== o.onlyIfMatch)) return false;
      m.set(k, clone(v)); tags.set(k, 'e' + (++n)); save(); return true;
    },
    async del(k) { m.delete(k); tags.delete(k); save(); },
    async keys(p) { return Array.from(m.keys()).filter((k) => k.startsWith(p)); },
  };
  async function kv() { return s; }
  async function update(key, fn, init) {
    const cur = await s.getE(key);
    const data = cur ? cur.data : init ? init() : null;
    if (data == null) { const e = new Error('introuvable'); e.status = 404; throw e; }
    const outv = await fn(data);
    await s.set(key, data);
    return outv === undefined ? data : outv;
  }
  return { kv, update };
})();
`;

const fetchHook = `
(() => {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const u = typeof input === 'string' ? input : input.url;
    if (u.startsWith('/api/')) {
      const req = new Request('https://demo.local' + u, { method: init.method || 'GET', headers: init.headers, body: init.body });
      return MOD['./http.mjs'].handleApi(req);
    }
    return realFetch(input, init);
  };
})();
`;

const server = shim
  + moduleOf('norm', 'server/norm.mjs')
  + moduleOf('seed', 'server/seed.mjs')
  + moduleOf('core', 'server/core.mjs')
  + moduleOf('http', 'server/http.mjs')
  + fetchHook;

const css = read('public/style.css');
const app = read('public/app.js');
const html = `<title>VocaQuest démo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
${css}
.demo-note { max-width: 480px; margin: 0 auto; text-align: center; font-size: 12px; color: var(--muted); padding: 10px 16px 24px; background: var(--bg); }
</style>
<main id="app" aria-live="polite"></main>
<div class="demo-note">Version de démonstration : tout reste sur cet appareil. Code administrateur de la démo : <b>admin</b></div>
<script>
${server}
</script>
<script>
${app}
</script>
`;
fs.writeFileSync(out, html);
console.log('démo écrite :', out, Math.round(html.length / 1024), 'Ko');
