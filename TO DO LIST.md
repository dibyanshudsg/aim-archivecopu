# AIM Archive — To Do List

_________________________

Personal Addition:

1. we might use only Hindi version - Agnishikha. So, we need to do a system wide audit and find out everywhere, where multiple Lang promises were maid. It will be 2 lang fixed and might we add more as a optional. But it should not be a promise. Thus, audit and create a .md file adding all the lines and whether we need to change it (what should be - add) or keep it as it is. We will decide. 

2. 

_________________________

## Completed
- [x] Create CLAUDE.md (comprehensive project bible)
- [x] Create ROADMAP.md (phased development plan)
- [x] Initialize Git repository
- [x] Define tech stack and architecture
- [x] Define database schema (high-level)
- [x] Define MVP scope
- [x] Set up Turborepo monorepo (pnpm workspaces)
- [x] Scaffold Next.js 15 web app (builds clean, 0 warnings)

- [x] Create shared types/constants package (@aim-archive/shared)
- [x] Create Supabase package with DB types + migration SQL
- [x] Scaffold Expo mobile app skeleton (4 tab screens)
- [x] Configure ESLint + Prettier
- [x] Set up design system (gold/cream color palette, fonts, animations)
- [x] Build homepage (hero, animated bookshelf, features, CTA, stats)
- [x] Build header (responsive nav, mobile menu with animations)
- [x] Build footer (links, branding, admin link)
- [x] Build Browse page (issue cards, filters by magazine/year/language/topic)
- [x] Build Issue detail page (cover, metadata, download, bookmark)
- [x] Build in-app PDF reader (page nav, zoom, fullscreen, scrubber)
- [x] Build Search page (global search, advanced filters, sort, popular topics)
- [x] Build Bookmarks page (Zustand + localStorage persistence)
- [x] Create Supabase project (database + storage + auth)
- [x] Run initial migration (00001_initial_schema.sql)
- [x] Set up Supabase Storage bucket + upload 8 real PDFs
- [x] API routes: magazines, issues, search, PDF serving
- [x] Wire frontend to live Supabase data (replace mock data)
- [x] Admin login page with authentication
- [x] Admin dashboard (stat cards, popular issues, quick links)
- [x] Admin magazine management (add/edit/delete)
- [x] Admin issues management (table, search, filters, sort, inline edit, upload)
- [x] Admin PDF upload page (drag-drop, auto-title, topics, metadata)
- [x] PDF cover thumbnail pipeline (auto-generated on upload via pdfjs + node-canvas)
- [x] Backfill thumbnails endpoint (`POST /api/admin/thumbnails`, one issue per call)
- [x] SEO optimization (meta tags, sitemap, structured data)
- [x] Zod input validation on all API routes
- [x] Browse page redesign (Phase 1 polish):
  - [x] Collapsible side filter panel (5 multi-select sections with facet counts)
  - [x] List/Grid view toggle with sortable list table
  - [x] URL-synced filter state (`?year=…&subject=…&view=list&page=2`)
  - [x] Pagination with smooth scroll + ellipsis truncation
  - [x] Active filter chips above the grid
  - [x] Mobile slide-out drawer + responsive panel
  - [x] Animated row stagger + modern hover lift
- [x] Web Share API on issue cards + list rows (cover thumbnail attached, clipboard fallback)
- [x] Bookmark count badge in header
- [x] Managed Topics dropdown in admin (add inline / rename / delete across all issues)
- [x] Alphabetical topic sort across all surfaces (admin + public)
- [x] Deploy to Vercel (`aim-archive.vercel.app`)

