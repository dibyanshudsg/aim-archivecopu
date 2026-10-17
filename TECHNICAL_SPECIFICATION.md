# AIM Archive current technical specification

The architecture below began as an 8 October baseline and includes dated observations. For the deployed 17 October source, start with the [current handover status](docs/handover/CURRENT_STATUS_2026-10-17.md). GitHub `main` matches the deployed release; the original dirty local workspace is an older working copy. The [handover assessment](HANDOVER_ASSESSMENT_2026-10-08.md) remains dated evidence; the [active tracker](TO%20DO%20LIST.md) owns open work.

## Runtime architecture

Source publication on 13 October is recorded in the [delivery record](docs/handover/SOURCE_PUBLICATION_2026-10-13.md). The subsequent 17 October release deployed the current source to Vercel; see [current handover status](docs/handover/CURRENT_STATUS_2026-10-17.md).

13 October update: the owner reports Society acceptance and will continue participating. Today’s requested delivery is complete source through Git for Dibyanshu Ji; final operational acceptance, hosting/access and release checks remain separate. [Fresh offline database restore](docs/handover/P3_LOCAL_RESTORE_2026-10-13.md) passed; [dependency/support review](docs/handover/P6_SUPPORT_REVIEW_2026-10-13.md) records unresolved release risks.

### APIs and external integrations

The web application includes its own server API in `apps/web/src/app/api` (43 route files inspected on 13 October). Public routes provide catalogue, search, navigation, settings and controlled PDF/cover access; privileged routes handle authentication, catalogue/uploads, storage and indexing. Server-rendered pages also call repositories directly, so not every read travels through HTTP. These are application endpoints, not a separately versioned public API product or complete OpenAPI contract.

External integrations are Turso/libSQL for database access, Cloudflare R2's S3-compatible API for file operations/signing, and GitHub Actions REST dispatch for manual indexing. Vercel hosts the site; Google Forms is a linked feedback destination. PDF extraction/OCR uses local PDF.js/Tesseract processing. Environment names and scopes are in [SETUP.md](SETUP.md); secrets and production data are not source deliverables.

Launch status clarified by the owner on 8 October 2026: the website is deployed for review but has not officially launched to the public. Historical "production release" records describe deployments, not an official launch. The existing 104-issue catalogue is sufficient for the owner's handover acceptance; additional historical ingestion is not a prerequisite. The hoped-for official launch is 24 November 2026, subject to Society agreement and readiness.

The Next.js web server reads and writes Turso through server-side libSQL repositories and stores PDFs/covers in R2 using the S3 API. English extraction runs in a separate manually dispatched GitHub Actions worker. The deployed app authorizes short-lived released-PDF grants, streams authenticated admin PDFs, separates cover delivery and uses authenticated worker reads. Browser PDF uploads use authenticated short-lived PUT URLs. The old direct public R2 origin remains an accepted exception awaiting Society IT closure.

The table below describes the implementation; consult the current handover status for the parts verified on the host.

| Layer | Implementation |
|---|---|
| Monorepo | pnpm workspaces and Turborepo; `apps/*`, `packages/*` |
| Package manager | `pnpm@10.33.0`, frozen `pnpm-lock.yaml` for reproducibility |
| Node | Tested pin 22.23.3 in `.node-version`; engines `>=22.23.3 <23`; exact pin enforced by runtime verification. Windows installed tools and hosted versions were not replaced |
| Web framework | Next.js 15.5.27, App Router, server and client components; framework support planning remains open |
| UI runtime | React/React DOM declared `^19.1.0`, TypeScript `^5.8.3` |
| UI tooling | Tailwind CSS `^4.1.4`, Framer Motion `^12.6.3`, Lucide, Zustand, Zod |
| Fonts | Inter, Aboreto, Tiro Devanagari Hindi and Tangerine bundled through `next/font/local`, with licenses/hashes; web build no longer downloads fonts |
| Database | `@libsql/client ^0.17.3`, remote Turso/libSQL; local `file:` database supported |
| Search | FTS5 trigram page and metadata indexes with triggers; literal SQL fallback, including short queries |
| Storage | Cloudflare R2, `@aws-sdk/client-s3 ^3.1045.0`; custom AWS Signature V4 PUT signer |
| PDF display | `react-pdf ^9.2.1`, `pdfjs-dist 4.8.69`, versioned self-hosted browser worker |
| Extraction | Native English text first, Tesseract.js `^7.0.0` fallback, canvas `^3.2.3`; PDF.js v4 required for current rendering implementation |
| ZIP downloads | JSZip; browser generation; 50 MiB total input budget |
| Mobile | Expo `~52.0.0`, React Native `0.76.9`, React `18.3.1`, Expo Router `~4.0.0`; skeleton only |

