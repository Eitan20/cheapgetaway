// cg-api.js — shared liteAPI fetch helper for the static site drop.
//
// Usage: window.cgApiFetch(path, options) -> Promise<Response>
//   path: e.g. 'data/hotel?hotelId=lp1a278' or 'hotels/rates' (leading slash optional)
//   options: standard fetch RequestInit (method, headers, body, ...)
//
// All traffic goes through the same-origin serverless proxy
// (/api/liteapi/<path>), which injects the API key server-side. There is no
// client-side direct-to-liteAPI fallback — no key is embedded here.

(function (global) {
  function normalizePath(path) {
    return String(path || '').replace(/^\/+/, '');
  }

  function proxyHeaders(callerHeaders) {
    // The proxy injects X-API-Key itself; forward caller headers minus any key.
    const h = Object.assign({ 'accept': 'application/json' }, callerHeaders || {});
    delete h['X-API-Key'];
    delete h['x-api-key'];
    return h;
  }

  async function cgApiFetch(path, options) {
    const opts = Object.assign({}, options);
    opts.headers = proxyHeaders(options && options.headers);
    return fetch('/api/liteapi/' + normalizePath(path), opts);
  }

  global.cgApiFetch = cgApiFetch;
})(typeof window !== 'undefined' ? window : this);
