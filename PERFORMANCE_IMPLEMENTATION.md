# Performance implementation — September 2026

Approved scope: implement the findings in the [original performance review](docs/archive/PERFORMANCE_REVIEW_2026-09-19.md) in phases, continuing automatically after verification. Preserve search semantics, publication restrictions and the existing interface.

## Phase 1 — search and cache correctness

- Implemented bounded TTL/LRU caches for server queries, Browse and bookmark requests; race-safe rejected-promise cleanup.
- Removed unsupported Turso FTS calls. Added a normalized FTS5 trigram index with insert/update/delete triggers and an atomic, repeatable migration.
- Migration 00007 applied successfully to the configured database. Capability discovery uses sqlite_master and caches the result; databases awaiting migration retain literal LIKE search. Queries shorter than three Unicode characters retain the scan path.
- Local regression checks pass: expiry/capacity/deduplication/races; English/Hindi/phrase/literal punctuation parity; index updates/deletes/reruns; existing public search and embargo tests.

## Phase 2 — PDF loading and resource ownership

- Featured cover/text shell renders normally; only the opened reader loads react-pdf.
- Bookshelf imports PDF code on preview intent, cancels rendering and destroys loading tasks on close/unmount, guards late results, retains at most six page images.
- Closed featured previews unmount; DPR capped at two.
- Production browser checks confirm no PDF engine/document before intent, a rendered preview after opening, and zero retained preview canvases after closing. Page-image caches stay at six entries; a long-session heap profile has not been claimed.

## Phase 3 — payloads and query work

- Shelf DTO excludes descriptions and repeated full magazine records. Initial response contains only the latest readable year plus the complete year catalogue; older years load through `/api/issues/shelf`. Browser year cache has TTL/capacity limits and failed loads have an explicit retry.
- Measured initial shelf JSON: **5,564 bytes, 10 issues, 8 year entries**, versus 176,006 bytes for 94 full records in the audit (96.8% reduction). This is raw JSON, not total page weight or compressed transfer.
- Browse caches facets/counts independently of page/sort. A regression check proves a subsequent page/sort change executes only the row query. Stale foreground requests abort; availability prefetch runs on intent and respects constrained connections.
- Metadata matches stay in SQL, removing the 10,000-ID transfer/truncation. Topic matching uses EXISTS rather than expanding and deduplicating every issue row.
- Migration 00008 adds maintained metadata trigrams and a latest-indexing-run lookup index; applied atomically to the configured database. Tests cover magazine renames and quoted topic values as well as English/Hindi substrings.
- Homepage shelf and collection counts use Next persistent data caches with a 30-second revalidation period, publication mutation tags and embargo-month keys. Process caches also clear on mutations. Browse's misleading HTML-cache comment is corrected.

## Phase 4 — large-file workflows and delivery

- ZIP checks selected metadata before transfer and counts actual streamed bytes across concurrent requests. Input budget is 50 MiB, with guidance to choose fewer issues or individual downloads. Network cancellation aborts work; generation callbacks throw on cancellation. Compression remains STORE.
- Highlight results are cached per PDF.js page using weak ownership and a bounded TTL cache. Closing a document does not retain it through the cache. Cancellation and the existing OCR timeout remain.
- Direct upload completion uses authenticated R2 HEAD plus a five-byte signature check. A successfully supplied cover avoids downloading the full PDF back through the app. The full PDF is fetched only when a fallback cover must be generated.
- Server uploads set a short explicit cache policy for mutable keys. Added precise legacy-origin aliases and configurable Next image allowlisting for a later domain transition.
- **User-deferred:** `aimarchive.aurosociety.org` is the chosen website address. Domain setup and spending are deferred. Asset hostname, CDN activation, existing-object/direct-PUT cache headers and CORS rollout remain in [ASSET_DELIVERY_PLAN.md](ASSET_DELIVERY_PLAN.md). No domain, billing or deployment change was made.

## Phase 5 — growth paths and verification

