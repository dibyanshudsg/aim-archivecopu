# Durable search indexing

Local private-storage adaptation, 8 October 2026: default worker downloads and thumbnail/operator source reads now use the authenticated R2 S3 API. The stored PDF locator and SHA-256 of actual PDF bytes remain the checkpoint/review identity. Reads reject unconfigured locators, non-PDF metadata/signatures and files above 100 MiB, with a two-minute transfer timeout. Historical hosted verification below predates this local change; deployment, GitHub source synchronization and the new bucket-scoped read credentials remain pending. See [P2-05 evidence](docs/handover/P2-05_PRIVATE_MAINTENANCE.md) and [GitHub configuration](GITHUB_INDEXING.md).

For an authorized environment, `node scripts/verify-private-worker.cjs` checks one English source using read-only metadata/signature requests before processing. `rebuild-search-index.cjs` re-reads private source bytes each run; rebuild checkpoint reuse still depends on byte hash and extraction version. The earlier extraction-pilot tools were privately archived during source cleanup and are not operating prerequisites. The R2 smoke script requires explicit `--allow-write`, uses authenticated reads and no longer treats public access as a success condition. Do not run it as a read-only verification.

Implemented and verified: 2026-09-06. The website is deployed to https://aim-archive.vercel.app. The owner selected manual-only GitHub indexing: there is no hourly trigger or shared activation gate. Hosted PDF extraction and production database access are verified. See `GITHUB_INDEXING.md` for the current operator workflow.

Final release and integrity evidence: [Production release — 6 September 2026](docs/archive/PRODUCTION_RELEASE_2026-09-06.md).

## Admin access

The public footer includes **Admin**, linking to `/admin`. Signed-out users reach `/admin/login`; authenticated users reach the dashboard. The sidebar's **Search Indexing** entry opens `/admin/indexing`. Issues retains a compact coverage summary and a link to the workspace. Per-issue PDF controls still include **Rebuild search index**.

The workspace defaults to issues needing attention. It lists the entire catalogue with status, magazine, year, publication and title filters, 25-row pagination, and selection retained while inspecting details. Missing and failed batch actions explicitly cover up to 100 issues across the catalogue; selections are capped at 100. Rebuilding existing indexes requires confirmation. Every issue is rechecked inside its enqueue transaction to skip unsupported, unavailable or already-active work.

Coverage distinguishes missing text, queued/processing/failed jobs, verified indexes, withheld pages, existing indexes requiring verification, unavailable sources, and languages outside scope. Summary counts cover the full catalogue including drafts. Job status and current searchable coverage are separate: a failed rebuild can still have an earlier searchable index.

The details drawer includes processing stage, saved pages, attempts, errors, coverage evidence, withheld-page review forms, and 30 recent runs. A review records verified text or an intentional exclusion, a note, reviewer ID, timestamp, and PDF fingerprint. The paginated Activity / History tab retains previous manual runs, upload/replacement triggers, automatic-attempt counts, failures and superseded work. Earlier rebuilds are labelled as reconciled records; their attempt/start times are not invented.

Withheld-page links open `/admin/indexing/[id]/preview`, an authenticated PDF preview supporting drafts and restricted editions without changing publication, public embargo rules, or reader analytics.

## What runs automatically