Ranges above are declarations from package manifests, not assertions of exact installed patch versions. The lockfile is authoritative. Keep root React/React DOM type overrides to avoid duplicate workspace type incompatibilities.

## Features and boundaries

- Public: Home, Browse, Search, Bookmarks, issue detail and Reader; server-loaded initial data, paginated catalogue/shelves, local reading history, page-linked search, downloads and bounded ZIPs.
- Admin: login, dashboard, magazines, issues, bulk ingestion/actions, topics, replacements, storage, settings, navigation and indexing workspace/reviews.
- Current catalogue: English and Hindi. Owner confirmed on 8 October 2026 that new uploads focus on English AIM only; further Agnishikha uploads are on hold, with existing Hindi issues retained. New extraction/OCR is English-only. Retained Hindi index rows are historical data, not a promise of Hindi OCR support. Dynamic Pages is outside the planned handover scope.
- Publication and availability are separate. Published recent issues can have public metadata while their PDF remains restricted for 60 months, released at midnight IST on the first of the corresponding month.
- **Security limitation:** current public R2 delivery bypasses this restriction when the file URL is known. Private delivery is a handover blocker; see H01 in the assessment.
- Public account/sync, native reader/offline workflows and format conversion are not complete features.

Security work, 8 October 2026: [P2-01 delivery design](docs/handover/P2-01_PRIVATE_PDF_DESIGN.md) selects authorized temporary R2 links for public released PDFs, authenticated streaming for admin previews and separate cover routes. [P2-03](docs/handover/P2-03_ACCESS_GATE_IMPLEMENTATION.md) implements the PDF grant/redirect and admin streaming endpoints locally, using `@aws-sdk/s3-request-presigner 3.1045.0`. [P2-04](docs/handover/P2-04_PUBLIC_DELIVERY_IMPLEMENTATION.md) connects public serializers/readers/downloads and adds bounded public cover delivery. [P2-05](docs/handover/P2-05_PRIVATE_MAINTENANCE.md) adapts admin PDF/cover previews, direct bulk/replacement uploads and authenticated worker/thumbnail/operator reads. New GitHub read credentials and hosted private-storage verification remain pending; nothing is deployed. The deployed runtime description above remains current until the verified Phase 2 release.

Local P2-06 security update: the legacy workspace `/api/pdf/[...path]` endpoint is retired with empty, uncached GET/HEAD 404 responses in all environments. It performs no filesystem access. Production build and real localhost HTTP denial checks passed; deployment and invalidation of previously cached file responses remain pending. See [route retirement evidence](docs/handover/P2-06_LOCAL_PDF_ROUTE_RETIREMENT.md).

Local P2-07 verification: `pnpm.cmd test:pdf-security` runs nine isolated suites covering access, signing, publication/replacement races, ranges, covers, maintenance and retired-file denial. The [regression matrix](docs/handover/P2-07_SECURITY_REGRESSION_MATRIX.md) includes a separately invoked read-only old-origin checker. Provider enforcement, CORS and live origin/cache closure remain staging/cutover requirements.

P2-08 preparation, 8 October: real read-only R2 signed GET/HEAD/range, current-origin CORS and expired/tampered signature checks passed. Added `PDF_DELIVERY_DISABLED=1` as a locally tested unavailable-PDF fallback; it is not configured on Vercel. No isolated preview or coordinated release is verified. [Readiness record and remaining dependencies](docs/handover/P2-08_STAGING_READINESS.md).

## Database and schema

Runtime migrations are ordered SQL files in `packages/turso/migrations/`:

| Migration | Responsibility |
|---|---|
| 00001 | Catalogue, admins, future account tables, analytics visibility, settings |
| 00002 | Navigation menus and items |
| 00003 | Durable indexing jobs, page checkpoints, worker health |
| 00004 | Indexing runs and coverage |
| 00005 | Worker check/run status |
| 00006 | Dispatch reservations and immutable page reviews |
| 00007 | Page-text FTS5 trigram index and maintenance triggers |
| 00008 | Metadata FTS5 and run lookup index |

The inspected database contains 19 application tables: `admins`, `magazines`, `issues`, `issue_search_index`, `users`, `user_bookmarks`, `user_reading_history`, `analytics_visibility`, `site_settings`, `navigation_menus`, `navigation_items`, `indexing_jobs`, `indexing_job_pages`, `indexing_workers`, `indexing_runs`, `issue_indexing_coverage`, `indexing_schedule`, `indexing_dispatches`, `indexing_page_reviews`; plus FTS virtual/shadow tables.

