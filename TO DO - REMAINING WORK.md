# AIM Archive — Remaining Work

Updated: 2026-09-06

This is the actionable list of unfinished work, consolidated from the review of `TO DO LIST.md`, `AUDIT.md`, project documentation, and the current workspace. Fully implemented tasks are omitted. For partially completed features, only the unfinished portion is listed.

The original [TO DO LIST.md](TO%20DO%20LIST.md) remains historical context. An unchecked verification item means completion has not been established; it does not necessarily mean the feature is broken or missing. Local implementation is not proof of deployment. Current database counts, hosting settings, and operational handoffs must be confirmed rather than inferred from older notes.

## 1. Next priority — Finish Turso + R2 verification and cleanup

Complete this section before declaring the migration finished or expanding admin usage.

### 1.1 Inventory and recover legacy files

- [ ] Inventory the intended active Turso database for issues and magazine covers still referencing Supabase Storage. Record issue IDs, publication status, affected fields, and source-file availability; do not assume the historical count of eight issues is still current.
- [ ] Recover or reupload legacy PDFs and covers to R2 where source files exist, and update the corresponding **Turso** records. Keep unrecovered issues unpublished.
- [ ] Intentionally clear unavailable legacy cover URLs so fallback covers are used instead of retaining broken references.
- [ ] Open each recovered issue in the reader, verify its PDF and cover, and publish only after verification.
- [ ] Confirm no published issue depends on Supabase Storage and no public/admin display emits legacy Supabase image requests.
- [ ] Replace the old storage-migration apply instructions with the actual Turso recovery procedure. `scripts/migrate-storage-to-r2.mjs` currently updates Supabase rows; do not run it unchanged as the Turso cleanup step.
- [ ] After recovery and stable verification, decide whether to retain or remove the old Supabase bucket. Confirm required backups before any destructive cleanup.

### Production indexing rollout

- Manual-only GitHub indexing is the selected operating mode. The hourly trigger is removed and normal manual runs are enabled on main; local development no longer starts a worker automatically. See [GitHub indexing](GITHUB_INDEXING.md). Monitor shared Actions usage; account billing settings remain outside the verified setup.
- [ ] On that deployment, verify a controlled English upload, worker interruption/resume, retry, PDF replacement, and the resulting public page-text search. Local transaction tests, real native/scanned PDF extraction, and browser UI checks already pass.

### 1.2 Public browser verification

Use the intended database and representative English/Hindi issues, including published, draft, embargoed, and recovered legacy cases where available.

- [ ] Verify homepage editions, carousel, covers, and navigation.
- [ ] Verify Browse filters, facet counts, sorting, query search, pagination, and browser back/forward behavior.
- [ ] Verify Search metadata and OCR matches, magazine/year filters, highlighted snippets, and links to the correct reader page. Establish whether native Turso full-text search or the SQL fallback is active.
- [ ] Verify issue detail and reader loading, cover fallback, page navigation, and resume-reading behavior.
- [ ] Verify Bookmarks persistence, catalog lookup, removal, and unavailable-issue handling.
- [ ] Verify individual downloads and ZIP downloads, including representative batch sizes, cancellation, partial failures, and embargoed selections.
- [ ] Verify drafts remain unavailable through public detail, reader, search, and download paths.
- [ ] Verify the sitemap includes the expected published issues and uses the intended public domain.

### 1.3 Authenticated admin and upload verification

Use controlled test records and files; avoid modifying real content solely for testing.

- [ ] Verify login, session validation, logout, and unauthenticated route/API protection.
- [ ] Verify dashboard statistics and Admin Issues filtering, sorting, pagination, and refresh after mutations.
- [ ] Verify magazine create/edit/delete and issue inline edit/publish/unpublish behavior.
- [ ] Verify topic rename/delete and site-settings persistence.
- [ ] Verify Storage lists R2 objects and handles stale cover references correctly; test cleanup only with disposable objects.
- [ ] Upload a small test PDF and confirm the PDF/cover are stored in R2, metadata is stored in Turso, and OCR rows are created.
- [ ] Replace a test PDF and verify its URL, size, page count, cover behavior, and OCR index.
- [ ] Replace a test cover and verify the saved URL and displayed image.
- [ ] Verify single-issue reindexing and thumbnail backfill where needed.
- [ ] Record warm public/admin timings against the intended remote database, including upload-form navigation. Investigate only demonstrated responsiveness problems.