## Up Next — Admin Issues Page Enhancements
- [x] Bulk select & bulk actions (delete, publish, unpublish) — checkbox column, master checkbox, action toolbar appears when rows selected
- [x] Manual cover image upload per issue (replace-cover modal with auto-crop + orientation toggle)
- [x] View/open link — opens public issue page in new tab
- [x] Download PDF link — direct download from row action
- [x] Download count column in table (sortable)
- [x] Pagination for large issue lists (25/page, prev/next, "Showing X–Y of Z")
- [x] Status filter (Published / Draft)
- [x] Topic filter dropdown
- [x] Export issue list as CSV (respects current filters)
- [x] Bulk upload — multiple PDFs at once with auto-detected magazine/month/year from filename (`/admin/issues/bulk`)
- [x] Duplicate issue — clones magazine + topics + description into upload form via sessionStorage
- [x] Last modified date shown per row (sortable, relative format like "3d ago")
- [x] Confirmation toast + custom confirm dialog (`components/ui/toast.tsx`, `UIProvider` wraps admin layout) — replaced `window.alert` / `window.confirm`

## Up Next — Phase 1.5: Polish & Deploy
- [ ] Performance audit (Lighthouse score)
- [ ] Accessibility check
- [ ] Connect domain (aimarchive.aurosociety.org)
- [ ] Full-page search bar where the old horizontal filter row used to live (placeholder is in place)
- [ ] Browse: remember user's last open/closed panel state per device (currently per-browser via localStorage; future: cross-device after auth lands)

## Up Next - System Improvements From Review
- [x] Public issue API: prevent drafts from loading by direct ID (`/api/issues/[id]`, reader, issue page)
- [x] Admin auth hardening: signed session cookie, no default password fallback, login rate limiting
- [x] Browse scalability: move filtering, sorting, facets, and pagination server-side; search parity covers title, theme, magazine name, description, and partial topic text
- [x] Footer magazine links: replace slug-like values (`aim`, `agnisikha`) with working IDs/slugs
- [x] Download analytics: add a download route that increments `download_count` before serving/redirecting PDF
- [x] Read analytics: use an atomic DB/RPC increment for `read_count`
- [x] Search safety: sanitize highlighted snippets before rendering HTML
- [x] Admin Issues UI: remove per-row "view public page" and "download PDF" actions to free table space
- [ ] Mobile readiness: add missing Expo assets and fix mobile lint dependency/config
- [ ] Test baseline: add focused tests for auth, draft visibility, browse filters, search, and counters
- [x] Tooling cleanup: migrate web lint script away from deprecated `next lint`
- [ ] Optional resilience: self-host fonts / PDF worker to reduce external build/runtime dependency

## Up Next — Migrate Storage to Cloudflare R2

> **Why:** Supabase Storage charges egress (bandwidth) per GB. R2 charges **zero** egress, forever. With ~25 MB per issue and a public archive, this saves ₹2,000+/month at scale and removes "viral spike" billing risk. Free tier (10 GB / 1M reads/mo) covers the first ~400 issues.

### A. Cloudflare account & bucket setup ✅ DONE (2026-05-11, via Dibyanshu)
- [x] Society-owned Cloudflare account + `aim-archive` R2 bucket (APAC region)
- [x] Public access enabled (`pub-3ed08073797148cf93d772ea1eb341f9.r2.dev`)
- [x] R2 API token issued (Object Read & Write, scoped to `aim-archive` bucket)
- [x] CORS policy applied — GET/HEAD allowed from `aim-archive.vercel.app`, `aimarchive.aurosociety.org`, `aim.aurosociety.org`, `http://localhost:3000`
- [x] Smoke test (`scripts/test-r2.mjs`) — all green

### B. Code changes ✅ DONE (2026-05-11)
- [x] Add dep: `@aws-sdk/client-s3` in `apps/web` runtime deps
- [x] New file `apps/web/src/lib/r2-client.ts` — S3 client + `uploadToR2`, `deleteFromR2`, `keyFromPublicUrl`, `storageKeyFromUrl`, `isR2Url`, `isSupabaseStorageUrl`
- [x] Refactor `apps/web/src/lib/pdf-thumbnail.ts` and `crop-cover-spread.ts` to write to R2 (dropped `SupabaseClient` param)
- [x] Refactor `/api/admin/upload` to write source PDFs + covers to R2
- [x] Refactor `/api/admin/issues/[id]` DELETE — handles both R2 + Supabase legacy URLs; also cleans up the cover (fixed pre-existing leak)
- [x] Refactor `/api/admin/issues/[id]/pdf` and `/cover` replace routes to R2 (auto-migrates the issue if it was on Supabase legacy)
- [x] Refactor `/api/admin/thumbnails`, `/api/admin/reindex`, `/api/admin/issues/[id]/reindex` to R2
- [x] Add `pub-*.r2.dev` to `next.config.ts` `images.remotePatterns`
- [x] Update `apps/web/.env.local.example` and `turbo.json` `build.env` with R2 vars

