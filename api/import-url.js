// Vercel serverless function — parse a wrapped hotel URL into
// CheapGetaway search params (hotel + dates + guests). Code-first parser
// for major OTAs and boutique/hotel-brand pages; LiteAPI data/hotels
// resolves the real property name/id (e.g. Loscar → L'oscar London).
// Never fetches the competitor page (no SSRF).

import WORLD_CITIES from './_cities.js';

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

const REGION_TO_COUNTRY = {};

function normKey(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

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

// Every ISO-3166 region name (Intl) + US states / regions travel sites put in slugs.
(function extendCountries() {
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' });
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const a of A) for (const b of A) {
      const code = a + b;
      let name = '';
      try { name = dn.of(code); } catch { name = ''; }
      if (!name || name === code || /unknown/i.test(name)) continue;
      const key = normKey(name);
      if (key && !COUNTRY_NAME_TO_CODE[key]) COUNTRY_NAME_TO_CODE[key] = code;
    }
  } catch { /* Intl without region names */ }
  const US_STATES = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming', 'district of columbia'];
  for (const st of US_STATES) REGION_TO_COUNTRY[st] = 'US';
  for (const r of ['ontario', 'quebec', 'british columbia', 'alberta', 'nova scotia', 'manitoba']) REGION_TO_COUNTRY[r] = 'CA';
  Object.assign(REGION_TO_COUNTRY, {
    oahu: 'US', maui: 'US', 'big island': 'US', kauai: 'US', 'french riviera': 'FR', 'cote d azur': 'FR',
    'provence alpes cote d azur': 'FR', 'ile de france': 'FR', lazio: 'IT', tuscany: 'IT', lombardy: 'IT', veneto: 'IT',
    catalonia: 'ES', andalucia: 'ES', bavaria: 'DE', 'new south wales': 'AU', victoria: 'AU', queensland: 'AU',
    bali: 'ID', phuket: 'TH', 'metro manila': 'PH', luzon: 'PH', 'greater london': 'GB', 'england': 'GB', 'scotland': 'GB',
    'kanto': 'JP', 'kansai': 'JP', 'kyoto prefecture': 'JP', 'tokyo prefecture': 'JP', 'quintana roo': 'MX', 'yucatan': 'MX'
  });
})();

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
  const CITY_ALIASES = { 'new york city': 'New York', nyc: 'New York', 'washington dc': 'Washington', 'washington d c': 'Washington', roma: 'Rome', wien: 'Vienna', 'hong kong': 'Hong Kong' };
  if (info.cityName && CITY_ALIASES[normKey(info.cityName)]) info.cityName = CITY_ALIASES[normKey(info.cityName)];
  else if (info.cityName && info.cityName === info.cityName.toLowerCase()) info.cityName = titleCase(info.cityName);

  const competitorPrice = parsePrice(qs.get('top_dp') || qs.get('top_price') || qs.get('price'));
  const competitorCurrency = (qs.get('top_cur') || qs.get('currency') || qs.get('selected_currency') || 'USD').toUpperCase();

  if (!info.hotelName && !info.cityName) {
    return {
      ok: false, error: info.googleMid ? 'google-entity' : 'no-hotel-or-destination', host: parsed.hostname,
      googleMid: info.googleMid || '', source, sourceLabel: SOURCE_LABELS[source] || 'the hotel site',
      checkin: dates.checkin, checkout: dates.checkout, adults,
      competitorPrice: null, competitorCurrency: 'USD', expediaHotelId: ''
    };
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
  let slug = match[2].replace(/\.html?$/i, '').replace(/\.[a-z]{2}(-[a-z]{2})?$/i, '');
  if (!/[-_]/.test(slug)) slug = segmentWords(slug).join('-');
  const loc = parseLocationSlug(slug);
  return { ...loc, countryCode: loc.countryCode || countryCode, hotelId: '' };
}

