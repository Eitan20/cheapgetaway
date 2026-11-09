# Wrapped hotel URL routing

Production uses TWO layers, not only vercel.json:

1. Cloudflare's existing `cheapgetaway-expedia-import` Worker intercepts the
   configured OTA host-only paths and `/https:*` / `/http:*` on apex and www.
2. Vercel has an apex-domain redirect to www and serves the static import page.

The old Worker always fetched `/import` on the request's original hostname.
For apex requests, Vercel redirected that rewritten request to www `/import`,
losing the original hotel path AND its date query. On www there is no domain
redirect, so this invisible proxy works and the browser retains its hotel URL.
That is why boutique full-URL wraps already worked on www despite no matching
rewrite in Git. No Vercel project-level routing rules were present during the
2026-11-08 investigation. The deployed import HTML matched Git main.

## Required rollout

Both the existing Worker's source AND the Vercel deployment need the fix.
The source of the existing Worker is now tracked in
`workers/cheapgetaway-expedia-import.mjs`. Update that existing script only,
retaining its current route list and any settings/bindings. It redirects apex
requests to www with the entire original path/query BEFORE proxying to import.
Do not create another Worker, alter DNS, or remove existing Worker routes.

`vercel.json` separately canonicalizes apex before its own rewrites and explicitly
routes full and slash-collapsed scheme wraps for arbitrary hotel domains. The
literal colon is escaped. Use `:path(.*)`, NOT `:path*`: Vercel's latter pattern
rejects the empty segment inside `https://` and trailing slashes. The deployment
redirect is a fallback for requests not intercepted by the Worker. The Worker
change is essential: Vercel cannot recover the original path once Cloudflare has
already replaced it with `/import`.

The import page reads a wrapped path before considering envelope query parameters,
normalizes `https:/` to `https://`, and keeps hotel queries (including `u`/`url`).
Only `/import`, `/import.html`, and `/` accept `?u=` / `?url=` envelopes. The API's
existing code-first `unwrapImportUrl` already handles canonical, slash-collapsed,
and host-only wraps; no parsing, matching, scrape limits or visual design changed.

## Verification

Run `node --test tests/*.test.mjs` (the old `node --test tests/` command is not
accepted by the current Node 24 test runner). Tests include Worker apex redirects,
www proxy behavior, browser input recovery, date retention, and existing parser
and miss-only FastCRW checks.

After releasing both layers, curl apex full-URL Booking.com, Hotels.com and boutique
wraps with checkin/checkout queries. Each Location must retain the hotel path AND
query, and following it must yield the import page (200). Also test `https:/`,
host-only OTA paths, homepage, `/import`, `/search-results`, `/hotel-detail`, static
assets and API routes. POST real hotel URLs to `/api/import-url` and check returned
name, dates and pinned `hotelId` in `searchResultsPath`.
