# Hand Over TaskList:

**Current direction, 13 October 2026:** owner reports Society acceptance and will continue as part of the project. Today's request is complete reviewed Git source for Dibyanshu Ji. The owner subsequently authorized isolated commit/push, hosted CI verification and repository sharing. This supersedes acceptance-pending and assumed-departure wording in the older continuation prompt below; it does not certify final release acceptance, named operating responsibilities or a departure date. Existing credentials and the pending Cloudflare request remain unchanged. Source publication must preserve the live website.

**Local progress, 13 October:** fresh read-only Turso capture and offline restore passed all 31 table/schema comparisons, integrity/FK and FTS checks; seven restore safeguards passed. [Recovery evidence](docs/handover/P3_LOCAL_RESTORE_2026-10-13.md). [Support review](docs/handover/P6_SUPPORT_REVIEW_2026-10-13.md) records native install exposure and Next migration work without upgrading the tested candidate. Source publication must use an isolated reviewed assembly and account for Vercel auto-build triggers.

Perfect. We will follow this from now on. Before starting each tasks - give me what it is, choices I should make, any questions to clarify with me and the outcome and anything else necessary so that I can know what to expect from it.
For each of the task. Now What is our first task.

# 

Prepared the discussion package. Start with the [document index](D:/AIM Project/docs/handover/SOCIETY_DOCUMENT_INDEX.md).
It includes:
- [Project status brief](D:/AIM Project/docs/handover/SOCIETY_DISCUSSION_BRIEF.md)
- [Society decisions and service inventory](D:/AIM Project/docs/handover/SOCIETY_DECISIONS_AND_SERVICES.md)
- [Draft admin walkthrough and acceptance requirements](D:/AIM Project/docs/handover/ADMIN_WALKTHROUGH_AND_ACCEPTANCE_DRAFT.md)

# Prompt to Share to start tomorrow's work:

Continue the AIM Archive handover work in D:\AIM Project from where we stopped on 10 October 2026.

Context and decisions to preserve:
- We are preparing the project for handover to Sri Aurobindo Society. Dibyanshu Ji is my intended recipient; institutional acceptance is still pending.
- Keep the current admin password and login working. I explicitly deferred rotation and requested removal of the password from Git only. Do not rotate credentials or invalidate sessions without a new instruction.
- Cloudflare settings require Dibyanshu Ji’s access. Leave the existing request pending and unsent, and continue independent local work.
- Preserve the dirty workspace and all unrelated work. Do not reset, overwrite, broadly stage or deploy it.

Read first:
1. AGENTS.md, including the Windows sandbox instructions.
2. CLAUDE.md.
3. TO DO LIST.md — the single active backlog.
4. docs/handover/P4-03_SECRET_HISTORY_REVIEW.md.
5. docs/handover/P4_SOURCE_RECONCILIATION.md.
6. docs/handover/P2-08_STAGING_READINESS.md.

Latest completed work:
- P4-02: local source/deployment exclusions verified.
- P4-03 found the active admin password in nine historical blobs.
- P4-03 local document/package suitability review is complete as of 10 October. Fresh scans found no known secret values or Gitleaks findings; eight historical documentation flags were classified. External limitations and the final assembled-package scan remain open.
- P4-04 generated/vendor lint exclusions are corrected; ordinary web lint and host-runner root lint passed, including Turbo cache/log replay. See docs/handover/P4-04_LINT_VERIFICATION.md.
- At my instruction, password-only history cleanup was published to both GitHub branches and applied locally. All 101 mapped commits were compared; current branch-tip files remained unchanged.
- Local Git index and private environment file were preserved.
- GitHub still retains the old PR #1 reference. Existing clones, caches and private backups may retain the password. Do not claim complete erasure or resolved credential exposure.
- Vercel builds triggered by the history rewrite were canceled using a temporary build guard. The previous setting was restored, and the public alias still points to deployment dpl_5V2XphXmDRLfDB4ku83WkYgeSf7x.

Current Git baselines:
- Local main: 4c02a99a3ecb7aa17a3be8f0c724c9c6127e676b
- GitHub main: e4d860fb7fc540481ab7bf23d768bedd8cbb3c6c
- Local main remains nine commits behind GitHub; extensive newer work is in the working folder. P4-01 local reconciliation and P4-08 isolated assembly are verified; no release commit/push has been made.
Verify current state before acting; earlier documents may contain pre-rewrite commit IDs.

Next work:
The [Society discussion package](docs/handover/SOCIETY_DOCUMENT_INDEX.md) is prepared for owner review: status brief, decisions/service inventory and draft admin/acceptance walkthrough. It has not been sent and does not close receiving acceptance or operational gates. Continue the remaining dependency/support review and isolated recovery preparation; Society decisions are needed for hosted staging/transfer.

P4-10 CI preparation and compatible P6-01 web/root patches passed a fresh Linux install and the exact CI script. See docs/handover/P4-10_P6-01_CI_SECURITY_REVIEW.md. Native dependency risks and the Next 15 support horizon remain open. First hosted CI execution, commit/push and rollout remain separate. Preserve P4-03 external cleanup limits and scan each updated receiving package.

Other settled constraints:
- Phase 2 PDF protections are locally implemented/tested, but staging, deployment and public-origin closure remain open.
- No separate R2 backup is requested.
- Existing 104-issue coverage is sufficient for handover.
- New uploads focus on English AIM; Agnishikha remains paused.
- Dynamic Pages and native-app completion are excluded.
- Supabase local cleanup is complete; hosted retirement remains pending.
- Private recovery material belongs under D:\AIM (Project Directory), outside the repository.

Before each task, briefly explain its purpose, expected outcome, necessary choices and genuine questions. Proceed with authorized local work without repeatedly seeking confirmation. Record evidence and remaining limitations in the tracker as you work. Never expose secrets or mark local preparation as production completion.

Start with a short status recap and the briefing for the next task, then proceed.

# [SHORT VERSION] AIM Archive — To Do List:

The main outstanding risks are **PDF protection not yet deployed or verified at public origins, unpublished verified source, and pending Society acceptance/access**. The current admin password remains unchanged by your instruction; historical exposure remains unresolved.

Below is the remaining work from the [active tracker](<D:/AIM Project/TO DO LIST.md>), grouped without repeating overlapping service checklists.

**1. Source and reproducible releases — next local work**

- **P4-05 — completed locally, 10 October:** Runtime/install contract and bundled fonts verified; P4-09 Linux verification passed and P6-01 patched the candidate runtime further. Remaining security/support work stays open.
- **P4-06 — completed locally, 10 October:** Environment examples/Turbo and hosted name-only inventory reconciled; hosted changes remain their release tasks.
- **P4-07 — completed locally, 10 October:** Explicit-target migration ledger, fresh setup and populated upgrades verified; live ledger adoption remains a reviewed release action.
- **P4-01 — completed locally, 10 October:** Reviewed overlaps, corrected the worker-runner test integration and recorded the exact candidate selection without changing the index/private environment. Assembly and publication remain separate.
- **P4-03:** Exact assembled-candidate scan passed; retained GitHub PR/external-copy exposure remains open. Scan later package changes before transfer.
- **P4-08 — assembly verified:** initial 351-file archive extended to the scanned 357-file CI/security snapshot. Discussion/document updates postdate that archive and need inclusion in a refreshed final release; commit/push remains pending.
- **P4-09 — verified, 10 October:** Cold Linux install, lint/cache replay, types, build, PDF/OCR/regressions and 13 startup/auth HTTP checks passed for the exact source snapshot.
- **P4-10 — locally verified, 10 October:** isolated CI prepared; first hosted execution awaits source publication.
- **P4-11:** Synchronize the indexing worker separately and verify its actual GitHub checkout.

**2. Finish PDF protection — requires staging and Cloudflare access**

- **P2-08:** Arrange isolated staging database/storage and separate credentials.
- Obtain Cloudflare settings/access assistance from Dibyanshu Ji; the prepared request remains **pending and unsent**.
- Configure scoped worker storage credentials and staging configuration.
- Deploy the reviewed candidate to staging.
- Verify actual reader redirects/ranges, expired links, uploads, replacements, covers, worker extraction and the PDF-unavailable fallback.
- Rehearse recovery and coordinate website/worker release.
- **P2-09:** Close every old public PDF origin and relevant cache path; verify restricted/draft denial while released reading and admin/worker access continue.

The implementation and local regression work are already complete; these are hosted verification and rollout tasks.

**3. Demonstrate recovery**

- **P3-01–03:** Finalize repeatable backup/restore steps, restore into isolation, and compare tables, relationships, search indexes, settings and counters.
- **P3-04–05:** Verify applicable asset references and representative files; exercise reading, search, private access and admin/worker operations on the restored service.
- **P3-06–07:** Record recovery duration/data timestamp and publish tested recovery instructions.

Your exclusion of a separate R2 backup remains in force; full-object-copy requirements must respect that decision.

**4. Indexing, admin workflows and editorial checks**

- **P5-01–02:** Configure and verify Admin-to-worker dispatch, including concurrent starts, failures, no-op runs and multiple batches.
- **P5-03:** Test single/bulk uploads, metadata, publication, PDF/cover replacement and resulting search/cache changes.
- **P5-04:** Test worker interruption, resume, retries, stale jobs and preservation of reviewed text.
- **P5-05:** Verify remaining admin operations: magazines, bulk actions, topics, CSV, navigation, settings, storage and deletion.
- **P5-06:** Review the **17 flagged cover pages** individually.
- **P5-07:** Validate and snapshot the **existing 104-issue catalogue**.
- **P5-08:** Agree future source-file quality, naming, delivery and publishing responsibilities.
- **P5-09:** Confirm subscription, feedback and problem-report destinations.
- **P5-10:** Check that documentation/admin/mobile wording accurately describes English/Hindi support and unfinished features.

**5. Security and product-quality acceptance**

- **P6-01 — partial, 10 October:** compatible web/root fixes verified; native dependency findings and Next 15 support planning remain open.
- **P6-02:** Verify login throttling, proxy handling, cookies, session validation and admin offboarding. Password/session replacement remains deferred until a new instruction.
- **P6-03:** Review privileged APIs, cross-origin mutations, uploads, object ownership and sensitive metadata/search responses.
- **P6-04:** Verify counters and caching behavior.
- **P6-05–07:** Test public browsing/search, bookmarks/history and full/embedded readers across desktop and phone.
- **P6-08:** Complete keyboard, screen-reader, focus, contrast, zoom and touch accessibility checks.
- **P6-09–10:** Measure performance and test representative upload, ZIP, OCR, traffic and failure workloads.
- **P6-11:** Fix confirmed release blockers and record any accepted noncritical exceptions.

