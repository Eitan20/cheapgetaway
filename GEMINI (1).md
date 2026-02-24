# CheapGetaway.com — Apple-Style Hotel Booking Homepage Builder

## Role

Act as a **world-class product designer + senior frontend engineer**. Build a sleek, Apple-style travel homepage for **cheapgetaway.com**.

Our niche is **cheap getaways**: short, affordable hotel stays that feel like an upgrade. Think the clarity of Apple.com with the utility of a travel site.

**Scope:** Home page only (for now). Hotels only.

---

## North Star

Design a site that feels:

- **Quietly premium** (white space, crisp typography, careful motion)
- **Deal-forward** (prices are always visible, “from $X” everywhere)
- **Fast to decision** (search is primary, browsing is curated)
- **Hotels-only** (no flights, no cars, no packages)

---

## Brand System (LOCKED)

### Color Palette (use these)

- **Navy (Primary):** `#0e1556`
- **Sky (Accent):** `#38b6ff`
- **Citrus (Deal Accent):** `#ff6500`

### Neutrals (allowed)

Use neutrals to let the palette breathe:

- `#ffffff`, `#f6f7fb`, `#0b0f1f`, `rgba(255,255,255,0.6)`

### Typography

Apple-like, modern, legible:

- Headings: `Inter` (tight tracking, strong weights)
- Body: `Inter`
- Numbers/labels: `JetBrains Mono` (sparingly)

### Visual Language

- Rounded system: `rounded-2xl` to `rounded-3xl`
- Shadows: soft, subtle, not “cardy”
- Surfaces: light glass + blur for sticky UI
- Photography: bright, high-key travel imagery (coasts, cities, cabin views). No moody noir.

### Motion

Subtle, physically plausible:

- 120–220ms for hover transitions
- 240–480ms for section entrances
- Ease defaults: `cubic-bezier(0.22, 1, 0.36, 1)`

No excessive scroll-jacking. No gimmicks.

---

## LiteAPI Reality Check (Hotels Only)

The homepage must be powered by hotel-capable endpoints only.

### Core building blocks

- **Location autocomplete:** `GET /data/places` (use for destination typeahead)
- **Hotel discovery:** `GET /data/hotels` (IDs + metadata)
- **Prices & availability:** `POST /hotels/min-rates` (fast “from $X”) and `POST /hotels/rates` (full rate options)
- **Hotel deep info:** `GET /data/hotel`
- **Social proof:** `GET /data/reviews`

### Optional (use carefully)

- **Semantic discovery:** `GET /data/hotels/semantic-search` (Beta)
- **Hotel Q&A:** `GET /data/hotel/ask` (Beta)
- **Price trends:** `GET /prices/city` + `GET /prices/hotels` (Beta, rate-limited)

### Booking flow (not fully implemented on homepage)

Home page can **tease** booking flow, but actual booking occurs later:

- `POST /rates/prebook` → get `prebookId`
- `POST /rates/book` → confirm booking

---

## Data Strategy (Homepage)

Avoid expensive fan-out calls.

- Prefer **curated destination modules** (fixed city list) over “everything everywhere”.
- Use **min-rates** for tiles and carousels.
- Cache results (server-side if possible). If client-side only: memoize and debounce.
- If using **price index** endpoints: do it for a small set of cities and cache aggressively.

---

## Page Architecture (HOME)

### 1) NAVBAR — “Glass Rail”
Sticky, translucent, minimal.

- Left: wordmark **cheapgetaway.com**
- Center: `Deals`, `Weekend`, `Vibes`, `How it works`
- Right: CTA button **Find a deal** (Sky) + optional `Sign in`

Behavior:

- At top: transparent background, white text over hero
- After scroll: blurred white surface, navy text, thin border

### 2) HERO — “Find a Cheap Getaway”
Full-bleed image with a clean overlay.

Copy:

- H1: **Cheap getaways, seriously good stays.**
- Subhead: *Hotels with real-time prices. Book in minutes. Leave tomorrow.*

Primary element: **Search Module**.

#### Search Module (must feel like Apple)
A single, pill-driven control cluster:

- Destination (typeahead using `/data/places`)
- Dates (check-in / check-out)
- Guests (rooms, adults, children)
- Primary CTA: **Search hotels** (Citrus)

Bonus toggles:

- “This weekend” quick-chip (auto sets next Fri–Sun)
- “Under $120/night” quick-chip (applies filter in results)

### 3) DEAL STRIP — “This Weekend’s Steals”
A horizontal carousel of destinations.

Each tile:

- City + short descriptor (e.g., “Beach reset”, “Downtown buzz”)
- **From $X/night** (use `/hotels/min-rates` against a curated hotelId list per city)

### 4) FEATURED COLLECTIONS — “Pick Your Escape”
Three large tiles that act like browse shortcuts.

- **Beach on a budget**
- **City break under $150**
- **Cabins & cozy corners**

Implementation:

- Use curated semantic queries (if enabled) via `/data/hotels/semantic-search`
- Fallback: curated city lists + min-rates

### 5) HOTEL CAROUSEL — “Top Deals Right Now”
A grid/carousel of 8–12 hotels.

Card must show:

- Image, name, star rating
- Neighborhood / city
- **From $X**
- “Free cancellation” badge when present in rate details (later pages can confirm)

Data:

- Get hotel IDs via `/data/hotels` (by city or coords)
- Get pricing via `/hotels/min-rates`

### 6) VIBE SEARCH — “Describe it, we’ll find it”
A compact, centered module:

- Input: “romantic getaway near London” style prompt
- CTA: “Search by vibe”

Data:

- Prefer `/data/hotels/semantic-search` for discovery
- Or pass `aiSearch` into `/hotels/rates` in later search flow

### 7) TRUST / VALUE — “Why CheapGetaway”
Three clean bullets with icons.

- **Real-time prices** (rates are live)
- **Hotels only** (no clutter)
- **Book securely** (payment flow supported later)

### 8) HOW IT WORKS — “Three steps to gone”
Minimal stepper:

1. Search a destination (Places + Hotels)
2. Compare prices (Min-rates + Rates)
3. Confirm in minutes (Prebook → Book)

### 9) FOOTER — “Simple, useful, not loud”

- Columns: Company, Help, Legal
- Small “Deal Drop” email capture (optional)
- Tiny status indicator (purely visual)

---

## Component Quality Bar

- No placeholders.
- All sections are responsive.
- Above-the-fold loads fast.
- Every price card uses a consistent number style.
- The site should feel like it was designed, not generated.

---

## Technical Requirements

- **Stack:** React 19 + Tailwind CSS v3.4.x
- Optional: GSAP for subtle entrances (use sparingly)
- Icons: Lucide React
- Images: real Unsplash URLs (bright travel photography)

### Environment

- Store API key in env (never hardcode)
- Base URLs:
  - Data/Search: `https://api.liteapi.travel/v3.0`
  - Booking: `https://book.liteapi.travel/v3.0`

---

## Build Sequence (do this in order)

1. Implement design tokens (colors, type, spacing, radius).
2. Build navbar + hero + search module first.
3. Build weekend deals carousel powered by min-rates.
4. Build featured collections + top deals grid.
5. Add vibe search module.
6. Add trust + how-it-works + footer.
7. Polish motion and responsive behavior.

**Execution directive:** Build a homepage that makes people feel like booking a cheap getaway is the most obvious thing they’ll do today.