### C. Migration script (one-shot for existing 8 issues)
- [x] New file `scripts/migrate-storage-to-r2.mjs`
  - List all objects in Supabase Storage `magazines` bucket
  - Stream each to R2 via S3 SDK (`PutObjectCommand`)
  - Update `issues.pdf_url` and `issues.cover_image_url` rows in DB to point at new R2 URLs
- [ ] Run script in apply mode locally with both Supabase + R2 creds in `.env.local`
- [ ] Spot-check: open 2–3 issues in the reader, confirm PDF + thumbnail load from R2 URLs

### D. Vercel + production
- [ ] Add the same 5 env vars on Vercel: Settings → Environment Variables (all three environments: Production, Preview, Development)
- [x] Add `R2_*`, `R2_PUBLIC_BASE_URL`, and admin auth vars to `turbo.json` `globalEnv` and `build.env`
- [ ] Push, redeploy, verify live site loads PDFs from R2

### E. Cleanup (after ~7 days of stable verification)
- [ ] Empty the Supabase Storage `magazines` bucket (keep DB rows; URLs already point at R2)
- [ ] Optional: delete the bucket itself, or leave empty as cold backup

### F. Documentation
- [ ] Update CLAUDE.md §3 (Tech Stack — File Storage now Cloudflare R2)
- [ ] Update CLAUDE.md §15 Known Issues with R2 setup gotchas if any surface
- [ ] Update CLAUDE.md §16 Deployment Flow with R2 env vars

### G. Future enhancements (separate work)
- [ ] Move from `r2.dev` subdomain to a custom domain like `cdn.aimarchive.aurosociety.org` (requires DNS access)
- [ ] Mirror PDFs to Internet Archive (archive.org) as a preservation backup + alternate access route
- [ ] Add Cloudflare CDN cache rules for popular issues (further latency improvement)

## Future — Phase 2: Enhanced Web Features
- [ ] PDF → EPUB/MOBI auto-conversion
- [ ] Bulk download (select issues → ZIP)
- [ ] Google OAuth sign-in (optional, for sync)
- [ ] Cross-device sync (bookmarks, history, preferences)
- [ ] Advanced search (within-PDF search, highlighted results)
- [ ] Public analytics display (admin-controlled visibility)
- [ ] Admin analytics dashboard (charts, search queries)
- [ ] PDF text extraction pipeline (for full-text search)

## Future — Phase 3: Mobile App
- [ ] Expo project build-out (mirrors web features)
- [ ] Offline reading (download + local storage)
- [ ] My Library with storage management
- [ ] Push notifications for new issues
- [ ] Google Play + App Store deployment

## Future — Phase 4: Polish & Scale
- [ ] Implement Tour of the System (onboarding)
- [ ] "On This Day" historical highlights
- [ ] Meilisearch upgrade (if PostgreSQL FTS hits limits)
- [ ] Error monitoring (Sentry)
- [ ] CDN optimization for large PDFs



________________________________

## Notes for next session

- ✅ Browse pagination shipped (Apr 2026) — see `components/browse/pagination.tsx` and `lib/use-browse-filters.ts`
- ✅ CLAUDE.md deployment flow updated (see §16 — production URL, env vars, atomic-commit flow, lessons from initial deploy)
- ⚠ Vercel build is sensitive to `noImplicitAny` on JSX event handlers — `<Link onClick={(e: React.MouseEvent) => …}>` must have an explicit event type. Local `pnpm build` may pass while Vercel fails because of this divergence.


