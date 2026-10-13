# Performance review — 19 September 2026

> Historical record, archived 19 September 2026. Status claims and commands below describe the original work; use [the active TODO](../../TO%20DO%20LIST.md) and current operating guides for today's tasks. This record does not authorize replaying migrations or deployments.

## Outcome

The highest-priority work is the actual search-engine mismatch, R2 delivery configuration, eager homepage PDF dependencies, PDF-preview resource ownership, and unbounded caches. These are supported by source evidence and, where practical, read-only measurements. Other findings below are workload or growth risks rather than measured production slowdowns.

No application source, database data/schema, storage configuration, or deployment was changed for this audit. Added only this report and the read-only inspection script at `output/playwright/performance-data-audit.cjs`.

## Scope and limits

Reviewed public server pages and client loading paths; public APIs; database client, cache, queries, migrations and import tooling; reader and homepage PDF rendering; search highlighting/OCR; upload and thumbnail handling; ZIP download; admin issues, indexing catalogue, storage and worker paths; shared images, fonts and build configuration. Mobile is still a skeleton and was not treated as a production app needing micro-optimization.

Read-only checks used the configured remote database, a small number of repository calls, an isolated in-memory cache experiment, and HEAD on one public PDF. No load test, write query, admin operation or indexing job was run. The production artifact in `.next-verify` was dated September 6 and was excluded as stale. No current production bundle-size, Lighthouse, field LCP/INP/CLS, heap profile, or mobile CPU score is claimed.

## Measured evidence

| Check | Observation | Meaning / limitation |
| --- | --- | --- |
| Database inventory | 104 issues; 4,937 indexed pages | Current configured database, not a forecast |
| Full-text capability | `fts_match` fails with missing-function SQL_INPUT_ERROR; no expected content FTS index in index inventory | Current search does not use the intended full-text engine |
| Text-search repository, query “mother” | 339ms and 158ms; 50 rows each | Two end-to-end calls from this machine, including remote latency; not SQL-only timing or p95 |
| Homepage shelf | 94 rows; 176,006 bytes serialized JSON; 179ms retrieval | Uncompressed data, not compressed browser transfer or whole-page weight |
| Descriptions within shelf data | 72,550 bytes serialized separately | Large removable field for a cover/title-oriented shelf |
| Largest issue PDF metadata | 22,730,882 bytes | Enough to make multi-file ZIP memory relevant; not a measured browser memory peak |
| Cache expiry experiment | 100 distinct expired entries plus a new entry leaves 101 retained entries | Directly reproduces absence of eviction in AsyncTtlCache |
| Sample PDF HEAD | 200; `r2.dev`; Accept-Ranges: bytes; no Cache-Control or CF-Cache-Status | Range support exists; one asset sample, not a complete storage-policy inventory |
| Metadata query plan | Published-index lookup, topic virtual-table scan, temporary trees for DISTINCT and ORDER BY | Ordinary title index does not solve this substring/topic query |

## Priority 1 — fix first

### 1. Search always takes a failed FTS attempt before its fallback

**Evidence:** `apps/web/src/lib/db/search-repository.ts:49`, `:142`, `:178`; `packages/turso/migrations/00001_initial_schema.sql`; migration/import `--skip-fts` paths. The connected database lacks the function and index the implementation expects. Each call tries `fts_match` and then falls back to `lower(replace(...content...)) LIKE '%query%'`.

**Impact:** Avoidable failed remote round trip plus page-text scanning. Cost grows with indexed pages. A search result being returned is not evidence that FTS works.

**Fix:** Select and migrate to a full-text implementation supported by the actual database engine/version; validate its query plan and multilingual matching. As an immediate fallback improvement, detect/cache capability rather than throwing on every request. Keep fallback behavior explicit and observable. Do not blindly rerun unsupported `USING fts` SQL.

**Verify:** Healthy supported index; no expected SQL error on ordinary searches; equivalent relevant results; repeated-query and cold-query timings at a larger page count.

### 2. Public PDFs still use the R2 development endpoint