### 1.4 Deployment and final checks

- [ ] Identify the revision and local changes intended for release; include required new assets and migrations in the release scope.
- [ ] Confirm Turso and R2 environment configuration in the required Vercel environments, without copying secret values into documentation.
- [ ] Apply the remote navigation migration if absent, then verify authenticated navigation changes and public header/footer output. See [Navigation Management Roadmap](NAVIGATION_MANAGEMENT_ROADMAP.md).
- [ ] Confirm the deployed application uses Turso + R2 and remove obsolete Supabase runtime environment variables after verification.
- [ ] Reconcile the imported data with the original export and subsequent intentional edits. Use the migration verifier where appropriate; historical row counts alone are not proof of current correctness.
- [ ] Run the production build and release checks against the intended configuration, then repeat the critical public/admin smoke checks on the deployed revision.
- [ ] Record the verification date, revision, environment, results, and any remaining failures.

## 2. Production readiness — Domains, reliability, and truthful content

Domain coordination and copy review can proceed alongside migration verification.

### 2.1 Website and asset domains

- [ ] Confirm whether `aimarchive.aurosociety.org` is already connected. If not, coordinate the current Vercel-provided DNS requirements with Dibyanshu, verify domain ownership/configuration, and confirm HTTPS.
- [ ] Confirm deployed `NEXT_PUBLIC_APP_URL`, canonical/OG URLs, sitemap, and robots output use the intended website domain.
- [ ] Configure a production custom domain for R2 assets if absent. Treat this separately from the website domain: `r2.dev` is a rate-limited development endpoint.
- [ ] Update asset URL handling, image hostname configuration, and CORS for the production asset domain; verify existing stored URLs and storage cleanup still work correctly.
- [ ] Configure appropriate PDF/image caching through the asset domain and verify PDF loading, range requests, replacement freshness, and representative delivery timings.

