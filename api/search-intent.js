// Vercel serverless function — classifies a hotel search query with Jev
// (TypeSafe System One) so rates can use LiteAPI hotelName vs place/aiSearch.
// Server-only: uses process.env.TYPESAFE_API_KEY. Never expose the key to
// the browser. On missing key or upstream failure, returns a safe place
// fallback so search-results never 500s.

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const HOTEL_SUFFIX_RE = /\b(hotel|hotels|inn|resort|resorts|suites?|motel|lodge|hostel|apartment|apartments|bnb|b&b)\b/i;

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    res.status(200).json(placeFallback('invalid-json'));
    return;
  }

  const q = typeof body.q === 'string' ? body.q.trim() : '';
  if (!q) {
    res.status(200).json(placeFallback('empty-q'));
    return;
  }

  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    res.status(200).json(placeFallback('typesafe-unconfigured'));
    return;
  }

  let classified;
  try {
    classified = await classifyWithJev(q, apiKey);
  } catch (err) {
    res.status(200).json(placeFallback('jev-failed'));
    return;
  }

  res.status(200).json(classified);
}

async function classifyWithJev(q, apiKey) {
  const payload = {
    model: MODEL,
    state: { query: q },
    questions: {
      intent: {
        type: 'choice',
        instructions:
          'Classify what a hotel-booking search box query most likely means. Prefer hotel_name when the user names a specific property (brand or independent), even if a city follows the name. Prefer place for cities, neighborhoods, airports, landmarks, or regions alone. Prefer ai_vibe for style, amenities, mood, or open-ended wish lists without a specific property name.',
        criteria: {
          hotel_name:
            'The query names a specific hotel or property (e.g. "L\'oscar London", "Hilton Paris Opera", "The Ritz").',
          place:
            'The query is a destination: city, neighborhood, airport, landmark, or region (e.g. "Paris", "Soho NYC", "JFK", "Tuscany").',
          ai_vibe:
            'The query describes vibe, style, amenities, or constraints without naming one property (e.g. "romantic boutique hotel", "pet friendly near beach", "under $150 with pool").'
        }
      }
    }
  };

  const upstream = await fetch(TYPESAFE_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    throw new Error('typesafe ' + upstream.status + (detail ? ': ' + detail.slice(0, 200) : ''));
  }

  const data = await upstream.json();
  const answer = data && data.answers && data.answers.intent;
  const intent = (answer && answer.choice) || 'place';
  const confidence = typeof (answer && answer.confidence) === 'number' ? answer.confidence : 0;
  const probabilities = (answer && answer.probabilities) || undefined;

  const out = {
    intent: normalizeIntent(intent),
    confidence,
    raw: {
      choice: intent,
      probabilities
    }
  };

  if (out.intent === 'hotel_name') {
    const parts = splitHotelAndCity(q);
    out.hotelName = parts.hotelName;
    if (parts.cityHint) out.cityHint = parts.cityHint;
  }

  return out;
}

function normalizeIntent(intent) {
  if (intent === 'hotel_name' || intent === 'place' || intent === 'ai_vibe') return intent;
  return 'place';
}

function placeFallback(reason) {
  return {
    intent: 'place',
    confidence: 0,
    raw: { fallback: reason }
  };
}

// Light heuristic only — Jev does not return free-text slots. "L'oscar London"
// -> hotelName "L'oscar", cityHint "London". Single-token or hotel-suffix
// last words keep the full query as hotelName.
function splitHotelAndCity(q) {
  const trimmed = q.trim().replace(/\s+/g, ' ');
  const tokens = trimmed.split(' ');
  if (tokens.length < 2) return { hotelName: trimmed };

  const last = tokens[tokens.length - 1];
  if (HOTEL_SUFFIX_RE.test(last)) return { hotelName: trimmed };
  if (!/^[A-Za-z][A-Za-z'.-]*$/.test(last)) return { hotelName: trimmed };
  if (last.length < 3) return { hotelName: trimmed };

  const hotelName = tokens.slice(0, -1).join(' ').trim();
  if (!hotelName || hotelName.length < 2) return { hotelName: trimmed };
  return { hotelName, cityHint: last };
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