- Indexing fast native pages checkpoint in batches of up to five; slow OCR checkpoints at page completion. Pending pages flush before completion or controlled failure. Lease/source fencing remains transactional. Crash/resume, stale-worker, replacement and retry tests pass. A hard crash can replay at most four fast pages.
- Coverage page counts use a grouped indexed relation instead of per-issue count subqueries. Admin facets have short bounded caches; storage inventory has a five-second cache invalidated by archive mutations. Storage cover deletion now invalidates public caches too.
- Reader scroll lookup uses binary search for the first visible page slot before measuring nearby pages.
- Issue cards subscribe to their own bookmark state; only the first two covers receive eager priority. The homepage-only decorative font is not preloaded globally, and PDF standard-font tracing is limited to admin API routes.
- Download counters use Next `after()` so redirects do not await the analytics write.
- Added production JS budgets in `scripts/check-performance-budget.cjs`; it also rejects a PDF engine in the homepage's initial scripts.
- Added opt-in anonymous Web Vitals logging (`NEXT_PUBLIC_ENABLE_WEB_VITALS=true` at build/deploy). Disabled by default. Reports only metric name/value/rating, with bounded validated input; no URLs, query strings or user identifiers. Field metrics have not yet been collected.

## Verification and practical limits

- Tests: `test-performance.cjs`, `test-performance-io.cjs`, `test-review.cjs`, `test-search-reader.cjs`, `test-indexing-jobs.cjs`, `test-indexing-controls.cjs`, `test-indexing-runner.cjs`.
- TypeScript and targeted ESLint pass. Production build and manifest budgets are checked in an isolated `.next-performance` directory so localhost:3000 stays available.
- Final production build passes without lint warnings. Manifest gzip budgets pass: homepage 205.4 KiB / 220 KiB, Browse 208.2 / 220, reader 301.5 / 350. These include the layout and route file sets and use a different accounting method from Next's displayed First Load JS (187/190/280 kB respectively); neither is a measured Lighthouse score.
- Browser script: `output/playwright/verify-performance.cjs`; screenshots: `performance-home-mobile.png`, `performance-home-desktop.png`. Checks responsive alignment, preview lifecycle, older-year fetch and public API responses. Temporary production port 3001 is not allowed by bucket CORS; the renderer check adds a CORS header in the test browser only and retains the real PDF response. It does not certify external CORS configuration.
- Normal localhost:3000 was separately verified with no interception: preview canvas renders, closing removes it, and no page errors occur.
- Read-only measurement script: `scripts/measure-performance.cjs`. FTS5 query plan uses `VIRTUAL TABLE INDEX 0:M1`; all 4,937 indexed pages are present. Three remote search samples were 436/277/150 ms for 50 rows. This is not a p95 or reliable before/after latency comparison; network variability dominates the small sample.
- Larger architectural options remain explicit: a file-backed/server-streaming ZIP path above the safe client budget, persisted OCR coordinates across document reloads, a durable thumbnail queue for uploads without covers, and paginated storage inventory for much larger buckets. Current fixes bound or avoid the immediate costs; these larger features are not falsely marked implemented.
- Additive migrations 00007 and 00008 were applied before release. The website was subsequently deployed with explicit user approval; see [production release](PRODUCTION_RELEASE_2026-09-19.md). No Git commit/push was made; the GitHub-hosted worker's source synchronization remains separate from the website release.

## Deployment readiness check

- Existing production site returns 200, uses `https://aim-archive.vercel.app` as its canonical address, serves the versioned PDF worker, and receives the correct R2 CORS header for that origin. Byte ranges are advertised.
- Production environment variable names checked: Turso, R2, admin password and public app URL are present. Values were not exposed or changed.
- **Known admin limitation:** `INDEXING_GITHUB_TOKEN` is absent in Production. Admin's Start indexing connection remains disabled; existing indexed search is independent of it. Setting up this optional connection is separate from deploying public website improvements.
- Verified all 16 PDF standard-font assets remain in the upload, cover, PDF-replacement and thumbnail function traces after narrowing the tracing pattern.
- Added `.next-performance` to `.vercelignore` so the temporary verification build is not uploaded as release input.
- No known blocking source-code issue found for deploying the public website changes to the existing Vercel address. Final deployed smoke checks should cover reading/preview, search, downloads and a controlled admin upload; local tests are not proof of the newly deployed runtime.
