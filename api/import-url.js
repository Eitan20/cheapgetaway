// Vercel serverless function — parse a wrapped Expedia hotel URL into
// CheapGetaway search params (hotel + dates + guests). Code-first parser;
// LiteAPI data/hotels resolves the real property name/id (e.g. Loscar →
// L'oscar London). Never fetches the competitor page (no SSRF).

const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0';

const CITY_TO_COUNTRY = {
  london: 'GB', manchester: 'GB', edinburgh: 'GB', birmingham: 'GB', liverpool: 'GB', glasgow: 'GB', bristol: 'GB',
  paris: 'FR', lyon: 'FR', marseille: 'FR', nice: 'FR',
  'new york': 'US', nyc: 'US', 'los angeles': 'US', la: 'US', 'las vegas': 'US', miami: 'US', chicago: 'US',
  'san francisco': 'US', boston: 'US', seattle: 'US', washington: 'US', 'washington dc': 'US', dc: 'US',
  orlando: 'US', dallas: 'US', houston: 'US', atlanta: 'US', denver: 'US', phoenix: 'US', 'san diego': 'US',
  austin: 'US', nashville: 'US', 'new orleans': 'US', honolulu: 'US',
  rome: 'IT', milan: 'IT', florence: 'IT', venice: 'IT', naples: 'IT',
  barcelona: 'ES', madrid: 'ES', seville: 'ES', valencia: 'ES',
  berlin: 'DE', munich: 'DE', hamburg: 'DE', frankfurt: 'DE',
  amsterdam: 'NL', rotterdam: 'NL',
  dubai: 'AE', 'abu dhabi': 'AE',
  tokyo: 'JP', osaka: 'JP', kyoto: 'JP',
  sydney: 'AU', melbourne: 'AU', brisbane: 'AU',
  toronto: 'CA', vancouver: 'CA', montreal: 'CA',
  singapore: 'SG', 'hong kong': 'HK', bangkok: 'TH', istanbul: 'TR',
  vienna: 'AT', prague: 'CZ', lisbon: 'PT', dublin: 'IE', brussels: 'BE',
  zurich: 'CH', geneva: 'CH', copenhagen: 'DK', stockholm: 'SE', oslo: 'NO', helsinki: 'FI',
  athens: 'GR', budapest: 'HU', warsaw: 'PL', 'mexico city': 'MX', cancun: 'MX'
};

const COUNTRY_NAME_TO_CODE = {
  'united kingdom': 'GB', uk: 'GB', england: 'GB', scotland: 'GB', wales: 'GB',
  'great britain': 'GB', britain: 'GB',
  'united states': 'US', 'united states of america': 'US', usa: 'US', us: 'US', america: 'US',
  france: 'FR', italy: 'IT', spain: 'ES', germany: 'DE', netherlands: 'NL',
  'the netherlands': 'NL', 'united arab emirates': 'AE', uae: 'AE',
  japan: 'JP', australia: 'AU', canada: 'CA', singapore: 'SG',
  'hong kong': 'HK', thailand: 'TH', turkey: 'TR', austria: 'AT',
  'czech republic': 'CZ', czechia: 'CZ', portugal: 'PT', ireland: 'IE',
  belgium: 'BE', switzerland: 'CH', denmark: 'DK', sweden: 'SE',
  norway: 'NO', finland: 'FI', greece: 'GR', hungary: 'HU', poland: 'PL',
  mexico: 'MX'
};

export function unwrapImportUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';

  // cheapgetaway.com/expedia.com/... or cheapgetaway.com/https://www.expedia.com/...
  try {
    const u = new URL(s);
    if (/cheapgetaway\.com$/i.test(u.hostname)) {
      const rest = (u.pathname.replace(/^\/+/, '') + u.search).replace(/^\/+/, '');
      s = rest || s;
    }
  } catch {
    // not an absolute URL — treat as path or host/path
  }

  s = s.replace(/^\/+/, '');
  if (/^https?:\/[^/]/i.test(s)) {
    s = s.replace(/^(https?:\/)/i, '$1/');
  }
  if (/^(www\.)?expedia\./i.test(s)) {
    s = 'https://' + s;
  }
  return s;
}

