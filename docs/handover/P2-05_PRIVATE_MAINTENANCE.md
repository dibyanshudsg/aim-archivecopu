# P2-05 — Private storage maintenance

Date: 8 October 2026. Implemented and verified locally. No live upload, database mutation, deployment, GitHub dispatch/secret change or public-origin closure was performed.

## Result

- Admin issue downloads, first-page cover generation and indexing previews use the authenticated issue PDF endpoint, including draft/recent issues. Admin cover GET/HEAD checks current membership before and after storage reads. Covers bypass the shared image optimizer; remounting after a locator change refreshes the image.
- Storage inventory opens linked files through authenticated issue endpoints. Unlinked objects remain listed but have no public preview link; inspect them through authorized storage access. No arbitrary object-download endpoint was added.
- Server thumbnails, the default English worker and source inspection/rebuild scripts use authenticated R2 reads. Strict configured-locator parsing prevents HTTP fallback or arbitrary network fetches. Reads enforce PDF MIME/signature, matching length, 100 MiB maximum and a 120-second deadline.
- Bulk PDFs now use direct signed PUT, as single-issue uploads already did. New presigned keys include a UUID to avoid accidental same-filename overwrite. Existing multipart API compatibility remains for new issues; browser bulk PDF bodies no longer traverse the web server. Cover images still use existing web requests and their hosting limits must be checked during staging.
- Replacement PDFs upload to a staging key. A signed, 30-minute completion ticket binds admin, issue, previous source, staging key and size. Completion copies into a unique server-only revision key, verifies the copied PDF, then atomically compares the old source, updates the active reference, clears obsolete search targets and queues English indexing. Reusing the staging PUT cannot change the promoted revision. Replayed/stale completion receives 409. The previous PDF is retained. Successful staging cleanup is attempted; failures/conflicts may leave unlinked objects for later review, never automatic bulk deletion.
- Automatic replacement covers update in the same transaction only if the editor has not changed the cover meanwhile. Separate manual cover uploads use unique keys. A thumbnail failure retains the previous cover; no claim that an old cover describes the new PDF is made. Verify/regenerate it in the admin screen when needed.
- Database PDF locators remain internal storage identities, not app routes or expiring grants. Worker SHA-256, extraction version, source checks and review provenance remain intact. The legacy direct indexing helper also checks source/language again inside its write transaction.

## Verification

Passed locally:

- `node scripts/test-private-maintenance.cjs`: real routes/repositories/libSQL transactions, synthetic R2. Private reads; bad locator/type/size/signature rejection; draft covers and removed admin denial; ticket expiry/tampering/scope; failed upload verification preserving the source; immutable revision promotion; old-file retention; stale/replayed/concurrent replacement rejection; cover edit preservation; default worker private transport and byte-hash identity.
- `node scripts/test-pdf-delivery.cjs` and `node scripts/test-public-delivery.cjs`: existing access, ranges, publication races, signatures, public serialization and cover checks remained passing.
- `node scripts/test-indexing-jobs.cjs`, `node scripts/test-indexing-controls.cjs`, `node scripts/test-indexing.cjs`, `node scripts/test-indexing-worker-pdf.cjs`: durable jobs/reviews, English-only behavior, stale-worker fencing, source invalidation and actual native/scanned PDF extraction remained passing.
- TypeScript, source ESLint and production build passed (43 static pages). The first build compiled but sandbox process spawning failed with EPERM; the same build passed with narrow escalation.
- Playwright against a production-mode localhost server, a newly seeded synthetic database and mocked PDF/cover transport: authenticated draft preview rendered; six admin cover images used gated routes; zero raw-origin requests or browser errors. Screenshot: `output/playwright/p2-05-admin-preview.png` (ignored local artifact, visually inspected). Browser upload to actual R2 was not exercised. Route tests cover completion separately.

## Hosted steps still open — P2-07/08/09 and Phase 4

1. Reconcile/publish the approved worker source separately from the website release.
2. Society storage administrator creates a dedicated bucket-scoped Object Read credential for the worker. Set `INDEXING_R2_ACCOUNT_ID`, `INDEXING_R2_BUCKET`, `INDEXING_R2_ACCESS_KEY_ID`, `INDEXING_R2_SECRET_ACCESS_KEY` in GitHub. None was set by this task. Website upload/copy/delete credentials stay separate.
3. Retain matching `R2_PUBLIC_BASE_URL`/legacy locator configuration even when old public delivery is disabled. This variable identifies stored objects; it does not authorize reads.
4. Run the workflow's read-only private preflight and isolated verification. Then use an agreed staging issue to verify actual English extraction, review provenance and retry behavior. Never infer hosted success from local fake storage.
5. Check web credentials permit authenticated reads, PUT, CopyObject and staging cleanup. Test signed PUT CORS from the chosen website origins, single/bulk/replacement uploads including a PDF above the server request-body limit, first-page/manual covers, authenticated drafts/recent previews and failure recovery. Check cover upload size and 60-second web execution limits with representative files.
6. Resolve the local file route under P2-06 and complete the access matrix before disabling every public R2 origin/cache path. Old-origin closure remains mandatory and has not occurred.

An interrupted upload/copy may leave an orphan. Review inventory only after upload grants have expired and confirm it is unreferenced before any separately authorized deletion. This task does not change the owner's decision excluding a separate R2 backup.