**6. Society decisions, accounts and hosting**

- **P0-01–03:** Obtain institutional acceptance, named receiving owners and acknowledgement of the agreed product and 104-issue scope.
- **P0-04–07:** Agree hosting choices, operational responsibilities, account/recovery access, costs, acceptance criteria and a finite transition period.
- Confirm Society admin identities and GitHub access.
- Decide who operates and pays for the indexing worker if it remains in your retained private repository.
- **P7-01–03:** Prepare receiving accounts and transfer or recreate retained services as selected.
- **P7-04–10:** Implement and rehearse **only the migrations actually chosen**—web hosting, database, storage or worker. A DigitalOcean migration is not mandatory.
- **P7-11:** Finalize the domain arrangement; setup/spending remain deferred.
- **P7-12:** Decide whether legacy-site replacement/redirects are included.
- **FORM-02–04:** Dibyanshu Ji confirms his form copy, response preservation and new links; then update and test website destinations.
- **SB-02/06:** Resolve remaining legacy Supabase preservation/billing uncertainty, remove obsolete hosted secrets during the coordinated release, and retire reviewed resources when authorized.

**7. Operations and the handover package**

- **P8-01:** Establish Society-controlled backup storage, scheduling, retention and verification.
- **P8-02:** Set up and test monitoring and alert recipients.
- **P8-03:** Establish secret management, renewal reminders, recovery access and spending alerts.
- **P8-04:** Finish tested deployment, rollback, restart and incident runbooks.
- **P8-05–06:** Reconcile technical specifications and operating documents with the final release.
- **P8-07:** Prepare the admin walkthrough and editorial checklist.
- **P8-08:** Assemble the source, documentation, inventories, private recovery references, test evidence and dependency/content notices.
- **P8-09:** Review the package with the receiving team and assign ongoing work.

**8. Final production release**

- **P9-01–03:** Confirm readiness and rollback arrangements, refresh applicable recovery evidence, and deploy the identified release.
- **P9-04:** Verify production security at old and new origins.
- **P9-05:** Run real desktop/phone public-flow checks.
- **P9-06:** Exercise a disposable production admin/indexing fixture and verify cleanup/integrity.
- **P9-07:** Verify backups, alerts, worker version and receiving access.
- **P9-08:** Observe the service for the agreed period and resolve failures.
- **P9-09:** Record the final release, deployment, schema, verification results and rollback instructions.

**9. Acceptance and ending your responsibility**

- **P10-01–02:** Society IT independently builds/deploys/rolls back and demonstrates recovery.
- **P10-03:** The receiving editor independently performs the admin/indexing workflow.
- **P10-04:** Verify receiving ownership, billing, recovery and operational responsibilities.
- **P10-05:** Obtain written acceptance and an effective transfer date.
- **P10-06:** Coordinate credential/session replacement and revoke departing access **only with the required instruction and verified receiving access**.
- **P10-07:** Close personal billing/automation dependencies, respecting the retained GitHub arrangement and agreed retention.
- **P10-08:** Record formal closure and the end of indefinite personal maintenance responsibility.

**Excluded or deferred—not required for this handover**

Additional archive uploads, new Agnishikha ingestion, Dynamic Pages, native-app completion and a separate R2 backup remain excluded. Optional backlog items include collections, larger ZIPs, OCR-coordinate caching, thumbnail queues, storage pagination, batch topic editing, within-reader search, public accounts/sync, EPUB conversion, expanded analytics and other future product enhancements.

**P4-10 CI preparation and compatible P6-01 patches are verified locally.** Next: resolve the remaining dependency/support plan and continue scoped security review. First hosted CI execution, release commit/push and rollout remain separate.

# AIM Archive — To Do List

Updated: 13 October 2026. This is the single active task tracker for AIM Archive. Society acceptance is owner-reported and the owner continues participating. Implementation and final operational acceptance remain open unless explicitly checked with evidence.

Baseline: the 8 October audit found 104 issues, 208 matching R2 objects, 4,937 search rows and 17 cover pages awaiting review. Database integrity, production web build, source-only lint and regression checks passed. This does not certify restricted-file security, a complete restore, production admin mutations or handover readiness. See [assessment](HANDOVER_ASSESSMENT_2026-10-08.md), [technical specification](TECHNICAL_SPECIFICATION.md), [DigitalOcean plan](DIGITALOCEAN_MIGRATION.md), and [September release evidence](PRODUCTION_RELEASE_2026-09-19.md).

## Tracking rules and phase order

Keep task IDs stable. `[ ]` means open; `[x]` means its stated outcome was verified. For an open task, append `IN PROGRESS`, `BLOCKED — reason and next action`, or `NOT APPLICABLE — decision reference` as needed. Do not check a task merely because code was written. Conditional tasks not selected remain explicitly not applicable and are excluded from completion totals.

For each completion record the task ID, date, responsible person, environment, release/commit, evidence link and result in the completion log below. Keep secret values and sensitive manifests outside Git; link to their private location without copying credentials. Record decisions and accepted noncritical exceptions in the decision register.

Owner roles below are proposed responsibilities, not named appointments: **Owner** = current project owner; **Engineering** = implementation/testing work; **Society IT** = receiving technical team; **Editorial** = receiving content owner. Assign named people in Phase 0. Do not invent deadlines before that assignment.

| Phase | Outcome | Dependencies |
|---|---|---|
| 0 | Agree scope, receiving owners and decisions | Begin now; external answers must not delay independent safety work |
| 1 | Preserve current source, data and assets before changes | Begin now, alongside Phase 0 |
| 2 | Enforce restricted PDF access | Phase 1 preservation; highest technical priority |
| 3 | Demonstrate complete recovery | Phase 1; repeat against final delivery design after Phase 2 |
| 4 | Produce reproducible source and CI | Inventory can start now; final verification includes Phase 2 fixes |
| 5 | Finish indexing, admin operations and editorial review | Safe staging, Phases 2 and 4; preserve new reviews in backups |
| 6 | Complete security, accessibility and quality acceptance | Phases 2, 4 and 5; rerun affected checks after later changes |
| 7 | Prepare Society hosting and any selected migration | Phase 0 architecture decision, Phases 3 and 4; no migration assumed |
| 8 | Establish operations and handover documentation | Start drafts early; validate against Phase 7 target |
| 9 | Release, cut over if needed and observe | All applicable earlier acceptance gates |
| 10 | Society acceptance and responsibility transfer | Successful Phase 9 and independent demonstrations |

H01 from the assessment maps to Phase 2; H02 to Phases 1 and 3; H03 to Phase 4; H04 to Phases 0, 7, 8 and 10. P1-01 is complete. Phase 0 coordination is active; the owner reports sending the handover email. Continue with a briefing for P0-02 scope documentation, while independent preservation/security work can proceed after its own task briefing. A full migration or a wait for institutional decisions must not postpone fixing the confirmed PDF exposure.

## Phase 0 — Agree delivery scope and receiving owners

Lead: Owner with Society IT and Editorial. Decisions can proceed alongside Phases 1–4.

- [ ] **P0-01 — SOCIETY ACCEPTANCE REPORTED, 13 OCTOBER:** owner confirms Society acceptance and will continue participating. Dibyanshu Ji is the intended source recipient. Named technical, editorial, account/billing and final release acceptance responsibilities/access still need recording; this does not assign all roles to Dibyanshu Ji. [Earlier email preparation](docs/handover/HANDOVER_EMAIL_DRAFT.md) remains historical.
- [ ] **P0-02** Agree the handover product: working web archive, existing English/Hindi catalogue, English extraction, manual indexing and local bookmarks/history. Owner confirmed on 8 October that new uploads focus only on English AIM; Agnishikha uploads are on hold and Dynamic Pages is excluded from the planned handover. Preserve existing Hindi issues. Society acceptance of the overall scope remains pending; explicitly exclude unfinished native apps and other optional features unless newly selected.
- [ ] **P0-03** Record the current catalogue as the handover coverage: **OWNER DECISION SETTLED, 8 October 2026** — the existing 104 issues (102 English AIM, 2 Agnishikha) are sufficient; no additional uploads or completion of historical years is required for handover. Preserve an itemised acceptance snapshot and obtain Society acknowledgement. Future ingestion belongs to the receiving editorial owner; Agnishikha uploads remain paused.
- [ ] **P0-04** Confirm Society IT's hosting standards and choose whether to retain current services, move only the web server, or additionally move database/storage/worker. Record decisions separately for each component using `DIGITALOCEAN_MIGRATION.md`.
- [ ] **P0-05** Use a proportionate prelaunch operating plan: the owner confirms the site has not officially launched, so defining public uptime/downtime targets is not a prerequisite for current preparation. Preserve existing data, verify backups before risky changes and avoid unapproved spending. Before launch/transfer, Society IT should own the practical backup/retention, recovery, incident and cost arrangements; no detailed service-level agreement is required merely to continue local work.
- [ ] **P0-06** Agree what blocks release, how noncritical exceptions are accepted, the acceptance approver, and a finite transition/observation period. No hard cutoff is set. Owner tentatively prefers clearing personal resources around the beginning of 2027, after official acceptance and a coordinated transition; this is not a shutdown deadline. The retained private GitHub repository is an explicit exception.
- [ ] **P0-07** Inventory account ownership and recovery access for GitHub, Vercel, Turso, Cloudflare/R2, DNS, backup destinations, monitoring and public feedback/contact services; record secret locations and expiration dates privately. **IN PROGRESS** — ownership clarified by owner on 8 October 2026; service steps below distinguish available preparation from Society-dependent work. Account recovery, billing, token expiry and independent receiving access remain unverified.

### Required responsibilities for P0-01

These are operational responsibilities, not new application permission roles or seven required staff positions. One person may hold several roles. Confirm a named primary owner and a backup/escalation contact where continuity requires it; do not assume the handover coordinator personally performs every function.

| Responsibility | What it covers | Current position |
|---|---|---|
| Handover coordinator | Receives the package, schedules walkthroughs, coordinates questions and acceptance evidence | Dibyanshu Ji is the owner's intended recipient; Society confirmation pending |
| Application maintainer | Source/repository, builds/releases, bug fixes, dependency updates, search/indexing code and security fixes | Society IT to assign; Dibyanshu Ji's current frontend/backend assistance is not confirmation of full ownership |
| Infrastructure and recovery operator | Hosting, database, object storage, DNS/TLS, backups/restores, uptime/error alerts and incidents | Society IT to assign; Kaushal Ji is the known IT Head/contact |
| Editorial and archive operator | Source batches, metadata/covers, English AIM uploads, publication policy, manual indexing and cover-text reviews | To be assigned; Hemlata Di is an existing source-material contact, not a confirmed ongoing operator |
| Accounts and billing custodian | Society-owned service accounts, access/recovery, secrets/renewals, costs, budgets and credential rotation | Society to assign; values remain in private records |
| Acceptance authority | Approves agreed delivery scope, any noncritical exceptions, launch readiness and responsibility-transfer date | To be confirmed by Kaushal Ji/Society; do not presume appointment |
| Departing project owner | Prepares agreed fixes, evidence, documentation and transition walkthroughs | Mugdhanil; ongoing responsibility ends at agreed acceptance/transfer. Any later help is subject to availability |