_____________________

Perfect. Next, see the Issues page in the Admin panel - how the control buttons are taking lots of spaces on the right side and making the left text details comapct, looking ugly. 

Now, to be frank, among the buttons for each rows, - 

1. We don't need view public page button against each rows. Remove it.

2. And, no need to put Download pdf 

3. No Toast message when adding a Bookmark. See others also regarding getting toast messages.


_____________________

## Up Next — Carousel Polish Continuation (queued 2026-05-08)

A. [ ] **Browse + Bookmarks polish audit** — same pattern as the carousel polish: scoped audit first, then a punch-list of items to ship. Focus areas: list view rows, empty states, filter panel transitions, pagination feel, grid breakpoints.

B. [ ] **Reader parity work** — three sub-options, pick one (see [AUDIT.md](AUDIT.md) "Reader parity"):
    - User-affecting drift only: align swipe thresholds, zoom grid, spread snap-to-odd between Reader A (`/read/[id]`) and Reader B (homepage carousel).
    - + Backport Reader B polish (cover JPEG fallback, neighbour preloading, page-turn skeleton, floating zoom pill) to Reader A.
    - + Extract shared helpers (`useMediaQuery`, zoom grid, ease curves, spread snap) to `apps/web/src/lib/` so both readers stay in sync.

C. [ ] **Lighthouse baseline run** — production build (`pnpm build && pnpm start`, port 3000), DevTools → Lighthouse on `/`, `/browse`, `/search`, `/issue/[id]`, `/read/[id]`. Paste scores into [AUDIT.md](AUDIT.md) score history. First run establishes the baseline; subsequent runs catch regressions.

_____________________

## Immediate Plan — Post-Kaushal-Approval (2026-05-04)

> Kaushal Ji has approved: (1) Cloudflare R2 storage, (2) current Topic Tags + popular-topics structure as the categorisation layer, (3) the present upload flow, (4) `aimarchive.aurosociety.org` as the new subdomain, and (5) the long-term north star of replacing `aim.aurosociety.org` with this archive once enough issues are uploaded — with the current month's issue prominently featured on the homepage. All technical operations route through **Dibyanshu**.

### Coordination — kickoff with Dibyanshu (this week)

1. [x] Reach out to Dibyanshu — single message covering R2 account, asset pipeline, and DNS (sent 2026-05-04).
2. [~] Settle Cloudflare account ownership — Society-owned account (Society email + Society payment method on file); generate R2 API tokens for the app and share securely. **In progress (2026-05-05)** — Dibyanshu is securing the Cloudflare R2 account on Society infrastructure and will share credentials when ready. **Expected handover (5 values):**
    - `R2_ACCOUNT_ID` (32-char hex, visible in Cloudflare dashboard sidebar or in the API token modal)
    - `R2_ACCESS_KEY_ID`
    - `R2_SECRET_ACCESS_KEY`
    - `R2_BUCKET` — should be `aim-archive`, located in **Asia-Pacific (APAC)**, default storage class **Standard**
    - `R2_PUBLIC_BASE_URL` — the public r2.dev URL after enabling public access (looks like `https://pub-XXXXXXXX.r2.dev`)
    - **Permissions:** the API token must have **Object Read & Write** scoped to the `aim-archive` bucket only (not all-buckets)
    - **Channel:** any private channel — Signal, encrypted email, or even split across two messages — never in a public thread or commit.
3. [ ] Settle asset pipeline with Hemlata Di (via Dibyanshu) — confirm format and quality bar: vector PDFs (no Chrome Print-to-PDF), embedded images ≥300 DPI, front + back covers as separate files, language-wise file naming, agreed batch cadence.

### R2 Migration — blocked on item 2

4. [ ] Execute steps A–F in the **"Up Next — Migrate Storage to Cloudflare R2"** section above (already detailed: code refactor, env vars, migration script, Vercel env, Supabase cleanup, CLAUDE.md updates).
5. [ ] Spot-check live site after migration: reader, browse, search, admin upload — confirm all PDFs and covers load from R2 URLs.