Use parameterized libSQL queries and transactions. Current SQL uses SQLite features including FTS5, JSON functions, integer booleans and SQLite metadata inspection. PostgreSQL/MySQL are not interchangeable connection settings. Current schema is defined by `packages/turso/migrations/`.

`scripts/apply-turso-migrations.mjs` requires `--local <path>` or `--url-env <name>` and defaults to read-only status. Ordered applications/baselines record normalized SQL checksums in `aim_schema_migrations`; existing schemas without a ledger require explicit reviewed adoption. `--only` and `--skip-fts` are no longer supported. [Procedure and limits](docs/handover/P4-07_MIGRATION_PROCEDURE.md). The live database has not been baselined. Historic import tooling is not a complete current backup/restore pipeline.

## Storage and content

At audit: 208 R2 objects, 327,407,755 bytes; every current database PDF/cover reference matched an object. PDF sizes recorded in the catalogue total 319,166,076 bytes. Full content/checksum validation remains to be done.

The bucket is separate from Turso. A database export contains URLs and metadata, not the PDF bytes. A Git clone contains neither a current database nor the full object archive.

Direct PDF PUT uploads allow at most 100 MiB per file. Completion verifies object size, content type and the PDF signature. Missing-cover generation may require a full PDF fetch. Server uploads set a five-minute revalidation cache policy; direct PUT/existing object cache behavior requires separate verification. CORS and byte-range support are essential for browser PDF reading.

Use source-quality checks for PDFs and covers; preserve the display title convention `Magazine Name — Full Month Year`. Topic/theme accuracy and archival completeness require editorial review.

## Authentication and worker operations

Admins use individual password hashes and assigned roles/permissions in the database. Sessions are signed using the required independent `ADMIN_SESSION_SECRET`, expire after seven days, and use HttpOnly, SameSite=Lax cookies, with Secure in production. Account and role changes revoke affected sessions. Legacy shared-password enrollment is controlled separately and disabled in normal operation. Admin activity is audited.

Login limits use shared database buckets for account and IP identity; public and Admin route limits are also configured in the application. A Vercel firewall rule adds a 120-per-IP, 10-minute edge limit for Admin login. Configure trusted reverse-proxy headers before self-hosting and test rotation/offboarding. See [security hardening](docs/handover/SECURITY_HARDENING_2026-10-17.md).

Indexing is manual-only. Upload/replacement queues work; Admin Start dispatches the GitHub workflow. Current worker limits are three jobs per run, a 20-minute claiming window, a 45-minute job watchdog and a 75-minute outer workflow timeout. Database leases/checkpoints support retry and resume. Existing saved search remains available when no worker runs.

`GITHUB_INDEXING.md` documents activation. `ops/indexing-worker.service` is an example continuous service, not the approved manual deployment configuration. Do not enable it unchanged during migration.

## Configuration inventory

Store values in the receiving team's secret manager and hosting configuration. This document intentionally contains names only.

| Names | Purpose and location |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Web/worker database connection; token not needed for a local file target |
| `DATABASE_PROVIDER` | Existing compatibility setting, normally `turso`; changing it does not implement a PostgreSQL adapter |
| `ADMIN_SESSION_SECRET` | Required independent web session signing secret |
| `ADMIN_PASSWORD`, `ADMIN_LEGACY_ENROLLMENT` | Controlled legacy owner enrollment only; not current multi-admin login |
| `RATE_LIMIT_SECRET`, `RATE_LIMIT_SCALE`, `TRUST_PROXY_IP_HEADERS` | Rate-limit identity key, capacity scale and trusted-ingress setting |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Server storage credentials and bucket |
| `R2_PUBLIC_BASE_URL` | Current permitted asset base; required for web/worker eligibility and allowed image host |
| `R2_LEGACY_PUBLIC_BASE_URLS` | Optional comma-separated former origins for precise URL aliasing |
| `NEXT_PUBLIC_APP_URL` | Canonical website URL for metadata, sitemap and robots |
| `INDEXING_GITHUB_TOKEN` | Web server's private manual workflow dispatch token; needs repository Actions permissions |
| `INDEXING_TURSO_DATABASE_URL`, `INDEXING_TURSO_AUTH_TOKEN` | GitHub secret names mapped to runtime database variables inside worker steps |
| `INDEXING_OCR_CACHE_PATH` | Worker English OCR data cache directory |
| `INDEXING_REQUEST_ID` | Per-run dispatch correlation/admission value, not a static credential |
| `INDEXING_LOCAL_WORKER` | Development opt-in only; `1` starts a local worker with dev server |
| `NEXT_PUBLIC_ENABLE_WEB_VITALS` | Optional build-time anonymous metrics flag; disabled by default |
| `NEXT_DIST_DIR`, `LOCAL_TURSO_DB`, `PREWARM_BASE_URL` | Local verification/development options |