- Saving a new English issue and saving its queue job are one database transaction. Single and bulk uploads share this path.
- PDF replacements use a unique R2 object key. Updating the issue, clearing obsolete search-page targets, superseding old work, and queuing the replacement are atomic. The old object is retained; storage cleanup is a separate action.
- Single and bulk reindex APIs enqueue work and return promptly. They no longer perform OCR inside the web request. Single reindex returns JSON with `indexing` and `jobId` (HTTP 202 when queued). Bulk reindex returns `queued`, `errors`, and `total`; external callers of the old stream/loop contract must update.
- Hindi/non-English editions do not enqueue OCR. Metadata-only edits do not rebuild text. Direct database imports must explicitly queue eligible issues afterward; application repository creation automatically queues them.
- A worker claims one issue at a time, checks the PDF hash and extraction version, and saves each physical page's extraction before moving on. A changed source/version discards incompatible checkpoints.
- Leases last two minutes and renew every 20 seconds. A crashed process can be replaced without losing completed pages. Lease tokens and source checks prevent superseded workers from publishing stale results.
- Failed work gets **three total automatic attempts**, with 30-second and 60-second backoff. A manual retry resets the attempt budget and reuses compatible checkpoints. Repeated crashes become a visible failure. The standalone process exits after a 45-minute stall so its supervisor can recover it.
- The index and final job state commit together. Low-confidence pages remain out of search. Successful jobs retain only withheld-page evidence; failed jobs retain checkpoints for retry. Excessive uncertainty leaves an existing same-PDF index intact and reports the extraction failure.
- Admin status polls approximately every five seconds after the preceding request finishes. Worker health becomes offline after 60 seconds without a heartbeat. The original job-only endpoint remains for compatibility; the dedicated workspace reconciles job state with catalogue coverage and persistent history.
- Public data uses its existing cache lifetimes; a completed job may need a refresh/cache expiry before a repeated public query reflects it.

## Database migration

Historical indexing migrations were applied in September. Current setup uses the [explicit-target migration procedure](docs/handover/P4-07_MIGRATION_PROCEDURE.md), with ordered checksums and a ledger. Do not replay historical migrations against the configured database. An existing schema without a ledger requires review and baselining first.

```powershell
# Fresh, separate synthetic setup only:
node scripts/apply-turso-migrations.mjs --local .cache/indexing-fixture.db --status
node scripts/apply-turso-migrations.mjs --local .cache/indexing-fixture.db --apply
```

Applied to both configured databases on 2026-09-06. Do not rerun every historical migration just to install this feature.

Migration 00004 adds persistent run history and source-bound coverage evidence. It is idempotent, including when jobs already have history. Worker completion writes the index, coverage evidence and run outcome atomically. Restart workers after updating this release so they record stage/history updates.

`node scripts/reconcile-indexing-coverage.cjs` checks saved v5 extraction evidence against every current page-text row, PDF URL and physical page count. `--apply` imports matching evidence/history only; `--local` selects the smoke database. Unproven entries remain unverified. Reconciliation applied successfully: 102 remote English editions (17 withheld pages) and two local English editions (one withheld page). Existing PDFs, publication state and search text were not rewritten.

## Local operation

Run `pnpm.cmd dev` from `apps/web` as usual. The development launcher starts Next only; indexing is manual. Set `INDEXING_LOCAL_WORKER=1` only when deliberately opting into a continuous local worker. `pnpm.cmd dev:local-db` from the root explicitly selects the smoke database. The normal `.env.local` selects the full catalogue. The previously running automatic local worker was stopped when switching to manual-only operation.

To run only the worker from the repository root:

```powershell
pnpm.cmd indexing:worker
# Process at most one currently eligible job, then exit:
node scripts/indexing-worker.cjs --once
```

Requirements: Node 22+, installed workspace dependencies including TypeScript, native `canvas`, PDF.js standard fonts, and network access to Turso and source PDFs. Tesseract downloads English language data on first use. Set `INDEXING_OCR_CACHE_PATH` to a writable cache directory when the checkout is read-only. Environment variables already set by the launcher take precedence over `.env.local`.

## Continuous-worker alternative

The Next/Vercel web process enqueues jobs and dispatches the separate GitHub worker when the Admin connection is configured. OCR still runs outside Vercel. The selected GitHub Actions setup and outstanding credential configuration are described in `GITHUB_INDEXING.md`. The instructions below are an alternative for a continuously running host; `next start`, Vercel `after()`, and an open browser do not provide a durable worker.