Reference: [Cloudflare public-bucket documentation](https://developers.cloudflare.com/r2/buckets/public-buckets/).

### 2.2 Correct public promises and project documentation

- [ ] Audit language promises across public copy and metadata. Create a review inventory containing the location, existing wording, proposed wording, and keep/change recommendation. Reflect currently supported editions without promising additional languages.
- [ ] Correct claims that EPUB/MOBI downloads are available; align format messaging with actual functionality.
- [ ] Update `CLAUDE.md` to describe Turso/libSQL + R2 as the runtime stack, current search behavior, and Supabase tooling as migration history. Remove contradictory runtime and deployment instructions.
- [ ] Reconcile stale `AUDIT.md` findings against current code and fresh checks; retain valid open findings and historical measurements.
- [ ] Add a current-status pointer in the older planning documents so completed work and obsolete migration steps are not reopened accidentally.

### 2.3 Reliability before broader usage

- [ ] Add a focused automated test baseline for signed/expired/tampered sessions, draft and embargo visibility, Browse filters, safe search rendering, and atomic counters.
- [ ] Add basic production error monitoring and verify that a controlled error is reported with useful context and without secrets.
- [ ] Review whether the current process-local login limiter is sufficient for the intended deployment; implement shared enforcement if required before broader admin exposure.

## 3. Web quality — Measure, then fix specific findings

### 3.1 Performance and accessibility

- [ ] Run a fresh Lighthouse audit against a production build for `/`, `/browse`, `/search`, `/issue/[id]`, `/read/[id]`, and `/admin/login`, covering mobile and desktop. Append results to `AUDIT.md`; the first baseline already exists.
- [ ] Perform manual keyboard, focus, and screen-reader checks on navigation, search, filters/drawers, pagination, dialogs, carousel, reader controls, and admin forms.
- [ ] Fix confirmed accessibility failures and the highest-impact measured performance issues, prioritizing reading and discovery flows.
- [ ] Recheck affected routes after fixes and record comparable results.
- [ ] Audit Browse and Bookmarks list rows, empty states, filter transitions, pagination behavior, and grid breakpoints; produce a bounded punch-list and address confirmed issues.

### 3.2 Reader parity

- [ ] Agree the shared swipe behavior and align the full and embedded readers, preserving pinch/pan behavior while zoomed.
- [ ] Define consistent zoom steps and spread-page snapping where both readers expose the same interaction.
- [ ] Finish full-reader cover fallback transitions and sizing where gaps remain.
- [ ] Evaluate and implement the useful missing full-reader polish: neighbour preloading, page-turn skeletons, and accessible zoom-control placement.
- [ ] Extract shared reader behavior/helpers where it prevents drift. Worker configuration is already shared; do not repeat that extraction.
- [ ] Verify both readers on phone, tablet, and desktop after the changes.

### 3.3 Small functional follow-ups

- [ ] Decide whether download totals should include ZIP downloads; if yes, add counting that reflects successfully fetched files without double-counting individual downloads.
- [ ] Add batch topic editing to selected admin issues if required for archive ingestion.
- [ ] Optional: replace build-time Google font downloads with local font files if reproducible/offline builds remain a practical concern. The local PDF worker implementation already exists.

## 4. Operations — Prepare the archive and admin handoff

- [ ] Confirm the source-file workflow with Hemlata Di via Dibyanshu: original PDF quality, cover assets, naming, supported editions, and batch cadence.
- [ ] After upload and deployment verification, confirm authorized admins have credentials through a private channel.
- [ ] Prepare a concise admin walkthrough covering upload, titles/themes, topics, editing, publication/embargo behavior, and file replacement.
- [ ] Receive and upload archive batches; verify each issue's metadata, theme, topics, cover, PDF, and publication state.
- [ ] Periodically identify and backfill missing theme titles and other required metadata.

## 5. Later — Enhanced web features

Start these only after the current reading, discovery, and admin workflows are reliable.

- [ ] **Within-reader search:** add issue-scoped search and useful navigation/highlighting inside the reader. Archive-wide OCR search and highlighted result snippets already exist; highlighting scanned pages needs a deliberate approach.
- [ ] **Optional public sign-in:** choose and implement public-user authentication for the current Turso stack when cross-device sync is prioritized.
- [ ] **Cross-device sync:** sync bookmarks, reading history, and preferences, including Browse panel state, after authentication exists. Preserve/migrate existing local data.
- [ ] **Format conversion:** validate conversion quality on representative English/Hindi magazines, decide required output formats, and then implement generation, storage, downloads, and failure handling. Do not promise formats before they work.
- [ ] **Public analytics controls:** connect admin visibility settings to public metrics. Basic counters already exist.
- [ ] **Expanded admin analytics:** add useful charts and search-query insights once there is enough usage and a defined reporting need. Basic totals and popular issues already exist.

## 6. Later — Native mobile app

Begin after the web/API contract is stable and native mobile is an agreed priority.

- [ ] Add the missing Expo icon, splash, and adaptive-icon assets and verify the app starts/builds. Mobile lint repair is already complete.
- [ ] Replace placeholder tabs with working Home, Browse, Search, issue-detail, and reader flows using the shared API/types.
- [ ] Implement offline PDF downloads and local reading.
- [ ] Build My Library with download state, storage usage, and file removal.
- [ ] Add new-issue notifications when the publication workflow and app infrastructure support them.
- [ ] Test on Android/iOS devices, establish release builds, and complete store submission requirements.

## 7. Conditional backlog — Do only when the trigger exists

| Unfinished task | Trigger / dependency |
|---|---|
| Guided onboarding/system tour | User testing demonstrates confusion that simpler copy or controls cannot resolve. |
| “On This Day” historical highlights | Enough historical content and usable dates/metadata are available. |
| Alternative search engine such as Meilisearch | Measured Turso search quality or performance fails agreed needs after reasonable improvements. |
| Advanced PDF/CDN optimization beyond Section 2 | Delivery measurements show a remaining bottleneck. |
| Internet Archive preservation mirror | Preservation scope, publication permissions, and backup policy are agreed. |
| Tamil/Bengali font additions and script QA | Those editions are confirmed for publication. Marathi uses the existing Devanagari font, but actual content still needs visual QA. |
| Replace or redirect the legacy AIM website | Archive coverage and operational readiness are sufficient, and Kaushal Ji + Dibyanshu approve the cutover and legacy-site disposition. |

## Suggested first work package

Complete Section 1 as a bounded migration-verification pass. Progress domain coordination and public-copy review from Section 2 alongside it. Use the resulting verified state to choose the next implementation task.
