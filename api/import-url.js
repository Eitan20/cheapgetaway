// Vercel serverless function — parse a wrapped hotel URL into
// CheapGetaway search params (hotel + dates + guests). Code-first parser
// for major OTAs and boutique/hotel-brand pages; LiteAPI data/hotels
// resolves the real property name/id (e.g. Loscar → L'oscar London).
// Never fetches the competitor page (no SSRF).

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

const SOURCE_LABELS = {
  expedia: 'Expedia',
  hotels: 'Hotels.com',
  booking: 'Booking.com',
  kayak: 'Kayak',
  priceline: 'Priceline',
  agoda: 'Agoda',
  tripadvisor: 'Tripadvisor',
  google: 'Google Hotels',
  orbitz: 'Orbitz',
  travelocity: 'Travelocity',
  cheaptickets: 'CheapTickets',
  brand: 'the hotel site',
  boutique: 'the hotel site'
};

const COUNTRY_SLUGS = [...new Set([
  ...Object.keys(COUNTRY_NAME_TO_CODE).map((k) => k.replace(/\s+/g, '-')),
  'united-states-of-america'
])].sort((a, b) => b.length - a.length);

export function unwrapImportUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';

  // cheapgetaway.com/hotels.com/... or cheapgetaway.com/https://www.hotels.com/...
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
  if (!/^https?:\/\//i.test(s) && /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/:?]|$)/i.test(s)) {
    s = 'https://' + s;
  }
  return s;
}

export function parseHotelUrl(raw) {
  const unwrapped = unwrapImportUrl(raw);
  if (!unwrapped) return { ok: false, error: 'missing-url' };

  let parsed;
  try {
    parsed = new URL(unwrapped);
  } catch {
    return { ok: false, error: 'invalid-url' };
  }

  const source = sourceFromHost(parsed.hostname);
  const qs = parsed.searchParams;
  const dates = datesFromUrl(parsed);
  const adults = adultsFromQuery(qs) || adultsFromPath(parsed.pathname) || 2;

  let info;
  if (source === 'expedia' || source === 'orbitz' || source === 'travelocity' || source === 'cheaptickets') {
    info = hotelFromExpediaPath(parsed.pathname);
    const dest = parseDestination(qs.get('destination') || qs.get('dest') || '');
    info.cityName = dest.cityName || info.cityName;
    info.countryCode = dest.countryCode || info.countryCode || countryFromCity(info.cityName);
    info.hotelId = qs.get('selected') || info.hotelId;
  } else if (source === 'hotels') {
    info = hotelFromHotelsComPath(parsed.pathname);
  } else if (source === 'booking') {
    info = hotelFromBookingPath(parsed.pathname);
  } else if (source === 'kayak') {
    info = hotelFromKayakPath(parsed.pathname);
  } else if (source === 'agoda') {
    info = hotelFromAgodaPath(parsed.pathname);
  } else if (source === 'tripadvisor') {
    info = hotelFromTripadvisorPath(parsed.pathname);
  } else if (source === 'google') {
    info = hotelFromGoogle(parsed);
  } else if (source === 'priceline') {
    info = hotelFromPricelinePath(parsed.pathname);
  } else {
    info = hotelFromGeneric(parsed);
  }

  if (!info.cityName) {
    const dest = parseDestination(qs.get('destination') || qs.get('dest') || qs.get('city') || qs.get('ss') || '');
    info.cityName = dest.cityName;
    info.countryCode = info.countryCode || dest.countryCode;
  }
  info.countryCode = info.countryCode || countryFromCity(info.cityName);

  const competitorPrice = parsePrice(qs.get('top_dp') || qs.get('top_price') || qs.get('price'));
  const competitorCurrency = (qs.get('top_cur') || qs.get('currency') || qs.get('selected_currency') || 'USD').toUpperCase();

  if (!info.hotelName && !info.cityName) {
    return { ok: false, error: 'no-hotel-or-destination', host: parsed.hostname };
  }

  return {
    ok: true,
    source,
    sourceLabel: SOURCE_LABELS[source] || 'the hotel site',
    hotelName: info.hotelName,
    cityName: info.cityName,
    countryCode: info.countryCode,
    checkin: dates.checkin,
    checkout: dates.checkout,
    adults,
    competitorPrice,
    competitorCurrency,
    expediaHotelId: info.hotelId || '',
    queryHint: [info.hotelName, info.cityName].filter(Boolean).join(' ').trim()
  };
}

// Back-compat for anything that still imports the Expedia-only name.
export function parseExpediaUrl(raw) {
  return parseHotelUrl(raw);
}

function sourceFromHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (/(^|\.)expedia\./.test(h)) return 'expedia';
  if (/(^|\.)hotels\.com$/.test(h) || /(^|\.)hoteles\.com$/.test(h) || /(^|\.)hoteis\.com$/.test(h)) return 'hotels';
  if (/(^|\.)booking\.com$/.test(h)) return 'booking';
  if (/(^|\.)kayak\./.test(h)) return 'kayak';
  if (/(^|\.)priceline\.com$/.test(h)) return 'priceline';
  if (/(^|\.)agoda\./.test(h)) return 'agoda';
  if (/(^|\.)tripadvisor\./.test(h)) return 'tripadvisor';
  if (/(^|\.)google\./.test(h)) return 'google';
  if (/(^|\.)orbitz\./.test(h)) return 'orbitz';
  if (/(^|\.)travelocity\./.test(h)) return 'travelocity';
  if (/(^|\.)cheaptickets\./.test(h)) return 'cheaptickets';
  if (/(^|\.)(marriott|hilton|hiltonhotels|hyatt|ihg|accor|ihgplc)\./.test(h)) return 'brand';
  return 'boutique';
}

function hotelFromExpediaPath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  const infoMatch = decoded.match(/\/([^/]+)\.h(\d+)\.Hotel-Information/i);
  if (!infoMatch) {
    const idOnly = decoded.match(/\.h(\d+)/i);
    return { hotelName: '', cityName: '', countryCode: '', hotelId: idOnly ? idOnly[1] : '' };
  }
  const slug = infoMatch[1];
  const hotelId = infoMatch[2];
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
  return {
    hotelName,
    cityName: cityFromSlug,
    countryCode: countryFromCity(cityFromSlug),
    hotelId
  };
}

