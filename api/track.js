// Vercel serverless function — funnel conversion tracking.
// POST /api/track { email, event } -> tags the contact in GoHighLevel via the
// Contacts API upsert (additive tags), so conversions can be measured and a
// thank-you automation can be triggered off the tag.
// Never-block rule: always responds 200 { ok: ... } except for 405 (wrong
// method) and 400 (invalid body) — a tracking beacon must never surface an
// error to the visitor or block navigation.

const GHL_CONTACTS_API_URL = 'https://services.leadconnectorhq.com/contacts/upsert';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVENT_RE = /^[A-Za-z0-9-]+$/;

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
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const event = typeof body.event === 'string' ? body.event.trim() : '';

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'A valid email is required' });
    return;
  }
  if (!EVENT_RE.test(event)) {
    res.status(400).json({ error: 'A valid event is required' });
    return;
  }

  const ghlApiToken = process.env.GHL_API_TOKEN;
  const ghlLocationId = process.env.GHL_LOCATION_ID;

  if (!ghlApiToken || !ghlLocationId) {
    res.status(200).json({ ok: false, reason: 'not-configured' });
    return;
  }

  const result = await tagContactInGhl(email, event, ghlApiToken, ghlLocationId);
  res.status(200).json({ ok: result.ok });
}

async function tagContactInGhl(email, event, apiToken, locationId) {
  try {
    const apiRes = await fetch(GHL_CONTACTS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: locationId,
        email: email,
        tags: [event]
      })
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => '');
      console.error('GHL contacts API tag upsert error', apiRes.status, text);
      return { ok: false };
    }

    return { ok: true };
  } catch (err) {
    console.error('GHL contacts API tag upsert fetch failed', err);
    return { ok: false };
  }
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
