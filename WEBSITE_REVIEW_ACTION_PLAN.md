# AIM Archive — Website Review Action Plan

Approved: 6 September 2026  
Last updated: 6 September 2026  
Status: UI review verified locally — 22/23 complete; search indexing follow-on — 6/6 implemented and verified locally
Delivery owner: Codex with the project owner  
Related tracker: [TO DO LIST.md](TO%20DO%20LIST.md)

## Objective

Make the archive's promises accurate and help visitors find something they can read quickly, while preserving its warm spiritual identity and five-year public-access policy.

This is the authoritative checklist for the approved website review work. The main To Do List links here; detailed statuses should be maintained here rather than duplicated across documents.

## Progress dashboard

Only numbered delivery tasks count toward completion. Checking an acceptance criterion does not add a separate completed task.

| Milestone | Delivery tasks | Completed | Status |
|---|---:|---:|---|
| Pass 1 — Accuracy and mobile usability | 8 | 8 | Verified locally |
| Pass 2 — Search reliability | 7 | 7 | Verified locally |
| Pass 3 — Discovery and reading polish | 8 | 7 | Verified locally; curation deferred |
| **Total** | **23** | **22** | **22 / 23 complete; 1 deferred** |

**Current status:** SI-01–SI-06 are implemented and verified locally. The supported-English rebuild and final coverage checks passed; durable ingestion jobs, progress and retries are implemented. Production web/worker deployment remains a separate release step; P3-07 remains deferred by the owner.
**Remaining inputs:** Approved curated selections and a maintainer; a verified official print contact destination before adding that link.  
**Deployment status:** Application code has not been deployed. Rebuilt search indexes have been applied to the remote database; this completed data operation is separate from application deployment.

## Tracking rules

- Task states: Planned → In progress → Verified locally → Deployed. Use Deferred for an explicit scope postponement. Use Blocked only with a specific dependency and an unblocking action.
- A task checkbox means its implementation and acceptance criteria are verified locally. Deployment is tracked separately in the release log.
- At the start of work, record the active task ID and set its status to In progress. Update its evidence and dashboard when finished.
- Record relevant file links, test/check results, and remaining limitations in the evidence log. Attach a commit or deployment reference when one exists; never invent one.
- Update this document in the same change as the implementation. Do not mark a task complete because code was written without verification.
- Keep unrelated dirty work intact. Follow the repository's required build and editing workflows.
- Complete each pass with its verification task before moving on, except for independent work that helps resolve a documented dependency.
- Changes to scope or policy go in the decision log. The approved scope does not need repeated approval for routine implementation choices.

## Baseline and agreed constraints

Review basis: supplied public-facing AI review, independent code assessments, local homepage inspection, and local public API checks on 6 September 2026. This is not a full production or security audit.

- Local public API returned **94 readable editions** and **104 publicly listed editions including locked ones**. These are dated observations, not constants to place in the UI or counts of the entire physical collection.
- Homepage hardcodes 850+ issues, 35+ years, and six languages; it also advertises EPUB/MOBI and unconditional free access.
- The "Now open" shelf selects a readable year but includes locked months within that year.
- Search reproduces the supplied examples. Missing locked excerpts are intentional; indexing completeness remains unmeasured.
- Search metadata matches currently receive page 1 and a full-text label. Query/filter state is not URL-backed.
- Mobile hero spacing and fixed reading-shortcut positioning support the reported concerns; exact collision must be reproduced at a real mobile viewport.
- Current runtime work targets Turso/libSQL and R2. Older Supabase architecture notes are historical context.
- Preserve the five-year embargo, including the existing IST release boundary. Do not add digital subscriber access or suggest that it exists.
- Preserve colours, spiritual identity, canonical magazine/date titles, and the useful reading experience. Refine hierarchy and presentation.
- No unsupported language, archive-completeness, format, or pending-digitisation promises.

## Pass 1 — Accuracy and mobile usability

### P1-01 — Correct the readable homepage shelf

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: None

Filter to published, non-embargoed issues with usable PDF references before sorting and limiting the reading shelf. Keep recent restricted editions in the existing subscriber section. Make sort labels reflect the actual ordering; distinguish issue date, upload date, and public release date.

Acceptance:

- [x] Every item under an open/readable heading can enter the public reader.
- [x] Locked later months cannot displace readable months in the same year.
- [x] Empty readable results have a useful fallback; year/magazine controls retain correct semantics.
- [x] Month rollover follows the shared IST policy, including homepage featured-month selection.

Primary files: `apps/web/src/components/home/animated-bookshelf.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/lib/db/public-repository.ts`, `apps/web/src/lib/embargo.ts`.

### P1-02 — Correct public promises and collection statistics

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: None

Audit homepage, footer, public metadata, and other public copy for universal access, complete-archive, format, and language promises. Replace hardcoded catalogue figures with appropriately scoped data or remove unsupported claims. Reconcile the language-copy audit already requested in the main To Do List.

Acceptance:

- [x] Explain free public access after five years without implying online subscriber unlocks.
- [x] Counts use documented definitions consistent with Browse, excluding drafts and unusable legacy assets as appropriate.
- [x] Language claims reflect the represented collection; future editions are not promised.
- [x] No invented physical-inventory or pending-digitisation totals.
- [x] Empty/error states do not substitute misleading marketing numbers.

Primary files: `apps/web/src/app/home-client.tsx`, `apps/web/src/components/layout/footer.tsx`, public page metadata, public repository helpers.

### P1-03 — Show only available download formats

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: None

Remove unavailable EPUB/MOBI badges and coming-soon promises from current download presentation. Render actions from available, permitted assets; preserve existing PDF download behaviour.

Acceptance:

- [x] A PDF-only issue shows only PDF availability.
- [x] Missing formats do not appear as usable choices.
- [x] Available format actions work and respect access restrictions.

Primary file: `apps/web/src/app/issue/[id]/issue-detail-client.tsx`; inspect relevant APIs if exposing additional file actions.

### P1-04 — Compact the mobile introduction and prevent action overlap

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: None

Reduce mobile hero spacing and heading footprint while keeping its visual identity. Move mobile resume access into normal navigation or a reserved layout area. Avoid an empty floating shortcut competing with primary actions.

Acceptance:

- [x] Validate at 360px, 390px, and 430px CSS viewport widths, including a short viewport.
- [x] Browse/Search actions remain visible, tappable, and free from horizontal clipping or overlays.
- [x] Check fresh history, existing reading history, returning from the reader, and open/closed resume UI.
- [x] Desktop composition and access to reading history remain intact.

Primary files: `apps/web/src/app/home-client.tsx`, `apps/web/src/components/layout/continue-reading-fab.tsx`, `apps/web/src/components/layout/header.tsx`.

### P1-05 — Simplify locked notices and provide a readable next step

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: None for readable fallback; contact link deferred as documented in P3-05

Use a concise explanation and release month/year. Keep precise release logic internally. Add a clear route to readable editions, preserving useful magazine/topic context. Align issue-detail and direct-reader locked states.

Acceptance:

- [x] Locked pages offer a clear Read available editions action.
- [x] Duplicate timezone boxes and distant-release auto-refresh prose no longer dominate the page.
- [x] Restricted content remains inaccessible; boundary refresh behaviour still works.
- [x] No claim that a subscriber can log in or unlock a digital copy.

Primary files: `apps/web/src/app/issue/[id]/issue-detail-client.tsx`, `apps/web/src/app/read/[id]/page.tsx`.

### P1-06 — Make Search actions accessible without hover

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: None

Ensure Read/View details and essential input controls are discoverable on touch and keyboard, with useful accessible names.

Acceptance:

- [x] Primary result actions remain visible on touch layouts and keyboard focus.
- [x] Clear-search control has an accessible label; focus states are visible.
- [x] Readable and locked results route to their correct destinations.

Primary files: `apps/web/src/components/search/search-result-item.tsx`, `apps/web/src/app/search/search-client.tsx`.

### P1-07 — Explain bookmark persistence

- [x] **Task complete** — Priority: Medium · Status: Verified locally · Dependencies: None

Add concise disclosure: bookmarks are saved in this browser and are not synced across devices. Check related history language for consistency.

Acceptance:

- [x] Disclosure is visible near the bookmark introduction or relevant help.
- [x] Saving, removing, and restoring bookmarks after reload still work.
- [x] No new registration requirement or synchronization promise.

Primary files: `apps/web/src/app/bookmarks/bookmarks-client.tsx`, `apps/web/src/lib/bookmarks-store.ts`.

### P1-08 — Verify Pass 1 and prepare release evidence

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: P1-01 through P1-07