function hotelFromHotelsComPath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  const match = decoded.match(/\/ho(\d+)(?:\/([^/?#]+))?/i);
  if (!match) return emptyHotel();
  const loc = parseLocationSlug(match[2] || '');
  return { ...loc, hotelId: match[1] };
}

function hotelFromBookingPath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  const match = decoded.match(/\/hotel\/([a-z]{2})\/([^/?#]+)/i);
  if (!match) return hotelFromGenericPath(pathname);
  const countryCode = match[1].toUpperCase();
  const slug = match[2].replace(/\.html?$/i, '');
  const loc = parseLocationSlug(slug);
  return { ...loc, countryCode: loc.countryCode || countryCode, hotelId: '' };
}

function hotelFromKayakPath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  const match = decoded.match(/\/hotels\/([^/]+)/i);
  if (!match) return emptyHotel();
  const raw = match[1];
  const idMatch = raw.match(/-h(\d+)/i);
  const token = raw.replace(/-c\d+.*$/i, '');
  const parts = token.split(',').map((s) => s.replace(/-/g, ' ').trim()).filter(Boolean);
  let countryCode = '';
  let cityName = '';
  let hotelName = '';
  if (parts.length >= 2) {
    countryCode = countryFromName(parts[parts.length - 1]);
    if (countryCode) {
      cityName = parts[parts.length - 2];
      hotelName = parts.slice(0, -2).join(' ');
    } else {
      cityName = parts[parts.length - 1];
      hotelName = parts.slice(0, -1).join(' ');
      countryCode = countryFromCity(cityName);
    }
  } else {
    hotelName = parts[0] || '';
  }
  return { hotelName, cityName, countryCode: countryCode || countryFromCity(cityName), hotelId: idMatch ? idMatch[1] : '' };
}

function hotelFromAgodaPath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  const match = decoded.match(/\/([^/]+)\/hotel\/([^/?#]+)/i);
  if (!match) return hotelFromGenericPath(pathname);
  const cityPart = match[2].replace(/\.html?$/i, '');
  const cityMatch = cityPart.match(/^(.+)-([a-z]{2})$/i);
  const cityName = (cityMatch ? cityMatch[1] : cityPart).replace(/-/g, ' ');
  const countryCode = cityMatch ? cityMatch[2].toUpperCase() : countryFromCity(cityName);
  const loc = parseLocationSlug(match[1]);
  return {
    hotelName: loc.hotelName,
    cityName: loc.cityName || cityName,
    countryCode: loc.countryCode || countryCode,
    hotelId: ''
  };
}

function hotelFromTripadvisorPath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  const match = decoded.match(/Hotel_Review-[^-]+-[^-]+-Reviews-(.+?)(?:\.html)?$/i);
  if (!match) return emptyHotel();
  const parts = match[1].split('-');
  let cityName = '';
  let countryCode = '';
  let hotelParts = parts;
  if (parts.length >= 2) {
    const locBits = parts[parts.length - 1].split('_').filter(Boolean);
    const last = (locBits[locBits.length - 1] || '').replace(/-/g, ' ');
    countryCode = countryFromName(last);
    if (countryCode) {
      cityName = locBits.slice(0, -1).join(' ');
      hotelParts = parts.slice(0, -1);
    } else {
      cityName = locBits.join(' ');
      hotelParts = parts.slice(0, -1);
      countryCode = countryFromCity(cityName);
    }
  }
  return {
    hotelName: hotelParts.join(' ').replace(/_/g, ' ').trim(),
    cityName,
    countryCode,
    hotelId: ''
  };
}

function hotelFromGoogle(parsed) {
  const q = parsed.searchParams.get('q') || parsed.searchParams.get('qs') || '';
  let hotelName = q.trim();
  let cityName = '';
  const match = decodeURIComponent(parsed.pathname || '').match(/\/travel\/hotels\/([^/]+)/i);
  if (match && !/^entity$/i.test(match[1])) {
    cityName = match[1].replace(/-/g, ' ');
    if (!hotelName) hotelName = cityName;
  }
  return { hotelName, cityName, countryCode: countryFromCity(cityName), hotelId: '' };
}

function hotelFromPricelinePath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  const named = decoded.match(/\/(?:hotel|hotels|hw)\/([^/]+)/i);
  if (named && !/^\d+$/.test(named[1])) {
    return { ...parseLocationSlug(named[1]), hotelId: '' };
  }
  return emptyHotel();
}

function hotelFromGeneric(parsed) {
  const pathInfo = hotelFromGenericPath(parsed.pathname);
  const hostInfo = hotelFromHost(parsed.hostname);
  const pathIsCityOnly = pathInfo.hotelName && !pathInfo.cityName && CITY_TO_COUNTRY[pathInfo.hotelName.toLowerCase()];
  if (pathIsCityOnly && hostInfo.hotelName) {
    return {
      hotelName: hostInfo.hotelName,
      cityName: pathInfo.hotelName,
      countryCode: CITY_TO_COUNTRY[pathInfo.hotelName.toLowerCase()],
      hotelId: ''
    };
  }
  return {
    hotelName: pathInfo.hotelName || hostInfo.hotelName,
    cityName: pathInfo.cityName || hostInfo.cityName,
    countryCode: pathInfo.countryCode || hostInfo.countryCode || countryFromCity(pathInfo.cityName || pathInfo.hotelName),
    hotelId: ''
  };
}

function hotelFromHost(hostname) {
  let host = String(hostname || '').toLowerCase().replace(/^www\./, '');
  host = host.replace(/^(book|booking|reservations|reserve|stay|rooms|hotel|go|secure|be)\./, '');
  const labels = host.split('.').filter(Boolean);
  if (labels.length >= 3 && labels[labels.length - 2] === 'co') labels.splice(-2, 2);
  else labels.pop();
  const name = labels.join(' ').replace(/[-_]+/g, ' ').trim();
  return { hotelName: titleCase(name), cityName: '', countryCode: '' };
}

function hotelFromGenericPath(pathname) {
  const skip = new Set([
    'en', 'us', 'uk', 'gb', 'fr', 'de', 'es', 'it', 'nl', 'pt', 'jp', 'en-us', 'en-gb',
    'hotel', 'hotels', 'book', 'booking', 'rooms', 'room', 'reservations', 'reservation',
    'stay', 'offers', 'specials', 'availability', 'search', 'travel', 'shop', 'properties',
    'property', 'accommodation', 'index', 'home', 'www', 'html', 'pages', 'page'
  ]);
  const segs = decodeURIComponent(pathname || '')
    .split('/')
    .map((s) => s.replace(/\.html?$/i, ''))
    .filter((s) => s && !skip.has(s.toLowerCase()) && !/^\d+$/.test(s) && s.length > 2);
  if (!segs.length) return emptyHotel();
  const best = segs.slice().sort((a, b) => b.length - a.length)[0];
  return { ...parseLocationSlug(best), hotelId: '' };
}

function parseLocationSlug(slug) {
  if (!slug) return { hotelName: '', cityName: '', countryCode: '' };
  let rest = String(slug).trim().replace(/\.html?$/i, '').replace(/_+/g, '-').toLowerCase();
  let countryCode = '';
  for (const suffix of COUNTRY_SLUGS) {
    if (rest === suffix || rest.endsWith('-' + suffix)) {
      rest = rest.slice(0, Math.max(0, rest.length - suffix.length)).replace(/-+$/, '');
      countryCode = COUNTRY_NAME_TO_CODE[suffix.replace(/-/g, ' ')] || '';
      break;
    }
  }
  let parts = rest.split(/[-]+/).filter(Boolean);
  let cityName = '';
  for (let n = 3; n >= 1; n -= 1) {
    if (parts.length <= n) continue;
    const candidate = parts.slice(-n).join(' ');
    if (CITY_TO_COUNTRY[candidate]) {
      cityName = candidate;
      if (!countryCode) countryCode = CITY_TO_COUNTRY[candidate];
      parts = parts.slice(0, -n);
      while (parts.length >= n && parts.slice(-n).join(' ') === candidate) {
        parts = parts.slice(0, -n);
      }
      break;
    }
  }
  return { hotelName: titleCase(parts.join(' ')), cityName: titleCase(cityName), countryCode };
}

function emptyHotel() {
  return { hotelName: '', cityName: '', countryCode: '', hotelId: '' };
}

function titleCase(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
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

function datesFromUrl(parsed) {
  const qs = parsed.searchParams;
  const inKeys = ['chkin', 'checkin', 'check-in', 'checkIn', 'check_in', 'q-check-in', 'startDate', 'start_date', 'arrival', 'arrivalDate', 'date_from', 'fromDate', 'd1', 'ci'];
  const outKeys = ['chkout', 'checkout', 'check-out', 'checkOut', 'check_out', 'q-check-out', 'endDate', 'end_date', 'departure', 'departureDate', 'date_to', 'toDate', 'd2', 'co'];
  let checkin = '';
  let checkout = '';
  for (const key of inKeys) {
    checkin = normalizeDate(qs.get(key) || '');
    if (checkin) break;
  }
  for (const key of outKeys) {
    checkout = normalizeDate(qs.get(key) || '');
    if (checkout) break;
  }

  const path = decodeURIComponent(parsed.pathname || '');
  if (!checkin || !checkout) {
    const pathDates = path.match(/(\d{4}-\d{2}-\d{2})/g);
    if (pathDates && pathDates.length >= 2) {
      if (!checkin) checkin = pathDates[0];
      if (!checkout) checkout = pathDates[1];
    }
    const compact = path.match(/\/from\/(\d{8})\/to\/(\d{8})/i);
    if (compact) {
      if (!checkin) checkin = normalizeDate(compact[1]);
      if (!checkout) checkout = normalizeDate(compact[2]);
    }
  }
  return { checkin, checkout };
}

function adultsFromQuery(qs) {
  let total = 0;
  for (const [key, value] of qs.entries()) {
    if (/^rm\d+$/i.test(key)) {
      const match = String(value).match(/a(\d+)/i);
      if (match) total += parseInt(match[1], 10);
    }
  }
  if (total > 0) return total;
  for (const key of ['adults', 'adult', 'group_adults', 'q-room-0-adults', 'num_adults', 'adultCount', 'adults_count']) {
    const n = parseInt(qs.get(key) || '', 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function adultsFromPath(pathname) {
  const match = String(pathname || '').match(/\/(\d+)\s*adults?/i);
  return match ? parseInt(match[1], 10) : 0;
}

function normalizeDate(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8);
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
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i >= 4 ? 40 + i : 0;
}

function hotelNameVariants(name) {
  const n = String(name || '').trim();
  const out = [];
  if (n) out.push(n);
  // Expedia/Hotels.com slugs drop apostrophes: Loscar → L'oscar, Oneill → O'neill.
  if (n && !/['’]/.test(n) && n.length > 2) out.push(n[0] + "'" + n.slice(1));
  // Booking-style "L Oscar" / "l oscar" → L'oscar
  if (/^l\s+/i.test(n) && !/['’]/.test(n)) out.push("L'" + n.replace(/^l\s+/i, ''));
  return [...new Set(out)];
}

async function lookupLiteHotels(apiKey, hotelName, parsed) {
  const qs = new URLSearchParams();
  qs.set('hotelName', hotelName);
  if (parsed.countryCode) qs.set('countryCode', parsed.countryCode);
  if (parsed.cityName) qs.set('cityName', parsed.cityName);
  qs.set('limit', '8');
  const res = await fetch(LITEAPI_BASE + '/data/hotels?' + qs.toString(), {
    headers: { 'X-API-Key': apiKey, accept: 'application/json' }
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json && json.data) ? json.data : [];
}

async function resolveLiteHotel(parsed) {
  const apiKey = process.env.LITEAPI_KEY;
  if (!apiKey || !parsed.hotelName) return null;

  try {
    let rows = [];
    let usedName = parsed.hotelName;
    for (const name of hotelNameVariants(parsed.hotelName)) {
      rows = await lookupLiteHotels(apiKey, name, parsed);
      if (rows.length) {
        usedName = name;
        break;
      }
    }
    if (!rows.length) return null;
    const wanted = [usedName, parsed.cityName].filter(Boolean).join(' ');
    let best = rows[0];
    let bestScore = -1;
    for (const row of rows) {
      const score = nameScore(row && row.name, wanted) + nameScore(row && row.name, usedName);
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
  qs.set('src', fields.source || 'expedia');
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
  const parsed = parseHotelUrl(raw);
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
    source: parsed.source,
    sourceLabel: parsed.sourceLabel,
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
        return;
      } catch (err) {
        reject(err);
        return;
      }
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
