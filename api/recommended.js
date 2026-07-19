// Vercel serverless function — server-priced homepage "recommended hotels".
//
// Same architecture as zzzello.com's homepage: server-side LiteAPI calls,
// cached at the edge, so every visitor gets an instantly-priced card grid
// instead of a client-side POST /hotels/rates on every page load.
//
// GET /api/recommended -> {
//   luxury: { checkin, checkout, nights, rates: { [hotelId]: { total, ssp, currency } } },
//   weekend: { checkin, checkout, nights, rates: { [hotelId]: { total, ssp, currency } } }
// }
//
// Two independent upstream calls (run in parallel):
//   - luxury: the `luxury` pool (curated high-end hotels, zzzello parity),
//     priced for a 1-night stay exactly 90 days out (UTC-safe).
//   - weekend: the `recommended` + `us` pools, priced for the next Fri->Sun
//     weekend (existing behavior).
// If one call fails, the response still includes the other block (the failed
// key is simply omitted); only a failure of BOTH is a 503.
//
// The upstream request body shape/key order MUST match what index.html's
// (former) client-side fetchHomeRates() sent and what search-results.html /
// hotel-detail.html send — LiteAPI's /hotels/rates response caching is keyed
// off the request body, and differently-shaped/ordered bodies (or different
// endpoints, e.g. aiSearch) can return different/stale rate sets for the same
// hotelIds+dates (see docs/plan.md Phase 7 notes). Never change this shape
// without re-verifying against the live API.
//
// This file is CommonJS (module.exports), not ESM — the repo has no
// package.json, so Vercel's Node runtime treats api/*.js as CommonJS (same
// as api/liteapi.js). The hotel registry lives at api/_homepage-hotels.json
// (not docs/) because .vercelignore excludes the whole docs/ directory from
// deployment; the underscore prefix keeps Vercel from treating the JSON as
// its own function, matching the api/_welcome-email.js convention. A static
// literal require() path is used so Vercel's file tracing bundles it.

const HOTEL_REGISTRY = require('./_homepage-hotels.json');

const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0';

// Same algorithm as index.html's nextWeekendDates() (UTC-safe: uses Date.UTC
// throughout so the server's local timezone can never shift the result).
function nextWeekendDates() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun ... 5 = Fri ... 6 = Sat
  let add = (5 - day + 7) % 7;
  if (add === 0) add = 7; // today is Friday -> use next Friday, not today
  const checkinDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + add));
  const checkoutDate = new Date(Date.UTC(checkinDate.getUTCFullYear(), checkinDate.getUTCMonth(), checkinDate.getUTCDate() + 2));
  const fmt = (x) => x.toISOString().split('T')[0];
  return { checkin: fmt(checkinDate), checkout: fmt(checkoutDate) };
}

// zzzello parity: luxury pool priced for a 1-night stay exactly 90 days out
// (UTC-safe, same Date.UTC pattern as above).
function luxuryDates() {
  const now = new Date();
  const checkinDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90));
  const checkoutDate = new Date(Date.UTC(checkinDate.getUTCFullYear(), checkinDate.getUTCMonth(), checkinDate.getUTCDate() + 1));
  const fmt = (x) => x.toISOString().split('T')[0];
  return { checkin: fmt(checkinDate), checkout: fmt(checkoutDate) };
}

// Duplicate of cg-rates.js cgBestRate() — this function runs on the server
// and can't load browser globals, so the ~15 lines are copied verbatim
// (logic must stay identical to the client-side helper).
function cgBestRate(rateRow) {
  const roomTypes = (rateRow && rateRow.roomTypes) || [];
  let best = null;
  roomTypes.forEach((rt) => {
    ((rt && rt.rates) || []).forEach((r) => {
      const rr = r && r.retailRate;
      const totalObj = rr && rr.total && rr.total[0];
      const amt = totalObj ? Number(totalObj.amount) : NaN;
      if (!isNaN(amt) && (!best || amt < best.total)) {
        const sspObj = rr.suggestedSellingPrice && rr.suggestedSellingPrice[0];
        const sspAmt = sspObj ? Number(sspObj.amount) : NaN;
        best = {
          total: amt,
          ssp: !isNaN(sspAmt) ? sspAmt : null,
          currency: totalObj.currency || (sspObj && sspObj.currency) || 'USD'
        };
      }
    });
  });
  return best;
}