P4-06 update, 10 October: root Turbo now propagates all 18 active app/dev configuration names, including dispatch, Web Vitals, PDF fallback and isolated build output; environment files participate in cache invalidation. [SETUP.md](SETUP.md) defines scope and GitHub secret mappings, and [batch evidence](docs/handover/P4_BATCH1_REPRODUCIBILITY.md) records remaining hosted gaps. Keep private names free of a `NEXT_PUBLIC_` prefix.

## Build and deployment

From a clean source checkout, install dependencies with `pnpm.cmd install --frozen-lockfile` on Windows (`pnpm` on Linux). Run `pnpm.cmd build` in `apps/web`; start with `pnpm.cmd start`, port 3000. Development uses `pnpm.cmd dev` in that directory. The direct web command avoids confusion with the mobile placeholder build.

The application needs a Node server, database access and native PDF/OCR dependencies. A static-file deployment is insufficient. On Linux, verify canvas native binaries/system dependencies, PDF.js standard fonts, English OCR data, writable caches, process supervision, reverse proxy, TLS and graceful shutdown. No complete production DigitalOcean web deployment manifest is currently supplied.

The current Vercel project is linked as `aim-archive`. Website deployment and GitHub worker source synchronization are distinct. A release must identify the source commit, schema state, configuration version, deployment ID and rollback target.

## Verification record

On 8 October 2026, the following existing scripts passed: `test-review.cjs`, `test-performance.cjs`, `test-performance-io.cjs`, `test-indexing.cjs`, `test-indexing-jobs.cjs`, `test-indexing-controls.cjs`, `test-indexing-runner.cjs`, `test-search-extraction.cjs`, `test-search-reader.cjs`, and four Python cases in `test-indexing-schedule.py`. These use isolated data/mocks where designed; they do not establish production admin mutation success.

The production web build passed compilation, lint, type checking and generation of 43 static pages with the required network access. A separate web TypeScript check and `test-indexing-worker-pdf.cjs` passed, including actual native-text and scanned-page OCR with isolated durable checkpoints. The initial sandboxed build failed retrieving Google Fonts through an unavailable proxy; the successful retry distinguishes that runner problem from a code defect. Root `pnpm lint` encountered Turbo log/cache permissions and did not complete; this is separate from the successful build's web lint/type checks.

Direct web `pnpm lint` also failed because its broad `eslint .` command inspects generated verification build directories and vendored JavaScript. The ESLint ignore configuration only excludes the normal `.next` directory, not all alternate build outputs. The targeted command `pnpm.cmd exec eslint src next.config.ts` passed. Repair the broad exclusions and verify the ordinary lint command before handover; generated-code diagnostics must not be reported as 5,571 application-source defects. Fresh build JS budgets passed: Home 205.4/220 KiB gzip, Browse 208.2/220, Reader 301.5/350, with no PDF engine in initial homepage scripts.

Database integrity, foreign keys and R2 reference inventory passed as detailed in the assessment. Fresh HTTP checks returned 200 for Home, Browse, Search, Bookmarks, admin login and the versioned PDF worker, and 401 for unauthenticated admin stats. They supplement, but do not replace, the September production browser evidence. Full live acceptance, dependency security review, accessibility and restore checks remain outstanding.

P1-02 update, 8 October 2026: a current Turso snapshot was captured and verified as an offline standalone SQLite backup, with all 31 tables and schema matching the remote read snapshot, passing integrity/foreign-key checks and working FTS queries. See [private backup evidence and limitations](docs/handover/P1-02_TURSO_BACKUP.md). This does not include R2 object bytes or complete the full application restore rehearsal.

## Documentation entry points

- [Active tasks](TO%20DO%20LIST.md)
- [Handover assessment](HANDOVER_ASSESSMENT_2026-10-08.md)
- [DigitalOcean migration decision and procedure](DIGITALOCEAN_MIGRATION.md)
- [Manual GitHub indexing](GITHUB_INDEXING.md) and [worker operations](INDEXING_WORKER.md)
- [Recovery limitations](MIGRATION_RECOVERY.md)
- [Navigation operations](NAVIGATION_MANAGEMENT.md)
- [Asset delivery](ASSET_DELIVERY_PLAN.md)
- [Latest documented website release](PRODUCTION_RELEASE_2026-09-19.md)
- [Historical evidence](docs/archive/README.md)