### Custom Domain — parallel; blocked on Dibyanshu DNS access

6. [ ] Provide Dibyanshu the exact CNAME record (`aimarchive` → `cname.vercel-dns.com` on `aurosociety.org` zone).
7. [ ] In Vercel: Project → Settings → Domains → add `aimarchive.aurosociety.org` and verify.
8. [ ] Wait for SSL provisioning, confirm site loads on the new domain.
9. [ ] Update `NEXT_PUBLIC_APP_URL` env var in Vercel to `https://aimarchive.aurosociety.org` so OG/SEO tags reflect the production URL.
10. [ ] Update `apps/web/src/app/sitemap.ts` and `robots.ts` if they reference the Vercel URL anywhere.

### Admin handoff — after R2 + domain are both live

11. [ ] Share admin credentials with Kaushal Ji, Hemlata Di, and Dibyanshu (separate channel — not in any reply thread).
12. [ ] Brief written walkthrough: upload form (Magazine Title auto-generation, Theme Title, Topic Tags), edit panel (slide-down inline editor), Topics master-list management.

### Homepage — "current month" prominence (sets up future legacy-site replacement)

13. [x] Ship a featured "This Month's Editions" section — side-by-side cards with cover, Magazine Title + Theme Title, description, Read button (deployed 2026-05-04, `0e8a2a9`).
14. [x] Position it above the animated bookshelf so it owns the first impression while preserving the archive's discovery layer.
15. [~] Evolve the featured section into a **slideshow/carousel per Kaushal Ji's 2026-05-05 suggestion** — one issue per slide for maximum readability, two filter strips side by side (magazine + month) for free toggling, gentle 8s auto-rotation paused on hover, replaces the current side-by-side cards. Build with the future state in mind so the homepage can step in as the main AIM site when the legacy cutover happens.

### Documentation — bring CLAUDE.md and ROADMAP.md current

16. [ ] Update CLAUDE.md:
    - §3 Tech Stack — File Storage now Cloudflare R2 (post-migration)
    - §4.1 — admin actions-row design (secondary toolbar / Edit primary / Delete destructive), edit-row-form slide-down pattern, collapsible+resizable sidebar, cover hover preview via React portal
    - §6 Database Schema — add `theme TEXT` column to `issues`
    - §10 Phase 1.5 — mark complete items shipped this session
    - §15 Known Issues — Devanagari italic + `bg-clip-text` gotcha; document the no-italic + `pr-1` mitigation
    - §15 — search now theme-aware everywhere (Browse `matchesQuery`, admin Issues filter, `/api/search` parallel metadata + FTS)
    - §16 Deployment Flow — R2 env vars on Vercel
17. [ ] Update ROADMAP.md — mark Phase 1.5 polish items complete, add R2 migration as a tracked item.

### Ongoing — build up the archive

18. [ ] Receive issue files from Hemlata Di / Dibyanshu in batches (English, Hindi, and whichever languages they have ready).
19. [ ] For each issue: upload PDF, set Theme Title (the cover theme), manage Topic Tags, verify cover renders correctly.
20. [ ] Periodically backfill any issues missing theme titles from older uploads.

### Long-term parking — legacy site replacement (after sufficient archive size)

21. [ ] When the archive is sufficiently populated, coordinate with Kaushal Ji + Dibyanshu on the cutover: change DNS so `aim.aurosociety.org` points to this archive (or 301-redirect at the parent level).
22. [ ] Decide fate of the legacy site — sunset, archive, or redirect.

### Side items surfaced earlier (low priority, separate)

23. [x] Remove the bookmark toast (per prior feedback — bookmark add/remove should not produce a toast). **Done 2026-05-05** — confirmed no bookmark toast was ever wired (heart icon flip is the only signal, which is correct).
24. [x] Audit other toasts and silence the noisy ones; keep toasts for outcomes the user can't otherwise see (uploads, deletes, batch actions). **Done 2026-05-05** — removed three redundant success toasts in admin Issues (delete, publish toggle, edit save) since each already has direct visual feedback (row vanishes, status pill flips, panel closes + row updates). All error toasts and invisible-side-effect toasts (cover replace, PDF replace + OCR, reindex done, bulk counts, CSV export, settings save) kept.

