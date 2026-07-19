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

## Phase 8 — zzzello-style server-priced recommended hotels

Recon (orchestrator, 2026-07-18): zzzello.com's homepage calls its OWN
backend `GET /v1/hotels/recommended?currency=USD` (NOT a LiteAPI endpoint —
LiteAPI has none) returning ~29 curated hotels with a server-computed nightly
`price` — so cards render instantly with prices, identically for every
visitor. We replicate the architecture:

- [x] **8.1 `/api/recommended` Vercel function + homepage wiring**
  (developer; commits 436f71a + hotfixes 531025b/2e05b37 — two deploy
  gotchas: no package.json → api/*.js must be CommonJS, and .vercelignore
  excludes docs/ → registry moved to api/_homepage-hotels.json):
  - New `api/recommended.js` (same handler style as api/liteapi.js):
    computes next-Fri→Sun dates (same algorithm as index.html
    nextWeekendDates, UTC-safe), reads the hotel ids from
    `docs/homepage-hotels.json` (recommended + us pools), makes ONE
    server-side LiteAPI `POST /hotels/rates` (api.liteapi.travel/v3.0,
    LITEAPI_KEY env — never in code) with body exactly
    `{ hotelIds, checkin, checkout, occupancies: [{ adults: 2 }],
    currency: 'USD', guestNationality: 'US' }` (same shape/key order as the
    pages use — see Phase 7 body-cache gotcha), reduces each hotel via the
    same cheapest-rate logic as cg-rates.js cgBestRate (duplicate the ~15
    lines in the function; it can't load browser globals), and responds
    `{ checkin, checkout, nights, rates: { [hotelId]: { total, ssp,
    currency } } }` with `Cache-Control: public, s-maxage=600,
    stale-while-revalidate=3600` so Vercel's edge serves it instantly.
    On LiteAPI failure: 503 JSON, no fake data. Never call prebook/book.
  - index.html `fetchHomeRates()`: replace the client-side POST
    /hotels/rates + sessionStorage cache with a single
    `fetch('/api/recommended')`; use its `checkin/checkout` for state +
    card links and its `rates` as the rateMap. Keep the existing failure
    path (ratesFailed → cards without price chips). Delete the
    sessionStorage cache code (edge cache replaces it).
  - Card polish to match zzzello's clarity: under the per-night price add
    the existing-style muted sub-line "per night · incl. taxes" if the
    template doesn't already say so (keep current design language, no
    redesign).
  - Local verify: node --check on api/recommended.js + index script;
    `node scripts/dev-server.mjs` requires LITEAPI_KEY so instead unit-run
    the reducer against a captured /hotels/rates response; grep that no
    client-side hotels/rates call remains in index.html.
- [x] **8.2 Review + live verify + ship** (orchestrator, 2026-07-18):
  prod `GET /api/recommended` returns rates (edge-cached, ~0.18s);
  homepage↔detail verified 3/3 on prod (lp31b8d US$226, lpaa0d7 US$109,
  lp1b30d1 US$52 — identical on both pages).

- [x] **8.3 Full zzzello parity for Recommended section** (developer,
  commit 74dddeb; 12/29 luxury hotels had rates at +90d/1n).
  User decision: mirror zzzello's remaining differences. Their section =
  luxury hotels in Dubai/Milan/Paris/London/Rome/Tokyo, priced for a
  1-night stay exactly 90 days out, card sub-line "1 room x 1 night
  incl. taxes". Source data: their 29 recommended hotels (LiteAPI lp…
  ids) captured in `.playwright-mcp/zzzello-recommended.json`
  (id/name/city/address/main_photo/reviewsCount; `rating` is 0 in their
  payload — enrich from our LiteAPI `/data/hotel`).
  Scope:
  a) Build a `luxury` pool in `api/_homepage-hotels.json` from those 29
     ids: name/city/address/image from the capture, rating+reviewCount
     enriched via prod proxy `GET /data/hotel?hotelId=…` (read-only);
     validate availability with a `POST /hotels/rates` for the new dates
     and keep every hotel that returns a rate (~2x oversupply is the
     point; render only priced ones). Keep `recommended`/`us` pools
     untouched (Deals/Weekend still use them).
  b) `api/recommended.js`: two date bases — `luxury` block priced for
     checkin = today+90d UTC, checkout +1 night; `weekend` block =
     existing next-Fri→Sun for the old pools. Two upstream hotelIds
     calls (same body shape rule), respond
     `{ luxury: {checkin, checkout, nights, rates}, weekend: {…} }`.
     Same cache headers. Backward-compat not needed (only index.html
     consumes it; update it in the same commit).
  c) index.html: Recommended section renders the luxury pool priced from
     `luxury` block (links carry the 90-day dates); price line = per
     night with muted sub-line "1 room x 1 night incl. taxes"; Deals +
     Weekend sections keep the `weekend` block + existing labels. Bake
     the luxury pool into index.html the same way REC_POOL is baked
     (static array), sourced from the updated registry.
  d) No layout redesign — existing card markup/carousel/pagination.
- [x] **8.4 Review + verify + ship** (orchestrator, 2026-07-18): prod
  endpoint serves both blocks (luxury 2026-10-17→18, 12 rates; weekend
  2026-07-24→26, 35 rates); homepage↔detail verified 3/3 luxury
  (lp1b9f6 US$448, lp1b845 US$396, lp1b9e7 US$763); sub-line only on
  Recommended cards; pushed 74dddeb.

## Phase 9 — Hotel detail redesign (2026-07-18, reference: ~/Downloads/"Hotel Detail.html" bundler export)

- [x] **9.1 Rebuild hotel-detail.html 1:1 from the reference template** (developer).
  Reference markup+script extracted to the session scratchpad `template.html`
  (lines 13–639 = `<x-dc>` markup incl. helmet; 640–1103 = DC Component).
  Use both verbatim EXCEPT the adaptations below:
  a) Head: keep repo convention — `support.js`, `cg-api.js`, `cg-rates.js`
     scripts + Google-Fonts Nunito link (400;600;700;800;900). DROP the
     reference's embedded @font-face uuid blocks; KEEP its second style
     block (cg-shimmer, .cg-scroll, base rules) verbatim.
  b) API: NO direct liteAPI, NO embedded key (reference contains the leaked
     `prod_836dbd63…` key — must not appear in the shipped file). Use
     `cgApiFetch()` proxy exactly as the current page's `api()` does.
  c) Links: `Cheapgetaway Home.dc.html`→`/`, `Webinar Optin General.dc.html`
     →`/webinar-optin`, `Webinar Optin- Creator.dc.html`→`/webinar-optin-creator`,
     `My Trips.dc.html`→`/my-trips`, `Checkout.dc.html`→`/checkout`
     (same query params — checkout.html matches offerId by room/board/price).
     Drop the now-dead `.dc.html` click interceptor. Logo uuid → assets/cg-logo.png.
  d) Demo images: `window.__resources.X || 'assets/…'` → plain `assets/…`.
  e) Keep our video hero: tile0 = videoEl(hotel.videoUrl, poster imgs[0])
     with videoFailed→image fallback (copy videoEl + state flag from the
     current page); other tiles/lightbox stay images-only per reference.
  f) Keep flatRates cheapest-first sort (rate-consistency rule) and use
     cgNights/CG_STRIKE from cg-rates.js for nights + strike threshold.
  g) Similar-hotels section is NOT in the reference — drop it (archive note
     only; git history keeps the code).
- [x] **9.2 Verify locally** (developer): `node scripts/dev-server.mjs`,
  Playwright against `/hotel-detail?hotelId=lp1a278` — gallery, sticky tabs
  scroll-spy, room groups + rate rows, breakfast/free-cancel filters,
  change-search re-fetch, reviews sort/load-more/expand, Ask AI, checkout
  href shape. NEVER call rates/prebook or rates/book. Grep shipped file for
  `prod_` (must be absent).
- [x] **9.3 Orchestrator review + merge** (orchestrator, 2026-07-18): diff reviewed (no key/leak, proxy-only, /checkout params intact, video hero + CG_STRIKE/cgNights kept), local Playwright pass in demo mode, merged 1a325f3 ff into main.

## Phase 10 — About page + legal hardening (modeled on zzzello, 2026-07-18)

Context: researcher audit of app.zzzello.com/privacy, /terms, /contact. Key
adoptable protections: not-merchant-of-record + booking-provider delegation
(they use Nuitée — same company as our liteAPI backend), 18+ eligibility,
info-accuracy disclaimer, booking-not-final-until-provider-confirms, payment
authorization scope (taxes/fees/no-shows), cancellation-varies-by-rate,
user indemnity, liability cap (greater of amount paid or $100), governing
law w/ consumer-protection carve-out. Gaps in theirs we ALSO add: affiliate/
commission disclosure, cookies section (we already have one), security
disclaimer + GDPR/CCPA-style rights in privacy. Do NOT copy their text
verbatim — same protections, our own wording. Keep the existing "not legal
advice" placeholder footer on both pages.

- [x] 10.1 (developer) Create about.html + contact.html in existing legal-page
  shell style (Nunito, navy #0e1556, cyan #38b6ff accent, same nav/footer);
  rewrite terms.html and strengthen privacy.html per clause list above;
  fix dead footer links (#) in index.html → /about, /contact.
- [x] 10.2 (orchestrator) Review diff, verify links/rendering, report.

## Phase 11 — PageSpeed / mobile performance (report 2026-07-19: perf 68, LCP 10.7s, a11y 86, SEO 83)

Context: PSI mobile flags render-blocking requests (1,620ms), image delivery
(4,304 KiB), LCP request discovery (hero is a CSS background, never
preloaded), >4 preconnects, cache lifetimes (3,044 KiB), imgs without
width/height, missing <title>/meta-description/<html lang>, low-contrast
text, redundant alt text. Researcher audit 2026-07-19 confirms: support.js
(61.6 KB) + cg-api.js + cg-rates.js load render-blocking with no defer;
Google Fonts stylesheet blocks render; index.html has NO <title>, no
preconnects; all 17 pages lack lang + meta description; assets/ holds
2.9 MB reference-theme.png + 2.4 MB hero-wide.jpg + several 100–435 KB
webps; no cache headers in vercel.json. Work on branch `perf/pagespeed`.

- [x] **11.1 Head + loading order, all 17 HTML pages** (developer):
  a) `<html lang="en">` everywhere; remove duplicate `<meta name=viewport>`.
  b) index.html: add `<title>Cheap Getaway — Members-Only Hotel Deals & Cheap Stays</title>`
     and meta description "Search 2M+ hotels at member prices. Real-time
     deals, weekend getaways, and a free workshop that unlocks
     members-only travel rates." Every other page: unique ~150-char meta
     description matching its existing <title> topic (write them per page).
  c) Preconnects: exactly `<link rel="preconnect" href="https://fonts.googleapis.com">`
     + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
     per page (add to index.html, delete extras elsewhere). No other
     preconnect/dns-prefetch unless the page really fetches that origin
     pre-LCP.
  d) Google Fonts non-blocking on every page:
     `<link rel="preload" as="style" href="<fonts css2 url>">` +
     `<link rel="stylesheet" href="<same url>" media="print" onload="this.media='all'">`
     + `<noscript><link rel="stylesheet" href="<same url>"></noscript>`.
     Keep display=swap. Trim unused Nunito/Fredoka weights per page (grep
     the page's CSS for font-weight usage first).
  e) `defer` on support.js, cg-api.js, cg-rates.js script tags on every
     page that loads them. FIRST grep each page's inline <script> blocks
     for parse-time use of their globals (dc/cgApiFetch/cgBestRate/
     cgNights/cgMoney etc.); anything that runs at parse time must move
     into a DOMContentLoaded handler (defer'd externals finish before
     DOMContentLoaded, order preserved).
  f) index.html LCP: `<link rel="preload" as="image" fetchpriority="high"
     href="assets/hero-stays.webp">` (hero stays a CSS background).
  g) vercel.json: add headers — `/assets/(.*)` → `Cache-Control: public,
     max-age=604800, stale-while-revalidate=2592000`; `/(.*)\.js` →
     `public, max-age=86400, stale-while-revalidate=604800`. Keep existing
     cleanUrls/redirects/rewrites intact.
- [x] **11.2 Images + contrast + a11y** (developer, same branch):
  a) Verify unreferenced (grep all html/js/css), then delete from deploy:
     assets/reference-theme.png, assets/hero-wide.jpg, assets/hero-bg.webp
     (if unused), root-level screenshot PNGs (stays-*.png, flights-*.png).
     Prefer adding to .vercelignore + `git rm` only if truly unused;
     if referenced anywhere, compress instead.
  b) Recompress oversized referenced images to ≤150 KB and ≤2× displayed
     CSS width (cards ≈ 400px → 800px wide): featured-*.webp,
     weekend-*.webp, vibe-*.webp, julian-ambassador.jpg, igor-hottub.jpg.
     Use `cwebp`/`sips`/`npx sharp-cli` (whichever is available), quality
     ~70, keep filenames + dimensions ratio.
  c) Every `<img>`: explicit width+height attributes (or CSS aspect-ratio)
     matching the file's ratio; `loading="lazy" decoding="async"` on all
     below-the-fold imgs (NOT on anything visible in the first viewport).
  d) Contrast to WCAG AA (≥4.5:1 normal text, ≥3:1 large): #9aa0b4 on
     white → #5d6478; #52586b 11px labels on #f6f7fb → #454b5e; check
     each flagged pair against its ACTUAL background before changing
     (footer text may sit on navy where light gray passes).
  e) Redundant alt text: fix imgs whose alt duplicates adjacent text or
     says "image/photo/logo of"; keep alts meaningful, decorative imgs
     get alt="".
- [ ] **11.3 Verify locally** (developer, same branch): `node
  scripts/dev-server.mjs` + Playwright — homepage renders w/ prices,
  search-results, hotel-detail gallery/rates, checkout page loads (NEVER
  call rates/prebook or rates/book), webinar-optin form present, fonts
  render, no console errors from defer change. Grep shipped files for
  `prod_` (must be absent). Confirm every page parses with lang/title/
  meta-description present (quick node/grep sweep).
- [ ] **11.4 Orchestrator review + merge**: diff vs this phase, run local
  Playwright spot-check, merge to main, push (Vercel auto-deploys), then
  re-run PSI and record scores here.
