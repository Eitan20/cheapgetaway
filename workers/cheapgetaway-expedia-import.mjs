// Source for the existing Cloudflare Worker of the same name (not a new service).
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Canonicalize BEFORE rewriting: Vercel's domain redirect otherwise sees
    // /import, not the wrapped hotel URL, and loses the hotel path and dates.
    if (url.hostname === 'cheapgetaway.com') {
      url.hostname = 'www.cheapgetaway.com';
      return Response.redirect(url.toString(), 307);
    }
    const dest = new URL('/import', url.origin);
    return fetch(new Request(dest, request));
  }
};