function hotelFromKayakPath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  // /Tokyo-Hotels-Park-Hyatt-Tokyo.12345.ksp
  const ksp = decoded.match(/\/([^/]+?)-Hotels-([^/]+?)\.\d+\.ksp/i);
  if (ksp) {
    const cityName = ksp[1].replace(/-/g, ' ');
    return { hotelName: ksp[2].replace(/-/g, ' '), cityName, countryCode: countryFromCity(cityName), hotelId: '' };
  }
  const match = decoded.match(/\/hotels\/([^/]+)/i);
  if (!match) return emptyHotel();
  const raw = match[1];
  const idMatch = raw.match(/-h(\d+)/i);
  const token = raw.replace(/-(?:c|p|h)\d+(?:-.*)?$/i, '');
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
  const loc = parseLocationSlug(match[1].replace(/-h\d+$/i, '').replace(/_\d+$/, ''));
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
  // Review pagination (Reviews-or50-Name) is not part of the hotel name.
  const parts = match[1].replace(/^(?:or\d+-)+/i, '').split('-');
  if (parts.length >= 2) {
    const locBits = parts[parts.length - 1].split('_').filter(Boolean);
    const hotelName = parts.slice(0, -1).join(' ').replace(/_/g, ' ').trim();
    // Longest leading run of location bits that is a known city; the rest
    // (state / region / country) only decides the country code.
    for (let n = Math.min(4, locBits.length); n >= 1; n -= 1) {
      const city = locBits.slice(0, n).join(' ');
      if (isKnownCity(city)) {
        const tail = locBits.slice(n);
        let cc = '';
        for (let k = 0; k < tail.length && !cc; k += 1) cc = countryFromName(tail.slice(k).join(' '));
        for (let k = tail.length; k > 0 && !cc; k -= 1) cc = countryFromName(tail.slice(0, k).join(' '));
        return { hotelName, cityName: city, countryCode: cc || countryFromCity(city), hotelId: '' };
      }
    }
  }
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
  const path = decodeURIComponent(parsed.pathname || '');
  const match = path.match(/\/travel\/hotels\/([^/]+)/i);
  if (match && !/^entity$/i.test(match[1])) {
    cityName = match[1].replace(/[-+]/g, ' ');
    if (!hotelName) hotelName = cityName;
  }
  const place = path.match(/\/maps\/place\/([^/@]+)/i);
  if (!hotelName && place) {
    const bits = place[1].replace(/\+/g, ' ').split(',').map((x) => x.trim()).filter(Boolean);
    hotelName = bits[0] || '';
    if (!cityName && bits.length > 1) cityName = bits.slice(1).map((b) => b.replace(/\b[A-Z]{2}\s*\d{4,}.*$/, '').replace(/\d+/g, '').trim()).find((b) => isKnownCity(b)) || '';
  }
  // ?q=Hotel Name, City → split on comma
  if (hotelName.includes(',') && !cityName) {
    const bits = hotelName.split(',').map((x) => x.trim());
    hotelName = bits[0];
    cityName = bits.slice(1).find((b) => isKnownCity(b)) || '';
  }
  const ent = path.match(/\/entity\/([A-Za-z0-9_-]{8,})/);
  const googleMid = (!hotelName && ent) ? decodeGoogleEntity(ent[1]).mid : '';
  return { hotelName, cityName, countryCode: countryFromCity(cityName), hotelId: '', googleMid };
}

