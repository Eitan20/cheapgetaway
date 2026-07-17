# team-cheapgetaway

Cheapgetaway is a travel-deals marketing site (hotel/flight search, checkout,
trips) paired with the Travorium membership webinar funnel. The deployable
site lives at the repository root — a
static HTML site with one small Vercel serverless function that proxies
liteAPI calls so the API key never ships to the browser.

## Page map

All pages live at the repository root.

| Page | Purpose |
|---|---|
| `index.html` | Site entry — main hotel/flight search hub |
| `search-results.html` | Hotel search results |
| `hotel-detail.html` | Hotel detail — rooms/rates, prebook |
| `checkout.html` | Hotel booking checkout (stops at prebook, see limitation below) |
| `booking-confirmed.html` | Hotel booking confirmation |
| `my-trips.html` | Signed-in user's saved/booked trips |
| `sign-in.html` | Sign in / create account |
| `flight-results.html` | Flight search results |
| `flight-checkout.html` | Flight booking checkout |
| `registration-confirmed.html` | Webinar registration confirmation → WebinarWiz join link |
| `join-the-club.html` | Post-webinar Travorium membership landing page |
| `webinar-optin.html` | Webinar opt-in (general "Join the club" funnel) |
| `webinar-optin-creator.html` | Webinar opt-in (creator-specific funnel) |
| `terms.html` | Terms of Use (placeholder legal copy) |
| `privacy.html` | Privacy Policy (placeholder legal copy) |
| `404.html` | Not-found page, served automatically by Vercel for unmatched paths |

Supporting files: `support.js` (shared page-runtime logic), `cg-api.js`
(shared liteAPI fetch helper), `assets/` (images/logos), `api/liteapi/[...path].js`
(the serverless proxy), `api/subscribe.js` (forwards webinar registrants to
GoHighLevel — primary path is a direct Contacts API upsert, falling back to
the GHL inbound webhook, then to Resend, if earlier steps are unconfigured or
fail), `api/_welcome-email.js` (the embedded welcome-email HTML template used
by the Resend fallback path in `api/subscribe.js`), `api/track.js` (funnel
conversion tracking — tags a GHL contact `clicked-enroll` when a visitor
clicks an enroll CTA on `join-the-club.html`, via the same GHL Contacts API
upsert; requires `GHL_API_TOKEN` + `GHL_LOCATION_ID`).

## Deploy on Vercel

1. Import this repo into Vercel (or run `vercel --prod` from the repo root).
2. Root Directory stays at the repo default (`.`); `vercel.json` sets
   `"framework": null` so Vercel serves the site statically (no Next.js build).
3. Set the environment variable `LITEAPI_KEY` (Production) to your liteAPI
   production key.
4. `GHL_API_TOKEN` + `GHL_LOCATION_ID` (recommended, primary signup path) —
   set both to have webinar signups upserted directly into GoHighLevel via
   the Contacts API (`POST /contacts/upsert`), tagged `webinar-registrant`.
   This avoids GHL's per-execution "premium action" fee that the inbound
   webhook workflow trigger incurs. Point your GHL automation (welcome email +
   drip sequence) at a workflow that triggers on the `webinar-registrant` tag
   being added, rather than on an inbound webhook.
5. `GHL_WEBHOOK_URL` (optional) — fallback signup destination, used only when
   `GHL_API_TOKEN`/`GHL_LOCATION_ID` are unset or the Contacts API upsert
   fails. A working default is baked into `api/subscribe.js`, so this only
   needs to be set to point at a different GHL webhook.
6. Resend is a last-resort fallback, used only when both the GHL Contacts API
   and the GHL webhook are unavailable or fail. Set `RESEND_API_KEY`
   (Production) to your Resend API key to enable it — without it, a GHL
   failure just falls through to `{ ok: false }` and the signup is not
   recorded anywhere. `RESEND_AUDIENCE_ID` (optional) is the Resend audience
   ID webinar registrants should be added to as a contact in the fallback
   path — omit it to skip audience sync and only send the fallback welcome
   email. `RESEND_FROM` (optional) overrides the fallback sender, defaulting
   to `CheapGetaway Travel Club <travel@cheapgetaway.com>`.
7. Redeploy so the functions pick up the env vars.

**Note:** the sender domain (`cheapgetaway.com`) must be verified in Resend
before `travel@cheapgetaway.com` can send — see
https://resend.com/domains.

The proxy at `api/liteapi/[...path].js` forwards every liteAPI call
(`/api/liteapi/<path>` → `https://api.liteapi.travel/v3.0/<path>`) and injects
`X-API-Key` from `process.env.LITEAPI_KEY` server-side, so the key is never
exposed to the browser once the env var is set.

**Security note:** both `cg-api.js` and `api/liteapi/[...path].js` currently
carry a hardcoded fallback liteAPI key (`prod_836dbd63-...`) so the site still
works before `LITEAPI_KEY` is configured. Once the env var is set and
verified in production, **rotate that key and delete the hardcoded fallback
from both files** — it's a real production credential embedded in
client-shippable code.

## Local testing

- **Full proxy mode** (recommended — exercises the real serverless function):
  ```
  npx vercel dev
  ```
- **Static mode** (no serverless runtime, e.g. `python3 -m http.server`):
  ```
  python3 -m http.server
  ```
  In this mode `cg-api.js` detects the missing proxy (404/405) and falls back
  to calling liteAPI directly from the browser using the embedded key.

## Webinar / membership funnel

1. `webinar-optin.html` / `webinar-optin-creator.html` — on valid submit,
   the visitor's name/email are saved to `localStorage['cg_webinar_signup']`
   and the page redirects to
   `registration-confirmed.html?name=<name>&email=<email>&ts=<sessionTs>`.
2. `registration-confirmed.html` — builds the WebinarWiz join URL as
   `https://www.webinarwiz.com/w/travel-secrets-y89ib6i?name=<name>&email=<email>`,
   using the query params if present, falling back to the `cg_webinar_signup`
   localStorage value.
3. `join-the-club.html` — the post-webinar page; its membership CTAs
   point to `https://travorium.com/enroll.php?sponsor=106720`.

## Known limitations

- **Flights API returns 403 on the production key.** liteAPI's `/flights/rates`
  endpoint is sandbox-only for this key — flight pages fall back to demo data
  until liteAPI enables production flights access on the account.
- **Checkout stops at prebook.** `POST /rates/book` is intentionally not
  called from checkout — completing a real booking requires payment
  processing that isn't wired up yet. This is a documented TODO, not a bug.
