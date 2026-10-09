// Stockage clé/valeur JSON : Netlify Blobs en production, fichiers locaux en développement.
import { createHash } from 'node:crypto';

let _kv = null;

function fsKV(dir) {
  return (async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    await fs.mkdir(dir, { recursive: true });
    const file = (k) => path.join(dir, encodeURIComponent(k) + '.json');
    const etagOf = (txt) => createHash('sha1').update(txt).digest('hex');
    const read = async (k) => {
      try { return await fs.readFile(file(k), 'utf8'); } catch { return null; }
    };
    return {
      async get(k) { const t = await read(k); return t == null ? null : JSON.parse(t); },
      async getE(k) { const t = await read(k); return t == null ? null : { data: JSON.parse(t), etag: etagOf(t) }; },
      async set(k, v, opts = {}) {
        const cur = await read(k);
        if (opts.onlyIfNew && cur != null) return false;
        if (opts.onlyIfMatch && (cur == null || etagOf(cur) !== opts.onlyIfMatch)) return false;
        await fs.writeFile(file(k), JSON.stringify(v));
        return true;
      },
      async del(k) { try { await fs.unlink(file(k)); } catch { /* absent */ } },
      async keys(prefix) {
        const names = await fs.readdir(dir);
        return names.filter((n) => n.endsWith('.json')).map((n) => decodeURIComponent(n.slice(0, -5))).filter((k) => k.startsWith(prefix));
      },
    };
  })();
}

async function blobsKV() {
  const { getStore } = await import('@netlify/blobs');
  const s = getStore({ name: 'vocaquest', consistency: 'strong' });
  return {
    async get(k) { return await s.get(k, { type: 'json' }); },
    async getE(k) {
      const r = await s.getWithMetadata(k, { type: 'json' });
      return r ? { data: r.data, etag: r.etag } : null;
    },
    async set(k, v, opts = {}) {
      const r = await s.setJSON(k, v, opts);
      return !(r && r.modified === false);
    },
    async del(k) { await s.delete(k); },
    async keys(prefix) {
      const { blobs } = await s.list({ prefix });
      return blobs.map((b) => b.key);
    },
  };
}

export async function kv() {
  if (!_kv) _kv = process.env.LOCAL_STORE_DIR ? await fsKV(process.env.LOCAL_STORE_DIR) : await blobsKV();
  return _kv;
}

// Lecture-modification-écriture protégée par etag (plusieurs essais en cas de conflit).
export async function update(key, fn, init) {
  const s = await kv();
  for (let i = 0; i < 6; i++) {
    const cur = await s.getE(key);
    let data = cur ? cur.data : init ? init() : null;
    if (data == null) { const e = new Error('introuvable'); e.status = 404; throw e; }
    const out = await fn(data);
    const ok = cur ? await s.set(key, data, { onlyIfMatch: cur.etag }) : await s.set(key, data, { onlyIfNew: true });
    if (ok) return out === undefined ? data : out;
    await new Promise((r) => setTimeout(r, 40 * (i + 1)));
  }
  const e = new Error('conflit, réessaie'); e.status = 409; throw e;
}