function hotelFromPricelinePath(pathname) {
  const decoded = decodeURIComponent(pathname || '');
  // /hotel-deals/en-us/P5000463463/H30001603/hotel-relax-marrakech.ssp
  const deals = decoded.match(/\/hotel-deals\/(?:[a-z]{2}-[a-z]{2}\/)?(?:[^/]+\/)*?([a-z0-9-]+)\.ssp/i);
  if (deals) return { ...parseLocationSlug(deals[1]), hotelId: '' };
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
    if (CITY_TO_COUNTRY[candidate] || WORLD_CITIES[candidate]) {
      cityName = candidate;
      if (!countryCode) countryCode = CITY_TO_COUNTRY[candidate] || WORLD_CITIES[candidate];
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
  const nk = normKey(beforeComma);
  return CITY_TO_COUNTRY[nk] || WORLD_CITIES[nk] || '';
}

export function isKnownCity(name) {
  const nk = normKey(name);
  return !!(nk && (CITY_TO_COUNTRY[nk] || WORLD_CITIES[nk]));
}

function countryFromName(name) {
  const key = normKey(name);
  return COUNTRY_NAME_TO_CODE[key] || REGION_TO_COUNTRY[key] || '';
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

function buildSearchPath(fields) {
  const q = fields.query || fields.hotelName || fields.cityName || '';
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (fields.liteHotelId) {
    qs.set('hotelId', fields.liteHotelId);
    if (fields.hotelName) qs.set('hn', fields.hotelName);
    if (fields.cityName) qs.set('city', fields.cityName);
    if (fields.countryCode) qs.set('cc', fields.countryCode);
  }
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
  let parsed = parseHotelUrl(raw);
  if (!parsed.ok && parsed.googleMid) {
    const wd = await wikidataFromMid(parsed.googleMid);
    if (wd) parsed = { ...parsed, ok: true, hotelName: wd.hotelName, cityName: wd.cityName, countryCode: wd.countryCode, error: undefined };
  }
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

// ---------------------------------------------------------------------------
// Hyphenless slug segmentation (booking.com/hotel/gb/novotellondontower) —
// dictionary DP over hotel vocabulary + brand names + world city words.
const SEG_WORDS = new Set(`
the a an and of at by on in de la le les du des del di da el los las san santa st saint
hotel hotels hostel inn inns suites suite resort resorts spa lodge motel house residence residences apartments apartment
apartamentos aparthotel boutique grand royal palace park plaza tower towers bridge city central centre center
downtown airport beach bay harbour harbor marina river view garden gardens court square street road gate hill
north south east west new old castle manor hall villa villas place point station collection signature
luxury premier deluxe executive international continental imperial regency regent crown king kings queen queens
london paris rome york bay island lake mountain valley sea ocean shore club golf country west end
novotel ibis mercure sofitel pullman accor hilton doubletree hampton embassy conrad waldorf astoria marriott
courtyard residence sheraton westin renaissance ritz carlton four seasons hyatt andaz holiday express crowne
intercontinental radisson blu best western premier travelodge premier jurys thistle park inn citizenm yotel
omni fairmont kempinski shangri mandarin oriental peninsula langham rosewood aman belmond melia nh barcelo
hard rock wyndham ramada days super la quinta comfort quality clarion sleep motel one moxy aloft element
w edition ace standard hoxton generator selina pod zoku canopy curio tapestry tribute autograph kimpton
staybridge candlewood vienna ibis budget easy hotel the belgrave shoreditch soho mayfair kensington chelsea
covent garden westminster victoria paddington piccadilly bloomsbury camden greenwich canary wharf tower hill
`.split(/\s+/).filter(Boolean));
let SEG_DICT = null;
function segDict() {
  if (SEG_DICT) return SEG_DICT;
  SEG_DICT = new Set(SEG_WORDS);
  for (const k of Object.keys(WORLD_CITIES)) for (const w of k.split(' ')) if (w.length >= 4) SEG_DICT.add(w);
  return SEG_DICT;
}
export function segmentWords(raw) {
  const s = String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s) return [];
  const dict = segDict();
  const n = s.length;
  const cost = new Array(n + 1).fill(Infinity);
  const back = new Array(n + 1).fill(0);
  cost[0] = 0;
  for (let i = 1; i <= n; i += 1) {
    for (let j = Math.max(0, i - 20); j < i; j += 1) {
      const w = s.slice(j, i);
      const c = dict.has(w) ? (SEG_WORDS.has(w) ? 1 : 1.6) : (w.length === 1 ? 6 : 4 + w.length * 2);
      if (cost[j] + c < cost[i]) { cost[i] = cost[j] + c; back[i] = j; }
    }
  }
  const out = [];
  for (let i = n; i > 0; i = back[i]) out.unshift(s.slice(back[i], i));
  // merge consecutive unknown fragments back together
  const merged = [];
  for (const w of out) {
    if (merged.length && !dict.has(w) && !dict.has(merged[merged.length - 1])) merged[merged.length - 1] += w;
    else merged.push(w);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Google Hotels entity ids: base64url protobuf. Some carry a Knowledge Graph
// MID (/m/… or /g/…); those resolve via Wikidata (P646 / P2671). CID-only ids
// are opaque without fetching Google, which we never do.
export function decodeGoogleEntity(id) {
  try {
    const b = Buffer.from(String(id).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('latin1');
    const mid = b.match(/\/[mg]\/[0-9a-z_]{4,14}/i);
    return { mid: mid ? mid[0] : '' };
  } catch {
    return { mid: '' };
  }
}

async function wikidataFromMid(mid) {
  if (!/^\/[mg]\/[0-9a-z_]{4,14}$/i.test(mid)) return null;
  const prop = mid.startsWith('/m/') ? 'P646' : 'P2671';
  const sparql = `SELECT ?itemLabel ?cityLabel ?cc WHERE { ?item wdt:${prop} "${mid}" . OPTIONAL { ?item wdt:P131 ?city . } OPTIONAL { ?item wdt:P17 ?c . ?c wdt:P297 ?cc . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 1`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3500);
    const res = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql), {
      headers: { accept: 'application/sparql-results+json', 'user-agent': 'CheapGetaway-import/1.0 (https://www.cheapgetaway.com)' },
      signal: ctl.signal
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    const row = j && j.results && j.results.bindings && j.results.bindings[0];
    if (!row || !row.itemLabel) return null;
    return { hotelName: row.itemLabel.value, cityName: row.cityLabel ? row.cityLabel.value : '', countryCode: row.cc ? row.cc.value : '' };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hotel identity scoring + LiteAPI resolution.
const NAME_STOP = new Set(['the', 'a', 'an', 'and', 'of', 'at', 'by', 'hotel', 'hotels', 'by', 'de', 'la', 'le', 'il', 'el', 'a', 'member', 'collection', 'luxury', 'ihg', 'marriott', 'hilton']);
function nameTokens(s) {
  return normKey(s).split(' ').filter((t) => t && !NAME_STOP.has(t));
}
export function identityScore(candidate, wanted, cityName) {
  const c = normKey(candidate);
  const w = normKey(wanted);
  if (!c || !w) return 0;
  const cz = c.replace(/ /g, '');
  const wz = w.replace(/ /g, '');
  if (cz === wz) return 1;
  const ct = new Set(nameTokens(candidate));
  const cityT = new Set(nameTokens(cityName || ''));
  // Drop a trailing full city phrase ("Hotel Sacher Wien Vienna"), never a
  // lone city-ish word inside the name ("1 Hotel South Beach" in Miami Beach).
  let wt = nameTokens(wanted);
  const cityList = nameTokens(cityName || '');
  if (cityList.length && wt.length > cityList.length && wt.slice(-cityList.length).join(' ') === cityList.join(' ')
      && !cityList.every((t) => ct.has(t))) wt = wt.slice(0, -cityList.length);
  if (!wt.length) return cz.includes(wz) ? 0.8 : 0;
  let hit = 0;
  for (const t of wt) {
    if (ct.has(t)) hit += 1;
    else if ([...ct].some((x) => (x.length >= 4 && t.length >= 4) && (x.startsWith(t) || t.startsWith(x)))) hit += 0.7;
  }
  const recall = hit / wt.length;
  if (recall < 0.5) return recall * 0.5;
  const wset = new Set(wt);
  const ctl = [...ct].filter((t) => !cityT.has(t) || wset.has(t));
  const precision = ctl.length ? Math.min(1, hit / ctl.length) : 1;
  let score = recall * 0.55 + precision * 0.45;
  if (precision < 0.5) score *= 0.7;
  const near = Math.min(cz.length, wz.length) / Math.max(cz.length, wz.length) >= 0.6;
  if (near && (cz.includes(wz) || wz.includes(cz))) score = Math.max(score, 0.85);
  return score;
}

const GENERIC_TOKENS = new Set(['resort', 'resorts', 'suites', 'hotels', 'apartments', 'residence', 'residences', 'collection', 'downtown', 'airport', 'international', 'boutique', 'luxury', 'grand', 'plaza', 'palace', 'beach', 'tower', 'center', 'centre', 'central', 'express', 'garden', 'gardens', 'royal', 'house', 'hostel', 'signature', 'member', 'design', 'curio', 'autograph', 'tribute', 'holiday', 'hampton', 'marriott', 'hilton', 'sheraton', 'westin', 'courtyard', 'novotel', 'mercure', 'radisson', 'hyatt', 'regency', 'doubletree', 'embassy', 'crowne', 'premier', 'comfort', 'quality', 'ramada', 'wyndham', 'best', 'western', 'square', 'street', 'station', 'bridge', 'river', 'harbour', 'harbor', 'marina', 'village', 'island']);

function apostropheVariants(name) {
  const out = [];
  const tokens = String(name || '').split(' ');
  tokens.forEach((tok, i) => {
    // DInghilterra → d'Inghilterra, OHare → O'Hare, Loscar → L'oscar
    if (/^[DLOdlo][A-Z][a-z]/.test(tok) || /^[DLOdlo][aeiouhAEIOUH][a-z]{2,}/.test(tok)) {
      const t2 = tokens.slice();
      t2[i] = tok[0] + "'" + tok.slice(1);
      out.push(t2.join(' '));
    }
  });
  return out;
}

export function nameQueryVariants(parsed) {
  const name = String(parsed.hotelName || '').replace(/\s+/g, ' ').trim();
  const out = [];
  const add = (n) => { const v = String(n || '').replace(/\s+/g, ' ').trim(); if (v.length >= 2 && !out.includes(v)) out.push(v); };
  add(name);
  for (const v of apostropheVariants(name)) { add(v); add(v.replace(/'/g, '\u2019')); }
  // LiteAPI hotelName is substring-matched: a bare distinctive token survives
  // apostrophe/brand/punctuation differences (DInghilterra → "Inghilterra").
  const cityTok = new Set(nameTokens(parsed.cityName || ''));
  const distinct = String(name).split(' ')
    .map((t) => (/^[DLO][A-Z][a-z]/.test(t) ? t.slice(1) : t).replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length >= 5 && !NAME_STOP.has(t.toLowerCase()) && !cityTok.has(normKey(t)) && !GENERIC_TOKENS.has(t.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  add(name.replace(/\b(hotel|the)\b/gi, ' '));
  // Brand-y suffixes ("…, a Luxury Collection Hotel", "- Starhotels Collezione")
  add(name.replace(/\s*[,(-].*$/, ''));
  // Drop apostrophe-broken tokens entirely: "Hyatt Regency OHare" → "Hyatt Regency"
  const toks = name.split(' ');
  if (toks.length >= 3) add(toks.filter((t) => !/^[DLO][A-Z][a-z]/.test(t)).join(' '));
  if (parsed.cityName && !normKey(name).includes(normKey(parsed.cityName))) add(name + ' ' + parsed.cityName);
  // Leading article / "Hotel" prefix differences
  add(name.replace(/^(the|hotel)\s+/i, ''));
  if (toks.length >= 3) add(toks.slice(0, 3).join(' '));
  if (toks.length >= 2) add(toks.slice(0, 2).join(' '));
  if (distinct[0]) add(distinct[0]);
  // German/Nordic slug transliteration: moevenpick → Mövenpick / Movenpick
  if (/(oe|ue|ae)/i.test(name)) {
    add(name.replace(/oe/g, 'ö').replace(/ue/g, 'ü').replace(/ae/g, 'ä'));
    add(name.replace(/oe/g, 'o').replace(/ue/g, 'u').replace(/ae/g, 'a'));
  }
  return out;
}

const FALLBACK_COUNTRIES = ['US', 'GB', 'FR', 'IT', 'ES', 'DE', 'MX', 'CA', 'AU', 'JP', 'TH', 'AE', 'AT', 'CH', 'NL', 'PT', 'GR', 'TR', 'IN', 'ID', 'PH', 'SG', 'CN', 'HK', 'BR', 'IE'];

async function lookupLite(apiKey, hotelName, countryCode, cityName) {
  const qs = new URLSearchParams();
  qs.set('hotelName', hotelName);
  if (countryCode) qs.set('countryCode', countryCode);
  if (cityName) qs.set('cityName', cityName);
  qs.set('limit', '10');
  try {
    let res = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      res = await fetch(LITEAPI_BASE + '/data/hotels?' + qs.toString(), {
        headers: { 'X-API-Key': apiKey, accept: 'application/json' }
      });
      if (res.status !== 429 && res.status < 500) break;
      await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
    }
    if (!res || !res.ok) return [];
    const json = await res.json();
    return Array.isArray(json && json.data) ? json.data : [];
  } catch {
    return [];
  }
}

function cityCompatible(a, b) {
  const x = normKey(a);
  const y = normKey(b);
  if (!x || !y) return true;
  if (x.includes(y) || y.includes(x)) return true;
  const xt = x.split(' ');
  const yt = y.split(' ');
  const weak = new Set(['city', 'saint', 'sankt', 'san', 'santa', 'new', 'port', 'north', 'south', 'east', 'west', 'beach', 'park']);
  return xt.some((t) => t.length >= 4 && !weak.has(t) && yt.includes(t));
}

export function pickBest(rows, parsed) {
  let best = null;
  for (const row of rows || []) {
    if (!row || !row.name) continue;
    let score = identityScore(row.name, parsed.hotelName, parsed.cityName);
    // "Hotel Renew" for "Hotel Renew Waikiki Beach": every candidate word is in
    // the wanted name, one of them distinctive, and the city agrees.
    if (score < 0.75 && row.city && parsed.cityName && cityCompatible(row.city, parsed.cityName)) {
      const cw = nameTokens(row.name);
      const ww = new Set(nameTokens(parsed.hotelName));
      const weak = new Set(['south', 'north', 'east', 'west', 'city', 'new', 'old', 'park', 'inn', 'suites', 'resort', 'beach']);
      if (cw.length && cw.every((t) => ww.has(t)) && cw.some((t) => t.length >= 5 && !GENERIC_TOKENS.has(t) && !weak.has(t))) score = 0.75;
      // Long noisy slugs: candidate matches the leading wanted words
      // ("The Strat Hotel Casino Skypod Bw Premier…" → "The STRAT Hotel, Casino & Tower").
      const wl = nameTokens(parsed.hotelName);
      let lead = 0;
      while (lead < wl.length && cw.includes(wl[lead])) lead += 1;
      const leadDistinct = wl.slice(0, lead).some((t) => t.length >= 4 && !GENERIC_TOKENS.has(t) && !weak.has(t));
      if (score < 0.75 && lead >= 2 && leadDistinct && lead / cw.length >= 0.6) score = 0.75;
    }
    if (parsed.cityName && row.city && normKey(row.city) === normKey(parsed.cityName)) score += 0.03;
    else if (parsed.cityName && row.city && !cityCompatible(row.city, parsed.cityName)) score -= 0.1;
    if (!best || score > best.score) best = { row, score };
  }
  return best;
}

async function resolveLiteHotel(parsed) {
  const apiKey = process.env.LITEAPI_KEY;
  if (!apiKey || !parsed.hotelName) return null;
  const names = nameQueryVariants(parsed).slice(0, 14);
  let cc = parsed.countryCode;
  // No country: look for a known city phrase anywhere in the name
  // (priceline …/holiday-inn-new-york-city-times-square.ssp).
  if (!cc) {
    const toks = normKey(parsed.hotelName).split(' ');
    outer: for (let n = 3; n >= 1; n -= 1) {
      for (let i = 0; i + n <= toks.length; i += 1) {
        const phrase = toks.slice(i, i + n).join(' ');
        if (phrase.length >= 4 && (CITY_TO_COUNTRY[phrase] || WORLD_CITIES[phrase])) {
          cc = CITY_TO_COUNTRY[phrase] || WORLD_CITIES[phrase];
          if (!parsed.cityName) parsed = { ...parsed, cityName: titleCase(phrase) };
          break outer;
        }
      }
    }
  }
  let best = null;
  const consider = (rows) => {
    const b = pickBest(rows, parsed);
    if (b && (!best || b.score > best.score)) best = b;
  };
  const plans = [];
  if (cc) {
    for (const n of names) {
      plans.push([n, cc, '']);
      if (parsed.cityName) plans.push([n, cc, parsed.cityName]);
    }
  }
  // Round 1: country-scoped variants in parallel.
  if (plans.length) {
    for (let i = 0; i < plans.length && (!best || best.score < 0.95); i += 8) {
      const results = await Promise.all(plans.slice(i, i + 8).map(([n, c, city]) => lookupLite(apiKey, n, c, city)));
      results.forEach(consider);
    }
  }
  // Round 2: unknown/wrong country — sweep common countries in parallel.
  if (!best || best.score < 0.8) {
    const sweep = FALLBACK_COUNTRIES.filter((c) => c !== cc);
    const sweepNames = names.slice(0, 1).concat(names.filter((n) => n !== names[0] && !/\s/.test(n)).slice(-1));
    const jobs = [];
    for (const c of sweep) for (const n of sweepNames) jobs.push([n, c]);
    for (let i = 0; i < jobs.length && (!best || best.score < 0.8); i += 8) {
      const results = await Promise.all(jobs.slice(i, i + 8).map(([n, c]) => lookupLite(apiKey, n, c, '')));
      results.forEach(consider);
    }
  }
  if (!best || best.score < 0.7) return null;
  const row = best.row;
  return { id: row.id || '', name: row.name, city: row.city || parsed.cityName, country: (row.country || parsed.countryCode || '').toUpperCase(), score: best.score };
}
