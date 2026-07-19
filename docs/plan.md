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
- [x] **11.3 Verify locally** (developer, same branch): `node
  scripts/dev-server.mjs` + Playwright — homepage renders w/ prices,
  search-results, hotel-detail gallery/rates, checkout page loads (NEVER
  call rates/prebook or rates/book), webinar-optin form present, fonts
  render, no console errors from defer change. Grep shipped files for
  `prod_` (must be absent). Confirm every page parses with lang/title/
  meta-description present (quick node/grep sweep).
- [ ] **11.4 Orchestrator review + merge**: diff vs this phase, run local
  Playwright spot-check, merge to main, push (Vercel auto-deploys), then
  re-run PSI and record scores here.
- [x] **11.4 done 2026-07-19**: merged ff 0948992 → main, pushed, deployed.
  Local Lighthouse (mobile, live site): perf 68→79, a11y 86→96, SEO 83→100,
  FCP 2.0s, LCP 5.1s (was 10.7), TBT 0ms, CLS 0. Remaining: dynamic hotel
  photos from static.cupid.travel (full-size ~0.4–1 MB JPEGs into ~400px
  cards, 8.8 MB est. waste, 1h cache — now THE payload/LCP problem; CDN has
  no resize variants, verified 404s), cg-logo.png aspect-ratio REGRESSION
  (width="2000" attr + CSS height:54px → displayed 2000×54), brand-orange
  #ff6500 small-text contrast (2.95:1, design decision — flag to user).
- [x] **11.5 Proxy-resize hotel images + fix logo ratio** (developer,
  branch perf/pagespeed2):
  a) vercel.json top-level `"images"` config: sizes [384,640,960],
     formats ["image/webp"], minimumCacheTTL 2592000, remotePatterns for
     https static.cupid.travel + static.nuitee.cloud (photos) — enables
     `/_vercel/image?url=<enc>&w=640&q=70` (Vercel Image Optimization for
     static sites).
  b) One shared helper `cgImg(url, w)` in cg-rates.js (already loaded on
     index/search-results/hotel-detail/checkout): returns
     `/_vercel/image?url=${encodeURIComponent(url)}&w=${w}&q=70` for
     http(s) URLs, url unchanged otherwise. Wire it into every dynamic
     hotel-image sink: index.html imgEl/card templates (w=640),
     search-results result cards (w=640), hotel-detail gallery main
     (w=960) + thumbs (w=384), checkout + my-trips summary imgs (w=384).
     Each <img> gets onerror fallback to the original URL (dev server has
     no /_vercel/image; graceful 404→original swap, guard infinite loop).
     Video poster attr too if it uses main_photo.
  c) Logo fix everywhere cg-logo/logo-cheapgetaway width/height attrs were
     added in 11.2: ensure CSS `width:auto` accompanies fixed CSS height
     (or drop the attrs where CSS sets height only) so displayed ratio is
     4:1 again. Verify in Playwright: nav logo ~216×54, not stretched.
  d) Verify: dev server + Playwright (fallback path renders imgs), grep
     no prod_, commit, DO NOT push (orchestrator merges).
- [ ] **11.6 Orchestrator: review, merge, push, re-run Lighthouse on live
  (expect /_vercel/image live), record final scores. Flag #ff6500 contrast
  tradeoff to user.**
- [x] **11.6 partial 2026-07-19**: merged dc5ccfd → main, deployed. Lighthouse
  (mobile, live): perf 79→84, BP 96→100 (logo ratio fixed), SEO 100, a11y 96,
  LCP 4.3s, bytes 9,273→4,471 KiB. BUT found domain is proxied by CLOUDFLARE
  in front of Vercel: Cloudflare cached old cg-rates.js under our new
  max-age=86400 js header → live page has no cgImg → hotel imgs still direct
  (~4.1 MiB waste). Also: support.js injects react/react-dom from unpkg.com
  at runtime (render-critical, no preconnect). Remaining a11y: brand orange
  #ff6500 small-text contrast 2.95:1 — design decision, flag to user.
