// Vercel serverless function — forwards webinar registrants to Brevo so an
// ESP can run the welcome + drip email sequence.
// POST /api/subscribe { name, email, source } -> Brevo POST /v3/contacts

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const source = typeof body.source === 'string' ? body.source.trim() : '';

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'A valid email is required' });
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    res.status(200).json({ ok: false, reason: 'not-configured' });
    return;
  }

  try {
    const brevoRes = await fetch(BREVO_CONTACTS_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        attributes: { FIRSTNAME: name, SOURCE: source },
        listIds: [Number(process.env.BREVO_LIST_ID) || 2],
        updateEnabled: true
      })
    });

    if (!brevoRes.ok) {
      const text = await brevoRes.text().catch(() => '');
      console.error('Brevo subscribe error', brevoRes.status, text);
      res.status(200).json({ ok: false });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Brevo subscribe fetch failed', err);
    res.status(200).json({ ok: false });
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