Acceptance:

- [x] Focused checks cover readable/locked/draft selection and before/at/after IST release boundaries.
- [x] Smoke-test homepage → Browse → readable issue → reader → resume, plus a locked issue route.
- [x] Capture representative desktop/mobile evidence and test keyboard access to changed actions.
- [x] Run repository-required checks, including `pnpm.cmd build` from `apps/web`, and record outcomes.
- [x] Update dashboard, evidence, decisions, and release readiness. Record deployment only when it actually occurs.

## Pass 2 — Search reliability

### P2-01 — Make query and filters shareable through the URL

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: None

Acceptance:

- [x] Initialize and update query, magazine, year range, and availability from URL parameters.
- [x] Refresh, shared links, and browser Back/Forward restore the expected search.
- [x] Debounced typing does not flood browser history or create request loops.
- [x] Preserve the Next.js server-wrapper/Suspense requirements for URL-reading client components.

Primary files: `apps/web/src/app/search/page.tsx`, `apps/web/src/app/search/search-client.tsx`.

### P2-02 — Add server-side Read now filtering

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: P2-01 for URL integration

Default the public reading path to readable results, with an explicit way to include restricted catalogue entries. Apply filtering to both page-text and metadata queries before limits and result counts.

Acceptance:

- [x] Availability is validated and passed consistently through UI, API, and repository queries.
- [x] Read now cannot show restricted results; inclusive search still identifies locked results clearly.
- [x] Empty states explain the active scope and offer an appropriate recovery action.

Primary files: `apps/web/src/app/api/search/route.ts`, `apps/web/src/lib/db/search-repository.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/validations.ts`.

### P2-03 — Describe why results matched accurately

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: None

Introduce explicit match provenance and nullable page numbers. Distinguish title, theme, topic, description, and page-text results. Remove blanket full-text classification for metadata-only results.

Acceptance:

- [x] Metadata matches never imply that text was found on page 1.
- [x] Page-text results open the actual matched page.
- [x] Locked results explain their match using allowed metadata or a neutral explanation, without restricted excerpts.
- [x] Counts clearly identify whether they represent returned matches or distinct issues; capped results are not presented as exhaustive totals.

Primary files: search API, search repository, API types, Search client, Search result component.

### P2-04 — Prevent stale results and show recoverable errors

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: None

Acceptance:

- [x] Cancel or disregard outdated requests so only the current query can update results/loading state.
- [x] Clearing the query during an active request leaves an empty search state.
- [x] Failed requests show a useful error/retry path rather than stale results or a false No results message.
- [x] Rapid typing, filter switching, delayed responses, and failed responses are verified.

Primary files: `apps/web/src/app/search/search-client.tsx`, `apps/web/src/lib/api.ts`.

### P2-05 — Measure indexing coverage and record a repair decision

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: Read-only database access

Audit distinct indexed pages, nonempty text, expected page counts, and anomalies by issue/language. Treat unknown page counts separately. Keep restricted text out of public reports.

Acceptance:

- [x] Save an aggregate coverage report with audit date, scope, and definitions.
- [x] Identify unindexed, partially indexed, empty-text, and suspicious page-number cases without assuming every blank page is defective.
- [x] Record structural text-quality indicators and actual FTS/fallback behaviour, explicitly stating when public indexed text is unavailable for quality sampling.
- [x] Replace unverifiable "every page of every issue" search copy with accurate wording.
- [x] Record targeted repair tasks if needed; do not bulk-reindex or replace the engine solely because one query returned little.

Deliverable: linked Markdown coverage report and any follow-up task IDs. Actual repairs are additional measured work, not silently included in this audit checkbox.

### P2-06 — Make suggested topics useful and consistent

- [x] **Task complete** — Priority: Medium · Status: Verified locally · Dependencies: P2-02, P2-03; use P2-05 findings

Acceptance:

- [x] Replace or filter hardcoded suggestions using available content or maintained editorial selections.
- [x] Suggested topics lead to useful results in the active availability scope.
- [x] Use consistent magazine/topic names across discovery surfaces.
- [x] Preserve a clean empty state when no suitable suggestions exist.

Primary file: `apps/web/src/app/search/search-client.tsx`; shared topic/navigation helpers as appropriate.

### P2-07 — Verify Pass 2 with representative searches

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: P2-01 through P2-06

Acceptance:

- [x] Exercise Surrender, animals, Divine Grace, nonsense input, and representative Hindi content where indexed data exists.
- [x] Cover metadata-only, page-text, mixed, locked, zero-result, error, and limited-result cases.
- [x] Verify URL restoration, request ordering, scope filtering, snippet sanitization, and match-page navigation.
- [x] Run appropriate automated checks and the required build; record evidence and remaining coverage limitations.

## Pass 3 — Discovery and reading polish

### P3-01 — Strengthen theme hierarchy and simplify public cards

- [x] **Task complete** — Priority: Medium · Status: Verified locally · Dependencies: None

Acceptance:

- [x] Themes help readers choose an issue; magazine/date remain clear supporting metadata.
- [x] Canonical generated titles remain intact; issues without themes have a good fallback.
- [x] Check long English/Hindi themes, grid/list layouts, and mobile widths.
- [x] Remove low-value public read counters from discovery presentation while retaining internal analytics.

Primary files: `apps/web/src/components/magazine/issue-card.tsx`, `apps/web/src/components/browse/issue-list-view.tsx`, issue detail and homepage cards.

### P3-02 — Consolidate availability controls

- [x] **Task complete** — Priority: Medium · Status: Verified locally · Dependencies: None

Acceptance:

- [x] One authoritative availability control is visible per Browse layout; remove simultaneous duplication in tabs and filters.
- [x] Shared state, URLs, counts, filter reset, and responsive transitions remain consistent.
- [x] Labels align with Search availability wording.

Primary files: `apps/web/src/app/browse/browse-client.tsx`, `apps/web/src/components/browse/filter-panel.tsx`.

### P3-03 — Shorten homepage discovery and make preview optional

- [x] **Task complete** — Priority: Medium · Status: Verified locally · Dependencies: P1-01, P1-04; P2-01 if adding a search form

Keep a compact introduction and direct discovery actions ahead of long content. Retain the distinctive preview behind an explicit action, especially on mobile. Reduce generic feature marketing; do not fill the freed space with unsupported recommendations.

Acceptance:

- [x] Visitors reach readable issues without scrolling through a large embedded reader.
- [x] Preview opens on request and returns cleanly to discovery; reading progress remains intact.
- [x] If an inline search field is added, it uses the same URL-backed Search behaviour.
- [x] Measure initial-load PDF requests and verify preview loads only on request; do not claim comparative performance gains without a baseline.

Primary files: homepage and `apps/web/src/components/home/this-month-featured.tsx`.

### P3-04 — Refine mobile reader controls

- [x] **Task complete** — Priority: Medium · Status: Verified locally · Dependencies: None

Acceptance:

- [x] Add a clearly labelled fit-to-width/reset action compatible with current zoom behaviour.
- [x] Keep essential navigation visible and move appropriate secondary actions into an accessible labelled menu.
- [x] Full issue title remains available through an obvious information control when truncated.
- [x] Preserve pinch, page turning, URL/page restoration, toolbar behaviour, and desktop controls.

Primary file: `apps/web/src/app/read/[id]/page.tsx` and shared reader components/helpers.

### P3-05 — Add related readable issues

- [x] **Task complete** — Priority: Medium · Status: Verified locally · Dependencies: P1-05

Acceptance:

- [x] Locked pages offer readable alternatives and explain the print-first five-year policy.
- [x] Relevant readable alternatives exclude locked/draft/unusable issues and handle an empty related set gracefully.
- [x] No unconfirmed instructions are given to existing print subscribers.
- [x] No digital login, payment, or entitlement system is implied or introduced.

Scope adjustment: the owner confirmed physical subscriptions exist and online subscriber access does not. Related editions are delivered. Adding an acquisition/contact link is deferred until an official destination and instructions are confirmed; it is not counted as delivered.

### P3-06 — Add contextual problem reporting and trim footer navigation

- [x] **Task complete** — Priority: Medium · Status: Verified locally · Dependencies: Existing feedback destination configured/verified

Acceptance:

- [x] Issue/detail or reader offers Report a scan or text problem.
- [x] Include issue identity and page context where the destination supports prefilling; otherwise provide clear copyable context.
- [x] Missing feedback configuration does not produce a dead link.
- [x] Remove the public Admin footer shortcut without changing admin routes or authentication.

Primary files: footer, issue detail, reader, site settings/navigation integration.

