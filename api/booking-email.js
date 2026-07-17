// Vercel serverless function — sends the guest their own booking confirmation
// email. LiteAPI does not email guests, so we send it ourselves via Resend
// (same pattern as api/subscribe.js's runResendFallback). Best-effort only:
// the booking has already succeeded by the time this is called, so failures
// here must never surface as a 5xx — the caller fires this off after
// redirecting the guest to /booking-confirmed.
// POST /api/booking-email { email, guestName, hotelName, address, room,
//   board, checkin, checkout, adults, price, currency, confirmation,
//   bookingId, refundable } -> Resend email send.

const RESEND_API_BASE = 'https://api.resend.com';
const DEFAULT_FROM = 'CheapGetaway Travel Club <travel@cheapgetaway.com>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 200;

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

  const str = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_LEN) : '');

  const email = str(body.email);
  const guestName = str(body.guestName);
  const hotelName = str(body.hotelName);
  const address = str(body.address);
  const room = str(body.room);
  const board = str(body.board);
  const checkin = str(body.checkin);
  const checkout = str(body.checkout);
  const adults = typeof body.adults === 'number' ? body.adults : parseInt(str(body.adults), 10);
  const price = typeof body.price === 'number' ? body.price : parseFloat(str(body.price));
  const currency = str(body.currency) || 'USD';
  const confirmation = str(body.confirmation);
  const bookingId = str(body.bookingId);
  const refundable = !!body.refundable;

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'A valid email is required' });
    return;
  }
  if (!hotelName) {
    res.status(400).json({ error: 'hotelName is required' });
    return;
  }
  if (!checkin || !checkout) {
    res.status(400).json({ error: 'checkin and checkout are required' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(200).json({ ok: false, reason: 'email-unconfigured' });
    return;
  }

  const result = await sendBookingEmail(apiKey, {
    email, guestName, hotelName, address, room, board, checkin, checkout,
    adults, price, currency, confirmation, bookingId, refundable
  });

  if (!result.ok) {
    res.status(200).json({
      ok: false,
      reason: 'send-failed',
      resendStatus: result.resendStatus,
      detail: result.detail
    });
    return;
  }

  res.status(200).json({ ok: true });
}

function formatDate(s) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(s + 'T12:00:00Z'));
  } catch (e) {
    return s;
  }
}

function bookingEmailHtml(fields) {
  const {
    guestName, hotelName, address, room, board, checkin, checkout,
    adults, price, currency, confirmation, bookingId, refundable
  } = fields;

  const firstName = (guestName || '').split(' ')[0] || 'there';
  const checkinFmt = formatDate(checkin);
  const checkoutFmt = formatDate(checkout);
  const guestCount = adults && !Number.isNaN(adults) ? adults : 1;
  const priceFmt = (price != null && !Number.isNaN(price))
    ? `${currency} ${Number(price).toLocaleString()}`
    : `${currency}`;

  const refundLine = refundable
    ? '<p>This rate includes free cancellation &mdash; you can cancel from My Trips at no charge before the deadline shown there.</p>'
    : '<p>Please note this rate is non-refundable.</p>';

  const refLine = bookingId
    ? `<p>Booking reference: ${bookingId}${confirmation ? ` &middot; Hotel confirmation: ${confirmation}` : ''}</p>`
    : (confirmation ? `<p>Hotel confirmation: ${confirmation}</p>` : '');

  return `<p>Hey ${firstName},</p>
<p>Your booking is confirmed${confirmation ? ` &mdash; confirmation code ${confirmation}` : ''}.</p>
${refLine}
<p>${hotelName}${address ? `<br>${address}` : ''}</p>
<p>Check-in: ${checkinFmt}<br>
Check-out: ${checkoutFmt}</p>
<p>${room ? `Room: ${room}<br>` : ''}${board ? `Board: ${board}<br>` : ''}Guests: ${guestCount}</p>
<p>Total paid: ${priceFmt}</p>
${refundLine}
<p>Manage this trip anytime at https://www.cheapgetaway.com/my-trips</p>
<p>&mdash; The CheapGetaway Team</p>
<p>--<br>
CheapGetaway Travel Club, [Your business address]<br>
Questions? Just reply to this email.</p>`;
}

async function sendBookingEmail(apiKey, fields) {
  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  try {
    const emailRes = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: from,
        to: [fields.email],
        reply_to: 'travel@cheapgetaway.com',
        subject: `your booking is confirmed — ${fields.hotelName}`,
        html: bookingEmailHtml(fields)
      })
    });

    if (!emailRes.ok) {
      const text = await emailRes.text().catch(() => '');
      console.error('Resend booking-email send error', emailRes.status, text);
      return { ok: false, resendStatus: emailRes.status, detail: text.slice(0, 300) };
    }

    return { ok: true };
  } catch (err) {
    console.error('Resend booking-email send fetch failed', err);
    return { ok: false, detail: String(err).slice(0, 300) };
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
