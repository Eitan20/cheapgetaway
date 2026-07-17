// Vercel serverless function — proxies liteAPI calls so the API key stays server-side.
// Forwards /api/liteapi/<path>?<query> -> https://api.liteapi.travel/v3.0/<path>?<query>
// Injects X-API-Key from process.env.LITEAPI_KEY, falling back to the hardcoded prod key
// found in the client pages so the deploy still works before the env var is set.

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
  const pathSegments = Array.isArray(rawPath) ? rawPath : (rawPath ? [rawPath] : []);
  const upstreamPath = pathSegments.map(encodeURIComponent).join('/');

  const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
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