1. Deploy the migration and the web/worker code from the same release. Install the worker checkout with `pnpm install --frozen-lockfile` including development dependencies (the standalone TypeScript loader requires TypeScript).
2. Supply `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` through the host's protected environment settings. Public R2 PDF downloads do not require R2 write credentials. Do not commit environment files.
3. Run `node scripts/indexing-worker.cjs` with automatic restart. An example Linux service is at `ops/indexing-worker.service`; its account, paths, Node installation, environment file and cache directory must exist before installation. This example has not been installed on a production host.
4. Confirm **Worker connected** in Search Indexing. Perform a controlled upload, interruption/resume, manual retry, and PDF replacement on that deployment; verify the resulting public page-text search after cache refresh.

Multiple workers are allowed and leases prevent duplicate ownership, but each adds OCR CPU/memory load. Start with one. A stopped worker does not lose queued jobs. Stopping a service may interrupt the current page; already checkpointed pages resume after its lease expires.

### Hosting decision background

The owner selected manual-only GitHub Actions after reviewing free alternatives. No paid service has been provisioned and hourly execution is not planned. Current setup and verification are in [GITHUB_INDEXING.md](GITHUB_INDEXING.md).

Scheduled execution and paid continuous hosting were considered but not selected. The approved setup is manual-only GitHub Actions; no paid worker service or hourly schedule is authorized by these notes.

## Verification evidence

- `node scripts/test-indexing-jobs.cjs`: real isolated libSQL transactions test upload/replacement queue atomicity, English-only guards, duplicate ownership prevention, crash checkpoints, stale-worker rejection, source hash changes, retry limits/backoff, review evidence, heartbeat expiry, deletion cleanup and injected write rollback.
- `node scripts/test-indexing-worker-pdf.cjs`: actual native-text and scanned-page PDF extraction through the worker, persistent checkpoints, and exact page 1/2 searchable output. No real catalogue/storage mutations.
- Existing indexing and search-quality/reader regressions remain applicable.
- Production build passes using isolated `.next-verify` output.
- Local browser QA verifies the Admin footer/login path, real admin authentication, unauthorized API rejection, live empty queue, desktop/mobile progress/failure/review fixtures, retry requests, and no page errors or phone overflow. Fixture screenshots are not evidence of production processing.
- Combined local development launcher was restarted and verified: full catalogue remains 104 listed editions, the worker reports connected, and unauthenticated indexing access returns HTTP 401. Finish review accepted the desktop/mobile panel and rendered Admin footer control.

GitHub Actions is configured, PR #1 is merged, and the two encrypted database secrets are installed with explicit authorization. The owner approved manual-only production indexing. The Admin Start indexing control requires INDEXING_GITHUB_TOKEN in Vercel; it was not present at the 6 September environment inspection. Direct repository dispatch remains available to maintainers. Existing indexes remain searchable between runs. Inspection and resolution of the 17 withheld covers remain separate from missing indexing work.

## Catalogue rebuild and verification

Run from the repository root. The default target uses the remote database configured in `apps/web/.env.local`; `--local` explicitly selects `.migration/turso-local-smoke.db`.

```powershell
# Extract/review only; no index writes
node scripts/rebuild-search-index.cjs
# Apply validated extraction to all supported English editions
node scripts/rebuild-search-index.cjs --apply
# Restrict a retry to explicit issue IDs
node scripts/rebuild-search-index.cjs --apply --ids <comma-separated-issue-ids>
# Local test catalogue
node scripts/rebuild-search-index.cjs --local --apply
# Verify every supported index against its source checkpoint and catalogue snapshot
node scripts/verify-rebuilt-search.cjs --complete
node scripts/verify-rebuilt-search.cjs --local --complete
```

Reports, backups, source PDFs and per-page review details stay in ignored `.codex-logs/search-rebuild-v2/`; the directory name is historical, while each checkpoint records the actual extraction version. Runs are locked per database scope. An interrupted run can resume from saved pages; only remove a stale lock after confirming its recorded process has stopped.

These commands are an operator alternative to queued jobs. `--apply` writes to the selected database; the default is the configured remote database. Confirm target and intended issue IDs before a write. Hindi OCR remains excluded. Completed rebuild results are in [SEARCH_REBUILD_REPORT.md](SEARCH_REBUILD_REPORT.md).
