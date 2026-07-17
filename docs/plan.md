# Plan — execute against docs/spec.md

Working directory for all tasks: `/Users/neriksbeast/Downloads/team-cheapgetaway-main/Travorium-all-pages-cloudflare-drop/`
Source folder: `/Users/neriksbeast/Documents/Travorium membership landing page (4)/`

- [x] **1.1 Migrate pages + assets** (developer)
  - Copy all 13 `.dc.html` pages into the drop folder using the spec's mapping table (replacing the 3 old pages), copy the (4) folder's `support.js` over the drop's copy, merge `assets/`.
  - Rewrite ALL internal links (raw + URL-encoded + JS `location.href` inside `data-dc-script`) to the new kebab-case filenames.
  - Verify: `grep -ri "dc.html" drop/` returns nothing; every internal href target exists on disk.

- [x] **1.2 liteAPI proxy + shared fetch helper** (developer, after 1.1)
  - Add `api/liteapi/[...path].js` Vercel serverless proxy per spec (deploy target changed from Cloudflare to Vercel mid-task; remove any `functions/` directory if created).
  - Add `cg-api.js` with proxy-first / direct-fallback logic; wire the 5 API pages through it.
  - Verify live with curl: `/data/hotel`, `POST /hotels/rates`, `POST /rates/prebook`, `POST /flights/rates` (never `/rates/book`). Record actual responses in the task report.

- [x] **1.3 Webinar funnel wiring** (developer, after 1.1, parallel with 1.2)
  - Optin pages redirect to `registration-confirmed.html?name&email&ts` on submit (port session-timestamp logic from the old drop `index.html` before it is replaced — a copy is preserved at `docs/reference/old-index-webinar-optin.html`).
  - Registration-confirmed join URL = webinarwiz link + `name` + `email` params; localStorage fallback intact.
  - Travorium landing CTAs → `https://app.travorium.com/enroll?sponsor=106720`.

- [x] **1.4 Missing pages + link sweep + README** (developer, after 1.2 & 1.3)
  - Dead-link sweep across all pages; create `404.html`, `terms.html`/`privacy.html` if linked-but-missing; fix the rest.
  - Rewrite `README.md` (page map, Cloudflare Pages deploy, `LITEAPI_KEY`, local testing).

- [x] **3.1 Mobile audit** (developer): load all 16 pages at 360/390/768px, record per-page horizontal overflow + offending elements and any broken mobile layouts; write findings to docs/mobile-audit.md.
- [x] **3.2 Mobile fixes** (3 developers in parallel, disjoint page sets, guided by 3.1; no browser use — CSS/media-query edits only): A) index, search-results, hotel-detail, checkout; B) flight-results, flight-checkout, my-trips, sign-in, booking-confirmed; C) webinar-optin, webinar-optin-creator, registration-confirmed, travorium-landing, terms, privacy, 404.
- [x] **3.3 Mobile re-verification** (orchestrator): re-run overflow audit on all pages/states; loop fix-ups if needed; then commit + push to main (auto-redeploys Vercel).

- [x] **2.1 End-to-end verification** (orchestrator with Playwright, after all above)
  - Serve drop folder locally, drive: hotel flow, flight flow, optin → registration-confirmed → webinarwiz href with name, my-trips, all nav links.
  - Review diffs against spec; fix-ups delegated back to developer (or senior-engineer if subtle).

## Phase 4 — Flights removal (2026-07-17)

Goal: stays-only live site. Archive all flights work (do not delete); hero mode
toggle becomes Stays / AI, where AI shows the existing AI search bar (same look
as the old flights "Ask AI" bar) and searches stays.

- [x] **4.1 Archive flight pages + asset** (developer)
  - `git mv flight-results.html flight-checkout.html docs/archive/flights/`
  - `git mv assets/hero-flights.webp docs/archive/flights/`
  - Save the flights markup/JS removed from `index.html` in 4.2 to
    `docs/archive/flights/index-flights-sections.html` with a header comment.
- [x] **4.2 index.html: flights → AI mode** (developer, details in task prompt)
- [x] **4.3 Legal copy sweep** (developer): terms.html + privacy.html drop
  flight wording (hotels/packages only); repo-wide grep confirms no live-page
  flight references remain outside docs/.
- [x] **4.4 Verify + merge** (orchestrator): serve locally, check both hero
  modes, AI search navigates to /search-results, no console errors; commit +
  push to main.

## Phase 5 — Real payment flow (2026-07-17)

Goal: guest actually pays by card via LiteAPI Payment SDK; bookings only confirm
when /rates/book succeeds; honest failures. No account-credit (ACC_CREDIT_CARD)
bookings, no fake confirmations.

- [ ] **5.1 Proxy host routing** (senior-engineer): api/liteapi.js routes
  rates/prebook, rates/book, bookings* to book.liteapi.travel/v3.0; everything
  else stays on api.liteapi.travel/v3.0. Add `__env` meta path returning
  {env: 'live'|'sandbox'} from the key prefix (prod_/sand_).
- [ ] **5.2 checkout.html payment rewrite** (senior-engineer): guest form →
  prebook {offerId, usePaymentSdk:true} on submit → Payment SDK
  (payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1) renders card
  form → returnUrl back to /checkout?return=1 → POST /rates/book with
  {method:'TRANSACTION_ID', transactionId, clientReference} → real
  booking-confirmed. Honest error states everywhere; remove fake card form,
  ACC_CREDIT_CARD, and fake CG- confirmations.
- [ ] **5.3 Local verification** (orchestrator): node dev server wrapping the
  real api/liteapi.js handler + static files; Playwright through prebook + SDK
  iframe render; book-failure path stub-tested. NO live card submission with
  the prod key.
- [ ] **5.4 Merge + push + live smoke** (orchestrator).
