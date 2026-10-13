# AIM Archive handover assessment

Assessment date: 8 October 2026. Intended recipients: project owner and Sri Aurobindo Society, Pondicherry IT team.

The web archive has substantial working functionality, but it is not ready for an unconditional operational handover. The first technical priority is enforcing the five-year PDF restriction at storage delivery. The first preservation priority is a complete, independently restorable backup and a reproducible source release. Finish these before adding product features or migrating infrastructure.

The active task list remains [TO DO LIST.md](TO%20DO%20LIST.md). This assessment provides evidence and acceptance criteria; it does not certify completion of its recommendations.

## Current service and verified data

| Component | Current location or implementation |
|---|---|
| Website | Vercel, `https://aim-archive.vercel.app` |
| Catalogue, metadata, search text, admins and operational records | Turso/libSQL, using SQLite-compatible SQL |
| PDFs and cover images | Cloudflare R2, bucket configured as `aim-archive` |
| Manual English indexing | GitHub Actions, repository configured as `MugdhanilK/aim-archive` |
| Local source workspace | `D:/AIM Project`; substantial changes are outside the local Git commit |
| Public bookmarks and reading history | Visitor browser storage; not a deployed account-sync service |
| Mobile app | Expo skeleton, not a completed Android/iOS product |
| Supabase | Historical export/migration resources, not the current web database |

Read-only checks against the remote database configured in local private settings and its R2 bucket found:

- 104 issues: 102 English and 2 Hindi, all marked published. Publication does not imply release from the five-year restriction.
- 4,937 indexed page rows across 103 issues; Hindi indexing is outside the current extraction scope.
- Both page-text and metadata FTS5 tables exist.
- 208 storage references and 208 R2 objects, totalling 327,407,755 bytes (about 312 MiB). No referenced objects were missing, no references used another asset base, and no unreferenced objects were found in this inventory.
- No missing issue covers or themes; no issue PDF references to legacy Supabase.
- Database integrity check returned `ok`; foreign-key check returned no violations.
- No durable indexing jobs were present at the time of inspection. Coverage reports 85 indexed English issues, 17 English issues awaiting cover review, and 2 excluded Hindi issues. No manual page-review records were saved.

These checks establish structural consistency and object presence. They do not compare all PDF contents or checksums, certify OCR accuracy, prove disaster recovery, or independently verify Vercel's private database configuration. September release records identify the same service architecture and catalogue totals.

## First priority and release blockers

### H01 Enforce restricted PDF access

**Confirmed finding:** a published recent issue's direct R2 URL returned HTTP 200 to an unauthenticated HEAD request and HTTP 206 with the PDF signature to an unauthenticated byte-range GET. The production public issue API returned 200 while correctly withholding that PDF URL. The asset URL is deliberately omitted here.

The application currently conceals restricted PDF links but the public storage origin serves a known URL. Anyone obtaining such a URL can bypass the application's restriction. Covers may remain public; restricted PDFs require private delivery. Do not treat CORS, obscure filenames, or hiding links as authorization.

Acceptance:

1. Select private PDF storage with a server or edge authorization gate that checks publication state and the IST release boundary before serving bytes or issuing short-lived read access.
2. Deny restricted and draft PDFs at every old public origin, including direct bucket URLs and any CDN aliases. Verify known old URLs, GET, HEAD and byte ranges. Prevent shared caches from serving restricted responses.
3. Retain functional public reading, previews, downloads and ZIPs for released issues, authenticated admin previews, and authenticated worker extraction. The current worker downloads public PDF URLs and must be adapted if those become private.
4. Add delivery-level regression coverage, including the exact release boundary, drafts, expired access and direct-origin bypass. Existing API embargo tests do not cover this finding.

Before self-hosting, also disable or restrict `apps/web/src/app/api/pdf/[...path]/route.ts`. It serves local PDFs without catalogue publication checks and uses a string-prefix containment check. Deploying the whole local workspace on a server would make this a materially larger exposure. Use a dedicated content root and robust path containment if this development feature is retained.

### H02 Preserve and prove recovery

`MIGRATION_RECOVERY.md` explicitly records that the old May Supabase export cannot restore the current service. The folder contains historical exports, a local smoke database, and extensive local evidence; none establishes a current complete restore rehearsal.

Acceptance:

