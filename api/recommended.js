// Vercel serverless function — server-priced homepage "recommended hotels".
//
// Same architecture as zzzello.com's homepage: one server-side LiteAPI call,
// cached at the edge, so every visitor gets an instantly-priced card grid
// instead of a client-side POST /hotels/rates on every page load.
//
// GET /api/recommended -> { checkin, checkout, nights, rates: { [hotelId]: { total, ssp, currency } } }
//
// The upstream request body shape/key order MUST match what index.html's
// (former) client-side fetchHomeRates() sent and what search-results.html /
// hotel-detail.html send — LiteAPI's /hotels/rates response caching is keyed
// off the request body, and differently-shaped/ordered bodies (or different
// endpoints, e.g. aiSearch) can return different/stale rate sets for the same
// hotelIds+dates (see docs/plan.md Phase 7 notes). Never change this shape
// without re-verifying against the live API.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

async function loadHotelIds() {
  const raw = await readFile(join(ROOT, 'docs', 'homepage-hotels.json'), 'utf8');
  const json = JSON.parse(raw);
  const recommended = Array.isArray(json.recommended) ? json.recommended : [];
  const us = Array.isArray(json.us) ? json.us : [];
  const ids = recommended.concat(us).map((h) => h.id).filter(Boolean);
  // De-dupe while preserving order, just in case the two pools overlap.
  return Array.from(new Set(ids));
}

export default async function handler(req, res) {
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

  const { checkin, checkout } = nextWeekendDates();
  const nights = cgNights(checkin, checkout);

  let hotelIds;
  try {
    hotelIds = await loadHotelIds();
  } catch (err) {
    res.status(503).json({ error: 'hotel-ids-unavailable', detail: String(err) });
    return;
  }

  if (!hotelIds.length) {
    res.status(503).json({ error: 'hotel-ids-empty' });
    return;
  }

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
    res.status(503).json({ error: 'upstream-fetch-failed', detail: String(err) });
    return;
  }

  if (!upstreamRes.ok) {
    res.status(503).json({ error: 'upstream-error', status: upstreamRes.status });
    return;
  }

  let data;
  try {
    data = await upstreamRes.json();
  } catch (err) {
    res.status(503).json({ error: 'upstream-parse-failed', detail: String(err) });
    return;
  }

  const rows = (data && data.data) || (Array.isArray(data) ? data : []) || [];
  const rates = {};
  rows.forEach((row) => {
    const hotelId = row && (row.hotelId || row.id);
    if (!hotelId) return;
    const best = cgBestRate(row);
    if (best) rates[hotelId] = best;
  });

  res.status(200);
  res.setHeader('content-type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.send(JSON.stringify({ checkin, checkout, nights, rates }));
}