### P3-07 — Publish maintained curated entry points

- [ ] **Task complete** — Priority: Medium · Status: Deferred by owner · Dependencies: Approved editorial selections and a named maintainer

Prepare a small set of starting points such as Start with these issues or topic collections. Editorial selection must be grounded in the actual content; do not fabricate endorsements or introductory suitability.

Acceptance:

- [ ] Record selected issues, short descriptions, and the editorial owner.
- [ ] Public reading recommendations are readable, with sensible fallbacks as the catalogue changes.
- [ ] Reuse existing navigation/data capabilities where sufficient; avoid an unnecessary new CMS.
- [ ] Show relevant language and collection scope accurately.

Owner decision: defer until approved initial selections and a maintainer are ready. No curated recommendations were fabricated.

### P3-08 — Verify the complete public reading journey

- [x] **Task complete** — Priority: High · Status: Verified locally · Dependencies: P3-01 through P3-06; P3-07 explicitly deferred

Acceptance:

- [x] Verify new visitor, returning reader, topic seeker, and locked-issue visitor journeys on desktop/mobile.
- [x] Check keyboard navigation, focus, changed control labels, zoom, long text, and reduced-motion behaviour.
- [x] Confirm counts, access labels, bookmark disclosure, format actions, and related recommendations agree across pages.
- [x] Run the required build and appropriate regression checks; capture final evidence.
- [x] Record outstanding editorial/external limitations honestly. Keep incomplete dependent tasks open.

## Search indexing — approved follow-on phase (6 September 2026)

This phase is additional to the original 23 UI tasks. Its six tasks are counted separately: **6/6 implemented and verified locally**. Owner instruction: add the indexing plan here and follow it. The owner subsequently authorized fixing extraction, rebuilding supported editions, and implementing durable ingestion. Preserve source PDFs, publication state, and the five-year embargo. Production release remains separate.

| ID | Task | Status | Completion evidence |
|---|---|---|---|
| SI-01 | Trace upload/reindex/import paths; inspect English/Hindi PDFs and establish actual page counts | Complete | Three sources inspected, 131 physical pages; pipeline findings and uncertainty documented in pilot report |
| SI-02 | Implement or adapt native-text extraction with per-page OCR fallback and safe index replacement | Complete; code verified locally | Native-first English extraction, confidence/readability gates, physical page accounting, safe snippets and transactional replacement; actual PDF and rollback tests pass |
| SI-03 | Pilot two readable English AIM editions | Complete | Integrated September 2021 and January 2014 pilot extended with the reported January 2019 issue; 147 physical pages, 146 indexed, one uncertain cover withheld; selected native/OCR passages inspected |
| SI-04 | Verify real page-text search and approve batch approach from pilot evidence | Complete | Real local/remote query returns January 2019 page 4; desktop/phone card clicks highlight the matching source line; safe HTML and embargo tests pass; owner authorized all supported English editions |
| SI-05 | Run resumable indexing batches after pilot review | Complete | 102 remote English editions rebuilt: 4,885 indexed pages, 17 uncertain covers withheld; both local English editions rebuilt; download retries succeeded; checkpoint/catalogue/excluded-index verification passed. [Report](SEARCH_REBUILD_REPORT.md) |
| SI-06 | Make ingestion indexing status and retry visible; verify ongoing coverage | Website deployed; worker hosting pending | Atomic upload/replacement queue, leased worker, checkpoints, bounded retries, stale-source fencing and dedicated admin coverage/history workspace. Isolated DB/PDF worker tests and production browser/build checks pass. Migrations applied to both databases. Local worker is running; independent hosting remains. [Release evidence](PRODUCTION_RELEASE_2026-09-06.md) |

The initial work package produces a diagnosis, sample-quality report, measured processing estimates, and pilot evidence. Do not claim OCR quality from character counts alone. Keep restricted excerpts out of public evidence. Database writes must target explicitly selected issue IDs and preserve unrelated data. A full batch is not automatic merely because extraction succeeded once.

Progress and evidence will be recorded in [Search Indexing Pilot](SEARCH_INDEXING_PILOT.md). This phase supersedes the separate SC-01–SC-04 follow-up outline in [Search Coverage Audit](SEARCH_COVERAGE_AUDIT.md): source inspection maps to SI-01, pilot to SI-02/SI-03, batch planning/execution to SI-04/SI-05, and re-audit to SI-06.