function cgNights(checkin, checkout) {
  try {
    const ci = new Date(checkin);
    const co = new Date(checkout);
    const ms = co - ci;
    if (!isFinite(ms)) return 1;
    const nights = Math.round(ms / 86400000);
    return nights > 0 ? nights : 1;
  } catch (e) {
    return 1;
  }
}

function loadWeekendHotelIds() {
  const recommended = Array.isArray(HOTEL_REGISTRY.recommended) ? HOTEL_REGISTRY.recommended : [];
  const us = Array.isArray(HOTEL_REGISTRY.us) ? HOTEL_REGISTRY.us : [];
  const ids = recommended.concat(us).map((h) => h.id).filter(Boolean);
  // De-dupe while preserving order, just in case the two pools overlap.
  return Array.from(new Set(ids));
}

function loadLuxuryHotelIds() {
  const luxury = Array.isArray(HOTEL_REGISTRY.luxury) ? HOTEL_REGISTRY.luxury : [];
  return Array.from(new Set(luxury.map((h) => h.id).filter(Boolean)));
}

// Fetch + reduce one /hotels/rates block. Returns { checkin, checkout, nights, rates }
// on success, or null on any upstream failure (fetch error, non-2xx, bad JSON).
async function fetchRatesBlock(apiKey, hotelIds, checkin, checkout) {
  if (!hotelIds.length) return null;

  // Body shape/key order must match the client pages' /hotels/rates calls
  // exactly (see file header comment) — do not reorder or add keys.
  const body = JSON.stringify({
    hotelIds,
    checkin,
    checkout,
    occupancies: [{ adults: 2 }],
    currency: 'USD',
    guestNationality: 'US'
  });

  let upstreamRes;
  try {
    upstreamRes = await fetch(LITEAPI_BASE + '/hotels/rates', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body
    });
  } catch (err) {
    return null;
  }

  if (!upstreamRes.ok) return null;

  let data;
  try {
    data = await upstreamRes.json();
  } catch (err) {
    return null;
  }

  const rows = (data && data.data) || (Array.isArray(data) ? data : []) || [];
  const rates = {};
  rows.forEach((row) => {
    const hotelId = row && (row.hotelId || row.id);
    if (!hotelId) return;
    const best = cgBestRate(row);
    if (best) rates[hotelId] = best;
  });

  const nights = cgNights(checkin, checkout);
  return { checkin, checkout, nights, rates };
}

module.exports = async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.LITEAPI_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'liteapi-unconfigured' });
    return;
  }

  const weekend = nextWeekendDates();
  const luxury = luxuryDates();

  let luxuryIds;
  let weekendIds;
  try {
    luxuryIds = loadLuxuryHotelIds();
    weekendIds = loadWeekendHotelIds();
  } catch (err) {
    res.status(503).json({ error: 'hotel-ids-unavailable', detail: String(err) });
    return;
  }

  if (!luxuryIds.length && !weekendIds.length) {
    res.status(503).json({ error: 'hotel-ids-empty' });
    return;
  }

  const [luxuryBlock, weekendBlock] = await Promise.all([
    fetchRatesBlock(apiKey, luxuryIds, luxury.checkin, luxury.checkout),
    fetchRatesBlock(apiKey, weekendIds, weekend.checkin, weekend.checkout)
  ]);

  if (!luxuryBlock && !weekendBlock) {
    res.status(503).json({ error: 'upstream-error' });
    return;
  }

  const payload = {};
  if (luxuryBlock) payload.luxury = luxuryBlock;
  if (weekendBlock) payload.weekend = weekendBlock;

  res.status(200);
  res.setHeader('content-type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.send(JSON.stringify(payload));
};
