# Public PDF and cover delivery integration

Completed locally, 8 October 2026. P2-04 connects public catalogue data, reading and downloads to the new access gate. No deployment or storage-access change has been made. Admin/worker adaptation and old-origin denial remain required before cutover.

## Public delivery

Public issue, magazine, shelf and search serializers now return stable catalogue-based website routes instead of raw R2 addresses. Recent issues retain null PDF fields; their published covers remain visible. Internal database locators and indexing provenance are unchanged.

The full reader, homepage slide preview, bookshelf PDF.js preview and issue page-count lookup receive the stable PDF route through their existing data contracts. Each new GET/range request reaches authorization again and receives a newly signed storage link. Installed PDF.js 4.8.69's fetch/range readers use the original `source.url`, not a saved redirect target. An idle reader therefore does not need periodic document reloads just because an earlier grant expired. Already loaded bytes remain usable as described in P2-01.

The main reader and slide preview have one bounded transport retry per document. The parent page, zoom and search state remain mounted when the PDF document retries. ZIP workers start each file at the gate and retry a transient/expired-transfer response once; they never fall back to a stored R2 URL. Existing three-worker and 50 MiB limits remain. Persistent failures are reported as skipped files rather than an empty success.

Single downloads use the same fresh eligibility checks and an attachment disposition with a sanitized Unicode title. Only successful authorized GET dispatches increment the download counter; HEAD, denied requests and reader/grant requests do not. Counters measure dispatch, not proof that a browser finished downloading.

## Covers and saved state

New issue-cover and magazine-cover GET/HEAD routes read only the corresponding database field. Issue covers require current publication, including a second check after storage retrieval. Keys must resolve from configured origins to supported raster extensions. Responses enforce a 4 MiB limit, matching raster signature/MIME and byte length, plus no-store/nosniff. SVG, arbitrary storage keys and PDF bytes presented as covers are rejected. These checks are not a full image-decoding audit.

Public cover components bypass Next Image's shared optimizer. Its local allowlist also rejects direct optimization of catalogue cover routes, closing an alternative cached path. Normal static-logo optimization remains available. Public delivery supports PNG/JPEG/WebP; larger or unsupported covers must be replaced or separately reviewed rather than making this route an arbitrary file server.

Saved reading-history cover snapshots are reconstructed from issue IDs. Existing saved positions and zoom preferences are retained; old asset URLs are not followed and temporary grants are never saved.

## Verification evidence

Passed locally:

- `test-public-delivery.cjs`: actual public repositories and cover handler with in-memory SQLite and synthetic storage; serializer/search/shelf routes, draft/restricted behavior, magazine covers, HEAD, publication changes during retrieval, PDF-as-image and size rejection, bounded fetch retry and saved-state migration.
- `test-pdf-delivery.cjs`: existing authorization/signature/range suite plus actual download-route attachment behavior and counter checks for GET/HEAD/denial.
- `test-review.cjs`: public catalogue/search/embargo regressions.
- `test-performance-io.cjs`: ZIP metadata/stream limits and early abort.
- Web source ESLint, TypeScript and production `pnpm.cmd build`; all 43 static pages and build tracing completed.
- Git whitespace checks.

Browser verification used the Playwright skill/CLI against the production build on `127.0.0.1:3104`, with a newly generated synthetic SQLite catalogue and fake storage credentials. Browser PDF/cover responses were intercepted with synthetic assets; server authorization was covered separately by the handler tests. The first transport request deliberately failed with 403; the reader retried once and rendered successfully. Reload retained page/zoom and updated the old cover snapshot. Restricted detail data withheld the PDF. Public catalogue JSON contained no raw fixture origin. The image optimizer rejected a direct gated-cover request with 400.

The homepage embedded preview rendered a PDF canvas. Browse selection downloaded a ZIP containing two valid PDF entries, verified by opening the ZIP and checking each PDF signature. The reader screenshot was visually inspected. Generated artifacts: `output/playwright/p2-04-reader.png` and `output/playwright/p2-04-download.zip` (ignored by Git).

Reusable browser setup: `scripts/prepare-public-delivery-browser.cjs`; CLI snippets: `scripts/browser-public-delivery.js` and `scripts/browser-public-zip.js`. The setup prints a new temporary database directory; start the app against that file with fake storage credentials. Run the reader snippet first, then enter Browse selection mode before the ZIP snippet. No live data or secrets are needed.

The browser transport interception does not verify live R2 redirects, CORS, five-minute idle range behavior, slow-network transfers or Vercel streaming. Those remain explicit integrated staging requirements in P2-07/08. The initial browser harness's mocked redirect target produced a 404; correcting transport interception made the UI checks pass. It was not a production-route failure.

## Next gate

P2-05 must update authenticated admin previews, file replacement, thumbnail generation and worker/operator S3 reads. P2-06 closes the local PDF route. Do not disable the live bucket's public access until those changes and the staged rollback/reader checks pass. P2-09 still must deny every former public PDF origin.