- Capture a consistent current Turso backup including all application tables, schema, triggers, search text, indexing coverage/checkpoints/reviews, navigation, settings, admin identities and counters. Record the source release and migration state.
- Copy every R2 object to separate Society-controlled backup storage, with key, size, content type and SHA-256 manifest. Do not assume S3 ETags are SHA-256 checksums.
- Preserve source PDFs and relevant extraction evidence separately. Keep browser profiles, credentials and unrelated task outputs out of the deliverable.
- Restore into an isolated database and bucket, compare records and checksums, rebuild/verify FTS if necessary, and demonstrate reading and search.
- Agree backup frequency, retention, maximum acceptable data loss and recovery time; assign an owner and alert on backup failure. Record actual restore duration.

### H03 Deliver a reproducible source release

The initial audit found 165 Git status entries, including untracked directories. Essential migrations 00002–00008, indexing modules, workflow, PDF worker and operating guides are not represented by the local committed baseline. Local HEAD is `8aad9b8`, dated 4 July 2026; a fresh read-only remote lookup found GitHub main at `7d73dce038e178525db16fd615e20365af7eea17`, matching the September 6 release record. September 19 was deployed by CLI without source synchronization. Reconcile all three states; local HEAD must not be described as the deployed release.

Acceptance:

- Reconcile local source, remote main and the deployed application; preserve unrelated work and review files before staging.
- Exclude `.cache`, browser session/profile data, `.playwright-cli`, private logs, `.env` files, raw backups and unrelated `output` artifacts from the source handover. Some broad scratch directories are currently untracked rather than fully ignored; do not use an indiscriminate `git add .`.
- Commit the approved application, lockfile, migrations, worker and documentation; create an identifiable release in a Society-controlled repository.
- From a clean checkout on the target Linux environment, install with the frozen lockfile, build, run tests, start the application and verify the worker.
- Add repeatable CI for the build and regression checks. The inspected `.github/workflows` contains the manual indexing workflow, not a general pull-request build/test pipeline.

### H04 Transfer operational ownership

The transfer must cover GitHub, Vercel or replacement hosting, Turso, Cloudflare/R2, DNS, billing, backups, monitoring, credentials and recovery access. The code alone is insufficient.

The Admin dispatch module hard-codes the personal repository name. A repository transfer requires updating this integration, testing dispatch on the receiving repository and establishing Society-owned token rotation. The sample systemd worker is a continuously running service, while the agreed product behavior is manual-only; installing it unchanged would alter operations.

Acceptance: named technical and editorial owners, Society-controlled recovery access, privately recorded credential locations and expiry dates, spend alerts, a deployment/rollback demonstration and an agreed acceptance date. Rotate credentials and revoke the departing owner's access only after the receiving team confirms independent access and recovery.

## Remaining work before acceptance

| Area | Required outcome | Evidence or current limitation |
|---|---|---|
| Admin indexing | Society-owned dispatch credential, synchronized worker source, controlled live run | `INDEXING_GITHUB_TOKEN` absent in last production environment inspection; current private production configuration needs rechecking |
| Editorial review | Review the 17 withheld cover pages, save text or deliberate exclusion, verify provenance | September rebuild identifies 17 covers; current manual-review table is empty |
| Admin lifecycle | Disposable issue upload, edit, publish/draft, cover/PDF replacement, indexing, cancellation/resume, retry and deletion | Production release explicitly excluded live mutation tests |
| Other admin mutations | Verify magazines, topics, navigation create/edit/reorder/reset, settings and storage deletion with controlled fixtures | Successful public rendering does not prove writes work |
| Authentication | Shared login enforcement, trusted proxy IP handling, signed/expired/tampered session tests, offboarding test | Current limiter is an in-process Map; all authorized emails share one environment password |
| Authorization review | Exercise unauthenticated and cross-origin mutations, draft/restricted assets and search redaction | Not a full penetration test; direct asset bypass confirmed |
| Maintenance | Review dependency advisories and apply justified fixes; retain PDF.js v4/canvas and unified React types until tested replacements exist | Version pins alone do not establish security support |
| Operations | Error reporting, uptime checks, queue failures, backup failures, alert routing and restart/rollback runbooks | Web Vitals logging exists but is optional and is not error monitoring |
| Accessibility and UX | Screen-reader and keyboard/focus checks, Reader/embedded preview behavior, Bookmarks persistence, empty/error states and navigation history | Existing desktop/mobile release checks cover only part of these flows |
| Performance | Fresh production Lighthouse/real-use baseline and representative target-server capacity test | September JS budgets are useful but do not establish current Lighthouse scores or Linux capacity |
| Content | Agree source quality and delivery with Hemlata Di through Dibyanshu; confirm editorial scope and archive completeness against a supplied inventory | 104 online issues is not proof of the complete historic print archive |
| Public contacts | Confirm subscription, feedback and problem-report destinations and their receiving owner | Official print-subscription destination remains pending |
| Domains | Decide final website and asset origins; configure DNS/TLS, CORS, SEO, ranges and replacement freshness if activated | Setup and spending remain deferred; legacy website cutover needs separate approval |
| Documents | Keep the technical specification, migration decision and operational instructions aligned with the final release | Specific contradictions are listed below |

