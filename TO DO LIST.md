# AIM Archive — To Do List

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
- [ ] Admin auth hardening: signed session cookie, no default password fallback, login rate limiting
- [ ] Browse scalability: move filtering, sorting, facets, and pagination server-side (current client data is capped)
- [x] Footer magazine links: replace slug-like values (`aim`, `agnisikha`) with working IDs/slugs
- [x] Download analytics: add a download route that increments `download_count` before serving/redirecting PDF
- [x] Read analytics: use an atomic DB/RPC increment for `read_count`
- [x] Search safety: sanitize highlighted snippets before rendering HTML
- [x] Admin Issues UI: remove per-row "view public page" and "download PDF" actions to free table space
- [ ] Mobile readiness: add missing Expo assets and fix mobile lint dependency/config
- [ ] Test baseline: add focused tests for auth, draft visibility, browse filters, search, and counters
- [ ] Tooling cleanup: migrate web lint script away from deprecated `next lint`
- [ ] Optional resilience: self-host fonts / PDF worker to reduce external build/runtime dependency

## Up Next — Migrate Storage to Cloudflare R2

> **Why:** Supabase Storage charges egress (bandwidth) per GB. R2 charges **zero** egress, forever. With ~25 MB per issue and a public archive, this saves ₹2,000+/month at scale and removes "viral spike" billing risk. Free tier (10 GB / 1M reads/mo) covers the first ~400 issues.

### A. Cloudflare account & bucket setup (manual, ~10 min)
- [ ] Sign up / log in at https://dash.cloudflare.com
- [ ] Add payment method (required for R2 even on free tier — won't be charged unless free tier is exceeded)
- [ ] R2 → **Create bucket**
  - Name: `aim-archive`
  - Location: **Asia-Pacific (APAC)** for closest hop to Indian users
  - Default Storage Class: Standard
- [ ] Bucket → Settings → **Public access** → enable **r2.dev subdomain**
  - Save the public URL (`https://pub-XXXXXXXX.r2.dev`)
- [ ] R2 → **Manage R2 API Tokens** → **Create API Token**
  - Name: `aim-archive-app`
  - Permissions: **Object Read & Write**
  - Specify bucket: `aim-archive` only (not all buckets)
  - Save: **Access Key ID**, **Secret Access Key**, **Account ID** (from endpoint URL)

### B. Code changes
- [ ] Add deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- [ ] New file `apps/web/src/lib/r2-client.ts` — configured S3 client pointed at R2
- [ ] Refactor `apps/web/src/lib/pdf-thumbnail.ts` to upload thumbnails to R2 (drop Supabase Storage dep)
- [ ] Refactor `/api/admin/upload` to write source PDFs to R2
- [ ] Refactor `/api/admin/issues/[id]` DELETE to clean up R2 instead of Supabase Storage
- [ ] Update `apps/web/.env.local.example` with new vars:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET=aim-archive`
  - `R2_PUBLIC_BASE_URL=https://pub-XXXXXXXX.r2.dev`

### C. Migration script (one-shot for existing 8 issues)
- [ ] New file `scripts/migrate-storage-to-r2.ts`
  - List all objects in Supabase Storage `magazines` bucket
  - Stream each to R2 via S3 SDK (`PutObjectCommand`)
  - Update `issues.pdf_url` and `issues.cover_image_url` rows in DB to point at new R2 URLs
- [ ] Run script locally with both Supabase + R2 creds in `.env.local`
- [ ] Spot-check: open 2–3 issues in the reader, confirm PDF + thumbnail load from R2 URLs

### D. Vercel + production
- [ ] Add the same 5 env vars on Vercel: Settings → Environment Variables (all three environments: Production, Preview, Development)
- [ ] Add `R2_*` and `R2_PUBLIC_BASE_URL` to `turbo.json` `globalEnv` and `build.env`
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

## Immediate Plan — Post-Kaushal-Approval (2026-05-04)

> Kaushal Ji has approved: (1) Cloudflare R2 storage, (2) current Topic Tags + popular-topics structure as the categorisation layer, (3) the present upload flow, (4) `aimarchive.aurosociety.org` as the new subdomain, and (5) the long-term north star of replacing `aim.aurosociety.org` with this archive once enough issues are uploaded — with the current month's issue prominently featured on the homepage. All technical operations route through **Dibyanshu**.

### Coordination — kickoff with Dibyanshu (this week)

1. [ ] Reach out to Dibyanshu — single message covering R2 account, asset pipeline, and DNS (draft separately so all topics are on the table at once).
2. [ ] Settle Cloudflare account ownership — Society-owned account (Society email + Society payment method on file); generate R2 API tokens for the app and share securely.
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

13. [ ] Design and ship a featured "current month" hero — large cover, Magazine Title + Theme Title, tagline pulled from description, prominent Read button.
14. [ ] Position it above the existing animated bookshelf so it owns the first impression while preserving the archive's discovery layer.
15. [ ] Build with the future state in mind — this homepage should feel comfortable as the main AIM site so the eventual cutover from `aim.aurosociety.org` is design-ready, not a redesign.

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

23. [ ] Remove the bookmark toast (per prior feedback — bookmark add/remove should not produce a toast).
24. [ ] Audit other toasts and silence the noisy ones; keep toasts for outcomes the user can't otherwise see (uploads, deletes, batch actions).


