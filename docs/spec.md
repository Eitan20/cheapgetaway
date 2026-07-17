# Spec — Full Cheapgetaway site in `Travorium-all-pages-cloudflare-drop`

Date: 2026-07-16. Owner: orchestrator session.

## Goal

Bring all 13 finished pages from
`/Users/neriksbeast/Documents/Travorium membership landing page (4)`
into this repo's deployable static folder
`Travorium-all-pages-cloudflare-drop/`, make the liteAPI-backed booking flow
work end-to-end, wire the webinar/membership funnel (optin →
registration-confirmed → WebinarWiz join link with the visitor's name in the
URL), and add any missing pages so the site is fully functional as a static
Cloudflare Pages deploy.

## Source of truth

- **Finished pages (migrate these):** `/Users/neriksbeast/Documents/Travorium membership landing page (4)/*.dc.html`, its `support.js` and `assets/`.
- **Older reference only (do not migrate):** `/Users/neriksbeast/Documents/Travorium/Travorium-all-pages`.
- **Existing drop:** `Travorium-all-pages-cloudflare-drop/` currently has `index.html` (old creator webinar optin), `travorium-landing.html` (old v2), `registration-confirmed.html` (old), `support.js`, `assets/`. The three old pages are superseded by newer versions in the (4) folder.

## Page mapping (rename rule: drop `.dc`, kebab-case, lowercase)

| Source `.dc.html` | Target in drop folder |
|---|---|
| Cheapgetaway Home | `index.html` (site entry — main search hub) |
| Search Results | `search-results.html` |
| Hotel Detail | `hotel-detail.html` |
| Checkout | `checkout.html` |
| Booking Confirmed | `booking-confirmed.html` |
| My Trips | `my-trips.html` |
| Sign In | `sign-in.html` |
| Flight Results | `flight-results.html` |
| Flight Checkout | `flight-checkout.html` |
| Registration Confirmed | `registration-confirmed.html` (**replaces** old) |
| Travorium Landing- after the webinar | `travorium-landing.html` (**replaces** old v2) |
| Webinar Optin General | `webinar-optin.html` |
| Webinar Optin- Creator | `webinar-optin-creator.html` |

Note: the drop's current `index.html` (old creator optin) is replaced by the
main site home; the creator optin funnel lives on at
`webinar-optin-creator.html`. This changes what the root URL shows — called
out to the user in the final report.

Migration rules (proven pattern from the previous adaptation):
- Copy page content verbatim — keep `<x-dc>`, `{{ }}` interpolation, `<sc-if>`/`<sc-for>`, inline styles, `data-props`.
- Rewrite every internal href to the target filenames above. Links appear both raw (`My Trips.dc.html`) and URL-encoded (`My%20Trips.dc.html`, `Webinar%20Optin%20General.dc.html`) — grep for both, and for JS `location.href` assignments inside `data-dc-script` blocks.
- `support.js`: use the version from the (4) folder (newest). One copy at drop root, referenced as `./support.js`.
- `assets/`: merge the (4) folder's `assets/` into the drop's `assets/` (keep existing favicons/logo; add the ~28 new images). Do NOT copy `uploads/` or `screenshots/`.
- External URLs (R2 videos, Wix video, Google Fonts, YouTube, `app.travorium.com/enroll?sponsor=106720`, webinarwiz.com) stay unchanged.

## liteAPI integration

Pages currently call `https://api.liteapi.travel/v3.0` directly with hardcoded
key `prod_836dbd63-00e5-443a-9b49-ce47adc49202` and header `X-API-Key`.
liteAPI docs require the key be kept server-side.

**Deploy target: Vercel** (user decision 2026-07-16; supersedes the original
Cloudflare Pages assumption). The drop folder is the Vercel project root;
static HTML is served as-is, and the proxy is a **Vercel serverless
function**:

1. Add `Travorium-all-pages-cloudflare-drop/api/liteapi/[...path].js`:
   - Node runtime, `export default async function handler(req, res)`.
   - Forwards method, query string, and JSON body to `https://api.liteapi.travel/v3.0/<path>`.
   - Injects `X-API-Key` from `process.env.LITEAPI_KEY`, falling back to the current hardcoded key if the env var is unset (so the deploy works before the user configures the secret).
   - Returns the upstream JSON + status. Only allow GET/POST/PUT.
   - Plain `fetch` passthrough (no `liteapi-node-sdk` dependency — the SDK is a per-endpoint wrapper and would need a method map plus a package.json; a catch-all passthrough covers every endpoint with zero deps).
   - No `functions/` Cloudflare directory should remain.
2. Add shared helper `cg-api.js` at drop root exposing `window.cgApiFetch(path, options)`:
   - When served over http(s), first try `/api/liteapi/<path>`; if the response is 404/405 (no Functions runtime, e.g. `python -m http.server` local testing) or the fetch throws, fall back to calling liteAPI directly with the key.
   - When on `file:` protocol, go direct immediately.
   - Cache which mode worked (module-level variable) so the probe happens once.
