// FastCRW (self-hosted) fallback for wrap-URL name misses.
// SPEED RULES: miss-only, short client timeout, no wait-in-queue,
// per-session cap. Fast-fail returns null so the caller keeps the
// URL-parser result. Never logs secrets.

export const CRW_TIMEOUT_MS = 1000; // client abort; Eric: ~1s or less
export const CRW_MAX_INFLIGHT = 2; // if already busy, skip (no queue wait)
export const CRW_SESSION_CAP = 3; // scrapes per search session
export const CRW_DEFAULT_BASE = 'https://crw.srv837509.hstgr.cloud';

let inflight = 0;
const sessionCounts = new Map(); // sessionId -> count
const SESSION_TTL_MS = 30 * 60 * 1000;
let lastSessionSweep = 0;

function sweepSessions(now) {
  if (now - lastSessionSweep < 60_000) return;
  lastSessionSweep = now;
  for (const [k, v] of sessionCounts) {
    if (!v || now - v.t > SESSION_TTL_MS) sessionCounts.delete(k);
  }
}

export function needsScrapeFallback(parsed) {
  if (!parsed) return false;
  // Success with a usable hotel name → never scrape.
  if (parsed.ok && String(parsed.hotelName || '').trim()) return false;
  // Wrong LiteAPI pin after a good name is NOT a miss.
  if (parsed.ok && String(parsed.hotelName || '').trim()) return false;
  // Nameless ID / google-entity / no-hotel: scrape may recover the name.
  if (!parsed.ok) {
    const err = parsed.error || '';
    if (err === 'no-hotel-or-destination' || err === 'google-entity') return true;
    // Keep other hard failures (invalid-url, missing-url) off the scraper.
    return false;
  }
  // ok:true but empty hotelName (city-only) — do not scrape; city search is enough.
  return false;
}

export function extractHotelFromCrw(title, markdown, source) {
  let t = String(title || '').trim();
  if (!t && markdown) {
    const h1 = String(markdown).match(/^#\s+(.+)$/m);
    if (h1) t = h1[1].trim();
  }
  if (!t) return null;
  // Bot / challenge pages
  if (/bot or not|just a moment|attention required|access denied|captcha|verify you are human/i.test(t)) {
    return null;
  }

  let name = t;
  // Booking.com: "Eteoro Suites, Imerovigli (updated prices 2027)"
  name = name.replace(/\s*\((?:updated\s+)?prices?\s*[^)]*\)\s*$/i, '');
  name = name.replace(/\s*[-–|]\s*(?:Booking\.com|Hotels\.com|Expedia|Official Site).*$/i, '');
  name = name.replace(/:\s*Hotel Reviews.*$/i, '');
  name = name.replace(/\s+-\s+Hotel Reviews.*$/i, '');

  let cityName = '';
  // "Name, City" or "Name, City, Region"
  const comma = name.split(',').map((x) => x.trim()).filter(Boolean);
  if (comma.length >= 2 && comma[0].split(/\s+/).length >= 1) {
    // Prefer keeping full hotel name before first comma when second looks like a place.
    const maybeCity = comma[1].replace(/\s*\(.*$/, '').trim();
    if (maybeCity && maybeCity.length <= 40 && !/hotel|suite|resort|inn\b/i.test(maybeCity)) {
      cityName = maybeCity;
      name = comma[0];
    }
  }

  name = name.replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 120) return null;
  return { hotelName: name, cityName };
}

function getCrwConfig(env = process.env) {
  const base = String(env.CRW_API_URL || CRW_DEFAULT_BASE).trim().replace(/\/+$/, '');
  const key = String(env.CRW_API_KEY || '').trim();
  return { base, key };
}

/**
 * Try a short CRW scrape. Returns { hotelName, cityName, meta } or null.
 * Never throws. Never waits on a full queue.
 */
export async function tryCrwHotelFallback(pageUrl, opts = {}) {
  const {
    sessionId = '',
    source = '',
    timeoutMs = CRW_TIMEOUT_MS,
    env = process.env,
    fetchImpl = globalThis.fetch
  } = opts;

  const target = String(pageUrl || '').trim();
  if (!/^https?:\/\//i.test(target)) return null;

  const { base, key } = getCrwConfig(env);
  if (!base || !key) return null;

  const now = Date.now();
  sweepSessions(now);

  if (sessionId) {
    const row = sessionCounts.get(sessionId) || { n: 0, t: now };
    if (row.n >= CRW_SESSION_CAP) {
      return null; // over per-session cap → fast-fail
    }
  }

  if (inflight >= CRW_MAX_INFLIGHT) {
    return null; // queue backed up → fast-fail (do not wait)
  }

  inflight += 1;
  if (sessionId) {
    const row = sessionCounts.get(sessionId) || { n: 0, t: now };
    row.n += 1;
    row.t = now;
    sessionCounts.set(sessionId, row);
  }

  const ctl = new AbortController();
  const budget = Math.max(200, timeoutMs);
  const started = Date.now();
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      ctl.abort();
      reject(new Error('crw-timeout'));
    }, budget);
    // Attach clearer for callers that race; unref so tests can exit.
    if (timer && typeof timer.unref === 'function') timer.unref();
  });
  try {
    const fetchPromise = fetchImpl(`${base}/v1/scrape`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: target,
        formats: ['markdown'],
        // Bound server work to our client budget; CRW may still pick HTTP tier.
        deadlineMs: Math.max(200, timeoutMs - 50)
      }),
      signal: ctl.signal
    });
    const res = await Promise.race([fetchPromise, timeoutPromise]);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) return null;
    const data = (json && json.data) || json || {};
    const meta = (data && data.metadata) || {};
    const title = (typeof meta.title === 'string' && meta.title) || (typeof data.title === 'string' && data.title) || '';
    const markdown = typeof data.markdown === 'string' ? data.markdown : '';
    const extracted = extractHotelFromCrw(title, markdown, source);
    if (!extracted) return null;
    return {
      ...extracted,
      meta: { ms: Date.now() - started, provider: 'crw' }
    };
  } catch {
    return null; // timeout / network → fast-fail
  } finally {
    inflight = Math.max(0, inflight - 1);
  }
}

/** Test seam */
export function _resetCrwFallbackState() {
  inflight = 0;
  sessionCounts.clear();
  lastSessionSweep = 0;
}