**Current Phase 0 position:** the owner's product constraints and existing-catalogue acceptance are recorded; no further uploads are required for handover. The deployed review site has not officially launched to the public. The email has been sent by the owner and institutional agreement is pending. The proposed 24 November 2026 official launch is an aspiration, distinct from the responsibility-transfer date. Society confirmations and the account inventory remain open; do not repeatedly ask the owner to decide settled scope/coverage.

**Exit evidence:** named receiving owners, delivery scope, architecture decisions and acceptance criteria recorded. Unanswered external decisions stay visible; independent remediation continues.

### Service preparation and transfer steps for P0-07

These are ordered service checklists under the existing phase tasks, not additional promises to complete every phase immediately. **READY** means work can proceed after its task briefing and stated prerequisites. **WAITING** means the named external input is needed. A checked inventory step does not certify a service transfer. Keep secrets out of this tracker.

#### Vercel and Turso

- [x] **VT-01 — Ownership recorded:** owner confirms both services belong to him and must leave his personal control for handover. Local Vercel project link, database configuration names and runtime dependency are identified.
- [ ] **VT-02 — PARTLY COMPLETE, P1-02/P4-01/P4-06:** current database backup verified under P1-02 on 8 October; reconcile deployed/source versions and environment variable names; record configuration locations, integrations and credentials requiring replacement, without exposing values.
- [ ] **VT-03 — WAITING, P0-04/P7-01:** Society selects retained services or replacements and supplies receiving accounts/team, billing custodian and access contact. Decide web and database independently.
- [ ] **VT-04 — AFTER VT-02/03, Phase 7:** prepare the selected transfer/migration, preserve rollback data and test the website and worker against the receiving database. Verify schema, search, catalogue and asset references.
- [ ] **VT-05 — AFTER ACCEPTANCE, P10-04/06/07:** verify receiving login/recovery/billing and operating access; remove personal credentials and retire only superseded resources. Do not delete a project/database that was transferred and remains the live service.

#### Society-owned Cloudflare R2

