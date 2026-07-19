// Minimal local dev server for testing the static site + the real liteAPI
// proxy handler. No dependencies.
//
//   node scripts/dev-server.mjs        (PORT env overrides, default 8940)
//
// - Static files are served from the repo root with clean-URL resolution
//   (`/checkout` -> checkout.html), mirroring Vercel's `cleanUrls`.
// - `/api/liteapi/...` is dispatched to the REAL exported handler in
//   api/liteapi.js, adapting Node's req/res to the Vercel handler shape the
//   same way the vercel.json rewrite does (path captured into req.query.path).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8940);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

const { default: liteapiHandler } = await import(pathToFileURL(join(ROOT, 'api', 'liteapi.js')).href);
const { default: bookingEmailHandler } = await import(pathToFileURL(join(ROOT, 'api', 'booking-email.js')).href);
const { default: recommendedHandler } = await import(pathToFileURL(join(ROOT, 'api', 'recommended.js')).href);

function makeRes(res) {
  const api = {
    status(code) { res.statusCode = code; return api; },
    setHeader(k, v) { res.setHeader(k, v); return api; },
    json(obj) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); return api; },
    send(body) { res.end(typeof body === 'string' ? body : Buffer.from(body || '')); return api; }
  };
  return api;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // API proxy: emulate the vercel.json rewrite /api/liteapi/:path* -> ?path=:path*
  if (pathname === '/api/liteapi' || pathname.startsWith('/api/liteapi/')) {
    const rest = pathname === '/api/liteapi' ? '' : pathname.slice('/api/liteapi/'.length);
    const query = {};
    for (const [k, v] of url.searchParams) query[k] = v;
    query.path = rest;
    req.query = query;
    try { await liteapiHandler(req, makeRes(res)); }
    catch (err) { res.statusCode = 500; res.end(JSON.stringify({ error: 'handler threw', detail: String(err) })); }
    return;
  }

  // /api/booking-email -> real exported handler (Node req/res, no rewrite needed).
  if (pathname === '/api/booking-email') {
    try { await bookingEmailHandler(req, makeRes(res)); }
    catch (err) { res.statusCode = 500; res.end(JSON.stringify({ error: 'handler threw', detail: String(err) })); }
    return;
  }

  // /api/recommended -> real exported handler (Node req/res, no rewrite needed).
  if (pathname === '/api/recommended') {
    const query = {};
    for (const [k, v] of url.searchParams) query[k] = v;
    req.query = query;
    try { await recommendedHandler(req, makeRes(res)); }
    catch (err) { res.statusCode = 500; res.end(JSON.stringify({ error: 'handler threw', detail: String(err) })); }
    return;
  }

  // Static files with clean-URL resolution.
  let rel = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (rel === '/' || rel === '\\') rel = '/index.html';
  const candidates = extname(rel) ? [rel] : [rel + '.html', join(rel, 'index.html')];
  for (const c of candidates) {
    try {
      const buf = await readFile(join(ROOT, c));
      res.statusCode = 200;
      res.setHeader('content-type', MIME[extname(c)] || 'application/octet-stream');
      res.end(buf);
      return;
    } catch (e) { /* try next */ }
  }
  res.statusCode = 404;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end('<h1>404</h1>');
});

server.listen(PORT, () => console.log(`dev-server on http://localhost:${PORT}`));