3. Update the 5 API-calling pages (`search-results`, `hotel-detail`, `checkout`, `flight-results`, `flight-checkout`) to load `cg-api.js` and route all liteAPI fetches through `cgApiFetch`, removing per-page duplicated `API`/`KEY` constants where feasible without restructuring the dc-script logic.

Endpoints in use (verify each live with curl before sign-off):
- `GET /data/hotel?hotelId=...`
- `POST /hotels/rates`
- `POST /rates/prebook`
- `POST /flights/rates` (flights product — confirm this key has access; if the endpoint 404s/403s, surface real response shape and adapt or report)
- Do **not** call `POST /rates/book` with the production key during testing (real booking risk). Confirm the checkout page's behavior stops at prebook (current prototype behavior) and note the book step as a documented TODO requiring payment processing.

## Webinar / membership funnel

Desired flow: any page's "Join the club" CTA → webinar optin → registration
confirmed → WebinarWiz live room **with the visitor's name in the URL**.

1. `webinar-optin.html` and `webinar-optin-creator.html`: on valid submit,
   write `localStorage['cg_webinar_signup'] = {name, email, at}` and redirect to
   `registration-confirmed.html?name=<enc>&email=<enc>&ts=<sessionTs>` —
   replicating the old drop `index.html` logic (next session = now rounded up
   to next 15-min boundary, per old implementation; port that code). Replace
   the current inline "You're on the list" success state with this redirect.
2. `registration-confirmed.html`: `joinUrl` prop must be
   `https://www.webinarwiz.com/w/travel-secrets-y89ib6i`. Keep/ensure the
   existing logic that appends `name=<firstName>`; ALSO append
   `email=<email>` when available (verified live: the WebinarWiz player
   consumes `name` and `email` query params). Falls back to
   `cg_webinar_signup` localStorage when query params are missing.
   **Gating (user request 2026-07-16):** the "Join the live room" button must
   NOT work while the countdown is still running. Before the session start
   (`ts` in the future): render the button visibly disabled (muted style,
   `aria-disabled`, no navigation — no webinarwiz href present) with a hint
   like "unlocks when the countdown ends". When live: full join link as
   specced. The switch must happen live as the countdown reaches zero
   (the page already ticks every second), without requiring a reload.
3. `travorium-landing.html` (post-webinar page): CTAs must point to
   `https://app.travorium.com/enroll?sponsor=106720` (as in the finished page).
4. Every migrated page's "Join the club"/membership CTAs must resolve to
   `webinar-optin.html` (general) — no dead `.dc.html` links anywhere.

## Missing pages / dead links

- Sweep all pages for hrefs with no target file (e.g. Sign In's Terms/Privacy
  links). For each dead internal link either point it at an existing page or
  create a minimal, brand-consistent page (`terms.html`, `privacy.html`) using
  the same fonts/header/footer style.
- Add `404.html` (Vercel serves it automatically for unmatched static paths)
  with a link home.
- Update `README.md`: page map, deploy instructions (Vercel project with root
  directory = the drop folder, set `LITEAPI_KEY` env var; `vercel --prod` or
  dashboard import), local testing instructions (`vercel dev` for the proxy,
  or any static server for direct-API fallback mode).

## Mobile optimization (user request 2026-07-16)

All 16 pages must be usable on phones. Scope (fix, don't redesign):
- **Zero horizontal overflow** at 360px and 390px viewport widths (document
  `scrollWidth <= innerWidth`) on every page, in every interactive state that
  changes layout (e.g. home page stays/flights modes, AI bar open).
- Known offenders on index.html: `white-space:nowrap` hero H1, the "From"
  flight input, passenger-summary label, nav "Join the club" button.
- Forms and buttons: tap targets ≥ 40px tall on mobile, inputs fit the
  viewport, multi-column rows stack vertically at small widths.
- Grids/carousels (search results, hotel detail rooms, deals rows) must fit
  or scroll within their own container — never widen the page.
- Text: no clipped headlines; use existing `clamp()`/media-query idiom
  (pages already use `@media (max-width: 480px)` blocks — extend those).
- Keep desktop layouts pixel-unchanged (mobile-only media queries or
  fluid units that resolve identically at desktop sizes).
- Verified programmatically page-by-page at 360/390/768 widths after fixes.

## Acceptance criteria

1. All 13 pages present under the drop folder with kebab-case names; zero references to `.dc.html` anywhere in the folder.
2. Serving the folder with `python3 -m http.server` and driving with a browser: home search → search-results renders real liteAPI hotels → hotel-detail shows rooms/rates with prebook → checkout renders summary → booking-confirmed shows the trip; my-trips lists it. Flights: search → flight-results (real data if the key supports flights; otherwise documented).
3. Optin form submit lands on registration-confirmed with name/email shown, and the join button href is `https://www.webinarwiz.com/w/travel-secrets-y89ib6i?name=<Name>&email=<email>`.
4. No dead internal links (checked programmatically across all pages).
5. Pages Function proxy exists and README documents `LITEAPI_KEY`.
6. Security note delivered to user: the production API key is embedded in page fallback code; recommend rotating it and removing the fallback once the env var is set.
