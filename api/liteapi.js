// Vercel serverless function — proxies liteAPI calls so the API key stays server-side.
// Forwards /api/liteapi/<path>?<query> -> https://api.liteapi.travel/v3.0/<path>?<query>
// Injects X-API-Key from process.env.LITEAPI_KEY, falling back to the hardcoded prod key
// found in the client pages so the deploy still works before the env var is set.
//
// This is a flat file (not a [...path].js catch-all) because Vercel's static
// build (framework: null) does not reliably route nested catch-all paths
// (e.g. /api/liteapi/data/hotel) to the function — those 404 before the
// handler ever runs. A rewrite in vercel.json sends
// /api/liteapi/:path* -> /api/liteapi?path=:path* so this single flat
// function always gets invoked, with the original nested path available via
// req.query.path.

const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0';
const FALLBACK_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';
const ALLOWED_METHODS = ['GET', 'POST', 'PUT'];

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();

  if (!ALLOWED_METHODS.includes(method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawPath = req.query.path;
  // Vercel's rewrite destination "?path=:path*" may deliver the forwarded
  // segments as a string (possibly with internal slashes or commas) or as
  // an array depending on how the path was captured. Normalize both.
  let pathSegments;
  if (Array.isArray(rawPath)) {
    pathSegments = rawPath;
  } else if (rawPath) {
    pathSegments = String(rawPath).split(',');
  } else {
    pathSegments = [];
  }
  // Segments may themselves contain slashes (e.g. a single element
  // "data/hotel"); split those too so we always re-encode per-segment.
  const upstreamPath = pathSegments
    .flatMap((seg) => String(seg).split('/'))
    .filter((seg) => seg.length)
    .map(encodeURIComponent)
    .join('/');

  // Build the upstream query string from req.query, dropping the injected
  // "path" param but preserving every other original query param.
  const upstreamParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      for (const v of value) upstreamParams.append(key, v);
    } else if (value !== undefined) {
      upstreamParams.append(key, value);
    }
  }
  const queryString = upstreamParams.toString() ? '?' + upstreamParams.toString() : '';
  const upstreamUrl = LITEAPI_BASE + '/' + upstreamPath + queryString;

  const apiKey = process.env.LITEAPI_KEY || FALLBACK_KEY;

  const upstreamHeaders = {
    'X-API-Key': apiKey,
    'accept': 'application/json'
  };

  const init = {
    method,
    headers: upstreamHeaders
  };

  if (method === 'POST' || method === 'PUT') {
    let bodyText = '';
    if (typeof req.body === 'string') {
      bodyText = req.body;
    } else if (req.body && Object.keys(req.body).length) {
      bodyText = JSON.stringify(req.body);
    } else {
      bodyText = await readRawBody(req);
    }
    if (bodyText) {
      init.body = bodyText;
      upstreamHeaders['content-type'] = 'application/json';
    }
  }

  let upstreamRes;
  try {
    upstreamRes = await fetch(upstreamUrl, init);
  } catch (err) {
    res.status(502).json({ error: 'Upstream fetch failed', detail: String(err) });
    return;
  }

  const text = await upstreamRes.text();
  res.status(upstreamRes.status);
  res.setHeader('content-type', 'application/json');
  res.send(text);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
