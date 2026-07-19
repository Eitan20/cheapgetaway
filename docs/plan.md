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

- [x] **5.1 Proxy host routing** (senior-engineer): api/liteapi.js routes
  rates/prebook, rates/book, bookings* to book.liteapi.travel/v3.0; everything
  else stays on api.liteapi.travel/v3.0. Add `__env` meta path returning
  {env: 'live'|'sandbox'} from the key prefix (prod_/sand_).
- [x] **5.2 checkout.html payment rewrite** (senior-engineer): guest form →
  prebook {offerId, usePaymentSdk:true} on submit → Payment SDK
  (payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1) renders card
  form → returnUrl back to /checkout?return=1 → POST /rates/book with
  {method:'TRANSACTION_ID', transactionId, clientReference} → real
  booking-confirmed. Honest error states everywhere; remove fake card form,
  ACC_CREDIT_CARD, and fake CG- confirmations.
- [x] **5.3 Local verification** (orchestrator): node dev server wrapping the
  real api/liteapi.js handler + static files; Playwright through prebook + SDK
  iframe render; book-failure path stub-tested. NO live card submission with
  the prod key.
- [x] **5.4 Merge + push + live smoke** (orchestrator).

## Phase 6 — Live homepage data (2026-07-17)

Goal: every price shown on the homepage is a real, live, bookable LiteAPI rate.
No invented hotels, prices, ratings, or fake 47% "member price" math. Sections
that can't be fed real data get flagged to the user for deletion instead.

Feasibility (verified by orchestrator with direct API calls):
- `GET /data/hotels?countryCode&cityName` → real id/name/address/main_photo/
  rating/reviewCount (static, safe to bake into the page).
- `POST /hotels/rates {hotelIds[], checkin, checkout, occupancies, currency,
  guestNationality}` → live rates; cheapest `retailRate.total` = member price;
  `retailRate.suggestedSellingPrice` = honest public-price strikethrough (only
  when meaningfully higher). Availability is spotty per hotel/date → curate
  ~2x oversupply per section, render only hotels that return rates.

- [x] **6.1 Curate real hotel pools** (researcher): build a JSON registry of
  real hotels with verified rate availability for next-Friday→Sunday dates.
  Recommended: ~18 international (Tokyo, Dubai, Paris, London, Rome, Milan);
  Deals: ~16 US (Las Vegas, Miami, San Diego, Chicago, New Orleans, NYC,
  Phoenix, Seattle); Weekend: reuse US pool. Fields: id, name, city, address,
  image (static.cupid.travel), rating, reviewCount. Save to
  `docs/homepage-hotels.json`. ONLY data/hotels + hotels/rates calls — never
  prebook/book.
- [x] **6.2 index.html live data rewrite** (developer): replace all hardcoded
  hotel arrays with the curated registry + one live `POST /hotels/rates` via
  cgApiFetch on load (all sections, one call, next Fri–Sun dates, 1h
  sessionStorage cache). Real per-night price = total/nights; strikethrough
  only from real suggestedSellingPrice (>3% higher), else no strikethrough;
  remove `* 0.47` fake member math. Cards link to
  /hotel-detail?hotelId&checkin&checkout. Loading skeleton; on API failure
  render cards without price chips (never fake numbers).
- [x] **6.3 Verify + merge + live smoke** (orchestrator). Flag to user:
  membership $1,684/$612 card + member-stories savings are illustrative
  marketing copy, not API data — keep/rewrite/delete is user's call.

## Phase 7 — Rate consistency: homepage vs detail page

Root causes found (orchestrator + researcher, 2026-07-18):
- hotel-detail.html `flatRates()` (l.440) keeps raw API order and renders only
  the first 6 rates (l.596) — the cheapest rate (the one the homepage shows)
  can be absent from the visible list.
- Homepage shows per-night = total ÷ hardcoded 2 (index.html:606); detail page
  shows raw stay totals — users read this as a price mismatch.
- Homepage sessionStorage cache TTL is 1h (index.html:581) → stale vs the
  detail page's fresh fetch.
- Strike threshold differs: 3% homepage (index.html:607) vs 2% detail/search.
LiteAPI docs: display `retailRate.total` (customer pays), strikethrough from
`suggestedSellingPrice`; `roomMapping` does not affect pricing.

- [ ] **7.1 Shared rate helper + page fixes** (developer):
  - New `cg-rates.js` (loaded after `cg-api.js` on index, search-results,
    hotel-detail, checkout): `cgNights(checkin, checkout)`,
    `cgBestRate(rateRow)` (cheapest `retailRate.total[0]` across roomTypes,
    returns `{total, ssp, currency}`), `cgPerNight(total, nights)`,
    `CG_STRIKE = 1.02`, `cgMoney(amount)`.
  - hotel-detail.html: sort flattened rates ascending by
    `retailRate.total[0].amount` before slicing to 6 (cheapest always visible,
    first); on each rate card show per-night price (total ÷ nights) as the
    headline with "US$X total for N nights" as the sub-line, so the cheapest
    card's per-night equals the homepage number.
  - index.html: per-night = total ÷ `cgNights(checkin, checkout)` (kill the
    hardcoded ÷2); strike threshold 1.03 → shared 1.02; cache TTL 1h → 10min.
  - search-results.html: drop `maxRatesPerHotel: 1` (order not guaranteed
    cheapest) and select the cheapest via `cgBestRate` like the homepage;
    use the shared helper for nights/threshold.
  - No visual redesign; keep existing markup/classes, only price logic/labels.
- [x] **7.1** done — commit 1f7de46 on fix/rate-consistency.
- [x] **7.2 Verify consistency end-to-end** (orchestrator): serve locally,
  click homepage card → detail page; assert homepage per-night == cheapest
  detail card per-night for the same hotel/dates/occupancy; repeat via
  search-results; then commit + push.
  - 2026-07-18 status: homepage↔detail verified MATCHING (4/4 hotels via
    live API + browser click-through: US$226/night on both, detail cards
    sorted cheapest-first). Search-results still mismatched (US$177 vs
    US$166) → root cause: LiteAPI caches /hotels/rates responses per
    request body, and aiSearch-based responses return stale/partial rate
    sets (verified: identical params, different JSON key order → n=6
    min=331.34 vs n=1 min=353.30, each stable). aiSearch rates ≠ hotelIds
    rates; hotelIds-based calls agree with each other. → task 7.3.
- [x] **7.3 Search-results: price via hotelIds like homepage** (developer,
  commit bb57cd0; live smoke 5/5 hotels match detail-page-style call;
  browser re-verify: search US$166 == detail US$166 for lp29976):
  in search-results.html, keep the aiSearch/placeId call for the hotel LIST
  (hotel metadata via includeHotelData), but ignore its rates; take the
  returned hotelIds (≤25) and issue a second `POST /hotels/rates` with
  `{ hotelIds, checkin, checkout, occupancies, currency, guestNationality }`
  (exact same body shape/key order as index.html fetchHomeRates) and price
  the cards from that response via cgBestRate. Hotels with no rate in the
  second call: hide the price chip (existing no-price behavior), don't fake.
  Refund/board metadata comes from the matched cheapest rate in the second
  response. Then orchestrator re-verifies (7.2) and commits + pushes.
