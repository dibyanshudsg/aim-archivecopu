# AIM Archive Society discussion package

Prepared locally on 10 October; updated 13 October 2026. Owner reports Society acceptance and will continue participating. The immediate request is complete reviewed source through Git for Dibyanshu Ji. This package has not been sent by the assistant; final technical transfer, receiving access and operational acceptance remain pending.

## Read in this order

1. [Discussion brief](SOCIETY_DISCUSSION_BRIEF.md): scope, verified status, remaining limitations and meeting outcomes.
2. [Decisions and service inventory](SOCIETY_DECISIONS_AND_SERVICES.md): questions, ownership, access and transfer sequence.
3. [Admin walkthrough and acceptance draft](ADMIN_WALKTHROUGH_AND_ACCEPTANCE_DRAFT.md): proposed operator rehearsal and independent receiving demonstrations.

These three documents plus this index form the discussion set. They contain no credentials. Supporting records below are technical references, not attachments that must all be read for the first meeting. Share through the agreed receiving channel; this local preparation does not change access permissions. Relative links work within the project folder; sending only these four files will not include their supporting references.

## Technical references and readiness

| Reference | Purpose and present limit |
| --- | --- |
| [Active tracker](../../TO%20DO%20LIST.md) | Sole active backlog and decisions; this package is a dated summary, not a competing checklist |
| [Technical specification](../../TECHNICAL_SPECIFICATION.md) | Architecture/schema/features; distinguishes deployed baseline and local candidate |
| [Setup](../../SETUP.md) | Tested Node 22.23.3 / pnpm 10.33.0 and installation; Windows installed tools were not upgraded |
| [Source reconciliation](P4_SOURCE_RECONCILIATION.md) | Reviewed selection and historical baselines; current candidate remains uncommitted/unpublished |
| [CI and security review](P4-10_P6-01_CI_SECURITY_REVIEW.md) | Latest fresh Linux tests and compatible patches; hosted CI, native advisory risks and framework support plan remain open |
| [Staging readiness and Cloudflare request](P2-08_STAGING_READINESS.md) | Concrete hosted prerequisites and draft request; staging/origin closure incomplete, request unsent |
| [PDF regression coverage](P2-07_SECURITY_REGRESSION_MATRIX.md) | Local protection tests; no certification of old-origin denial |
| [Credential history review](P4-03_SECRET_HISTORY_REVIEW.md) | Password-only cleanup, exposure limits and deferred rotation; no credential values |
| [Database backup evidence](P1-02_TURSO_BACKUP.md) and [recovery notes](../../MIGRATION_RECOVERY.md) | Verified snapshot and rehearsal procedure; full application/receiving restore unproven |
| [Migration procedure](P4-07_MIGRATION_PROCEDURE.md) | Explicit targets and tested migration ledger; live ledger adoption not performed |
| [Hosting choices](../../DIGITALOCEAN_MIGRATION.md) | Conditional migration paths; not approval to move services or spend |
| [Manual indexing](../../GITHUB_INDEXING.md) and [worker operation](../../INDEXING_WORKER.md) | Operating references; hosted dispatch/scoped storage credentials and final worker synchronization pending |
| [Navigation](../../NAVIGATION_MANAGEMENT.md) | Implemented menu management; does not implement Dynamic Pages |
| [Preservation checks](P1-04_05_PRESERVATION_CHECKS.md) and [legacy cleanup](SB-04_CLEANUP_2026-10-08.md) | Dated database/assets and local retirement evidence; no separate R2 backup or hosted Supabase retirement certified |

## Source package and private material

**Published 13 October:** [source delivery record](SOURCE_PUBLICATION_2026-10-13.md) identifies commit `c44eb45`, hosted CI, Vercel build cancellation and remaining receiving-access requirements. Start from the repository [README](../../README.md). The local archives below are dated preparation snapshots; current Git `main` now contains the reconciled source and discussion documents. Source publication did not deploy the candidate.

13 October additions: [offline database restore evidence](P3_LOCAL_RESTORE_2026-10-13.md) and [dependency/support review](P6_SUPPORT_REVIEW_2026-10-13.md). The technical specification now explains application APIs and external integrations. A refreshed source assembly must include these records and the new restore tooling; the archive below remains the earlier tested baseline.

Refreshed local source candidate: `.cache/readiness-2026-10-13-final/candidate.tar.gz`, with exact files/hashes/modes in `selection.json` and scan/protected-file results in `verification.json` beside it. It contains 365 files including this discussion set and the restore tools; all 307 previously tested non-Markdown files remain unchanged. This is ready for source review and isolated commit preparation, not a pushed release or permission to deploy. Private recovery files are excluded. Before publishing, inspect current Vercel build triggers and coordinate a source-only push; then verify hosted CI and Dibyanshu Ji's repository access.

The earlier 357-file `.cache/p6-security/candidate-final.tar.gz`, SHA-256 `a95aa0e80271be5d2d6091cf38bd5c361488fe726a3a9b9b3c0bd551108c752b`, passed its recorded secret checks and corresponds to the 10 October tested runtime. It predates this discussion package. Use the published Git source for receiving review; the original dirty workspace's local HEAD still points to the older baseline and must not be mistaken for the published candidate.

Recovery material remains separately controlled under `D:\AIM (Project Directory)`. Technical evidence can identify its location/hashes, but it is not included here. Environment files, database snapshots, source magazine PDFs, historical correspondence, old Git bundles, browser state and raw private logs are not discussion attachments. The current scope excludes a separate R2 backup.

## Before and after the conversation

Before the conversation, the owner can review the brief and service questions and decide which technical colleagues should attend. Engineering can continue recovery and security work; those unfinished demonstrations do not prevent a planning discussion.

After the conversation, record named owners, service choices, staging access, official contact links and timing in the tracker. Finalize runbooks against the chosen destination, complete remaining security/recovery/hosted checks, then prepare a refreshed receiving package and independent acceptance. No implementation, ownership transfer or accepted exception follows merely from discussing these documents.
