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
- [ ] Bulk **edit topics** in batch (deferred — needs an "add / remove tag across selection" modal)
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
