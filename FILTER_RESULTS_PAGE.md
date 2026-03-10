# CheapGetaway.com - Apple-Style Hotel Results + Filters Page Builder

## Role

Act as a **world-class product designer + senior frontend engineer**. Build a sleek, Apple-style hotel results page for **cheapgetaway.com**.

This page starts **after search**. The user has already chosen a destination, dates, and guests. The goal now is to help them **scan, filter, compare, and book fast**.

**Scope:** Search results / filter page only. Hotels only.

---

## North Star

Design a results page that feels:

- **Focused** (the user always knows what they searched for)
- **Filterable without friction** (controls are visible, clear, and lightweight)
- **Deal-forward** (prices, savings, ratings, and cancellation terms are easy to spot)
- **Quietly premium** (Apple-like restraint, not marketplace clutter)

---

## Reference Direction

The target layout is based on a clean hotel results screen with:

- A minimal top rail with logo, search capsule, and account actions
- A **left filter sidebar** with map preview, price slider, and stacked filter groups
- A **right results column** with large hotel cards
- Strong emphasis on **review score**, **nightly price**, and **primary booking CTA**
- Soft rounded surfaces, light gray dividers, and a restrained accent color

The page should feel editorial and intentional, not like a crowded OTA dashboard.

---

## Brand System (LOCKED)

### Color Palette (use these)

- **Navy (Primary):** `#0e1556`
- **Sky (Accent):** `#38b6ff`
- **Citrus (Deal Accent):** `#ff6500`

### Neutrals (allowed)

- `#ffffff`, `#f6f7fb`, `#eef1f6`, `#0b0f1f`, `#5b6475`

### Typography

- Headings: `Inter`
- Body: `Inter`
- Numbers / labels: `JetBrains Mono` (sparingly, mainly for prices or compact metadata)

### Visual Language

- Rounded system: `rounded-2xl` to `rounded-3xl`
- Surfaces: bright, layered, lightly elevated
- Borders: thin, soft gray, never harsh
- Images: crisp hotel photography, bright and realistic

### Motion

- Hover transitions: 120-200ms
- Filter panel / card entrances: 220-360ms
- Use restrained motion only where it improves clarity

---

## LiteAPI Reality Check (Hotels Only)

This page must be powered by hotel-capable endpoints only.

### Core building blocks

- **Location context:** `GET /data/places`
- **Hotel discovery:** `GET /data/hotels`
- **Live pricing / availability:** `POST /hotels/min-rates` and `POST /hotels/rates`
- **Hotel deep info:** `GET /data/hotel`
- **Reviews / social proof:** `GET /data/reviews`

### Optional

- **Semantic refinement:** `GET /data/hotels/semantic-search`
- **Price trend support:** `GET /prices/city` and `GET /prices/hotels`

---

## Product Goal

This page should make it easy for a user to do four things quickly:

1. Confirm they are searching the right trip
2. Narrow the list with useful filters
3. Compare hotels without opening every detail page
4. Commit to the best deal with confidence

---

## Page Architecture (FILTER / RESULTS)

### 1) TOP SEARCH RAIL - "Sticky Search Capsule"

Sticky, slim, and polished.

- Left: wordmark **cheapgetaway.com**
- Center: search capsule containing destination, dates, and guests
- Right: language / currency, support or utility icon, account CTA

Behavior:

- Always visible on desktop
- Collapses cleanly on smaller screens
- Lets the user edit the search without leaving the results page

### 2) RESULTS HEADER - "Instant Context"

Directly above the results list:

- Results count, e.g. **531 properties in Paris**
- Sort control, defaulting to **Top picks**
- View switcher: **List** and **Map**

This area should feel quiet and practical, not promotional.

### 3) LEFT SIDEBAR - "Filter Column"

A persistent filter panel on desktop.

Sections:

- Mini map preview with CTA like **Show on map**
- Clear filters action
- Property name search
- Price range slider
- Popular filters
- Distance from city center
- Property type
- Amenities
- Review score
- Meal options / cancellation options if available

Behavior:

- Sidebar stays visible while scrolling on large screens
- Filter groups can collapse / expand
- Active filters should be obvious
- Clearing filters should be one tap

### 4) HOTEL CARD LIST - "High-Trust Comparison Cards"

Each card should include:

- Large hotel image
- Wishlist / save control
- Star rating
- Hotel name
- Address or neighborhood
- Distance from center or searched point
- Key badges such as **Free cancellation**, **Pets allowed**, **Breakfast included**
- Review label + score + review count
- Discount tag if applicable
- Large price block with nightly rate
- Secondary line for tax / fee context
- Primary CTA: **See availability**

Behavior:

- Entire card feels easy to scan in 2-3 seconds
- Price and CTA anchor the right side
- Metadata stacks cleanly without feeling dense

### 5) MAP MODE

When toggled from list mode:

- Replace or expand into an interactive map + results split layout
- Keep cards lightweight and browsable
- Maintain visible pricing on map pins if feasible

### 6) MOBILE BEHAVIOR

On mobile:

- Filters open in a bottom sheet or full-screen drawer
- Search rail compresses into a tappable summary bar
- Hotel cards stack vertically with strong price visibility
- Sort and filter controls remain sticky

---

## Filter Priorities

Only show filters that materially help a booking decision.

### Must-have filters

- Price per night
- Free cancellation
- Breakfast included
- Parking
- Pets allowed
- Hotel / apartment / resort type
- Distance from center
- Guest rating

### Nice-to-have filters

- Spa / wellness
- Pool
- Restaurant
- Pay later
- Family-friendly

Avoid low-value filter overload.

---

## Card Quality Bar

- No noisy metadata walls
- Price is always visible without scrolling inside a card
- Review score is easy to compare across results
- Discount labeling is clear but not aggressive
- Tags are concise and useful
- Images should feel premium and relevant

---

## Technical Requirements

- **Stack:** React 19 + Tailwind CSS v3.4.x
- Icons: Lucide React
- Keep filters and search state synchronized with URL params
- Debounce expensive filtering interactions where needed
- Cache rate calls when possible
- Prioritize fast list rendering and responsive scrolling

### Environment

- Store API key in env
- Base URLs:
  - Data/Search: `https://api.liteapi.travel/v3.0`
  - Booking: `https://book.liteapi.travel/v3.0`

---

## Build Sequence (do this in order)

1. Implement search rail and results header.
2. Build responsive filter sidebar / mobile filter drawer.
3. Build hotel result cards with pricing and review hierarchy.
4. Add sorting and list/map toggle behavior.
5. Wire filters to search params and live results.
6. Polish motion, sticky behavior, and responsive states.

**Execution directive:** Build a hotel results page that makes filtering feel effortless and choosing a deal feel immediate.