- [x] **11.7 Cache-bust scripts + unpkg preconnect** (developer, branch
  perf/pagespeed3): a) version-string ALL local script references so every
  future deploy busts Cloudflare/browser caches: `support.js?v=115`,
  `cg-api.js?v=115`, `cg-rates.js?v=115` on every page that loads them
  (grep all 17 html files). b) add `<link rel="preconnect"
  href="https://unpkg.com" crossorigin>` to the real <head> of pages that
  boot the dc-runtime (all pages loading support.js). c) verify dev-server
  + Playwright (index/search-results/hotel-detail/checkout render, no new
  console errors), grep prod_ empty, commit, do not push.
- [ ] **11.8 Orchestrator: merge, push, confirm live cgImg + /_vercel/image
  requests in browser, final Lighthouse, record scores.**
- [x] **11.8 done 2026-07-19**: ?v=115 busted Cloudflare cache; cgImg live,
  all 15 dynamic hotel imgs confirmed served via /_vercel/image in-browser.
  Lighthouse (mobile, live): perf 88, a11y 96, BP 100, SEO 100 — FCP 1.1s,
  SI 1.1s, LCP 3.9s, TBT 0, CLS 0, bytes 991 KiB (was 4,973). LCP element =
  hero section, gated on support.js → runtime-injected unpkg React chain.
- [x] **11.9 done 2026-07-19**: added `<link rel="preload" as="script"
  crossorigin href="...react.../react.production.min.js">` + react-dom
  equivalent, right after the unpkg preconnect, in the real <head> of all 11
  pages loading support.js. support.js's `loadScript()` sets `integrity` +
  `crossOrigin="anonymous"` on the injected <script> (since window.__resources
  is unset in prod, `cdnScriptFor` always returns the SRI path), so preload
  used matching `crossorigin` (anonymous) — no credentials-mode mismatch.
  Verified via dev server (python3 -m http.server) + Playwright on index.html
  and hotel-detail.html: no new console errors (only pre-existing local
  /api/* 404s from missing Vercel functions), and response-headers on the
  preload vs. script-consumed network entries for react.production.min.js
  were byte-identical (same `date`/`age`/`cf-ray`/`fly-request-id`),
  confirming a single real network fetch reused by the script tag. `grep -rn
  prod_` across the 11 pages returned no matches. Committed "perf: preload
  react umd scripts (11.9)" on perf/pagespeed4, not pushed.
- [ ] **11.10 Orchestrator: merge, push, final Lighthouse, record, close
  phase.**
- [x] **11.10 done 2026-07-19**: merged dffd273 → main, deployed. Final live
  Lighthouse (mobile): perf 85 cold-cache / **100 warm-cache** (LCP 1.4s,
  FCP 1.1s, SI 1.1s warm; 3.9s LCP cold), a11y 96, best-practices 100,
  SEO 100, TBT 0ms, CLS 0, page weight 850–990 KiB (was 4,973 KiB).
  Baseline PSI 2026-07-19 was perf 68 / a11y 86 / BP 100 / SEO 83, LCP
  10.7s. OPEN (user decision): brand orange #ff6500 small-text contrast
  2.95:1 fails WCAG AA (needs ~#cc4e00 for 4.5:1) — visible brand change,
  not applied. Phase 11 closed.
- [x] **11.11 Round-2 PSI cleanup** (developer, branch perf/pagespeed5) —
  PSI 2026-07-19 #2: perf 90, cache 397 KiB (our assets ttl 7d, js 1d),
  image delivery 2,073 KiB (static featured-*/logo served full-size;
  w=640 slightly big for mobile), minify support.js 5 KiB:
  a) vercel.json: `/assets/(.*)` AND `/(.*)\.js` → `Cache-Control: public,
     max-age=31536000, immutable` (safe: js is ?v-versioned; assets are
     content-stable — any future asset edit must RENAME the file, note
     this in the header comment of docs/plan.md entry).
  b) Static homepage <img>s (featured-*.webp, weekend-*.webp,
     vibe-*.webp, cg-logo.png nav+footer, any other >20 KiB static img on
     index.html) → serve via `/_vercel/image?url=%2Fassets%2F<name>&w=<sz>&q=70`
     with `srcset` (384/640/960 as fits display size; logo w=384 only) and
     inline `onerror="this.onerror=null;this.src='<original>'"` fallback
     (dev server lacks /_vercel/image). Local paths need NO remotePatterns.
     Do NOT touch hero-stays.webp (preloaded, 52 KiB, leave direct).
  c) Dynamic imgEl helpers (index/search-results/hotel-detail/checkout/
     my-trips): add srcset via cgImg at 384w/640w (+960w where main
     gallery) + sizes attr approximating the card CSS width; keep onerror
     fallback logic.
  d) Minify support.js in place with `npx terser support.js -c -m -o support.js`
     AFTER copying the readable original to docs/src/support.src.js
     (docs/ is vercelignored). Playwright-verify the dc-runtime still
     boots ALL key pages after minification (index, search-results,
     hotel-detail, checkout, webinar-optin) — if anything breaks, revert
     the minification and note it (5 KiB is not worth a broken runtime).
  e) Bump script version strings ?v=115 → ?v=116 on ALL pages (required:
     js now cached 1y).
  f) Verify (dev server + Playwright, static sweep: every page still has
     v=116, srcset present on featured imgs), grep prod_ empty, commit
     "perf: long-cache immutable, static img proxy+srcset, minify support.js (11.11)",
     no push.