**Evidence:** Stored public asset URLs, `apps/web/next.config.ts`, `apps/web/src/lib/r2-client.ts:58`, and sampled PDF HEAD. Cloudflare states that `r2.dev` is rate-limited and intended for development; its R2 cache integration requires a custom domain. [Cloudflare public-bucket documentation](https://developers.cloudflare.com/r2/buckets/public-buckets/).

**Impact:** The PDF delivery path lacks the intended production CDN configuration and may encounter development-endpoint limits. Existing range support is good and must be retained.

**Fix:** Configure a custom asset domain, migrate/normalize stored URLs and Next image allowlisting, verify CORS/ranges, and set an explicit cache policy. Use versioned object keys or reliable invalidation for replaced PDFs/covers. `uploadToR2` currently sets ContentType but not CacheControl. Do not put year-long immutable caching on mutable object names without a version strategy.

**Verify:** Cold/warm asset headers and timings, replacement freshness, byte ranges, and browser PDF/image loading through the new domain.

### 3. Homepage PDF code is not actually deferred until preview

**Evidence:** `apps/web/src/app/home-client.tsx:10` statically imports AnimatedBookshelf; `animated-bookshelf.tsx:19` statically imports `react-pdf` and calls worker configuration. The dynamically imported featured component also contains both the text/card shell and its Document/Page imports. Rendering that dynamic component on initial load fetches its code, even when no preview is open.

**Impact:** Visitors who only browse covers still download/execute PDF-related client code. The comment claiming the PDF dependency is fully isolated from first load is incomplete.

**Fix:** Separate lightweight server-renderable cover/metadata/action shells from PDF viewers. Dynamically import the actual renderer on preview intent, including the bookshelf PDF loader. A dynamic import alone is insufficient if the component is immediately rendered. [Next.js lazy-loading guidance](https://nextjs.org/docs/15/app/guides/lazy-loading).

**Verify:** Fresh production-network trace contains no PDF-renderer chunk before preview intent; compare initial JS transfer and parse time. Check the featured section's reserved height: its 220px loading placeholder is substantially smaller than its content-rich mobile state, so measure CLS after restructuring.

### 4. Bookshelf preview resources have no complete disposal lifecycle

**Evidence:** `animated-bookshelf.tsx:134–191`, `:273`. `getDocument` results are retained in refs; rendered pages accumulate as base64 JPEG strings in pageImages. Cleanup clears timers but never destroys the loading task/document or cancels outstanding renders on unmount. A late document load can complete after its book component is gone.

**Impact:** Repeated previews/year changes can leave PDF resources active and consume memory. Long open previews accumulate rendered page images. This is a confirmed missing cleanup path; actual retained heap size was not profiled.

**Fix:** Own and destroy loading tasks/documents; cancel render tasks; guard late completions; bound page-image caching to the current/nearby spread; prefer revocable Blob URLs over retained base64 strings when appropriate. [PDF.js document lifecycle API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFDocumentProxy.html).

**Verify:** Repeated open/close/year changes reach a stable heap/worker count, and cancelled previews do not continue work or update unmounted state.

### 5. Server and client caches retain an unbounded number of keys

**Evidence:** `apps/web/src/lib/db/cache.ts:6`; `apps/web/src/app/browse/browse-client.tsx:142–213`; `apps/web/src/lib/api.ts` bookmarkedIssueRequests. AsyncTtlCache checks expiry but never evicts untouched expired entries. Browse responses have neither a size cap nor TTL. Bookmark-request keys represent changing complete ID sets.

**Impact:** Memory grows with distinct filters, pages, issue IDs, or bookmark combinations. The server issue is especially relevant to long-lived processes. Browser Browse data can also remain stale throughout a long session.

**Fix:** Add bounded LRU/TTL eviction, normalized keys, and deliberate stale-data refresh. Keep in-flight deduplication but avoid an old rejected promise deleting a newer replacement entry. Bound browser caches separately from process caches.

**Verify:** Many distinct keys plateau at configured limits; expired data is refreshed; concurrent requests share work correctly; mutation freshness is preserved.

## Priority 2 — next performance pass

### 6. Homepage overfetches full records for a small visible shelf

`public-repository.ts:95`, `mappers.ts` issueSelectSql, and `home-client.tsx`. Up to 240 complete issue records are sent to the client, while a selected year shows at most 12. Today this is 176KB raw JSON for 94 records, including approximately 73KB of descriptions and repeated magazine metadata.

Return a purpose-built shelf DTO, fetch the selected year's page, and provide year counts separately. Preserve browsing older years rather than silently narrowing the archive to the newest 240 records. Verify payload reduction and instant/cached year transitions. **Confirmed excess data; production transfer savings need measurement.**

### 7. Public caching has gaps and misleading assumptions

Home explicitly uses `force-dynamic`; getPublicCollectionSummary does an uncached aggregate on every invocation. Most database caches are process-local. Browse's comment promises edge-cached HTML through `revalidate=60`, but the page consumes `searchParams`, a dynamic API. That declaration alone does not make every filtered HTML response ISR-cached. [Next.js 15 page/searchParams documentation](https://nextjs.org/docs/15/app/api-reference/file-conventions/page).

Add explicit shared/framework data caching for appropriate queries, cache the collection summary, and define publication/embargo/mutation invalidation. Consider streaming independent homepage sections so the slowest query does not hold back all content. Verify actual production response/cache behavior rather than comments. **Confirmed architectural gap; cold-instance frequency not measured.**

### 8. Browse recomputes facets/counts for pagination and sorting

`public-repository.ts:312–346`. A cache miss runs rows + total + five facet queries in a batch. The cache key includes the full input, so changing page or sort repeats facet work even when filters are unchanged. Admin issue pagination separately repeats year/topic lookups.

Cache facet/count results by filtering inputs only, independently of page/sort. Retain the existing batch operation. Consider composite/partial indexes based on actual EXPLAIN plans and data growth, not blanket indexing. **Repeated work confirmed; current 104-issue dataset is small.**

### 9. Metadata search and Browse search scale through substring scans

`search-repository.ts:64–104`; `public-repository.ts:588`. Leading-wildcard LIKE across lowered text and json_each cannot use a conventional title index for selective lookup. Topic expansion requires DISTINCT and sorting. Browse first materializes up to 10,000 IDs and repeats them across list/facet predicates.

Integrate metadata into an indexed search path while preserving intended substring behavior; consider an indexed issue-topic relation. Join search matches in SQL instead of transporting/repeating large ID lists. **Query-plan confirmed; urgency increases with collection size.**

### 10. Obsolete Browse requests continue after filter changes

`browse-client.tsx` loadBrowseEntry and filter effect. Cleanup only ignores a stale result; it does not abort the request, although fetchIssues already accepts a signal. Desktop availability prefetch eagerly warms alternate lists with their facets.

Cancel superseded foreground requests with ownership/reference rules for shared in-flight work. Schedule speculative prefetch on idle/intent and account for connection speed as well as saveData. **Confirmed unnecessary work during rapid changes; server cancellation is not guaranteed merely by aborting the client.**

### 11. Embedded preview rendering costs exceed the main reader's bounds

`this-month-featured.tsx:624`, `:744`, `:857`. After the first open, previewLoaded leaves the PDF reader mounted when closed. Its canvas DPR is at least 2 and has no upper cap; the main reader already caps DPR at 2.

Suspend/unmount hidden viewers after a short grace period if resume behavior permits, and impose a pixel budget/DPR cap. At equal CSS size, DPR 3 requires 2.25 times the canvas pixels of DPR 2. **Source-confirmed behavior; measure memory and crispness on real phones.**

### 12. ZIP downloads accumulate all PDFs in memory

`apps/web/src/lib/download-zip.ts:38–127`. Three concurrent fetches limit network concurrency, not total memory: all downloaded Blobs stay in JSZip, and generating the final Blob needs additional memory. Cancellation during generation does not stop the ZIP computation; the callback only returns.

Add a total-byte budget based on selected files, a workable mobile limit, and a streaming/file-backed or server-assisted path for large archives. Preserve STORE compression because PDFs rarely benefit from recompression. **Memory-growth mechanism confirmed; peak heap not measured.**

### 13. Search-result highlighting can rerun OCR on the reader's device

`locate-pdf-search.ts:54–100`; `searchable-pdf-page.tsx:25`. When native text does not locate the passage, the browser rasterizes up to a 2200px page, initializes Tesseract/language data, and OCRs it. Remounting the target page can repeat this work.

Prefer stored extraction coordinates keyed by PDF hash/version. Where that is unavailable, cache location results and retain cancellation/timeouts. Do not delay opening the readable page for optional highlight computation. **Confirmed expensive fallback, not proof every search needs OCR.**

### 14. Direct uploads still download the entire PDF back through the app

`apps/web/src/app/api/admin/upload/route.ts:99–145`; PDF replacement and thumbnail helpers. The direct-upload completion branch fetches and buffers the entire uploaded PDF before saving, even when a browser-generated cover was supplied. Server-generated thumbnails are awaited despite “non-blocking” log wording. OCR itself is already queued correctly.

Use bounded server verification and metadata checks; skip a full transfer when supplied cover/metadata meet validation needs. Move remaining thumbnail work to a durable job where practical. Add timeouts/byte limits to full-download helper paths, matching the worker's existing protections. **Confirmed transfer and request-duration cost.**

### 15. Admin storage/indexing catalogue work grows with the whole archive

`admin-repository.ts:517–585` lists all R2 objects serially and then all issue URLs. `indexing-workspace-repository.ts:12–119` derives coverage using per-issue count/latest-run subqueries and evaluates it for filtered count, rows, and status summary.

Paginate object lists; move full orphan audits into an explicit/background job with a cached summary. Maintain/cache coverage aggregates and verify index support for latest-run lookups. Keep issue pagination and authoritative integrity checks. **Growth risks confirmed in query structure; authenticated screen latency was not benchmarked.**

### 16. Continuous-reader position tracking revisits earlier page slots

`apps/web/src/app/read/[id]/page.tsx:419–458`. Each scroll frame starts at slot zero and reads bounding boxes until passing the viewport. Canvas mounting is already windowed, but position detection still grows with scroll depth.

Use the intersecting-page set, cached offsets plus binary search, or a bounded scan around the current page. Preserve the current deterministic page indicator and queued rendering. **Algorithmic growth confirmed; prioritize if long PDFs show scroll-frame cost.**

## Lower priority / measure before changing

17. **Indexing checkpoint round trips:** saveIndexingPage opens a transaction, verifies the lease, writes payload/progress/run information and commits for every page. The worker awaits this per-page path. Native-text PDFs may become database-latency-bound. Profile first, then consider small bounded checkpoint batches without losing lease safety or resumability.

18. **Image/font/build packaging:** IssueCard marks six covers as above-fold at every breakpoint, although phones show two columns; Tangerine is globally declared/preloaded but used only by the home hero; PDF standard fonts are traced into every route via `outputFileTracingIncludes['/*']`. Inspect a fresh production waterfall and function sizes before changing these. Keep Devanagari support, appropriate above-fold image priority, and server PDF fonts where required.

19. **Scoped React subscriptions:** IssueCard subscribes to the whole bookmarks store, so one bookmark change can rerender unrelated cards. Use an issue-specific bookmark selector; use the profiler before adding blanket memoization. At 24 cards this is below the larger network/memory items.

20. **Download analytics round trip:** Read analytics already use `after()`, but download redirects await the counter update. Consider the same post-response pattern with error handling if redirect latency is measurable. Preserve analytics correctness and embargo checks.

21. **Performance visibility:** No active web-vitals reporting, production bundle budget, or performance CI check was found in the inspected source/config. Establish cold/warm p50/p95 route/query timings, initial JS and RSC payload budgets, LCP/INP/CLS, PDF first-page time, and preview/ZIP memory tests. This is needed to prove gains and prevent regressions, not a claim that all those metrics currently fail.

## Existing protections to keep

- Parallel homepage reads and batched Browse queries; public API shared-cache headers.
- Real server-provided Browse data, pagination, and in-flight request deduplication.
- Main PDF reader windowed page mounting/unmounting, staggered render queue, and DPR/render-scale caps.
- Dedicated indexing worker, native-text-first extraction, lazy OCR worker creation, checkpoints/leases and a 100MB/time-limited worker download.
- Direct-to-R2 upload support; dynamically imported JSZip and STORE compression.
- Search debounce and abort handling, and safe plain-text snippet rendering.
- Dev-only route warming is explicitly gated; it should not be reported as production network overhead.

## Recommended implementation order

1. Confirm the supported search engine and establish a reproducible production baseline.
2. Correct FTS capability/indexing; configure production R2 delivery/cache policy.
3. Isolate PDF imports; repair preview cleanup; bound server/client caches.
4. Reduce homepage payload and clarify/cache public query paths.
5. Optimize facets, request cancellation, upload/ZIP memory, and highlight reuse.
6. Address admin growth paths and the lower-priority items only with representative profiling evidence.

Deploy or storage/domain changes should be reviewed as concrete changes after local implementation and verification. No such changes were performed in this audit.