### Multi-language fonts — when Tamil / Bengali / Marathi editions arrive

> The font cascade currently uses `Aboreto` (Latin display) + `Tiro Devanagari Hindi` (Devanagari) for headings, composed via per-font CSS variables in `apps/web/src/styles/globals.css` (`--font-heading: var(--font-aboreto), var(--font-tiro-deva), …`). When additional Indic-language editions are uploaded, drop their script-specific font into the same chain.

25. [ ] **Tamil** — load `Tiro Tamil` from `next/font/google` in `apps/web/src/app/layout.tsx` with a unique variable like `--font-tiro-tamil`, add to the html className, then extend `--font-heading` and `--font-display` in `globals.css`:
    ```css
    --font-heading: var(--font-aboreto), var(--font-tiro-deva), var(--font-tiro-tamil), ui-serif, Georgia, serif;
    ```
26. [ ] **Bengali** — load `Tiro Bangla` (or `Noto Serif Bengali` if Tiro Bangla isn't available) with `--font-tiro-bangla`, append to the chain.
27. [ ] **Marathi** — Marathi uses Devanagari script, so `Tiro Devanagari Hindi` already covers it. No font work needed; the magazine row + uploads are enough.
28. [ ] **Why the composition matters** — `next/font/google` generates obfuscated font-family names (e.g. `__Tiro_Tamil_abc123`), so `font-family: 'Tiro Tamil'` as a literal in CSS won't match anything. Each font must reference its own variable, and the design-system token (`--font-heading`) composes them all in one cascade so the browser picks the right font per-character.
29. [ ] Verify on each magazine's detail page after upload — Tamil / Bengali / Marathi theme titles should render with correct script-specific glyphs, not system fallbacks.

_____________________

## Immediate Plan - Supabase Runtime Removal and Local Speed Fixes (2026-06-27)

> Goal: finish the Turso + R2 cutover so local/admin clicks stop waiting on dead Supabase assets, then remove Supabase from active runtime code once the data is clean.

1. [x] **Neutralize legacy Supabase image URLs in runtime display paths**
    - [x] Add a shared display sanitizer that turns `.supabase.co` asset URLs into `null`.
    - [x] Apply it to Turso public issue/magazine mappers so public cards, search, issue detail, reader, and homepage do not render dead legacy thumbnails.
    - [x] Apply it to the admin Issues list response so the table does not trigger slow `_next/image` failures for legacy covers.
    - [x] Smoke test public surfaces and APIs to confirm no Supabase asset URLs are returned.
    - [x] Smoke test public surfaces; no new `_next/image?...supabase.co...` failures appeared in the dev-server log after the sanitizer.
    - [ ] Authenticated Admin Issues browser smoke still needed to confirm the table emits no legacy Supabase image requests under a real admin session.

2. [x] **Inventory remaining Supabase references**
    - [x] Run a code search for `@supabase/supabase-js`, `createPublicClient`, `createAdminClient`, `supabase.storage`, `.rpc(`, and `.supabase.co`.
    - [x] Classify each hit as active runtime fallback, migration/archive script, docs, env example, or expected legacy detector.
    - [x] Active public fallback buckets found and removed: public pages/routes, sitemap/metadata, public site settings, search fallback, issue read/download APIs, and Browse listing helper.
    - [x] Active admin fallback buckets found and removed: admin auth/routes, admin-data helper fallbacks, admin storage/settings routes, and upload/reindex/update routes.
    - [x] Intentional keep-for-now buckets found: migration scripts, `packages/supabase`, R2 migration tooling, and legacy URL detectors.
    - [x] Create the removal order so storage-cleanup tools are not broken before legacy data is handled.

3. [ ] **Clean legacy data references**
    - [ ] Use the admin storage surface or a one-off verification script to list every issue whose `pdf_url` or `cover_image_url` contains `supabase.co`.
    - [ ] Reupload/migrate covers and PDFs to R2 where the source files exist.
    - [ ] For unavailable legacy cover files, intentionally null `cover_image_url` rather than leaving broken Supabase URLs.
    - [ ] Verify public published rows do not depend on Supabase Storage.

4. [x] **Remove Supabase runtime fallback code**
    - [x] Delete Supabase fallback branches from public pages/routes.
    - [x] Delete Supabase fallback branches from admin pages/routes.
    - [x] Replace any remaining `createPublicClient()` / `createAdminClient()` usage with Turso repository functions or R2 helpers.
    - [x] Remove or archive `apps/web/src/lib/supabase-server.ts` after no runtime imports remain.

5. [x] **Remove Supabase runtime dependencies**
    - [x] Remove `@supabase/supabase-js` from `apps/web/package.json` after runtime imports are gone.
    - [x] Remove `@aim-archive/supabase` from `apps/web/package.json` if no active app code imports it.
    - [x] Remove unused mobile `@supabase/supabase-js` dependency.
    - [x] Keep migration scripts only if they remain useful, and document that they are not runtime dependencies.
    - [x] Point legacy migration scripts at `packages/supabase` instead of `apps/web` for their Supabase client dependency.
    - [x] Refresh `pnpm-lock.yaml`.

6. [ ] **Local responsiveness fixes after Supabase cleanup**
    - [x] Add a dev prewarm command for `/`, `/browse`, `/search`, `/admin/login`, `/admin`, `/admin/issues`, `/api/issues`, `/api/magazines`, and one real issue detail/reader route.
    - [x] Add `pnpm.cmd dev:local-db` so local UI testing can run against `.migration/turso-local-smoke.db` instead of the remote Turso database.
    - [x] Remove duplicate magazine fetching from Browse's Turso path.
    - [x] Remove Supabase image optimizer allowance from `next.config.ts`.
    - [x] Add hover/focus route prefetching to public and admin navigation.
    - [x] Add short in-memory TTL caches for repeated public read queries and admin identity checks.
    - [x] Replace Browse facet row fanout with aggregate/cached counts if warm Browse remains above target.
    - [x] Move Admin Issues toward server-side pagination/filtering before the archive grows.
    - [x] Prefetch Admin Upload/Bulk Upload routes from the Issues page and parallelize Upload form lookup loading.
    - [x] Add a development-only public route warmer so Home compiles Browse, Search, Bookmarks, and public lookup APIs before the first tab click.

7. [ ] **Verification**
    - [x] Run `pnpm.cmd --filter @aim-archive/web exec tsc --noEmit --pretty false`.
    - [x] Run `pnpm.cmd --filter @aim-archive/web build` (sandboxed run failed on blocked Google Fonts; escalated run passed).
    - [x] Run local warm smoke checks against homepage, Browse, Search, and unauthenticated Admin Issues redirect.
    - [x] Confirm warm local DB timings after prewarm: `/api/issues` ~45-58ms, `/browse` ~281-294ms, unauthenticated `/admin/issues/new` redirect ~178ms.
    - [x] Confirm authenticated warm admin issue listing API after server-side pagination: `/api/admin/issues?page=1&pageSize=25` ~37ms.
    - [x] Confirm fixed Upload route compiles and responds after prewarm; warm unauthenticated route guard measured ~287ms.
    - [x] Confirm warmed public tab timings after route warmer: Browse ~307ms, Search ~188ms, Bookmarks ~153ms, `/api/issues?page=1&page_size=24` ~25ms.
    - [x] Confirm server logs no longer show new `_next/image` requests for `glduurfsjyxpkdnxgdqz.supabase.co` during public smoke checks.
    - [ ] Authenticated admin smoke checks for Admin Issues, upload, replace PDF, replace cover, topics, settings, and storage.
    - [ ] Update `CLAUDE.md` to state Turso/libSQL + R2 are the runtime stack and Supabase is migration history only.

_____________________

## Up Next - Finish Supabase to Turso Migration Cleanup

> Status 2026-05-27: Turso database created, Supabase export imported, public reads/admin reads/admin writes are wired behind `DATABASE_PROVIDER=turso`, and Turso-mode production builds pass. The 8 legacy Supabase-hosted PDF/cover issues are imported as drafts until reupload, so published Turso rows do not depend on Supabase Storage.

1. [ ] **Browser smoke test with `DATABASE_PROVIDER=turso`**
    - [ ] Homepage loads from Turso.
    - [ ] Browse filters/facets/pagination work.
    - [ ] Search returns metadata and OCR results via SQL fallback search.
    - [ ] Issue detail and reader open for the 2 R2-backed published issues.
    - [ ] Bookmarks page initial catalog loads.
    - [ ] Sitemap builds with Turso issue rows.

2. [ ] **Admin smoke test with Turso**
    - [ ] Admin login and `/api/admin/auth/check` work.
    - [ ] Dashboard stats load from Turso.
    - [ ] Magazine create/edit/delete works.
    - [ ] Issue inline edit/status toggle works.
    - [ ] Topic rename/delete works.
    - [ ] Site settings save works.
    - [ ] Storage page loads R2 objects and can clear deleted cover references.

3. [ ] **Upload/reindex smoke test**
    - [ ] Upload a small test PDF; confirm PDF + cover go to R2 and issue row goes to Turso.
    - [ ] Confirm OCR rows are written to Turso `issue_search_index`.
    - [ ] Replace PDF and confirm `pdf_url`, `file_size_bytes`, page count, and OCR rows update.
    - [ ] Replace cover and confirm `cover_image_url` updates.
    - [ ] Run single-issue reindex.
    - [ ] Run thumbnail backfill if any issue is missing cover.

4. [ ] **Legacy PDF reupload plan**
    - [ ] Reupload the 8 legacy Supabase-hosted PDFs/covers through the admin panel when files are ready.
    - [ ] Publish each reuploaded issue after confirming R2 PDF and cover URLs.
    - [ ] Verify no published Turso issue has `pdf_url` or `cover_image_url` containing `supabase.co`.

5. [ ] **Remove Supabase runtime dependency after smoke tests**
    - [ ] Delete Supabase fallback branches from public routes/pages.
    - [ ] Delete Supabase fallback branches from admin routes.
    - [ ] Replace/remove `apps/web/src/lib/supabase-server.ts` usage.
    - [ ] Remove runtime `@supabase/supabase-js` usage from `apps/web/src`.
    - [ ] Decide whether Supabase export scripts stay as historical tools or move to an archive folder.
    - [ ] Remove `@aim-archive/supabase` and `@supabase/supabase-js` from `apps/web/package.json` once no runtime code needs them.

6. [ ] **Deployment env**
    - [ ] Add `DATABASE_PROVIDER=turso` to Vercel.
    - [ ] Add `TURSO_DATABASE_URL` to Vercel.
    - [ ] Add `TURSO_AUTH_TOKEN` to Vercel.
    - [ ] Keep Supabase env vars temporarily until final Supabase fallback cleanup is deployed and verified.
    - [ ] After cleanup, remove Supabase env vars from Vercel runtime.

7. [ ] **Final verification**
    - [ ] Run `pnpm.cmd --filter @aim-archive/web exec tsc --noEmit --pretty false`.
    - [ ] Run `cd apps/web; pnpm.cmd build` with `DATABASE_PROVIDER=turso`.
    - [ ] Run `pnpm.cmd migration:verify:turso -- --export .migration/supabase-export-20260527T142432Z`.
    - [ ] Run `rg "@supabase/supabase-js|createPublicClient|createAdminClient|supabase\\.storage|\\.rpc\\(" apps/web/src` and confirm only intentionally archived/migration code remains.
    - [ ] Update `CLAUDE.md` to say Turso/libSQL is the production database and Supabase is no longer a runtime dependency.