- [x] **11.11 done 2026-07-19**: a) vercel.json `/assets/(.*)` and
  `/(.*)\.js` now `Cache-Control: public, max-age=31536000, immutable`.
  REMINDER (per header-comment requirement): assets are content-addressed
  only by convention now — any future edit to a file under /assets/ MUST
  ship under a new filename (immutable client/CDN caches would otherwise
  serve the stale byte-for-byte content for up to a year); js is safe as-is
  since it's `?v=`-versioned. b) index.html's 4 featured-collection images
  + nav/footer cg-logo.png now proxy through `/_vercel/image` (featured-beach
  384/640/960w, sizes "(max-width:768px) 100vw, 600px"; featured-roadtrip
  384/640w "(max-width:768px) 50vw, 300px"; featured-mountain/forest
  384/640w "(max-width:768px) 25vw, 280px"; logo single w=384). vibe-*.webp
  (find-your-vibe, rendered via JS not literal markup) also proxied,
  single w=640, no srcset (see deviation note). weekend-*.webp/quickvibe-*
  are NOT static homepage images — they're only used as demo hotel photo
  data (already dynamic, already proxied since 11.5); no separate work
  needed for them. hero-stays.webp left untouched as directed.
  DEVIATION: the plan called for literal `<img onerror="...">` markup on
  these static tags, but this codebase's whole `<x-dc>` body is compiled
  by the support.js dc-runtime into a reactive tree; a literal HTML
  `onerror="..."` attribute gets mapped straight to a React `onError` prop
  with the raw STRING left as its value (not wrapped in a function), which
  throws "Minified React error #231: onError must be a function" the next
  time that component re-renders (reproduced, confirmed absent on
  unmodified main). Fixed by moving all 6 of these images into JS
  (`staticImgEl()` in index.html's component, computed in `renderVals()`
  and referenced via `{{ }}` bindings — the same pattern already used for
  vibeCards/topDeals/weekendDeals), so `onError` is always a real function.
  Documented inline in index.html above `staticImgEl`. c) imgEl helpers in
  index.html, search-results.html, hotel-detail.html, checkout.html,
  my-trips.html now add `srcSet`/`sizes` when the resolved src is an
  absolute http(s) URL (i.e. cgImg actually proxies): 384/640w for card
  contexts, 384/640/960w for hotel-detail's hero tile + lightbox (w>=960).
  Local/relative srcs (fallback `assets/hotel-fallback-sm.webp`, static
  paths) keep prior single-width behavior, unchanged, per instruction.
  Every onError fallback now also clears `srcset` before swapping `src`
  (`e.target.srcset = ''`) so the browser can't keep re-resolving the dead
  proxied set. d) terser SHIPPED: `npx terser support.js -c -m -o
  support.js`, 61,589 → 32,347 bytes (−47.5%, well over the ~5 KiB
  estimate). Readable original preserved at docs/src/support.src.js
  (docs/ is vercelignored, confirmed via .vercelignore). `node --check`
  passed on the minified file and on every page's extracted
  `<script type="text/x-dc" data-dc-script>` block. e) `?v=115` → `?v=116`
  bumped on all 11 pages that load support.js/cg-api.js/cg-rates.js
  (booking-confirmed, checkout, hotel-detail, index, join-the-club,
  my-trips, registration-confirmed, search-results, sign-in,
  webinar-optin-creator, webinar-optin); pages with no script tags
  (404/about/contact/help/privacy/terms) correctly untouched. f) Verified
  via `node scripts/dev-server.mjs` + Playwright MCP: index (React #231
  reproduced pre-fix, gone post-fix; only expected local noise remains:
  `/api/recommended` 503, `/_vercel/image` 404s that correctly fall back
  to the plain asset — nav logo confirmed swapping to `assets/cg-logo.png`
  on error), search-results (4 demo cards + prices render, only expected
  `/api/liteapi/*` 503s), hotel-detail?hotelId=lp1a278 (gallery, rooms,
  description, reviews all render, only expected 503s), checkout (same
  hotel, only expected 503s), my-trips, webinar-optin,
  webinar-optin-creator, sign-in, join-the-club — zero new console errors
  anywhere. `grep -rn prod_` across all *.html/*.js: empty. `grep -c
  "srcSet\|srcset" index.html` = 4 (the 4 featured cards). All 11
  script-loading pages confirmed on `v=116`, zero remaining `v=115`.
  Committed "perf: long-cache immutable, static img proxy+srcset, minify
  support.js (11.11)" on perf/pagespeed5, not pushed.
- [ ] **11.12 Orchestrator: merge, push, live-verify /_vercel/image static
  imgs + v116, final Lighthouse, record, close.**
- [x] **11.12 done 2026-07-19**: merged a7e0371 → main, deployed, live-verified
  (all 25 homepage imgs via /_vercel/image + srcset, 0 broken, minified
  support.js boots index + hotel-detail with 0 console errors, v=116 live).
  Final live Lighthouse mobile COLD cache: perf 92, a11y 96, BP 100,
  SEO 100 — LCP 2.9s, TBT 10ms, CLS 0, weight 530 KiB (baseline was
  perf 68, LCP 10.7s, 4,973 KiB). Warm-cache runs score 100. Remaining
  (accepted): ~174 KiB image headroom, 10 KiB third-party cloudflareinsights
  beacon cache, #ff6500 small-text contrast (user decision). REMINDERS:
  editing any /assets file → RENAME it (immutable 1y cache); editing any
  root .js → bump ?v= on script tags (currently 116). Phase 11 closed.
- [x] **11.13 done 2026-07-19**: computed WCAG relative luminance in
  /private/tmp scratch script (hue 23.76° locked, full saturation, binary
  search over value). Primary swap: `#ff6500` → `#c04c00` (192,76,0) —
  lightest orange in-hue that clears ALL required pairs: vs #ffffff 4.912:1,
  vs #f6f7fb 4.588:1, vs #fff3eb 4.508:1 (note: literal `#fff3eb` string
  does not actually appear anywhere in the codebase — checked, no chip bg
  uses that exact hex — so this was a validate-only check), white-text-on-
  new-orange 4.912:1 (≥4.6 required). Found and fixed one additional
  failing pair the base swap alone didn't cover: the two small-text chips
  that render orange text over a light `rgba(255,101,0,alpha)` orange wash
  (index.html "Member price $612" pill over 0.08 wash, and "Earns monthly"
  pill over 0.12 wash) — original was ~2.7:1 (matches orchestrator's
  flagged failing pair) and even the new #c04c00 text only reached
  4.16–4.41:1 on those composited backgrounds, still short of 4.5. CHOICE:
  darkened text-only on those 2 labels to `#b74800` (183,72,0) rather than
  changing the wash backgrounds — computed to clear both alpha cases
  (4.52:1 @ 0.12 wash, 4.77:1 @ 0.08 wash) with comfortable margin, and is
  the smaller visual change (2 text-color tweaks vs redesigning every
  tinted wash sitewide). All other rgba(255,101,0,x) tints (box-shadows,
  borders, icon-badge washes with no text on them) swapped to
  rgba(192,76,0,x) at their original alphas, unchanged otherwise.
  FILES CHANGED (grep-driven, occurrence counts pre-edit): 404.html (1
  hex + 1 rgba), booking-confirmed.html (1+1), checkout.html (1+1),
  my-trips.html (1+1), hotel-detail.html (2 hex + 2 rgba), index.html (17
  hex + 7 rgba, 2 of those hex further overridden to #b74800 per above),
  sign-in.html (1+1), search-results.html (2+1). support.js / cg-api.js /
  cg-rates.js / docs/src/support.src.js: confirmed clean (0 hits, case-
  insensitive, both hex and rgba forms) — NO v117 bump needed, script tags
  stay at `?v=116`. Verify: dev server (`node scripts/dev-server.mjs`) +
  Playwright — index (hero "Join the club" CTA, "Members see lower prices"
  chip, "Member price $612" pill, "Earns monthly" pill, membership/creator
  card border+icon+checkmarks+"See how creators earn" button all render
  the new orange, legible), hotel-detail?hotelId=lp1a278 ("Join the club"
  nav button), checkout?hotelId=lp1a278 (only expected `/api/liteapi/*`
  503s — continue button not reachable in this dev-server run because the
  demo room "sold out" fallback fired, same known dev-only limitation
  documented in 11.11; button's `#c04c00`/box-shadow markup verified
  correct by source inspection and by the identical style variant
  rendering correctly elsewhere), webinar-optin (0 console errors; this
  page doesn't use the brand orange at all, unaffected as expected). No
  new console errors anywhere beyond the pre-existing local-only noise
  (`/api/*` 503s, `/_vercel/image` 404 fallbacks — both already documented
  in 11.11/11.12). `grep -rn prod_` across all *.html/*.js: empty.
  Case-insensitive `ff6500` grep: zero hits outside `docs/` (3 hits remain
  only in `docs/archive/flights/*.html`, explicitly out of scope).
  Committed "a11y: darken brand orange to WCAG AA (11.13)" on
  perf/pagespeed6, not pushed.
- [ ] **11.14 Orchestrator: merge, push, final Lighthouse (expect a11y
  100), record, close.**
- [ ] **11.15 CLS + polish round 3** (developer, branch perf/pagespeed7,
  AFTER 11.13 merges) — PSI #3 2026-07-19: CLS 0.107, culprit = Nunito
  web-font swap (fonts.gstatic woff2); filmstrip flashes raw "{{ heroTitle }}"
  template pre-boot; image delivery 375 KiB (featured-beach w=960 = 109 KiB
  of it):
  a) Zero-shift font loading on ALL pages using Nunito: add a
     metric-matched fallback `@font-face{font-family:'Nunito Fallback';
     src:local('Arial');size-adjust/ascent-override/descent-override/
     line-gap-override:<computed>}` to each page's critical inline CSS and
     put 'Nunito Fallback' after 'Nunito' in every font-family stack.
     COMPUTE the override percentages from the actual Nunito font metrics
     (fontTools via pip --user venv, or capsize metrics via npm — Nunito
     latin woff2 downloadable from the Google Fonts CSS we already use).
     If computation is impossible, fall back to switching the Google CSS
     URLs to display=optional instead (state which path you took). Same
     for Fredoka on the 4 webinar/funnel pages.
  b) Kill the raw-template flash: static `<style>x-dc{display:none}</style>`
     in the real <head> of every dc-runtime page — FIRST verify in
     support.js (docs/src/support.src.js) that the runtime renders into a
     separate #dc-root and never needs x-dc visible; confirm post-boot
     rendering still works in Playwright after the change.
  c) index.html featured-beach: drop the 960w srcset entry (keep 384/640)
     — mobile DPR was pulling 137 KiB for a card. Also drop q to 60 on the
     THREE largest dynamic-photo sinks' cgImg calls ONLY if a quick visual
     check shows no obvious quality loss (else leave q=70).
  d) Verify: Playwright index/search-results/hotel-detail/checkout/
     webinar-optin render post-boot, no {{ }} text visible at any point
     (screenshot early + late), fonts render as Nunito, no new console
     errors, grep prod_ empty. No .js file changes expected → v stays 116;
     if you DO touch a root .js, bump to v=117 everywhere.
  e) Commit "perf: zero-CLS font fallback, hide pre-boot template, srcset cap (11.15)", no push.
- [ ] **11.16 Orchestrator: merge 11.13+11.15, push, final PSI-equivalent
  Lighthouse, record, close.**