## Scope that can remain deferred

A sound web handover does not require finishing every idea in `vision.md`. Record the following as explicitly outside acceptance unless the Society chooses otherwise: native apps; public sign-in and cross-device sync; EPUB/MOBI conversion; reader-local search; new analytics charts; curated collections; article/author/topic landing pages; citations and related-content expansion; annotations, dark/reflowed reading, newsletters and notifications; additional languages; unlimited ZIP downloads; and a replacement search engine.

Current capacity enhancements such as durable fallback thumbnails, persistent OCR highlight coordinates and paginated storage inventory should be driven by measured needs. The present ZIP input limit is 50 MiB. Existing local bookmarks must not be advertised as synchronized accounts.

The Society must accept the delivered archive coverage and future ingestion responsibility. Do not make an indefinite promise to digitise all historical issues before personal responsibilities can end.

## Folder and documentation quality

The project has useful architecture, migration and release documentation, but it is not yet a clean handover package.

- The real source folders are `apps/web`, `apps/mobile`, `packages`, `scripts`, `.github` and `ops`; current operational guides live at the root and historical material under `docs/archive`.
- `AIM 2026` contains four PDFs; `Agnisikha 2026` contains four PDFs; `AIM Issues` contains two PDFs and two JPGs. These are local source batches, not a complete archive mirror.
- `.cache` is about 1.60 GB and `.codex-logs` about 531 MB. They include browser and execution artifacts; `.codex-logs` also contains source PDFs and a private environment file. Review and preserve useful evidence selectively, not by distributing the whole workspace.
- `.migration` contains the May legacy export and local smoke database. It is ignored by Git and is not a current production backup.
- `output` includes an unrelated Ask Alok Da browser artifact. Keep unrelated project material out of the transfer.
- `CLAUDE.md` described Playfair Display as the heading font, while current layout loads Inter, Aboreto, Tiro Devanagari Hindi and Tangerine. Corrected during this audit.
- `SEARCH_REBUILD_REPORT.md` had a stale remaining-work paragraph saying deployment and durable indexing were unfinished, contradicted by later releases. Corrected during this audit while preserving dated evidence.
- The environment example framed Turso as a future target and omitted the dispatch token and asset-alias/metrics options. Corrected during this audit; no private environment values were changed.
- The migration runner applies selected SQL files but has no version ledger. Record applied migrations explicitly and avoid treating blanket replay as a universal upgrade procedure.
- Routine lint is not clean: root Turbo encountered cache/log permissions, while direct web lint included generated verification builds and vendored JavaScript. The production build's web lint/type checks passed; fix command scope and verify reproducibility before handing over the runbook.
- Mobile `assets` exists but its configured images are missing; the mobile build script merely prints an EAS message. A successful monorepo build does not certify a mobile release.

## Audit scope and limits

The audit inventoried the project and scratch/source folders; reviewed the active backlog and architecture/operations/release documents; searched historical documents and source for unfinished work; inspected database, storage, authentication, access, migrations, worker and deployment boundaries; and performed read-only database/storage and public HTTP checks. It did not read every generated dependency or binary byte, conduct a full penetration test, perform a live admin mutation, review every PDF, or inspect Society accounts and infrastructure.

Fresh automated verification results are recorded in the technical specification. Historical September production browser checks remain historical evidence; fresh HTTP success alone does not replace browser acceptance testing.

## Acceptance and departure

Use a written acceptance record containing the release tag, deployment, backup manifest, successful restore evidence, test results, known accepted limitations, costs, account owners and outstanding editorial work. The Society team should independently deploy, upload an issue, run indexing, restore a backup and resolve a simulated failure using the documentation.

Agree a finite transition period and effective responsibility-transfer date. If any critical issue remains, name it explicitly and obtain a documented decision rather than calling the project perfect. Closure means the receiving team can operate safely without the departing owner's machine, credentials or ongoing availability.