export function parseExpediaUrl(raw) {
  const unwrapped = unwrapImportUrl(raw);
  if (!unwrapped) return { ok: false, error: 'missing-url' };

  let parsed;
  try {
    parsed = new URL(unwrapped);
  } catch {
    return { ok: false, error: 'invalid-url' };
  }

  if (!/(^|\.)expedia\./i.test(parsed.hostname)) {
    return { ok: false, error: 'unsupported-host', host: parsed.hostname };
  }

  const qs = parsed.searchParams;
  const pathInfo = hotelFromPath(parsed.pathname);
  const dest = parseDestination(qs.get('destination') || qs.get('dest') || '');
  const cityName = dest.cityName || pathInfo.cityFromSlug || '';
  const countryCode = dest.countryCode || countryFromCity(cityName) || '';
  const checkin = normalizeDate(qs.get('chkin') || qs.get('checkIn') || qs.get('startDate') || qs.get('d1') || '');
  const checkout = normalizeDate(qs.get('chkout') || qs.get('checkOut') || qs.get('endDate') || qs.get('d2') || '');
  const adults = adultsFromQuery(qs);
  const expediaHotelId = qs.get('selected') || pathInfo.expediaHotelId || '';
  const competitorPrice = parsePrice(qs.get('top_dp') || qs.get('top_price'));
  const competitorCurrency = (qs.get('top_cur') || qs.get('currency') || 'USD').toUpperCase();

  let hotelName = pathInfo.hotelName || '';
  if (!hotelName && !expediaHotelId && !cityName) {
    return { ok: false, error: 'no-hotel-or-destination' };
  }

  return {
    ok: true,
    source: 'expedia',
    hotelName,
    cityName,
    countryCode,
    checkin,
    checkout,
    adults,
    competitorPrice,
    competitorCurrency,
    expediaHotelId,
    queryHint: [hotelName, cityName].filter(Boolean).join(' ').trim()
  };
}

function hotelFromPath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  const infoMatch = decoded.match(/\/([^/]+)\.h(\d+)\.Hotel-Information/i);
  if (!infoMatch) {
    const idOnly = decoded.match(/\.h(\d+)/i);
    return { hotelName: '', cityFromSlug: '', expediaHotelId: idOnly ? idOnly[1] : '' };
  }
  const slug = infoMatch[1];
  const expediaHotelId = infoMatch[2];
  const hotelsSplit = slug.split(/-Hotels-/i);
  let cityFromSlug = '';
  let hotelSlug = slug;
  if (hotelsSplit.length >= 2) {
    cityFromSlug = hotelsSplit[0].replace(/-/g, ' ').trim();
    hotelSlug = hotelsSplit.slice(1).join('-Hotels-');
  }
  let parts = hotelSlug.split('-').filter(Boolean);
  if (cityFromSlug) {
    const cityKey = cityFromSlug.toLowerCase();
    const last = (parts[parts.length - 1] || '').toLowerCase();
    if (last === cityKey) parts = parts.slice(0, -1);
  }
  const hotelName = parts.join(' ').replace(/\s+/g, ' ').trim();
  return { hotelName, cityFromSlug, expediaHotelId };
}

function parseDestination(dest) {
  if (!dest) return { cityName: '', countryCode: '' };
  const parts = String(dest).split(',').map((s) => s.trim()).filter(Boolean);
  const cityName = parts[0] || '';
  let countryCode = countryFromCity(cityName);
  for (let i = parts.length - 1; i >= 0; i--) {
    const code = countryFromName(parts[i]);
    if (code) {
      countryCode = code;
      break;
    }
  }
  return { cityName, countryCode };
}

function countryFromCity(city) {
  if (!city) return '';
  const key = String(city).trim().toLowerCase().replace(/\s+/g, ' ');
  if (CITY_TO_COUNTRY[key]) return CITY_TO_COUNTRY[key];
  const beforeComma = key.split(',')[0].trim();
  if (beforeComma && CITY_TO_COUNTRY[beforeComma]) return CITY_TO_COUNTRY[beforeComma];
  return '';
}

function countryFromName(name) {
  const key = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return COUNTRY_NAME_TO_CODE[key] || '';
}

function adultsFromQuery(qs) {
  let total = 0;
  for (const [key, value] of qs.entries()) {
    if (/^rm\d+$/i.test(key)) {
      const m = String(value).match(/a(\d+)/i);
      if (m) total += parseInt(m[1], 10);
    }
  }
  if (total > 0) return total;
  const adults = parseInt(qs.get('adults') || qs.get('adult') || '', 10);
  return Number.isFinite(adults) && adults > 0 ? adults : 2;
}