Delivery checkboxes (one per numbered indexing task):

- [x] SI-01 — Diagnosis and source inspection.
- [x] SI-02 — Integrated extraction and safe replacement.
- [x] SI-03 — Reviewed two-edition English AIM pilot.
- [x] SI-04 — Real search verification and batch decision.
- [x] SI-05 — Resumable batch execution.
- [x] SI-06 — Durable status, retry, and final coverage, verified locally. Production worker hosting/deployment remains release work.

Owner scope decision: OCR/indexing work is limited to English AIM editions. Hindi OCR is removed from the active plan, upload/reindex processing, and pilot scripts. Existing Hindi PDFs, metadata and index rows are preserved. The earlier question about publishing uncertain Hindi OCR is closed by this decision. English extraction still requires sample quality checks; raw pilot output remains local.

English-only enforcement verified: shared indexer rejects non-English issues before download/extraction/write; upload and PDF replacement skip Hindi OCR; bulk candidates exclude Hindi; admin reindex shows the scope. `test:indexing` verifies skips and preservation of existing Hindi index rows; `test:review` remains green. No existing Hindi data was deleted.

Final English-only build passed with `NEXT_DIST_DIR=.next-verify` after a separate development process repeatedly conflicted with normal `.next` output. The optional build-directory setting preserves the default development path and allows isolated verification. Earlier shared-directory builds failed on missing generated modules/trace files; no source compile/type errors were reported.

Earlier prototype verification, 6 September 2026: `pnpm.cmd build` from `apps/web` passed compilation, lint/types, and 37-page generation. `node scripts/test-indexing.cjs` passed real libSQL rollback/count tests; `pnpm.cmd test:review` passed access/search regression fixtures. Source inspection and the local three-edition extraction pilot completed successfully. No deployment or database indexing writes had occurred at that point.

Completed rebuild verification, 6 September 2026: all 102 supported remote English indexes match their `native-first-english-v5` checkpoints, with 4,902 physical pages and 4,885 indexed pages. The 17 withheld pages are covers. Both eligible local indexes also match; excluded index hashes and catalogue/source/publication checks passed. Native/OCR quality, safe snippets, standard-font packaging, rollback, access rules and desktop/phone reader navigation were verified. Application code is locally built but not deployed. [Full evidence and review list](SEARCH_REBUILD_REPORT.md).

## Other deferred work — outside the approved indexing phase

| Item | Reason / trigger for reconsideration |
|---|---|
| Adjustable text-reading edition | Requires reliable text, reading order, language support, and content-quality review. |
| EPUB/MOBI conversion | Separate conversion/quality workflow; hide unsupported formats now. |
| Digital subscriber accounts or online unlocks | Separate policy, entitlement, and authentication decision. |
| Bookmark/history synchronization | Separate sign-in and data-sync scope. |
| New search engine or blanket reindex | Only consider after coverage/relevance measurements justify it. |
| Pending-digitisation counter | Requires a trustworthy maintained physical/source inventory. |
| Complete visual redesign | Not required by the evidence or approved direction. |

## Verification approach

Use focused tests for meaningful logic changes: embargo boundaries, readable selection, search provenance/filtering, and stale-response prevention. Use browser checks for layout and interaction changes. Do not add tests that merely repeat static copy or CSS implementation.

Record the exact environment, route/query, viewport where relevant, observed outcome, and known limits. Local verification is not production verification. Follow repo instructions for environment-specific build failures without misclassifying them as code failures.

## Evidence and activity log

| Date | Task / event | Outcome | Evidence / limitations |
|---|---|---|---|
| 2026-09-06 | Review assessed | Code and local API checks support accuracy, shelf, and search findings | 94 readable / 104 publicly listed editions at review time; index completeness and exact mobile collision still require targeted verification. |
| 2026-09-06 | Scope approved | Three-pass direction accepted by project owner | Preserve identity and five-year policy; prioritize accurate access and usable discovery. |
| 2026-09-06 | Tracker created | 23 delivery tasks documented; 0 implemented at creation | Detailed acceptance criteria, dependencies, evidence log, and release log established. |
| 2026-09-06 | P1-01–P1-08 | Verified locally | Readable shelf/counts, truthful copy/formats, concise access notice, mobile history, visible search actions, bookmark disclosure. [Verification report](WEBSITE_REVIEW_VERIFICATION.md). |
| 2026-09-06 | P2-01–P2-07 | Verified locally | URL restoration, availability SQL, provenance, stale/error handling, actual topic suggestions; [coverage audit](SEARCH_COVERAGE_AUDIT.md) found 0/94 readable editions indexed. |
| 2026-09-06 | P3-01–P3-06, P3-08 | Verified locally | Theme hierarchy, single availability control, optional preview, mobile reader controls, related editions, contextual reporting/footer; curation deferred. |
| 2026-09-06 | Public copy audit | Completed | [Copy inventory](PUBLIC_COPY_AUDIT.md) records unsupported claims corrected and identity/policy preserved. |