- [x] **R2-01 — Ownership recorded:** owner confirms R2 belongs to Sri Aurobindo Society. No ownership migration is presumed necessary.
- [x] **R2-02 — APPLICABLE PREPARATION COMPLETE, P1-03/05/06:** separate R2 backup excluded by owner. All 208 references matched 208 live objects without discrepancies on 8 October; [evidence](docs/handover/P1-04_05_PRESERVATION_CHECKS.md) and [rollback approach](docs/handover/P1-06_PDF_ACCESS_ROLLBACK.md) recorded. No independent asset backup certified. Access implementation/rehearsal remains Phase 2.
- [ ] **R2-03 — AFTER PRESERVATION, Phase 2:** implement and test private restricted-PDF delivery, including released readers, downloads, admin previews and worker access; close the old public-origin bypass. Society response about future hosting must not postpone this fix.
- [ ] **R2-04 — WAITING ON DIBYANSHU JI, P0-01/P8-03:** owner confirmed on 8 October that they do not have Cloudflare dashboard access and Dibyanshu Ji must handle these settings. His acceptance and effective permissions remain unverified; confirm bucket administration, recovery/billing contacts and arrange scoped application/worker credentials. [Forwardable request](docs/handover/P2-08_STAGING_READINESS.md#draft-request-to-dibyanshu-ji).
- [ ] **R2-05 — AFTER FIX AND RECEIVING ACCESS, P9-04/P10-06:** verify old-origin denial and normal operation, then revoke departing access/keys without interrupting Society storage.

#### GitHub and manual indexing

- [x] **GH-01 — Ownership and intention recorded:** `MugdhanilK/aim-archive` belongs to the owner; he intends to retain it privately and make it available for as long as the Society wants. This records intent, not a fresh verification or change of repository visibility.
- [x] **GH-02 — LOCAL PREPARATION VERIFIED, P4-01/02/03/08/09, 10 OCTOBER:** source comparison/review and exact candidate assembly/scan verified without overwriting unrelated work; clean Linux checks passed. Release publication remains P4-08; external historical password copies remain P4-03.
- [ ] **GH-03 — READY, P4-11/P5-01:** inventory repository references, workflow triggers, secret names and dispatch credential requirements. Current code names the personal repository; local worker changes and remote source must be reconciled. Prepare the chosen configuration once its destination is known.
- [ ] **GH-04 — WAITING:** obtain receiving GitHub usernames and agreed permissions; invite individual accounts rather than sharing the owner's login or desktop token. Verify private visibility and their access at transfer.
- [ ] **GH-05 — WAITING, P0-04/P7-01:** decide whether Actions stays in the retained repository or moves to Society infrastructure. If it stays, explicitly assign usage/billing, token renewal, secret administration and support; retaining source access alone does not settle worker responsibility.
- [ ] **GH-06 — AFTER SOURCE AND ACCESS DECISIONS, P4-08/11/P5-01/02:** synchronize the approved worker release, configure scoped dispatch/database credentials privately, and verify a bounded manual indexing fixture. Record the actual checkout and results.

#### Website admin access

- [x] **ADM-01 — Current arrangement recorded:** approved admin emails are stored in the database; login uses a shared environment password and signed seven-day sessions. Owner confirms temporary credentials were shared with the receiving team. A separate session secret is supported; local configuration currently falls back to the password. No external identity provider is required by the current implementation.
- [ ] **ADM-02 — READY, P6-02/P8-07:** document the current login/session behavior, configuration locations and known limitations, including process-local login throttling. Prepare the admin walkthrough and receiving checklist without reproducing credentials.
- [ ] **ADM-03 — WAITING:** Society confirms authorized admins and its preferred access arrangement. Do not presume a new identity provider or extra application roles.
- [ ] **ADM-04 — ROTATION DEFERRED BY OWNER, P6-02/P10-03/06:** P4-03 found the current password in Git history and confirmed production still accepts it on 8 October. Owner explicitly requested removing it from Git while keeping the current login. Do not rotate now. Before handover, revisit coordinated password/session replacement and verify rejection of inherited access, including accessible older deployments. History cleanup does not invalidate copied credentials. [Evidence and ordered steps](docs/handover/P4-03_SECRET_HISTORY_REVIEW.md).

#### Backups and monitoring

- [x] **BM-01 — Baseline recorded:** P1-01 verified a private same-drive workspace copy. It is not a complete current remote database/object backup or protection from drive failure. Owner has no additional confirmed backup/monitoring arrangement; Society will select and manage ongoing operations.
- [x] **BM-02 — APPLICABLE BASELINE COMPLETE, P1-02/03/05:** current database backup verified and rechecked; all 208 live asset references reconciled without discrepancies. Separate R2 copy excluded by owner decision. [Evidence](docs/handover/P1-04_05_PRESERVATION_CHECKS.md). Application restore and future institutional backup arrangements remain open under Phases 3 and 8.
- [ ] **BM-03 — AFTER BACKUPS, Phase 3:** demonstrate an isolated restore, compare records and asset hashes, and prepare tested recovery instructions and an honest list of operational gaps.
- [ ] **BM-04 — WAITING, P0-05/P8-01/02:** Society chooses permanent backup destination, retention, schedule, monitoring/alert service, recipients and costs. Owner is not committing to operate these indefinitely.
- [ ] **BM-05 — AFTER SOCIETY DECISION, P8-01/02/P10-02:** transfer the recovery package, verify Society can restore independently, and test its selected backup and alert arrangements. Explicitly record any deferred setup in acceptance rather than marking it complete.

#### Legacy Supabase removal

Owner authorizes review and removal of obsolete Supabase material from the delivered project to avoid confusing the receiving team. Preservation and live-resource verification precede destructive retirement; replacing current Turso/R2 is not part of this cleanup.

- [x] **SB-01 — Local inventory inspected, 8 October 2026:** found the historical workspace package/SDK/schema, export/import/storage-migration scripts, local credential names, documentation, Admin Storage legacy reporting, and URL rejection guards in current queries/indexing. The main web runtime uses Turso/R2. Some remaining references actively reject old assets, so deleting every matching line would change behavior.
- [ ] **SB-02 — PAUSED, PARTIAL PRESERVATION REPORTED:** owner confirms Resume is available but prefers using current Turso as authoritative rather than resuming Supabase. Downloaded Storage is at `D:\AIM (Project Directory)\glduurfsjyxpkdnxgdqz.storage`; database downloads are unavailable. Keep paused for now. Latest legacy database contents and charges remain unverified; any final retirement must acknowledge that post-May unique legacy records were not checked.
- [x] **SB-03 — VERIFIED 8 OCTOBER 2026, P1-04/05:** historical Storage verified (18 files; 516 PDF pages; all 16 May asset references covered), May table export hashes/counts verified, current Turso backup completed. Pre-cleanup tools/schema/config/docs and historical export preserved privately in `D:\AIM (Project Directory)\SB-03_retired-material_2026-10-08_143246_IST`: 96 files, 4,989,727 bytes, all hashes rechecked. [Evidence](docs/handover/SB-04_CLEANUP_2026-10-08.md). No claim of completeness against the paused remote service or its latest database.
- [x] **SB-04 — COMPLETED LOCALLY 8 OCTOBER 2026, P4-02/06:** removed obsolete package/SDK/scripts, local credentials, configuration examples and migration guidance; current docs now describe Turso/R2. Replaced URL rejection with configured asset-location checks and admin unsupported-file reporting. Historical material preserved privately; Git history unchanged. Source/workflow not deployed or pushed. [Evidence](docs/handover/SB-04_CLEANUP_2026-10-08.md).
- [x] **SB-05 — VERIFIED 8 OCTOBER 2026, SCOPED LOCAL CHECKS:** frozen dependency install, web build, TypeScript/source lint, asset/catalogue/search/indexing/real PDF-OCR regressions passed. Read-only current database check: all 104 PDFs/covers use supported locations, no missing cover references. No obsolete provider references in active code/config/setup docs or local credential keys. Full clean-Linux/browser/production acceptance remains in later phases. [Evidence](docs/handover/SB-04_CLEANUP_2026-10-08.md).
- [ ] **SB-06 — AFTER VERIFIED PRESERVATION AND CLEANUP:** remove obsolete hosted secrets and retire any remaining owner-controlled legacy project/resources through the owner account. Confirm no residual billing/dependency. Permanent remote deletion requires an identified, reviewed target and preservation evidence.

#### Feedback form and domain

- [x] **FORM-01 — Ownership and proposed recipient recorded:** current form belongs to the owner's personal Gmail account; proposed recipient is `dibyanshu@aurosociety.org`. Its domain alone does not establish whether it is a managed Google Workspace account.
- [ ] **FORM-02 — WAITING FOR DIBYANSHU JI:** owner reports sharing editor access on 8 October 2026; receiving sign-in and ability to create/manage the copy remain to be confirmed by Dibyanshu Ji. No further sharing request is needed from the owner now. Personal-to-Workspace ownership transfer is not supported by [Google's ownership rules](https://support.google.com/drive/answer/2494892?hl=en).
- [ ] **FORM-03 — IN PROGRESS, RECEIVING ACTION PENDING:** owner has shared the form as an Editor with Dibyanshu Ji and requested a copy under his account; owner delegates the remaining form setup/management to him. Creation and receiving ownership of the copy are not yet confirmed. Dibyanshu Ji should preserve any existing responses and check linked response-sheet ownership/access; copying a form is not proof of migrating response history. [Form collaboration guidance](https://support.google.com/docs/answer/2917111?hl=en).
- [ ] **FORM-04 — WAITING FOR NEW LINKS:** after Dibyanshu Ji supplies the new public response and admin edit links, update the stored settings and source defaults; coordinate submission/response/notification verification with him. Retire the personal form only after continuity and response preservation are verified.
- [x] **DNS-01 — Responsibility recorded:** owner controls the current Vercel project/address; Dibyanshu Ji is intended to create/manage `aimarchive.aurosociety.org` when needed.
- [ ] **DNS-02 — WAITING, P7-11:** when the destination is agreed, coordinate DNS/TLS and verify canonical URLs, routing and redirects as applicable. No new domain purchase or setup is required now.

## Phase 1 — Preserve the current project before changes

Lead: Engineering and Owner. Capture the baseline before modifying storage access, source history or data.

- [x] **P1-01** Preserve the current dirty workspace and Git state in a private recovery copy, including untracked source, migrations and worker files. Record local HEAD, remote main, deployed release and timestamp; keep credentials protected. **Verified 2026-10-08** — 7,627 files / 940,242,895 bytes, matching SHA-256 hashes, restricted ACLs and successful copied Git integrity check. [Evidence](docs/handover/P1-01_WORKSPACE_PRESERVATION.md).
- [x] **P1-02** Capture a consistent current Turso backup containing all application tables, schema, triggers, search text, indexing history/checkpoints/reviews, navigation, settings, admin identities and counters. **Verified 8 October 2026:** remote snapshot and local replica schema/all 31 table digests matched; standalone 38,686,720-byte SQLite backup reopened offline with matching contents, integrity `ok`, zero FK violations and working FTS queries. Private dated folder under the approved parent; [evidence](docs/handover/P1-02_TURSO_BACKUP.md). Full application restore remains Phase 3.
- [ ] **P1-03 — NOT APPLICABLE, OWNER EXCLUSION 8 OCTOBER 2026:** owner explicitly declines a separate R2 object backup, stating the Society owns the live bucket and deleted files can be re-added. No independent R2 copy or replacement-source completeness has been verified. Exclude this task from applicable completion totals; do not reopen it merely because later phase wording assumes an object backup. Apply the same exclusion to full-object-copy prerequisites in P1-05 and Phase 3; preserve reference checks, authorized access tests and database recovery. Society may choose its own ongoing backup arrangements under Phase 8.
- [x] **P1-04** Supplied originals and extraction/review evidence preserved and verified, 8 October: 12 originals matched the existing backup; 800 additional working/evidence files copied privately and hash-verified. Originals, downloaded copies and generated evidence distinguished. [Evidence](docs/handover/P1-04_05_PRESERVATION_CHECKS.md).
- [x] **P1-05** Applicable checks passed, 8 October: database backup hashes/readability/integrity rechecked; 208 references matched 208 live R2 objects with zero discrepancies or unreferenced objects. Metadata verification only; no R2 content backup or full application restore claimed. [Evidence](docs/handover/P1-04_05_PRESERVATION_CHECKS.md). Full restore proof remains Phase 3.
- [x] **P1-06** [Immediate PDF-access rollback approach](docs/handover/P1-06_PDF_ACCESS_ROLLBACK.md) documented, 8 October: keep restricted origins denied; recover to a tested secure release or temporarily stop PDF delivery. No legacy buckets/backups deleted. Concrete implementation and rehearsal remain Phase 2.

**Exit evidence:** recoverable baseline copies and manifests in a protected location, plus a recorded rollback approach. If Society storage is not yet available, protect the interim copy and transfer it in P8-01; do not wait to preserve the project.

## Phase 2 — Fix restricted PDF delivery

Lead: Engineering. Highest technical priority. Detail and evidence: H01 in the handover assessment.

- [x] **P2-01 — DESIGN DOCUMENTED, 8 OCTOBER:** [Private PDF delivery design](docs/handover/P2-01_PRIVATE_PDF_DESIGN.md) selects five-minute authorized R2 links for released PDFs, authenticated streaming for admin previews and separate cover routes over the existing private bucket. Records revocation limits, renewal, source identity, worker/upload changes, platform constraints and cutover prerequisites. Implementation and live protection remain P2-02 through P2-09.
- [x] **P2-02 — LOCAL PREPARATION VERIFIED, 8 OCTOBER:** [Delivery map and fixtures](docs/handover/P2-02_DELIVERY_MAP_AND_FIXTURES.md) covers public/admin/worker/operator paths, stored-URL provenance, local origins and cache layers. Six schema-valid synthetic issues/PDFs/PNG covers and three IST boundary instants passed isolated validation. Account-side domain/CORS/cache inventory remains a mandatory P2-08/09 prerequisite; actual access-gate tests remain P2-03/07.
- [x] **P2-03 — IMPLEMENTED AND VERIFIED LOCALLY, 8 OCTOBER:** new public grant/redirect routes and authenticated admin GET/HEAD streaming enforce fresh catalogue/admin checks, configured key validation, private cache policy and byte-range handling. Isolated handler/route/signature regressions, asset-origin regressions, TypeScript, changed-source lint and production build passed. [Evidence and limits](docs/handover/P2-03_ACCESS_GATE_IMPLEMENTATION.md). Existing consumers/cover routes/downloads still need P2-04/05; no live protection or deployment claimed.
- [x] **P2-04 — IMPLEMENTED AND VERIFIED LOCALLY, 8 OCTOBER:** public serializers/readers/previews now use stable gated PDF routes; downloads use authorized attachment grants; ZIPs have bounded retry; cover routes enforce publication/type/size checks and bypass shared image caching; saved reading state retained. Repository/handler/counter/ZIP regressions, types/lint/build and isolated reader/preview/ZIP browser checks passed. [Evidence and staging limits](docs/handover/P2-04_PUBLIC_DELIVERY_IMPLEMENTATION.md). Real R2 CORS/redirect/idle-range/slow-network acceptance remains P2-07/08; no deployment or public-origin closure claimed.
- [x] **P2-05 — IMPLEMENTED AND VERIFIED LOCALLY, 8 OCTOBER:** authenticated admin previews/covers/downloads, direct bulk/replacement uploads with source fencing, private thumbnail/worker/operator reads and preserved byte-hash/review identity. Regression checks, types/lint/build and isolated admin preview/cover browser checks passed. [Evidence and hosted steps](docs/handover/P2-05_PRIVATE_MAINTENANCE.md). New scoped GitHub R2 read secrets, live CORS/upload/copy checks and worker synchronization remain P2-07/08 and Phase 4; no deployment or origin closure claimed.
- [x] **P2-06 — IMPLEMENTED AND VERIFIED LOCALLY, 8 OCTOBER:** retired `/api/pdf/[...path]` in every environment; GET/HEAD return uncached empty 404 without resolving or reading files. Six-state/traversal/range handler regressions, existing access-gate tests, production build and 16 real Next HTTP denial checks passed. [Evidence and cache/deployment limits](docs/handover/P2-06_LOCAL_PDF_ROUTE_RETIREMENT.md). Deployment and old cached-response invalidation remain P2-08/09.
- [x] **P2-07 — LOCAL REGRESSION GATE COMPLETE, 8 OCTOBER:** `pnpm.cmd test:pdf-security` runs nine passing isolated suites; expanded 96-case method/access matrix, signed-link tampering/expiry and revocation limits, boundary transitions and former-origin mapping. Read-only known-origin verifier added and self-tested; actual live-origin denial is not claimed. [Coverage, commands and hosted checks](docs/handover/P2-07_SECURITY_REGRESSION_MATRIX.md). P2-08/09 remain open.
- [ ] **P2-08 — IN PROGRESS, 8 OCTOBER:** [Staging readiness and ordered remaining steps](docs/handover/P2-08_STAGING_READINESS.md). Verified live read-only signed R2 GET/HEAD/range, current-origin CORS and tampered/expired denial; recorded deployment/source/configuration baseline. Added locally tested PDF-unavailable fallback; nine security suites and production build passed. Isolated staging, Cloudflare settings access, worker credentials/source sync, real upload/browser tests and coordinated release remain open. No deployment or origin/configuration changes.
- [ ] **P2-09** Deny restricted PDFs at every former public bucket/CDN origin, handle cached copies under our control, and confirm the previously exposed URL no longer returns bytes. Verify released public PDFs and admin/worker access still work.

**Exit evidence:** production denial tests for restricted/draft assets, successful released/admin/worker flows, and the security-fix release identifier. Existing API URL-hiding tests alone cannot close this phase.

## Phase 3 — Prove backup and disaster recovery

Lead: Engineering; Society IT reviews and later repeats the recovery.

- [ ] **P3-01** Build a repeatable current Turso backup/restore procedure with consistent snapshot handling, metadata, versions and private configuration recovery. Document asset reference verification/re-upload limits; a separate R2 backup remains excluded by owner decision.
- [x] **P3-02 — OFFLINE DATABASE RESTORE VERIFIED, 13 OCTOBER:** fresh snapshot restored to a new protected private directory. No app/worker started or storage writes enabled. Hosted fixture rehearsal remains P3-05/P2-08. [Evidence](docs/handover/P3_LOCAL_RESTORE_2026-10-13.md).
- [x] **P3-03 — DATABASE COMPARISON VERIFIED, 13 OCTOBER:** all 31 table contents/schema matched, including IDs, relations, search, coverage, settings and counters; integrity/FK/FTS checks passed. Empty review/checkpoint tables preserved; populated-review recovery not demonstrated. [Evidence](docs/handover/P3_LOCAL_RESTORE_2026-10-13.md).
- [ ] **P3-04** Verify all object keys, sizes and SHA-256 hashes; reconcile database references and inspect representative English/Hindi, scanned/native, released/restricted PDFs and covers.
- [ ] **P3-05** Run reading, searching, authorized private delivery and controlled admin/worker operations on the restored service. Check that restored restricted data remains private.
- [ ] **P3-06** Record actual restoration duration and recovered-data timestamp against P0-05 targets; fix failures and repeat only the affected checks.
- [ ] **P3-07** Document restore commands, prerequisites, secret locations, failure recovery, backup retention and verification frequency in `MIGRATION_RECOVERY.md`. Historical exports/tools are privately preserved outside the delivery project; current recovery uses the verified Turso snapshot.

**Exit evidence:** successful isolated restore report, comparison results, manifests and measured recovery time. Phase 8 automates the verified process; Phase 10 proves the Society can execute it independently.

## Phase 4 — Reconcile source and make releases reproducible

Lead: Engineering and Owner; Society IT supplies the final repository destination.

- [x] **P4-01 — LOCAL RECONCILIATION VERIFIED, 10 OCTOBER:** verified post-rewrite baselines/production alias, reviewed overlaps and selected 351 files with 24 intentional removals/exclusions. Fixed the isolated worker-runner test for private-storage startup; security/search/performance/worker regressions pass. Exact path/hash/mode selection recorded privately; dirty workspace, index and environment preserved. No exact deployed-source equivalence or committed release claimed. [Decisions and evidence](docs/handover/P4_SOURCE_RECONCILIATION.md#p4-01-reconciliation-decisions-10-october-2026). Assembly/publication and clean Linux verification remain P4-08/09.
- [x] **P4-02 — LOCAL CLASSIFICATION/EXCLUSIONS VERIFIED, 8 OCTOBER:** expanded Git/deployment exclusions for browser profiles, caches, private environment variants, local tooling and temporary output; source/examples retained. Untracked two generated OCR downloads from Git while retaining both files on disk. Exclusion checks passed; actual deployment inventory remains a staging check. [Scope and evidence](docs/handover/P4_SOURCE_RECONCILIATION.md).
- [ ] **P4-03 — LOCAL/CANDIDATE REVIEW COMPLETE; EXTERNAL LIMITS OPEN, 10 OCTOBER:** earlier password-only cleanup compared all 101 commits and changed only nine blobs, preserving tip trees/index/login/deployment. Read-only remote checks confirmed both cleaned branches and the retained old PR #1 ref. Current/history scans found no known credential values or Gitleaks findings; eight historical documentation flags classified. The exact P4-08 351-file archive also passed Gitleaks and raw-byte known-secret checks. External copies are not erased; rotation remains deferred under ADM-04. Retained PR/cached-copy follow-up and scans of later package changes remain open. [Evidence and limits](docs/handover/P4-03_SECRET_HISTORY_REVIEW.md).
- [x] **P4-04 — LOCAL LINT VERIFIED, 10 OCTOBER:** corrected root/web generated-build and vendored PDF-worker exclusions without weakening rules. Ordinary web lint passed; ordinary root lint passed all four tasks on the Windows host runner, then replayed all four cached logs successfully. Sandbox Turbo log-write failure is runner-specific; narrow escalation works without deleting caches or changing ACLs. [Verification and limits](docs/handover/P4-04_LINT_VERIFICATION.md). Clean Linux verification remains P4-09.
- [x] **P4-05 — LOCAL SETUP VERIFIED, 10 OCTOBER:** pinned tested Node 22.16.0/pnpm 10.33.0, documented native canvas/PDF.js/OCR requirements and retained React overrides. Bundled existing fonts with licenses/hashes; frozen offline install on the populated host store, runtime checks, real PDF/OCR, web build and English/Hindi browser checks passed. [Setup](SETUP.md) and [batch evidence](docs/handover/P4_BATCH1_REPRODUCIBILITY.md). Clean Linux remains P4-09; current Node/dependency security review remains P6-01.
- [x] **P4-06 — CONTRACT/INVENTORY VERIFIED, 10 OCTOBER:** all 18 active app/dev names documented and verified in Turbo strict-mode planning; env-file cache invalidation and isolated outputs covered. Read-only Vercel inventory records shared Preview/Production entries, missing dispatch/session/fallback configuration and retained legacy names. No hosted values/settings changed; actual configuration/isolation remains P2-08/P5-01/SB-06, session changes owner-deferred. [Evidence](docs/handover/P4_BATCH1_REPRODUCIBILITY.md).
- [x] **P4-07 — PROCEDURE/LOCAL MIGRATIONS VERIFIED, 10 OCTOBER:** explicit target/read-only default, checksummed ledger, reviewed baseline and atomic application implemented. Synthetic fresh/populated upgrades, FTS triggers/backfills, rollback and drift/target safeguards passed. Live read-only comparison matches all eight migrations (57 schema objects), but no live ledger was created. Adoption requires a fresh backup and reviewed release action. [Procedure](docs/handover/P4-07_MIGRATION_PROCEDURE.md) and [evidence](docs/handover/P4_BATCH1_REPRODUCIBILITY.md).
- [ ] **P4-08 — ASSEMBLY VERIFIED, PUBLICATION PENDING, 10 OCTOBER:** assembled all 351 selected files over sanitized remote main with 24 intentional removals/exclusions; hashes/modes and zero-finding candidate secret scan verified. Archive SHA-256 `b5cfcb3458c069eabb85ecc51132341f9cc25571ddf7a5267e7d4530c637ff5d`. No commit/push authorized by this batch; record the release commit when separately authorized and reconcile companion documentation updates. [Evidence](docs/handover/P4-08_09_CANDIDATE_VERIFICATION.md).
- [x] **P4-09 — CLEAN LINUX SOURCE VERIFIED, 10 OCTOBER:** fresh Ubuntu/WSL2 source extraction, pinned tools and empty pnpm store; frozen install, native canvas/PDF/English OCR, nine PDF security suites, migration/search/performance/worker regressions, root lint/cache replay, web types, cold root/web build and 13 production HTTP startup/auth checks passed. All 351 source hashes/modes unchanged. This is an exact uncommitted selected-source snapshot; future release commit must match it. Mobile build remains a placeholder; no hosted acceptance claimed. [Results and limits](docs/handover/P4-08_09_CANDIDATE_VERIFICATION.md).
- [ ] **P4-10 — IMPLEMENTED / LOCALLY VERIFIED, 10 OCTOBER; HOSTED RUN PENDING:** CI covers lint/types/build and isolated security/migration/search/worker/native OCR/HTTP/image tests without production mutation credentials. Production indexing remains manual-only. Fresh Linux run and workflow syntax validation passed; publish approved source and verify the first GitHub-hosted run before closure. [Evidence](docs/handover/P4-10_P6-01_CI_SECURITY_REVIEW.md).
- [ ] **P4-11** Synchronize the hosted worker to the approved release and verify the checkout actually used by GitHub Actions; document website and worker release coordination.

**Exit evidence:** clean-checkout build/test results, working CI, identifiable source release and migration state. Optional native-app completion is not implied by monorepo command success.

## Phase 5 — Complete indexing, admin workflows and content review

Lead: Engineering for workflows; Editorial for content decisions. Test in isolated staging first; Phase 9 repeats a bounded production acceptance fixture.

- [ ] **P5-01** Recheck the current dispatch configuration, privately configure the scoped `INDEXING_GITHUB_TOKEN` or the selected replacement connection, and verify the correct repository/branch/worker release. Follow [GitHub setup](GITHUB_INDEXING.md); do not expose tokens in evidence.
- [ ] **P5-02** Verify Admin Start with controlled English work, no-op behavior, concurrent starts, connection failures, ambiguous responses, run completion and a queue larger than one bounded batch. Preserve manual-only operation.
- [ ] **P5-03** Exercise a disposable issue through single/bulk upload, metadata/topics edit, draft/publish, cover replacement and PDF replacement; check correct assets, caches and search provenance after each change.
- [ ] **P5-04** Verify worker interruption/resume, retries, exhausted attempts, stale leases, changed-source fencing and reviewed text surviving an unchanged-source rebuild; ensure failed work does not destroy a valid prior index.
- [ ] **P5-05** Verify magazines, bulk issue actions, topic rename, CSV export, navigation create/edit/reorder/reset, settings, storage inventory and deletion with controlled fixtures. Check authenticated success and unauthenticated rejection; remove only fixture data/assets.
- [ ] **P5-06** Reconfirm the 17 flagged cover pages and review each individually with Editorial: save verified transcription or intentional exclusion with a note, then verify correct search inclusion/exclusion and page provenance.
- [ ] **P5-07** Validate and snapshot the existing 104-issue handover catalogue, checking titles, month/year, language, themes, topics, page counts, covers, PDFs and publication state. Additional ingestion and completing missing historical years are not handover requirements. Record future gaps only as receiving-team backlog; any voluntarily added English issues must be reflected in the final snapshot. Agnishikha ingestion remains on hold.
- [ ] **P5-08** Agree PDF/cover quality, source naming and delivery process with Hemlata Di through Dibyanshu; document who supplies, checks and publishes future batches.
- [ ] **P5-09** Confirm official print-subscription, feedback and problem-report destinations and their receiving owners; test approved links without inventing online subscription entitlements.
- [ ] **P5-10** Complete the English/Hindi promise review across admin, mobile and documentation; label the mobile app and future formats honestly and preserve the decision not to promise Hindi OCR.

**Exit evidence:** workflow test report, saved editorial decisions, agreed catalogue inventory and source-delivery procedure. Back up newly saved reviews and content; do not rely on the Phase 1 snapshot alone.

## Phase 6 — Complete security and product quality checks

Lead: Engineering; Society IT/Editorial review relevant acceptance results.

- [ ] **P6-01 — PARTIAL, 10 OCTOBER:** Node 22.23.3, Next 15.5.27, Turbo 2.9.14, PostCSS 8.5.23, Sharp 0.35.5 and source-map-js 1.2.2 passed cold Linux install and isolated CI. Audit has no web/shared/root findings; 96 native-only advisory records remain (107 metadata findings, including two critical). Resolve native dependency/tooling risk and the Next 15 maintenance horizon before closure. PDF.js v4/canvas and React overrides preserved. Windows installed tools/dependencies unchanged; follow SETUP.md. [Evidence](docs/handover/P4-10_P6-01_CI_SECURITY_REVIEW.md).
- [ ] **P6-02** Implement and verify shared or otherwise deployment-appropriate login-rate enforcement, trusted proxy IP handling, expired/tampered/signed session checks, secure cookies, session rotation and admin removal/offboarding. **Open security issue:** historically exposed live password; rotation deferred by owner under ADM-04 while Git history is cleaned. [P4-03 findings and owner decision](docs/handover/P4-03_SECRET_HISTORY_REVIEW.md).
- [ ] **P6-03** Review privileged APIs, cross-origin mutations, upload validation, object ownership and sensitive responses; test public draft/restricted metadata and search redaction alongside the Phase 2 delivery checks.
- [ ] **P6-04** Verify atomic read/download counters and that caching does not suppress or duplicate intended side effects. Record the current ZIP counting policy without adding unapproved behavior.
- [ ] **P6-05** Verify Home/Browse/Search/issue-detail flows: filters, sorts, pagination, result page links, literal/Unicode queries, empty/error states, back/forward navigation and cache freshness after mutations.
- [ ] **P6-06** Verify Bookmarks and reading history: save/remove, reload, missing/unpublished issues, empty state, browser-storage persistence/failure and the documented lack of cross-device sync.
- [ ] **P6-07** Verify full and embedded Reader on desktop and phone: navigation, swipe, zoom, spreads/snapping, search-result highlighting, close/reopen, loading/error recovery, downloads and access expiry under the new delivery model.
- [ ] **P6-08** Complete screen-reader, keyboard order/focus, dialog focus return, form labels/errors, contrast, zoom/reflow and touch-target checks, especially Reader and Admin; fix confirmed gaps.
- [ ] **P6-09** Measure Home, Browse, Search, issue detail, Reader and admin login in production-like conditions; record Lighthouse, JS budgets and representative network/device results in `AUDIT.md`. Do not equate bundle budgets with Lighthouse scores.
- [ ] **P6-10** Test agreed representative catalogue/traffic/upload/OCR workloads, including ZIP limits, worker memory/time, slow networks and failure recovery; document supported capacity and actionable limits.
- [ ] **P6-11** Resolve confirmed release-blocking defects and rerun affected regressions. Record any noncritical accepted exception with owner, impact and follow-up; do not silently mark it fixed.

**Exit evidence:** dated security and quality results against an identified release, no unresolved release blockers, and explicit ownership for accepted exceptions. Earlier passing tests may be reused only where subsequent changes do not invalidate them.

## Phase 7 — Prepare Society hosting and selected migrations

Lead: Society IT with Engineering. Depends on P0-04 and verified recovery/source. These are conditional implementation branches, not a requirement to move everything to DigitalOcean. Details: [migration plan](DIGITALOCEAN_MIGRATION.md).

- [ ] **P7-01** Finalize the target architecture, service owners, staging/production isolation, network paths, capacity and approved costs. Identify the single authoritative database and worker connection for each environment.
- [ ] **P7-02** Establish the Society-controlled repository and account/project access; update the hard-coded personal GitHub dispatch target and verify repository secrets, Actions permissions and token expiry/rotation.
- [ ] **P7-03** **If retaining a current provider:** complete the supported ownership/project transfer or controlled recreation under Society ownership; verify independent recovery/billing access and the intended runtime connections.
- [ ] **P7-04** **If moving the web host:** build and deploy the release on target Linux with native dependencies, supervised Node process, TLS/reverse proxy, writable caches, logs, graceful shutdown, health checks and startup/restart verification.
- [ ] **P7-05** **If moving the web host:** verify proxy/origin headers, secure sessions, multi-instance cache/rate-limit assumptions, image optimization, PDF ranges, request limits/timeouts and `after()` analytics behavior.
- [ ] **P7-06** **If self-hosting compatible libSQL/SQLite:** verify FTS5/JSON, foreign keys, concurrency, persistent storage and consistent backup/crash recovery. Provide secure worker access; a GitHub runner cannot use the Droplet's local database file directly.
- [ ] **P7-07** **If changing database engine:** port the current schema, repositories, FTS/search semantics, transactions, queue/leases/reviews and Python worker probe; implement and test a current-data export/import. Do not substitute the old Supabase schema or change only a connection string.
- [ ] **P7-08** **If moving R2 to Spaces or another store:** adapt endpoint, region/signing, presigned upload, URL/key handling, private delivery, CORS and replacement/deletion paths; copy objects with checksum verification and preserve source-review provenance.
- [ ] **P7-09** **If moving worker execution:** implement a secure manual dispatch path on the selected host, preserving bounded processing, leases, retries, checkpoints and visible progress. Do not enable the continuous systemd example unchanged.
- [ ] **P7-10** Rehearse all selected migrations on isolated staging; compare all records and object hashes, verify search/access/admin/worker behavior, measure time and rehearse rollback with post-cutover writes accounted for.
- [ ] **P7-11** Record final domain decisions. If activating `aimarchive.aurosociety.org` or an asset hostname, prepare DNS/TLS, CORS, cache policy, aliases, image allowlists and canonical/sitemap/robots updates. Otherwise record the accepted existing address and deferred work.
- [ ] **P7-12** If retiring/replacing the legacy AIM website, obtain the required decision from Kaushal Ji and Dibyanshu and prepare tested URL redirects/content coverage. Otherwise explicitly exclude legacy cutover from this release.

**Exit evidence:** Society-accessible target environment, selected-branch test/restore/rollback results, and documented not-applicable branches. Hosting, database, storage and worker choices may differ; record each separately.

## Phase 8 — Establish operations and finish the handover package

Lead: Society IT with Engineering and Editorial. Documentation can start early; final commands must work on the selected target.

- [ ] **P8-01** Put the proven backup process on Society-controlled storage and scheduling, with protected access, retention, integrity verification and failure alerts; migrate any interim private preservation copy appropriately.
- [ ] **P8-02** Add error reporting, uptime and backup/worker failure alerts with named recipients and a tested notification route. Distinguish expected manual-worker inactivity from a fault; optionally enable anonymous Web Vitals.
- [ ] **P8-03** Establish secret management, renewal/rotation reminders, restricted access, recovery access and spend/usage alerts across all retained services. Remove unused runtime credentials after verifying recovery-tool needs.
- [ ] **P8-04** Write and test operator steps for deploy, rollback, service restart, queue failure/retry, token expiry, broken/missing PDF, failed backup, restore and storage/capacity problems.
- [ ] **P8-05** Finalize the technical specification: exact release/lockfile, runtime/dependencies, schema/migration state, architecture, hosting, private asset delivery, domains, environment names and capacity limits.
- [ ] **P8-06 — DISCUSSION RECONCILIATION PREPARED, 10 OCTOBER:** current runtime/fonts, source/deployed boundaries, email status and recovery scope reconciled; [discussion index](docs/handover/SOCIETY_DOCUMENT_INDEX.md) links authoritative references. Final destination-specific guide/release reconciliation remains open; historical evidence stays dated.
- [ ] **P8-07 — DRAFT PREPARED, 10 OCTOBER:** [admin walkthrough and acceptance draft](docs/handover/ADMIN_WALKTHROUGH_AND_ACCEPTANCE_DRAFT.md) covers isolated upload, metadata, replacements, publication/restriction, indexing, cover review, retry and fixture deletion. Operator rehearsal on the selected release and receiving demonstration remain open.
- [ ] **P8-08 — DISCUSSION SET PREPARED, 10 OCTOBER:** [brief, inventory and document index](docs/handover/SOCIETY_DOCUMENT_INDEX.md) ready for owner review; nothing sent. Final transfer still needs identified source release, complete operating/evidence/notices package and controlled private recovery transfer. New documents postdate the scanned 357-file archive; refresh final package identity/scan before transfer.
- [ ] **P8-09** Review the package with the receiving team for missing instructions or access; assign every accepted ongoing task, including future archive ingestion and periodic restore/dependency review.

**Exit evidence:** working monitoring/backup alerts, tested runbooks, privately accessible backups/secrets and a complete, reviewed transfer package.

## Phase 9 — Release and verify the final production service

Lead: Engineering and Society IT; Owner coordinates the agreed release window. A host/database migration is not required if the retained environment is accepted.

- [ ] **P9-01** Review applicable phase gates, exceptions, target release and rollback triggers; confirm source/worker/schema/configuration alignment and production access before the release window. Existing Turso schema matches migrations 00001–00008 but has no ledger; rehearse and review the P4-07 baseline/adoption procedure after a fresh backup before any live migration work.
- [ ] **P9-02** Take a fresh consistent backup and asset delta. For migration, pause/drain admin and indexing writes and account for analytics writes; record the final source timestamp and one authoritative writer.
- [ ] **P9-03** Deploy the identified release and selected migrations/configuration. Switch routing/DNS only if selected; preserve protected rollback data and prevent conflicting writers.
- [ ] **P9-04** Verify production security at old and new origins: restricted/draft denial, released access, admin/worker access, sessions, search redaction, ranges and cache behavior.
- [ ] **P9-05** Run real desktop/phone production smoke checks for Home, Browse, Search, Bookmarks, issue detail, Reader/preview, downloads/ZIPs and navigation; verify HTTPS and canonical URLs where changed.
- [ ] **P9-06** Execute a disposable production admin fixture through upload/replacement/indexing/review/retry and agreed remaining mutations; compare catalogue/asset integrity afterward and remove only fixture records/assets.
- [ ] **P9-07** Verify alert delivery, automated backup and restore of the final production format; confirm actual worker source, credential expiry and receiving-team access.
- [ ] **P9-08** Observe for the period agreed in P0-06; record errors, performance, queue/storage/backup health and costs. Resolve blockers and repeat affected acceptance checks.
- [ ] **P9-09** Publish the final release/evidence record with commit/tag, deployment, schema state, backup manifest reference, test outcomes, exceptions and rollback steps. Update this tracker and technical documents.

**Exit evidence:** stable final service over the agreed observation period, successful production acceptance checks, current recovery evidence and a complete release record.

## Phase 10 — Independent acceptance and end of personal responsibility

Lead: Society IT and Editorial demonstrate; Owner records the agreed transfer.

- [ ] **P10-01** Society IT independently checks out, builds, deploys/restarts and rolls back the release using the runbook, without relying on the owner's machine or personal credentials.
- [ ] **P10-02** Society IT independently restores a backup and diagnoses a simulated operational failure; demonstrate that monitoring and recovery work for them.
- [ ] **P10-03** The receiving admin/editor independently uploads and corrects an issue, publishes it under the release policy, runs manual indexing and resolves a review/retry using the walkthrough.
- [ ] **P10-04** Verify Society ownership/recovery/billing of all production dependencies and notification/contact destinations; confirm who maintains content, code, backups and incidents.
- [ ] **P10-05** Obtain written acceptance identifying the delivered release, archive scope, evidence, accepted limitations, ongoing owners, effective responsibility-transfer date and any explicitly finite transition support.
- [ ] **P10-06** After independent access and acceptance, rotate inherited secrets, invalidate old sessions and revoke departing personal access/service tokens; verify continuity with Society credentials and update private recovery records.
- [ ] **P10-07** Close personal billing/alerts/automation dependencies and record transfer completion. Retire old services or backups only after the agreed retention period and separate retention decision; assign any later retirement to Society IT.
- [ ] **P10-08** Record the final closure statement and date: responsibility has transferred, outstanding optional work belongs to named receiving owners, and no indefinite personal maintenance commitment remains.

**Exit evidence:** signed acceptance, successful independent demonstrations, completed credential/access transition and a recorded end date. Optional future features do not prevent closure when explicitly excluded from the accepted scope.

## Deferred product and capacity backlog

These tasks are excluded from handover completion unless explicitly selected in P0-02. Promote a selected item into the appropriate phase with an owner and acceptance criteria. Domain/asset-host choices are tracked once in P7-11, legacy cutover in P7-12, and the font-build choice in P4-05; previous deferrals remain in force until a decision changes them.

- [ ] **D-01** Add curated collections only after approved selections and a named editorial maintainer exist.
- [ ] **D-02** Add a file-backed/server-streaming ZIP path if batches above the current safe 50 MiB limit are needed.
- [ ] **D-03** Persist OCR highlight coordinates across document reloads when measured usability/cost warrants it.
- [ ] **D-04** Queue fallback thumbnail generation durably if current upload behavior fails agreed workload requirements.
- [ ] **D-05** Paginate storage inventory when catalogue/object growth warrants it.
- [ ] **D-06** Decide whether ZIP downloads should count toward download totals; implement successful-file counting if selected.
- [ ] **D-07** Add batch topic editing if needed for ingestion.
- [ ] **D-08** Add within-reader search and navigation; archive-wide indexed search and result highlighting already work.
- [ ] **D-09** Add optional public sign-in and cross-device bookmarks/history/preferences while preserving local data.
- [ ] **D-10** Validate and implement EPUB/other format conversion after representative English/Hindi quality checks.
- [ ] **D-11** Add admin-controlled public analytics visibility and useful admin charts/search insights when reporting needs are defined.
- [ ] **D-12** Build out Expo: missing assets, archive/reader flows, offline Library/storage, notifications and Android/iOS release testing. Do not infer mobile readiness from its placeholder build script.
- [ ] **D-13** Consider approved About/support/sibling-publication links, article/author/topic pages, citations, related content, reading-time labels and other `vision.md` ideas only against an explicit editorial/product requirement. **Dynamic Pages is excluded from the planned handover by owner decision on 8 October 2026**; it is not implemented by Navigation Management and is not a promise of later work by the departing owner.
- [ ] **D-14** Consider onboarding, historical highlights, annotations, reflow/dark reading, preservation mirrors and additional-language/font QA only when selected; change search engines only if measured FTS5 results justify it.

## Decision register

Update these rows when decisions are made. A pending choice is not authorization for spending, service changes or external communications.

| Decision | Status | Owner or task | Record |
|---|---|---|---|
| Delivery scope and archive cutoff | Owner decision settled; Society acknowledgement pending | P0-02, P0-03 | Existing 104 issues accepted by owner; no additional upload batch required. Any further uploads focus on English AIM; Agnishikha paused, existing issues retained. Dynamic Pages excluded. |
| Named receiving owners | Owner proposes Dibyanshu Ji; Society confirmation pending | P0-01 | Handover will be coordinated with Dibyanshu Ji unless Kaushal Ji prefers another recipient or additional participants. This does not assign all ongoing technical/editorial/billing responsibilities to Dibyanshu Ji or imply acceptance. |
| Web, database, storage and worker hosting | Pending Society IT decision | P0-04, P7-01 | DigitalOcean is an option; current Turso/R2 need not move with the web host |
| Prelaunch and operational expectations | Public uptime targets not needed for current preparation | P0-05 | Not officially launched. Preserve existing data and control spending now; receiving team to confirm practical recovery/retention/cost ownership before launch/transfer. |
| Initial workspace backup destination | Approved by owner, 2026-10-08 | P1-01 | Dated private subfolder under `D:\AIM (Project Directory)`; same-drive recovery copy, not protection from drive failure |
| Private PDF delivery design | Implemented and locally tested; hosted verification pending | P2-01–08 | Five-minute public R2 grants, authenticated admin streaming, separate cover routes; [design and tradeoffs](docs/handover/P2-01_PRIVATE_PDF_DESIGN.md). Deployment and old-origin denial still required. |
| Website and asset domains | Setup/spending remain deferred | P7-11 | Preferred website: aimarchive.aurosociety.org; asset hostname undecided |
| Legacy website cutover | Deferred pending required approval | P7-12 | — |
| Observation period and transfer date | Pending agreement; no hard cutoff | P0-06, P10-05 | Owner tentatively prefers clearing personal resources around the beginning of 2027 after acceptance/transition; no automatic shutdown date. Retained private GitHub source repository is an exception. |
| Service ownership and ongoing operations | Owner clarified, 8 October 2026 | P0-07 service steps | Vercel/Turso and legacy Supabase belong to owner; R2 belongs to Society. GitHub retained privately by owner. Society selects future admin, backup/monitoring and domain operations; receiving access still needs verification. |
| Separate R2 backup during preparation | Excluded by owner, 8 October 2026 | P1-03 | Owner relies on Society-owned live storage and available originals for re-upload. No independent object backup certified; adjust dependent verification scope accordingly. |
| Official launch target | Owner's aspiration; not an agreed deadline | P0-06, P9-01 | 24 November 2026, Siddhi Day centenary; subject to Society guidance and readiness/testing. This is not automatically the responsibility-transfer date. |
| Accepted noncritical exceptions | None recorded for handover | P6-11, P10-05 | Record impact, receiving owner and decision; never silently close |

## Completion and evidence log

Append a row when a task is completed or a conditional branch is formally excluded. Use private references for sensitive evidence. The October audit is a baseline, not completion of the new implementation tasks.

| Task ID | Date | Responsible person | Environment and release | Evidence and result |
|---|---|---|---|---|
| P3-02/03 | 2026-10-13 | Codex, authorized by project owner | Fresh configured Turso read snapshot; private offline Windows restore | [Recovery evidence](docs/handover/P3_LOCAL_RESTORE_2026-10-13.md): all 31 tables/schema matched, integrity/FK/FTS passed; seven safeguard tests passed, offline restore/verification 2.360 seconds. Full application/storage/receiving recovery remains open. |
| P4-08 / P8-08 source readiness only | 2026-10-13 | Codex, authorized local preparation | 365-file isolated source candidate; no publication | `.cache/readiness-2026-10-13-final/verification.json` records final package checks. Prior assembly passed zero-finding Gitleaks/known-secret scans and 167 local links; all 307 previously tested non-Markdown files unchanged, two new Python restore tools tested. Every present nonignored Git candidate path included. Index/private environment preserved. Push-trigger inspection, commit/push and receiving access remain separate. |
| P0-07 / P8-06/07/08 discussion preparation only | 2026-10-10 | Codex, authorized by project owner | Local documents; no application/hosted changes | [Discussion package](docs/handover/SOCIETY_DOCUMENT_INDEX.md): four receiving discussion documents; current specification/context/tracker/source-reference corrections. Link/secret and protected-file verification recorded in `.cache/society-discussion/verification.json`. Final operator rehearsal, operational package, source publication and receiving acceptance remain open. Nothing sent. |
| Baseline only | 2026-10-08 | Project audit | Local workspace; configured remote DB/R2; focused production HTTP checks | [Assessment](HANDOVER_ASSESSMENT_2026-10-08.md) and [verification record](TECHNICAL_SPECIFICATION.md#verification-record); no handover phase declared complete |
| P1-01 | 2026-10-08 | Codex, authorized by project owner | Local workspace HEAD `8aad9b8`; observed remote main `7d73dce`; documented September 19 deployment | [Preservation evidence](docs/handover/P1-01_WORKSPACE_PRESERVATION.md): 7,627 files verified in private dated same-drive copy; remote database/object backups remain open |
| P1-02 | 2026-10-08 | Codex, authorized by project owner | Configured remote Turso, captured 13:18:13–13:18:27 IST | [Database backup evidence](docs/handover/P1-02_TURSO_BACKUP.md): all 31 tables/schema matched remote read snapshot, standalone offline backup verified, integrity/FK/FTS checks passed; R2 and full application recovery remain open |
| SB-03/04/05 | 2026-10-08 | Codex, authorized by project owner | Local workspace; isolated tests; read-only current catalogue check | [Cleanup evidence](docs/handover/SB-04_CLEANUP_2026-10-08.md): 96-file private preservation verified; obsolete integration removed; frozen install/build/types/source lint and affected regressions passed. No deployment or remote retirement. |
| P2-05 | 2026-10-08 | Codex, authorized by project owner | Local source; isolated libSQL/fake R2; production build and synthetic admin browser | [Private maintenance evidence](docs/handover/P2-05_PRIVATE_MAINTENANCE.md): authenticated maintenance/worker reads, source-fenced direct replacement, passing regressions and draft-preview browser check. Hosted credentials, CORS and coordinated deployment remain open. |
| P2-06 | 2026-10-08 | Codex, authorized by project owner | Local source and isolated production-mode Next server | [Route retirement evidence](docs/handover/P2-06_LOCAL_PDF_ROUTE_RETIREMENT.md): no workspace-file access; handler regressions, 16 HTTP checks and production build passed. No live deployment/cache changes. |
| P2-07 | 2026-10-08 | Codex, authorized by project owner | Local synthetic fixtures, isolated databases and mocked storage | [Security regression matrix](docs/handover/P2-07_SECURITY_REGRESSION_MATRIX.md): nine-suite gate passed; affected suites rechecked after final additions. Origin verifier prepared/self-tested only; no live origin certification. |
| P4-02 | 2026-10-08 | Codex, authorized by project owner | Local Git index, retained workspace files and ignore-rule tests | [Classification evidence](docs/handover/P4_SOURCE_RECONCILIATION.md): private/generated artifacts excluded; two OCR cache files untracked but retained byte-for-byte; exclusion checks passed. No commit, push or deployment. |
| P4-03 local review only | 2026-10-10 | Codex, authorized by project owner | Dirty Windows candidate at HEAD `4c02a99`; read-only remote refs | [Suitability review](docs/handover/P4-03_SECRET_HISTORY_REVIEW.md#local-suitability-review-10-october-2026): current/history scan has no new credential findings; eight documentation flags classified; package exclusions verified and stale scope notes corrected. Overall task remains open for external PR/copy limits and final assembled-package scan; login retained. |
| P4-04 | 2026-10-10 | Codex, authorized by project owner | Dirty Windows candidate at HEAD `4c02a99`; host runner for Turbo/build | [Lint evidence](docs/handover/P4-04_LINT_VERIFICATION.md): web lint, all four root tasks, cache/log replay and web production build passed. Generated/vendor exclusions verified; no rules weakened. Linux reproducibility remains P4-09; no source release/deployment. |
| P4-05/06/07 | 2026-10-10 | Codex, authorized by project owner | Dirty Windows candidate at HEAD `4c02a99`; synthetic local DB/PDF/browser; read-only hosted inventories | [Batch evidence](docs/handover/P4_BATCH1_REPRODUCIBILITY.md): frozen install, bundled fonts, native PDF/OCR, web build/root lint, 18-name Turbo configuration checks and migration regression suite passed. Live schema matches eight migrations but ledger adoption remains unperformed. No credential changes, source publishing or deployment. |
| P4-01 | 2026-10-10 | Codex, authorized by project owner | Dirty Windows candidate at HEAD `4c02a99`; origin `e4d860f`; unchanged production alias | [Reconciliation evidence](docs/handover/P4_SOURCE_RECONCILIATION.md#p4-01-reconciliation-decisions-10-october-2026): reviewed selection of 351 files/24 removals, runner-test correction, nine PDF security suites and search/performance/worker checks passed. Fingerprint `e83456f0abdf`; index/private environment unchanged. Isolated assembly, clean Linux and final package scan remain open. |
| P4-08 assembly / P4-09 | 2026-10-10 | Codex, authorized by project owner | 351-file archive `b5cfcb3458c0`; fresh Ubuntu 26.04 x64/WSL2 task directory, Node 22.16.0 / pnpm 10.33.0 | [Candidate evidence](docs/handover/P4-08_09_CANDIDATE_VERIFICATION.md): zero-finding scan, cold frozen install, native PDF/OCR, security/migration/search/worker checks, lint/cache replay, types, build/budgets and 13 startup/auth checks passed. Original index/environment and all selected Linux source bytes/modes preserved. No commit/push/deploy; publication and hosted gates remain open. |

Progress note, 8 October 2026: reviewed the owner's five-page June 29 correspondence PDF and prepared the [handover email draft](docs/handover/HANDOVER_EMAIL_DRAFT.md). The owner reports that the Society has not yet been informed of the intended withdrawal from ongoing responsibility. Earlier correspondence prioritised archive ingestion and discussed future enhancements; the draft asks for an agreed transition scope rather than presuming those commitments or all historical uploads are complete. P0-01 remains open. The reference PDF includes historical login credentials; do not reproduce them in outgoing mail or shared documents, and verify rotation under P6-02/P8-03. No message was sent. This newly supplied PDF and email draft postdate the P1-01 recovery snapshot.

Correspondence follow-up, 8 October 2026: [checked Dibyanshu Ji's requests](docs/handover/DIBYANSHU_REQUEST_REVIEW.md) against current source and operating records. Expanded search and Navigation Management are implemented; issue actions were reorganised but the specific Edit-button wrapping fix has not been freshly verified across viewports. Dynamic Pages and full historical ingestion are not complete. Updated the draft's opening accordingly; no email sent and no implementation checkbox closed.

Final draft review, 8 October 2026: preserved the owner's wording edits and clarified the 102 English / 2 Hindi catalogue split, current English-only upload focus, paused Agnishikha ingestion and exclusion of Dynamic Pages from planned handover. The draft is ready for the owner to send to Kaushal Ji, copying Dibyanshu Ji. No email sent; Society acceptance remains pending.

Recipient clarification, 8 October 2026: owner selected Dibyanshu Ji as intended handover contact, inviting Kaushal Ji to suggest alternatives/additional participants. Removed the contact-nomination question and moved hosting selection into a discussion with Society IT during handover. Scope and acceptance/timing remain the two questions in the draft. No email sent.

Closing clarification, 8 October 2026: added the owner's explanation that office projects and other commitments limited availability over the last two to three months, prompting recognition of the need for institutional/team support. Further assistance is offered subject to availability, without undoing the transfer of ongoing responsibility. Recorded the hoped-for official launch on 24 November 2026 as an aspiration, not an agreed deadline or waiver of readiness checks. Siddhi Day's 24 November 1926 date is documented by the [Sri Aurobindo Ashram](https://www.sriaurobindoashram.org/darshan/dates.php). No email sent.

Communication update, 8 October 2026: the owner reports that the email has now been sent. Added the required operational responsibility table to Phase 0. No reply, institutional acceptance or final role allocation has been reported; P0-01 remains open. The stored draft is retained as preparation evidence, not an independently verified copy of the sent message. Earlier "not sent" notes describe the drafting history.

Scope clarification, 8 October 2026: owner confirms the website is not officially publicly launched and accepts current archive coverage for handover. No additional issues or complete historical ingestion are required. Simplified P0-05 so a detailed uptime agreement does not block prelaunch preparation; data preservation, backup/recovery verification and cost ownership still apply. The already-sent email preparation file is unchanged; this clarification supersedes its open archive-batch question for future planning.

Service planning update, 8 October 2026: recorded ownership clarifications and ordered VT/R2/GH/ADM/BM/SB/FORM/DNS steps under P0-07. Society-dependent actions remain open. No hard personal-resource cutoff was requested; beginning of 2027 is a tentative preference. Local Supabase inventory completed; read-only remote schema/bucket inspection failed at DNS resolution, so remote status and preservation requirements are unresolved. No services, accounts, credentials, repository visibility or application code changed in this planning step. Google Form replacement under the receiving account is the proposed path if its account type prevents direct transfer.

Feedback update, 8 October 2026: owner reports completing editor sharing and asking Dibyanshu Ji to create a copy under his account. Remaining form setup/management is delegated to Dibyanshu Ji; no further owner sharing action is needed now. Copy ownership, response preservation and replacement website links remain unverified and open under FORM-02/03/04.

Legacy status update, 8 October 2026: owner confirms Supabase is paused. Status uncertainty is resolved; contents and preservation remain open under SB-02/03. Check available dashboard backup/Storage downloads first, or temporarily resume for read-only inventory/export if downloads are unavailable. The current website uses Turso/R2 and does not need this legacy service resumed for normal operation.

Legacy preservation update, 8 October 2026: owner reports downloading Supabase Storage objects; downloadable database backups are unavailable. Download not yet inspected because its path is unknown. Rehashed all nine files in the existing 27 May application-table export and checked row counts against its manifest; all matched. Latest paused database contents remain unknown, so legacy retirement and cleanup are not marked complete.

Database preservation update, 8 October 2026: completed P1-02 in `D:\AIM (Project Directory)\P1-02_turso_2026-10-08_131813_IST`, verified file and manifest hashes plus restricted ACLs. Owner supplied the legacy Storage path and prefers keeping Supabase paused; current Turso is authoritative. Owner questioned R2 backup necessity; P1-03 remains pending discussion, not complete or waived. No remote writes, deployments, account changes or asset deletions were performed.

Legacy Storage verification, 8 October 2026: read-only inspection of the owner's downloaded folder passed file hashing, image decoding and rendering of all 516 pages across nine PDFs. All 16 historical Supabase references are covered; two additional March 2026 Hindi assets retained. Source files unchanged; Supabase remained paused and no R2 access/change occurred. Per-file evidence is in `docs/handover/SUPABASE_STORAGE_VERIFICATION_2026-10-08.json`. Owner explicitly excluded the separate R2 backup; P1-03 now not applicable rather than pending discussion.

Local integration cleanup, 8 October 2026: SB-03/04/05 completed with private preservation, active dependency/config/code/docs cleanup, replacement asset guards and passing scoped verification. No deployed service or remote resources changed. SB-06 remains open for coordinated hosted-secret cleanup and eventual account retirement. Existing historical evidence remains dated; completed local checks do not complete the broader release or security phases.

## Current work and blockers

- **Current, 13 October:** Society acceptance reported; owner continues participating. Immediate priority is complete source through Git. P3-02/03 offline recovery verified; app/assets/receiving demonstration remains open. P6-01 support review prepared; native tooling and Next migration remain release work. No commit/push/deployment/access invitation made in this readiness review. Earlier acceptance-pending and departure assumptions are superseded by the owner's update; detailed operating roles remain open.

- **Discussion preparation, 10 October:** [Society package](docs/handover/SOCIETY_DOCUMENT_INDEX.md) provides a brief, decision/service inventory, supporting-document index and draft admin/acceptance walkthrough. P0-07/P8-06/07/08 progress only; no new receiving owner, accepted exception, restore demonstration or final transfer completion is claimed. Nothing sent. Remaining dependency/security and local recovery work can continue independently.
- **Current, 10 October:** P4-10 CI preparation and compatible P6-01 patches passed fresh Linux verification. [Evidence and remaining risks](docs/handover/P4-10_P6-01_CI_SECURITY_REVIEW.md). First hosted CI execution, native dependency risks and framework support planning remain open. Commit/push remains separate; rescan subsequent package changes. P4-03 old PR/external-copy exposure remains unresolved; rotation stays deferred under ADM-04. P2-08/09 await Dibyanshu Ji's Cloudflare work and isolated staging; request pending/unsent. Original index/environment preserved. No live schema/ledger change, source publication or deployment occurred. SB-06 waits for coordinated deployment/account decision.
- **Active implementation:** P0-01 email sent by owner; Society response pending. All five applicable Phase 1 tasks complete; P1-03 explicitly excluded by owner. SB-03/04/05 verified locally. Phase 2 PDF security and Phase 3 application/database restore remain open with revised asset scope.
- **External decisions needed:** named Society owners, target hosting, independent Society backup destination, recovery/acceptance targets and dates. Initial same-drive workspace destination is approved; this is separate from durable independent backup.
- **Progress reporting:** report completed IDs with evidence, the current task, any concrete blocker and the next phase gate. Count applicable verified tasks separately from not-applicable and deferred tasks; avoid a misleading whole-project percentage.
