// Serveur local de développement : fichiers statiques + mêmes gestionnaires que les fonctions Netlify.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.LOCAL_STORE_DIR ||= path.join(root, '.data');
process.env.INVITE_CODE ||= 'famille';
process.env.ADMIN_CODE ||= 'admin-test';
process.env.MCP_SECRET ||= 'secret-test';
const { handleApi } = await import('../server/http.mjs');
const { handleMcp } = await import('../server/mcp.mjs');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const port = Number(process.env.PORT || 8888);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/mcp/')) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
    const r = url.pathname.startsWith('/api/') ? await handleApi(request) : await handleMcp(request);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let file = path.join(root, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  try { await fs.access(file); } catch { file = path.join(root, 'public', 'index.html'); }
  const data = await fs.readFile(file);
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(data);
}).listen(port, () => console.log(`VocaQuest local : http://localhost:${port}`));
