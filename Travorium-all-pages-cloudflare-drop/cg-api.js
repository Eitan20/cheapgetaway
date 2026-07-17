// cg-api.js — shared liteAPI fetch helper for the static site drop.
//
// Usage: window.cgApiFetch(path, options) -> Promise<Response>
//   path: e.g. 'data/hotel?hotelId=lp1a278' or 'hotels/rates' (leading slash optional)
//   options: standard fetch RequestInit (method, headers, body, ...)
//
// Over http(s): tries the same-origin serverless proxy first
// (/api/liteapi/<path>). If that 404s/405s/501s (no serverless runtime, e.g.
// local `python -m http.server` testing — which answers unknown paths with
// 404 for GET but 501 Unsupported method for POST/PUT) or the request
// throws, falls back to calling liteAPI directly with the embedded key. The
// working mode is remembered after the first successful probe so later
// calls skip straight to it.
//
// Over file://: goes direct immediately (no same-origin server to proxy through).

(function (global) {
  const DIRECT_BASE = 'https://api.liteapi.travel/v3.0';
  const DIRECT_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';

  // mode: null = unknown (probe), 'proxy' = use /api/liteapi, 'direct' = call liteAPI directly
  let mode = null;

  function isFileProtocol() {
    return global.location && global.location.protocol === 'file:';
  }

  function normalizePath(path) {
    return String(path || '').replace(/^\/+/, '');
  }

  function directHeaders(callerHeaders) {
    return Object.assign({ 'X-API-Key': DIRECT_KEY, 'accept': 'application/json' }, callerHeaders || {});
  }

  function proxyHeaders(callerHeaders) {
    // The proxy injects X-API-Key itself; forward caller headers minus any key.
    const h = Object.assign({ 'accept': 'application/json' }, callerHeaders || {});
    delete h['X-API-Key'];
    delete h['x-api-key'];
    return h;
  }

  async function callDirect(path, options) {
    const opts = Object.assign({}, options);
    opts.headers = directHeaders(options && options.headers);
    return fetch(DIRECT_BASE + '/' + normalizePath(path), opts);
  }

  async function callProxy(path, options) {
    const opts = Object.assign({}, options);
    opts.headers = proxyHeaders(options && options.headers);
    return fetch('/api/liteapi/' + normalizePath(path), opts);
  }

  async function cgApiFetch(path, options) {
    if (isFileProtocol()) {
      mode = 'direct';
      return callDirect(path, options);
    }

    if (mode === 'direct') {
      return callDirect(path, options);
    }

    if (mode === 'proxy') {
      return callProxy(path, options);
    }

    // Unknown mode: probe the proxy first.
    try {
      const res = await callProxy(path, options);
      if (res.status === 404 || res.status === 405 || res.status === 501) {
        mode = 'direct';
        return callDirect(path, options);
      }
      mode = 'proxy';
      return res;
    } catch (err) {
      mode = 'direct';
      return callDirect(path, options);
    }
  }

  global.cgApiFetch = cgApiFetch;
})(typeof window !== 'undefined' ? window : this);