Append an entry for each substantive implementation/verification session. Include task IDs and file/commit links when available.

### Follow-up — Preview transition (6 September 2026)

- [x] Smooth the homepage Preview here expansion and closing, as requested by the owner. Revised after owner feedback: a 360ms grid expansion and 280ms collapse move the section without fading the magazine. Reduced-motion mode changes state immediately. PDF loading remains opt-in; the loaded reader is retained while closed, with hidden controls inert.
- Verified locally: final build passed; browser checks at 1440px and 390px confirmed intermediate opening/closing heights, rapid toggle reversal, no horizontal overflow, and immediate reduced-motion settling. No browser exceptions. Evidence: `.codex-logs/review-preview-motion.mjs`.
- Local site restarted at `http://localhost:3000`. Not deployed; original delivery-task totals remain unchanged.
- Correction verified: removed the separate cover-to-canvas fade, reserved page-control space to avoid a loading jump, and confirmed the exact same PDF canvas survives closing/reopening on desktop and mobile. Build and updated browser checks passed; no browser exceptions.

## Decision log

| Date | Decision | Basis |
|---|---|---|
| 2026-09-06 | Preserve five-year public access restriction | Existing product policy; review concerns are selection and communication problems. |
| 2026-09-06 | Refine existing identity and make preview optional | Improve discovery while retaining the site's reading experience. |
| 2026-09-06 | Audit indexing before planning repairs | Search examples cannot establish complete or incomplete OCR coverage. |
| 2026-09-06 | Use current catalogue data for public statistics | Existing marketing figures are hardcoded; physical inventory is not established. |
| 2026-09-06 | No online subscriber entitlement; defer acquisition link | Owner confirmed print subscriptions and the five-year embargo; no verified official contact destination supplied. P3-05 scope narrowed to readable alternatives. |
| 2026-09-06 | Defer P3-07 | Owner explicitly asked to wait for approved selections. |
| 2026-09-06 | Record indexing repairs separately | Coverage measured: 0/94 readable editions have page text. SC-01–SC-04 in the audit define inspection, pilot, batch planning, and revalidation. No bulk indexing performed. |

## Release log

| Pass | Local verification | Commit / change reference | Deployment | Production verification |
|---|---|---|---|---|
| 1 | Passed 2026-09-06 | Working tree; [evidence](WEBSITE_REVIEW_VERIFICATION.md) | Deployed 2026-09-06 | Focused smoke checks; [release scope](PRODUCTION_RELEASE_2026-09-06.md) |
| 2 | Passed 2026-09-06 | Working tree; [evidence](WEBSITE_REVIEW_VERIFICATION.md) | Deployed 2026-09-06 | Focused smoke checks; [release scope](PRODUCTION_RELEASE_2026-09-06.md) |
| 3 | Passed 2026-09-06 (P3-07 deferred) | Working tree; [evidence](WEBSITE_REVIEW_VERIFICATION.md) | Deployed 2026-09-06 | Focused smoke checks; [release scope](PRODUCTION_RELEASE_2026-09-06.md) |

## Session handoff

- **Next action:** Choose independent production indexing execution (continuous hosting or the proposed free scheduled GitHub Actions alternative), then verify its processing lifecycle. The website is deployed with issues/indexes intact. Review of 17 withheld covers remains separate. See `INDEXING_WORKER.md`.
- **Last completed delivery task:** P3-08; 22 tasks verified locally.
- **Inputs still needed:** verified print contact destination; curated selections and editorial maintainer. Existing feedback configuration is used with copyable issue/page context.
- **Completion rule:** Keep dashboard totals, task statuses, evidence, and release log consistent. Verified locally and deployed are distinct milestones.
