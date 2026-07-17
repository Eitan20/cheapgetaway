# Mobile Audit — Task 3.1

Date: 2026-07-16 (executed 2026-07-17 session). Method: Playwright, `document.documentElement.scrollWidth` vs `window.innerWidth` at 360×800 and 390×844 (768×1024 spot-checked where flagged), plus a DOM walk for elements with `getBoundingClientRect().right > innerWidth` or `left < 0`, tap-target height (<40px), `white-space:nowrap` clipping, and inline fixed pixel widths >360px (excluding `max-width`/`min-width`, which are fine on mobile since they only cap large viewports).

**Global finding (applies to all pages):** the spec states "pages already use `@media (max-width: 480px)` blocks — prefer extending those." In reality only 3 of 16 pages have any `@media` block at all: `travorium-landing.html` (5), `webinar-optin.html` (1), `webinar-optin-creator.html` (1). The other 13 pages (`index.html`, `search-results.html`, `hotel-detail.html`, `checkout.html`, `booking-confirmed.html`, `my-trips.html`, `sign-in.html`, `flight-results.html`, `flight-checkout.html`, `registration-confirmed.html`, `terms.html`, `privacy.html`, `404.html`) have **zero** media queries — 3.2 fixers will need to add fresh `@media (max-width: 480px)` (and in some cases 768px) blocks rather than extend existing ones.

---

## index.html

No `@media` blocks at all.

### Stays mode (default)
| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 626 | 360 | **YES** (+266px) |
| 390 | 626 | 390 | **YES** (+236px) |