function normalizeDate(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const isoish = s.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/);
  if (isoish) {
    return isoish[1] + '-' + isoish[2].padStart(2, '0') + '-' + isoish[3].padStart(2, '0');
  }
  const mdY = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (mdY) {
    return mdY[3] + '-' + mdY[1].padStart(2, '0') + '-' + mdY[2].padStart(2, '0');
  }
  return '';
}

function parsePrice(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function nameScore(candidate, wanted) {
  const a = String(candidate || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const b = String(wanted || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  // shared prefix after stripping punctuation (loscar vs loscarlondon)
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i >= 4 ? 40 + i : 0;
}

async function resolveLiteHotel(parsed) {
  const apiKey = process.env.LITEAPI_KEY;
  if (!apiKey || !parsed.hotelName) return null;

  const qs = new URLSearchParams();
  qs.set('hotelName', parsed.hotelName);
  if (parsed.countryCode) qs.set('countryCode', parsed.countryCode);
  if (parsed.cityName) qs.set('cityName', parsed.cityName);
  qs.set('limit', '8');

  try {
    const res = await fetch(LITEAPI_BASE + '/data/hotels?' + qs.toString(), {
      headers: { 'X-API-Key': apiKey, accept: 'application/json' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rows = Array.isArray(json && json.data) ? json.data : [];
    if (!rows.length) return null;
    const wanted = [parsed.hotelName, parsed.cityName].filter(Boolean).join(' ');
    let best = rows[0];
    let bestScore = -1;
    for (const row of rows) {
      const score = nameScore(row && row.name, wanted) + nameScore(row && row.name, parsed.hotelName);
      if (score > bestScore) {
        best = row;
        bestScore = score;
      }
    }
    if (!best || !best.name) return null;
    return { id: best.id || '', name: best.name, city: best.city || parsed.cityName, country: best.country || parsed.countryCode };
  } catch {
    return null;
  }
}

function buildSearchPath(fields) {
  const q = fields.query || fields.hotelName || fields.cityName || '';
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (fields.adults) qs.set('adults', String(fields.adults));
  if (fields.checkin) qs.set('checkin', fields.checkin);
  if (fields.checkout) qs.set('checkout', fields.checkout);
  qs.set('src', 'expedia');
  if (fields.competitorPrice != null) qs.set('srcPrice', String(fields.competitorPrice));
  if (fields.competitorCurrency) qs.set('srcCur', fields.competitorCurrency);
  return '/search-results?' + qs.toString();
}

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = {};
  if (method === 'POST') {
    try {
      body = await readJsonBody(req);
    } catch {
      res.status(200).json({ ok: false, error: 'invalid-json' });
      return;
    }
  }

  const raw = (body && body.url) || (req.query && (req.query.url || req.query.u)) || '';
  const parsed = parseExpediaUrl(raw);
  if (!parsed.ok) {
    res.status(200).json(parsed);
    return;
  }

  const resolved = await resolveLiteHotel(parsed);
  const hotelName = (resolved && resolved.name) || parsed.hotelName;
  const cityName = (resolved && resolved.city) || parsed.cityName;
  const countryCode = (resolved && resolved.country) || parsed.countryCode;
  const query = hotelName && cityName && !hotelName.toLowerCase().includes(cityName.toLowerCase())
    ? (hotelName + ' ' + cityName).trim()
    : (hotelName || cityName);

  const payload = {
    ok: true,
    source: 'expedia',
    hotelName,
    cityName,
    countryCode,
    checkin: parsed.checkin,
    checkout: parsed.checkout,
    adults: parsed.adults,
    competitorPrice: parsed.competitorPrice,
    competitorCurrency: parsed.competitorCurrency,
    expediaHotelId: parsed.expediaHotelId,
    liteHotelId: (resolved && resolved.id) || '',
    query,
    searchResultsPath: ''
  };
  payload.searchResultsPath = buildSearchPath(payload);
  res.status(200).json(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
      resolve(req.body);
      return;
    }
    if (typeof req.body === 'string' && req.body) {
      try {
        resolve(JSON.parse(req.body));
      } catch (err) {
        reject(err);
      }
      return;
    }
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) { resolve({}); return; }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
