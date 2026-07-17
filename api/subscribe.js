// Vercel serverless function — forwards webinar registrants to GoHighLevel.
// Primary path is a direct GHL Contacts API upsert (avoids the per-execution
// "premium action" cost of the inbound webhook workflow trigger). Falls back
// to the GHL inbound webhook, then to Resend, if earlier steps are
// unconfigured or fail.
// POST /api/subscribe { name, email, source } -> GHL contacts/upsert API, or
// GHL inbound webhook, or Resend audience contact + immediate welcome email.

import { welcomeHtml } from './_welcome-email.js';

const RESEND_API_BASE = 'https://api.resend.com';
const DEFAULT_FROM = 'CheapGetaway Travel Club <travel@cheapgetaway.com>';
const DEFAULT_GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/AYSVZL0QEQajXAY0Cejh/webhook-trigger/e630b6ca-0fa5-4082-8276-d0fba830256c';
const GHL_CONTACTS_API_URL = 'https://services.leadconnectorhq.com/contacts/upsert';
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

  const ghlApiToken = process.env.GHL_API_TOKEN;
  const ghlLocationId = process.env.GHL_LOCATION_ID;
  if (ghlApiToken && ghlLocationId) {
    const ghlApiOk = await postToGhlContactsApi(name, email, source, ghlApiToken, ghlLocationId);
    if (ghlApiOk) {
      res.status(200).json({ ok: true, via: 'ghl-api' });
      return;
    }
  }

  const ghlOk = await postToGhl(name, email, source);
  if (ghlOk) {
    res.status(200).json({ ok: true, via: 'ghl-webhook' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(200).json({ ok: false });
    return;
  }

  const resendOk = await runResendFallback(name, email, apiKey);
  if (resendOk) {
    res.status(200).json({ ok: true, via: 'resend-fallback' });
    return;
  }

  res.status(200).json({ ok: false });
}

async function postToGhlContactsApi(name, email, source, apiToken, locationId) {
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
        name: name,
        tags: ['webinar-registrant', source].filter(Boolean),
        source: 'cheapgetaway.com'
      })
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => '');
      console.error('GHL contacts API upsert error', apiRes.status, text);
      return false;
    }

    return true;
  } catch (err) {
    console.error('GHL contacts API upsert fetch failed', err);
    return false;
  }
}

async function postToGhl(name, email, source) {
  const webhookUrl = process.env.GHL_WEBHOOK_URL || DEFAULT_GHL_WEBHOOK_URL;

  try {
    const ghlRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ name, email, source })
    });

    if (!ghlRes.ok) {
      const text = await ghlRes.text().catch(() => '');
      console.error('GHL webhook error', ghlRes.status, text);
      return false;
    }

    return true;
  } catch (err) {
    console.error('GHL webhook fetch failed', err);
    return false;
  }
}

async function runResendFallback(name, email, apiKey) {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  if (audienceId) {
    try {
      const contactRes = await fetch(`${RESEND_API_BASE}/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          first_name: name,
          unsubscribed: false
        })
      });

      if (!contactRes.ok) {
        const text = await contactRes.text().catch(() => '');
        console.error('Resend add-contact error', contactRes.status, text);
      }
    } catch (err) {
      // Non-fatal — the welcome email is what actually matters to the visitor.
      console.error('Resend add-contact fetch failed', err);
    }
  }

  try {
    const emailRes = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: from,
        to: [email],
        subject: `You're in — here's your seat, ${name}`,
        html: welcomeHtml(name, email)
      })
    });

    if (!emailRes.ok) {
      const text = await emailRes.text().catch(() => '');
      console.error('Resend send-email error', emailRes.status, text);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Resend send-email fetch failed', err);
    return false;
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