Offending elements (both widths, same root cause — header nav row doesn't wrap/shrink):
- `nav` header row (`index.html:25`) — the flex row holding logo, nav links (`Deals`/`Weekend`/`Vibes`, lines 29-31), and the auth cluster (`Sign in` button + `Join the club` link, line 38) never wraps; total content width (~627px) exceeds the 360/390 viewport. The auth cluster div (`display:flex;align-items:center;gap:12px`) sits at `left:489, right:627` — fully off-screen on both widths.
  - `Join the club` link (line 38, inline style `background:#ff6500;...padding:10px 20px;border-radius:999px;`) — right edge at 627px.
  - `Sign in` button (no dedicated line — rendered near line 38, `scp0` class) — right edge 544-599px depending on width.
  - Nav link cluster `Deals`/`Weekend`/`Vibes` (lines 29-31, `display:flex;gap:28px`) also pushed off-canvas since nothing shrinks/hides on small screens.
- Hero decorative circle (absolute-positioned `div`, `top:-80px;right:-80px;width:320px;height:320px;border-radius:50%`) — not in source as inline in the h1 area; found near hero section (~line 45-50 block). At 390px it extends to `right:446` (overflows by 56px). Cosmetic only (background gradient blob) but still contributes to `scrollWidth`.

**Tap-target issues (< 40px height):** nav links `Deals`/`Weekend`/`Vibes` (21px tall, lines 29-31); `This weekend` / `Under $120/night` quick-filter buttons (34px, `scp9` class, in the hero search card); the destination `input` (24px). `Stays`/`Flights` mode toggle buttons are 38px (borderline, 2px short of the 40px target).

**`white-space:nowrap` clipping:** hero `H1` "Same Stays. Better Prices." (`index.html:49`, `white-space:nowrap;max-width:100%` — the known offender called out in spec.md; at 360px it is visually clipped/overflows rather than wrapping).

**Suggested minimal fix:** add a fresh `@media (max-width: 480px)` block (none exists yet) that: (1) makes the `nav` header row `flex-wrap:wrap` or collapses the `Deals/Weekend/Vibes` link cluster behind a hamburger/hidden at this breakpoint, (2) shrinks `Join the club`/`Sign in` padding, (3) removes `white-space:nowrap` from the H1 in favor of `clamp()` font-size only (already has `clamp(30px,4.6vw,56px)`) plus `white-space:normal`, (4) increase quick-filter button and nav-link `min-height` to 40px via padding.

### Flights mode (click "Flights" toggle)
| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 643 | 360 | **YES** (+283px, worse than stays mode) |

Additional offenders on top of the header issue above:
- `From` flight-origin field row (`index.html:105` area, class row `flex:1 1 100%;border:1.5px solid ...;border-radius:999px;padding:4px`) — width 555px, right edge at 643px. This is the "From" flight input called out in spec.md as a known offender.
- Swap-direction circular button (inline `width:48px;height:48px;border-radius:50%`, sits between From/To fields) — right edge at 630px, pushed off-canvas as a consequence of the From field's width.
- `Passengers` summary block (`index.html:156-157`, `white-space:nowrap` on both the "Passengers" label span and the `{{ paxSummary }}` span e.g. "1 Passenger · All cabins") — label span right edge 574px, value span right edge 662px. This is the "passenger-summary label" flagged in spec.md.
- `SPAN` "Search hundreds of airlines at once." (flights-mode hero H1, also `white-space:nowrap`, same pattern as stays-mode H1) — right edge 592px.

**Tap-target issues:** `Round trip`/`One way` toggle buttons are 40px (borderline pass); a checkbox `INPUT` is 17px (native checkbox, not resizable via height alone — needs a larger hit-area wrapper); another `INPUT` at 22px.

**Suggested minimal fix:** in the same `@media (max-width: 480px)` block, force the From/To/swap row to `flex-direction:column` (stack From above To, swap button centered) instead of the current single-row flex, and change `white-space:nowrap` to `nowrap` + `overflow:hidden;text-overflow:ellipsis` is already present on the paxSummary span but the *container* still isn't constrained — give the passengers field a `max-width` or let it wrap onto 2 lines at this breakpoint.

### Flights + AI-open (click "Ask AI" toggle while in flights mode)
| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 626 | 360 | **YES** (+266px) |

Same root cause as stays-mode baseline (header nav row) — the AI panel itself (`index.html:82`, `#cg-fly-ai` input, `min-height:44px`) does not add extra overflow; opening it actually reduces visible scrollWidth vs. the closed flights-form state because the From/To row is hidden while the AI textbox is shown instead. No new offenders beyond the header nav issue already documented above.

---

## search-results.html
`?destination=Las%20Vegas&checkin=2026-08-14&checkout=2026-08-17&adults=2`. No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 492 | 360 | **YES** (+132px) |
| 390 | 492 | 390 | **YES** (+102px) |

**Root cause (555 flagged elements, all downstream of 2 structural issues):**
1. `<main>` (`search-results.html:43`, `display:flex;gap:24px;align-items:flex-start`, no `flex-wrap`) holds a fixed-width `<aside>` filters sidebar (`search-results.html:45`, `flex:0 0 250px` — hard-pinned 250px, never collapses/stacks) side-by-side with the results `<section>` (`flex:1;min-width:0`). At 360-390px viewport there is no room for a 250px sidebar plus any usable results column, but nothing stacks them vertically — this alone guarantees overflow on every state of this page.
2. Each hotel result card (`search-results.html:180`, `<article style="display:flex;min-height:210px">`) is a 3-part flex row: a 240px fixed image (`line 181: flex:0 0 240px`), a details block (`line 183: flex:1.4`), and a price/CTA block (`line 203: flex:1;...align-items:flex-end`). None of these three shrink/stack at mobile widths, so every card (repeated ~10x = the 555-element count) pushes ~172-190px past the right edge — offending nodes are the price column's children: score badge (`line 206`), `13% off` badge (`line 210`), price row (`line 212-216`), and `See availability` link (`line 218`), consistently landing at `right:750` (492px scrollWidth is measured after the sidebar is also accounted for — the card itself renders wider than its ancestor because flex children with no `min-width:0` on the price block refuse to shrink below content size).

**Tap-target issues:** filter checkboxes' `<label>` wrapper is tall enough, but the underlying `<input type="checkbox">` itself is 18×18px (native, sub-40px — acceptable for checkboxes but the row `padding:6px 0` only yields ~29px total tap height, under the 40px guideline); `Clear filters` button 29px tall; sort/select `INPUT` 16-21px in a few spots; `Join the club` in the results-page nav is 37px (borderline).

(768×1024 checked: no overflow — `scrollWidth` 768 = `innerWidth` 768. The layout only breaks below ~600px, so the fix only needs a sub-768px breakpoint.)

**Suggested minimal fix:** add an `@media (max-width: 480px)` block (or 600px to be safe): (1) on `<main>` add `flex-direction:column` below the breakpoint so `<aside>` stacks above `<section>` and drop its `flex:0 0 250px` to `flex:1 1 auto;width:100%`, ideally behind a collapsible "Filters" toggle; (2) on the card `<article>` (line 180) add `flex-direction:column` at the breakpoint so image/details/price stack vertically, and change the image `flex:0 0 240px` (line 181) to `width:100%;height:180px` in that stacked layout; (3) give the price block (line 203) `align-items:flex-start` and `width:100%` when stacked so its children (badges/price/button) don't stay right-anchored past the container edge.

---

## hotel-detail.html
`?hotelId=lp43826&checkin=2026-08-14&checkout=2026-08-17&adults=2`. No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 510 | 360 | **YES** (+150px) |
| 390 | 510 | 390 | **YES** (+120px) |

**Offending elements:**
- Top `nav` row (`hotel-detail.html:29`, `display:flex;justify-content:space-between;gap:20px`, no wrap) packs logo + a search-summary pill (`line 31-38`: city/dates/guests + circular search button, `display:flex` with fixed internal dividers) + `Join the club` (`line 39`) into one row. The search-summary pill alone is 242px wide; combined with the logo and CTA button nothing fits in 360-390px and nothing wraps. Offenders: `Join the club` (line 39, right edge 510/537 across widths), the search-summary `DIV` (lines 31-38, right edge up to 422), the circular search-icon link inside it (line 37), and the `2 Guests` span (line 36).
- Sticky sub-nav tab row (`hotel-detail.html:110-115`): `Description`/`Ask AI` tab links (lines 112-113, both `white-space:nowrap`) plus the `Select rooms ↓` CTA (line 115, `flex-shrink:0`) overflow together — `Ask AI` badge lands at right:537, `Description` at right:426.

**Non-overflowing but visually broken (flag per instructions — multi-column grid squished, not literally overflowing):** the photo gallery grid (`hotel-detail.html:81`, `display:grid;grid-template-columns:1.55fr 1fr 1fr;grid-template-rows:200px 200px`) does not use `scrollWidth`-triggering fixed px, but at 360px viewport the grid measures 312px wide with 4 of 5 photo tiles rendered at 82×~100px each — thumbnails are too small to be useful and the row is unbalanced (fixed 200px row height regardless of tile width). Rooms grid (`line 197`, `repeat(auto-fit,minmax(290px,1fr))`) and amenities grids (lines 120, 168, 231) already use `auto-fit`/`minmax` so they correctly collapse to 1 column and were not flagged.

**Tap-target issues:** `Select rooms ↓` sticky CTA 37px; `Reserve` buttons per room card (`hotel-detail.html:211`) 39px (borderline, 1px short); `See all properties` link 30px; several icon-only links (search button, etc.) 32-34px.

**Suggested minimal fix:** add `@media (max-width: 480px)` block: (1) collapse the top-nav search-summary pill (lines 31-38) to icon-only or hide it behind a "Change search" link at this breakpoint, and let the `nav` row wrap (`flex-wrap:wrap`) as a fallback; (2) make the sub-nav tabs row (line 110-115) horizontally scrollable (`overflow-x:auto;white-space:nowrap` on the row itself, not per-link) instead of trying to fit `Description`/`Ask AI`/`Select rooms` all in view; (3) change the gallery grid (line 81) to `grid-template-columns:1fr` (single hero photo) with the rest in a horizontal scroll strip, or `grid-template-columns:repeat(2,1fr)` with `grid-template-rows:140px 140px 140px`, at the mobile breakpoint; (4) bump `Reserve` button padding by 1-2px to clear 40px.

---

## checkout.html
`?hotelId=lp43826&checkin=2026-08-14&checkout=2026-08-17&adults=2&room=X&board=Y&price=358&refund=0`. No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

No offenders found; page already fits (single-column form layout, no fixed-width flex rows). Minor: `Back to hotel` link is 18px tall (well under the 40px tap-target guideline) — low priority, add `padding` if fixing.

---

## booking-confirmed.html
No query params needed (reads from `localStorage`). No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

No offenders. Minor: `My trips` link 19px tall — under 40px guideline, low priority.

---

## my-trips.html
No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

No offenders — trip card (with real booking data: "Hampton Inn & Suites Las Vegas Airport") renders cleanly, single column. Minor: `Home` and `Join the club` footer links 17px tall — under 40px guideline, low priority.

---

## sign-in.html
No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

No real overflow (2 elements technically exceed `innerWidth` in their `getBoundingClientRect` — a decorative absolutely-positioned circle at `sign-in.html`'s hero panel, and a "See how travelers unlock bigger discounts" link — but both sit inside an `overflow:hidden` ancestor, so `scrollWidth` is unaffected; not a real bug).

**Tap-target issues (< 40px, none causing overflow but worth noting for the 40px acceptance criterion):** `← Back to home` 38px (borderline); a checkbox `INPUT` 16px (native checkbox — acceptable); `Forgot password?` link 35px; footer `Terms`/`Privacy Policy`/`Home`/`Join the club` links 16-17px tall.

**Suggested minimal fix:** low priority — bump footer link line-height/padding to reach 40px hit area if strictly enforcing the tap-target guideline; no `@media` block is required for overflow since there is none.

---

## flight-results.html
`?from=JFK&to=MIA&depart=2026-08-14&return=2026-08-17&adults=2&trip=round&cabin=economy`. No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 486 | 360 | **YES** (+126px) |
| 390 | 486 | 390 | **YES** (+96px) |

**Root cause (293 flagged elements — same pattern as search-results.html):**
1. `<main>` (`flight-results.html:41`, `display:flex;gap:24px`, no wrap) + fixed `<aside>` filters sidebar (`line 42`, `flex:0 0 240px`) — identical structural issue to search-results.html's sidebar.
2. Each flight card (`flight-results.html:98`, `<article style="display:flex;overflow:hidden">`) has a leg-time row (`line 106`, `flex:1;...min-width:260px`) that hard-floors at 260px regardless of available width, plus a fixed-width price panel (`line 119`, `flex:0 0 190px`). Combined, a single leg row + price panel needs ~150(carrier, line 102)+260(times, line 106)+190(price, line 119) = 600px+, guaranteeing overflow well past 390px. Offenders are the departure/arrival time spans (lines 107, 113) and their parent `min-width:260px` container (line 106), repeated per leg per card (round-trip = 2 legs × ~4 cards = the 293-count).

**Tap-target issues:** `Join the club` nav link 37px; several checkbox `INPUT`s 18px (native, acceptable); icon-only search button ~34px.

**Suggested minimal fix:** add `@media (max-width: 480px)` (mirror the search-results.html fix): (1) stack `<aside>` above `<section>` in `<main>` (`flex-direction:column`, drop sidebar's `flex:0 0 240px` to full width); (2) on the flight card `<article>` (line 98) switch to `flex-direction:column` so the leg-details column and the price panel (line 119, currently `flex:0 0 190px`) stack vertically instead of side-by-side; (3) drop or reduce `min-width:260px` on line 106 to something like `min-width:0` with `flex-wrap:wrap` on the leg row (line 101, which already has `flex-wrap:wrap` — extend that behavior to the inner time block) so times/duration can wrap onto their own line under the carrier info instead of forcing a fixed floor width.

---

## flight-checkout.html
`?from=JFK&to=MIA&depart=2026-08-14&return=2026-08-17&adults=2&trip=round&cabin=economy`. No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

No offenders; content ("This offer is quoted from demo data...") renders in a single-column form layout that already fits. Minor: `Back to flights` link 18px tall — under 40px guideline, low priority.

---

## registration-confirmed.html
`?name=Test&email=t%40e.com&ts=<future ms timestamp>`. No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

No real overflow. 3 decorative absolutely-positioned confetti/animation spans exceed `innerWidth` in raw `getBoundingClientRect`, but sit inside an `overflow:hidden` ancestor so `scrollWidth` is unaffected — not a bug. No tap-target issues found.

---

## travorium-landing.html
Already has 5 `@media` blocks (the only page besides the two webinar-optin pages with pre-existing responsive CSS).

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

131 elements exceed `innerWidth` in raw bounding-rect terms, but all are inside intentionally-clipped containers: an infinite CSS `cg-marquee` ticker strip (`width:max-content` animated horizontally) and a horizontally-scrolling video/testimonial carousel (`scroll-snap-align:center`, `overflow-x` scroll on the parent). Both patterns are correct mobile behavior per spec ("carousels must fit or scroll within their own container — never widen the page") — `scrollWidth` confirms the page itself never widens. No fix needed.

---

## webinar-optin.html
Already has 1 `@media` block.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

45 elements exceed `innerWidth` in raw bounding-rect terms — all from the same clipped `cg-marquee` ticker pattern as travorium-landing.html (a strip of "Members-only rates / Cancel anytime / No coupon hunting / ..." pills scrolling infinitely inside an `overflow:hidden` band). Confirmed non-issue: `scrollWidth` matches `innerWidth` exactly. No tap-target issues found.

---

## webinar-optin-creator.html
Already has 1 `@media` block.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

Clean — no offenders, no tap-target issues found.

---

## terms.html
No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

No overflow offenders. **Tap-target issues:** `← Back to home` link 38px (borderline, 2px short); footer `Home`/`Privacy Policy`/`Join the club` links 17px tall — under the 40px guideline, low priority since these are inline text links in a footer row, consistent with the same pattern across all pages.

---

## privacy.html
No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

Clean — no overflow, structurally identical to terms.html (same shared header/footer template).

---

## 404.html
No `@media` blocks.

| Width | scrollWidth | innerWidth | Overflow |
|---|---|---|---|
| 360 | 360 | 360 | No |
| 390 | 390 | 390 | No |

Clean — minimal page (heading + link home), no offenders.

---

## Summary table

| Page | Overflow @360 | Overflow @390 | Findings (distinct offender groups) |
|---|---|---|---|
| index.html — stays mode | YES (+266px) | YES (+236px) | 2 (header nav row; hero H1 nowrap) |
| index.html — flights mode | YES (+283px) | not re-measured (same code path, worse) | 4 (header nav; From/swap row; passenger label nowrap; flights H1 nowrap) |
| index.html — flights + AI open | YES (+266px) | not re-measured | 1 (header nav row only; AI panel itself adds no overflow) |
| search-results.html | YES (+132px) | YES (+102px) | 2 structural (fixed 250px sidebar; 3-part card row) → 555 raw elements |
| hotel-detail.html | YES (+150px) | YES (+120px) | 2 overflow groups (top-nav search pill + Join club; sub-nav tabs) + 1 non-overflow layout issue (squished photo gallery grid) |
| checkout.html | No | No | 0 |
| booking-confirmed.html | No | No | 0 |
| my-trips.html | No | No | 0 |
| sign-in.html | No | No | 0 (2 false positives, clipped by ancestor) |
| flight-results.html | YES (+126px) | YES (+96px) | 2 structural (fixed 240px sidebar; leg-time min-width:260px + fixed price panel) → 293 raw elements |
| flight-checkout.html | No | No | 0 |
| registration-confirmed.html | No | No | 0 (3 false positives, clipped) |
| travorium-landing.html | No | No | 0 (131 false positives — clipped marquee/carousel, correct behavior) |
| webinar-optin.html | No | No | 0 (45 false positives — clipped marquee, correct behavior) |
| webinar-optin-creator.html | No | No | 0 |
| terms.html | No | No | 0 |
| privacy.html | No | No | 0 |
| 404.html | No | No | 0 |

**Pages/states with real overflow: 5 of 16 pages (8 of ~19 measured states/modes)** — `index.html` (all 3 states), `search-results.html`, `hotel-detail.html`, `flight-results.html`. All other 11 pages pass at both 360 and 390. 768px was spot-checked on `search-results.html` (passes — issue is sub-600px only).

**Common root-cause pattern across all 4 broken pages:** rigid `display:flex` rows with fixed-px children (`flex:0 0 <N>px`, `min-width:<N>px`) and no `flex-wrap`/`flex-direction:column` fallback at small viewports, plus two results pages sharing a hard-pinned 240-250px sidebar that never collapses. None of these 4 pages currently have any `@media` query, so 3.2 fixers are adding new breakpoints rather than extending existing ones (contrary to spec.md's assumption). The 3 pages that already ship `@media` blocks (`travorium-landing.html`, `webinar-optin.html`, `webinar-optin-creator.html`) are also the 3 that pass cleanly — reinforcing that the fix pattern (extend/add `@media (max-width: 480px)`) works.

