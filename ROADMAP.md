# AIM Archive — Development Roadmap

## Phase 1: Foundation + MVP Web App
> Goal: A fully functional public archive website with admin management

### 1.1 Project Scaffolding ✅ COMPLETE
- [x] Turborepo monorepo setup (web + mobile + shared packages)
- [x] Next.js 15 app (TypeScript, Tailwind CSS 4, Framer Motion)
- [x] Expo React Native app (skeleton — 4 tab screens)
- [x] Shared types/utilities package (@aim-archive/shared)
- [x] Supabase package (client, DB types, migration SQL)
- [x] ESLint + Prettier configuration
- [x] pnpm workspace configuration
- [x] Design system (gold/cream palette, Inter + Playfair Display fonts)
- [x] Production build — 0 errors, 0 warnings
- [ ] GitHub Actions CI pipeline

### 1.2 Backend & Database ✅ COMPLETE
- [x] Supabase project creation (South Asia / Mumbai region)
- [x] Run initial migration (00001_initial_schema.sql) — 8 tables
- [x] Row Level Security (RLS) policies on all tables
- [x] Supabase Storage bucket (magazines) — 8 real PDFs uploaded (~170MB)
- [x] API routes: magazines (GET, POST, PUT, DELETE)
- [x] API routes: issues (GET, POST, PUT, DELETE)
- [x] API routes: file upload (PDF → Supabase Storage)
- [x] API routes: search (title, description, topics with filters)
- [x] API routes: admin auth (login, logout, session check)
- [x] API routes: admin stats (dashboard data)
- [x] Replace mock data with live Supabase queries
- [x] PDF text extraction via OCR (Tesseract.js + pdfjs-dist + node-canvas)
- [x] Full-text search RPC function (plainto_tsquery, ts_rank, ts_headline)
- [x] Search API rewritten for full-text search with fallback to title/topic matching
- [x] Search UI updated — page-level results with highlighted snippets
- [x] Reindex endpoints (single issue + batch backfill)
- [x] All 8 issues backfilled — 384 pages indexed
- [ ] Input validation with Zod — deferred to Phase 1.5

### 1.3 Public Web Pages ✅ COMPLETE
- [x] Global layout (header, navigation, footer)
- [x] Homepage — hero, animated bookshelf, features grid, stats, CTA
- [x] Browse page — issue card grid, filters (magazine, year, language, topic)
- [x] Issue detail page — cover, metadata, topics, download buttons, bookmark
- [x] In-app PDF reader — page nav, zoom, fullscreen, page scrubber, bookmark
- [x] Search page — global search, advanced filters, sort, popular topics
- [x] Bookmarks page — saved issues list with clear all (Zustand + localStorage)
- [x] Heart icon bookmark on issue cards and detail pages
- [x] Responsive design (desktop, tablet, mobile)
- [x] Smooth Framer Motion animations throughout
- [x] Scroll performance optimized (removed backdrop-blur, particles, heavy filters)
- [x] Loading skeletons on Browse, Search, Issue detail pages
- [x] All pages wired to live Supabase data

### 1.4 Admin Panel ✅ COMPLETE
- [x] Admin authentication (login page, session cookies, auth check)
- [x] Admin layout (sidebar nav, mobile responsive, logout)
- [x] Admin dashboard — stat cards (magazines, issues, reads, downloads), popular issues, quick links
- [x] Magazine management — add/edit/delete with language selector
- [x] Issue management — table with search, filters (magazine, year), sortable columns (title, date, reads, size)
- [x] Inline row editing — title, topics, description, month, year
- [x] Publish/unpublish toggle per issue
- [x] PDF upload page — drag-drop zone, auto-generated title, topics, description
- [x] Discreet admin link in public footer

#### Admin Issues Page — Enhancements Pending
- [ ] Bulk select & bulk actions (delete, publish/unpublish, edit topics)
- [ ] Cover image upload per issue
- [ ] View/open link to public page or PDF
- [ ] Download count column
- [ ] Pagination for large lists (850+ issues)
- [ ] Status filter (Published / Draft)
- [ ] Topic filter dropdown
- [ ] Export issue list as CSV
- [ ] Bulk upload — multiple PDFs with auto-detected month/year from filename
- [ ] Duplicate issue — clone metadata for quick uploads
- [ ] Last modified date per row
- [ ] Confirmation toast after edit/delete/upload

### 1.5 Polish & Deploy ✅ MOSTLY COMPLETE
- [x] SEO optimization (meta tags, sitemap, structured data)
- [ ] Performance audit (Lighthouse score)
- [ ] Accessibility check
- [x] Input validation with Zod on all API routes
- [x] Deploy to Vercel (`aim-archive.vercel.app`)
- [ ] Connect domain (aimarchive.aurosociety.org) — DNS via Dibyanshu, planned

### 1.7 Theme Title + Admin Redesign ✅ COMPLETE (May 2026)
> Goal: First-class support for each issue's overarching theme + admin polish.

- [x] `theme TEXT` column on issues (migration `00005_add_theme_column.sql`)
- [x] `Theme Title` field added to admin upload form + edit panel
- [x] Renamed Title → Magazine Title, Topics → Topic Tags across all admin and public surfaces
- [x] Theme display across browse cards, browse list view, issue detail page, reader info drawer, continue-reading shelf, admin issues table — gold-flame gradient with vertical accent bar; no italic (Devanagari clipping fix)
- [x] Theme-aware search across Browse filter, Bookmarks filter, admin Issues filter, and `/api/search` (FTS + metadata in parallel)
- [x] Admin sidebar: collapsible (icons-only rail) + drag-resizable + persisted to localStorage
- [x] Admin issues table redesign: cover thumbnails with portal-rendered hover preview; 2-row card unit per issue (main row + actions row); hover scale + lift; inline slide-down edit form (centered card with flame border); Save button gated by isDirty memo; auto-regenerate Magazine Title on dropdown change
- [x] Browse + Bookmarks grid breakpoints unified (2/3/3/4/4/5 across responsive tiers)

### 1.8 Cloudflare R2 Storage Migration 🟡 IN PROGRESS (Phases 0–2 done; 3–4 remaining)
> Goal: Replace Supabase Storage with Cloudflare R2 for zero egress fees + better India delivery. Approved by Kaushal Ji (May 2026).

#### Phase 0 — Account & bucket setup ✅ COMPLETE (2026-05-11)
- [x] Society-owned Cloudflare account + `aim-archive` R2 bucket (coordinated with Dibyanshu)
- [x] Public access enabled (`pub-3ed08073797148cf93d772ea1eb341f9.r2.dev`)
- [x] R2 API token issued (Object Read & Write, scoped to `aim-archive` bucket)
- [x] CORS policy applied — GET/HEAD allowed from `aim-archive.vercel.app`, `aimarchive.aurosociety.org`, `aim.aurosociety.org`, `http://localhost:3000`
- [x] Connectivity smoke test (`scripts/test-r2.mjs`) — PUT/LIST/HEAD/GET/DELETE all green, CORS preflight returns 204 with ACAO

#### Phase 1 — Foundation (no behavior change) ✅ COMPLETE (2026-05-11)
- [x] Move `@aws-sdk/client-s3` from root devDeps to `apps/web` runtime deps
- [x] New `apps/web/src/lib/r2-client.ts` — memoised S3 client + `uploadToR2`, `deleteFromR2`, `keyFromPublicUrl`, `storageKeyFromUrl`, `isR2Url`, `isSupabaseStorageUrl` helpers
- [x] Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` to `apps/web/.env.local.example` and `turbo.json` `build.env`
- [x] Smoke test script `scripts/test-r2.mjs` resolves SDK out of `apps/web/node_modules` via `createRequire`

#### Phase 2 — Wire R2 as the storage layer ✅ COMPLETE (2026-05-11)
- [x] Refactor `apps/web/src/lib/pdf-thumbnail.ts` to write to R2 (dropped `SupabaseClient` param)
- [x] Refactor `apps/web/src/lib/crop-cover-spread.ts` to write to R2 (dropped `SupabaseClient` param)
- [x] `/api/admin/upload` — writes source PDF + cover/thumbnail to R2
- [x] `/api/admin/issues/[id]` DELETE — recognises both R2 + Supabase legacy URLs; also cleans up the cover (fixed pre-existing leak)
- [x] `/api/admin/issues/[id]/pdf` — replace always writes to R2; if prior URL was Supabase legacy, the old file is removed (implicit per-issue migration)
- [x] `/api/admin/issues/[id]/cover` — uploads to R2; derives key from `pdf_url` via `storageKeyFromUrl` (works for either backend)
- [x] `/api/admin/thumbnails`, `/api/admin/reindex`, `/api/admin/issues/[id]/reindex` — backfill/reindex routes write thumbnails to R2
- [x] Add `pub-3ed08073797148cf93d772ea1eb341f9.r2.dev` to `next.config.ts` `images.remotePatterns` (Next blocks unconfigured image hosts)
- [x] Add R2 creds to `apps/web/.env.local` for dev
- [x] Manual upload test: both "All India Magazine — May 2026" and "Agnishikha — May 2026" uploaded; PDF + cover served from `pub-*.r2.dev`; reader rendered the PDF cleanly

#### Phase 3 — Migrate the existing 8 issues
- [ ] New `scripts/migrate-storage-to-r2.mjs` — for each issue: download from Supabase, re-upload to R2 with the same key, update `issues.pdf_url` + `issues.cover_image_url`. Idempotent — skips rows already on R2
- [ ] Dry-run mode first (`--dry`), then real run
- [ ] Spot-check 2–3 issues in the live reader — PDF + thumbnail load from R2

#### Phase 4 — Production cutover
- [ ] Add the 5 `R2_*` env vars on Vercel (Production, Preview, Development)
- [ ] Push, redeploy, verify live site loads PDFs from R2
- [ ] After ~7 days of stable verification, empty the Supabase Storage `magazines` bucket (keep DB rows; URLs already point at R2)
- [ ] Documentation: update `CLAUDE.md` §3 (Tech Stack), §15 (Known Issues if any surface), §16 (Deployment Flow with R2 env vars)

#### Phase 5 — Future enhancements (separate work)
- [ ] Move from `pub-*.r2.dev` to a custom domain like `cdn.aimarchive.aurosociety.org` — single env-var change once DNS is ready
- [ ] Mirror PDFs to Internet Archive (archive.org) as preservation backup + alternate access route
- [ ] Cloudflare CDN cache rules for popular issues (further latency improvement)

See `TO DO LIST.md` § "Up Next — Migrate Storage to Cloudflare R2" for the originating checklist.

### 1.6 Public UI/UX Polish
> Goal: Make the public archive feel calm, tactile, and easy to explore.

#### Homepage Shelf
- [x] Replace decorative bookshelf with live latest-issue data from Supabase
- [x] Show real cover thumbnails and link every issue directly to `/read/[id]`
- [x] Add hover/long-press book preview with actual PDF page snapshots
- [x] Add automatic 3D page flip with stable page-content handoff
- [x] Make hover switching immediate: old book closes while new book opens
- [x] Remove bookmark close animation from homepage preview
- [x] Add polished sorting pill: Recent, Issue Date, A-Z
- [x] Add a subtle shelf status line, e.g. `Showing 8 latest issues`
- [x] Add magazine filter chips: All, AIM, Agnishikha
- [x] Add a tiny page indicator inside opened preview, e.g. `4-5 / 44`
- [ ] Tune hover timing after real-user testing

#### Browse Continuity
- [x] Make Browse issue cards visually echo homepage book cards
- [x] Add the same gradient spine, title/date typography, and cover treatment
- [ ] Keep filter/sort controls dense and scan-friendly for repeated use

#### Reader Flow
- [x] Add contextual back link: back to shelf, browse, search, or bookmarks
- [x] Preserve source context when opening `/read/[id]`
- [x] Add a compact issue info drawer inside the reader

#### Personalization
- [x] Add `Continue reading` shelf from local reading history
- [ ] Add `Recently viewed` or `Last opened` ordering where useful
- [ ] Prepare interaction patterns for future synced account state

#### Feedback
- [x] Add footer feedback link for visitor concerns, requests, and advice
- [x] Make feedback Google Form URLs manageable from the admin Settings page
- [x] Store separate public form and admin edit/manage URLs

#### Loading And Empty States
- [x] Replace plain homepage loading text with skeleton book spines
- [ ] Add refined empty states for Browse, Search, and Bookmarks

#### Motion System
- [ ] Consolidate shared open/close/sort motion timings
- [ ] Keep animations tactile but restrained; avoid decorative motion that delays task flow
- [ ] Respect reduced-motion preferences

---

## Phase 2: Enhanced Web Features
> Goal: Complete feature set for the web platform

- [x] ~~PDF text extraction pipeline~~ (moved to Phase 1.2 — done via OCR)
- [ ] PDF → EPUB auto-conversion (Calibre CLI)
- [ ] PDF → MOBI auto-conversion
- [ ] Bulk download — select issues → ZIP
- [ ] Download by range (e.g., "Jan 2020 – Dec 2020")
- [ ] Google OAuth sign-in (optional, one-tap)
- [ ] Cross-device sync (bookmarks, history, preferences)
- [ ] Advanced search — within-PDF search, highlighted results
- [ ] Public analytics display (admin-controlled visibility)
- [ ] Admin analytics dashboard (detailed charts, search queries)

---

## Phase 3: Mobile App (Android + iOS)
> Goal: Native mobile experience mirroring web features

- [x] Expo project setup + navigation structure (4 tabs: Home, Browse, Search, Library)
- [ ] Home screen — latest issues, browse
- [ ] Browse screen — filters, search
- [ ] Issue detail screen
- [ ] In-app PDF reader (react-native-pdf)
- [ ] Search functionality
- [ ] Bookmarks (local + synced)
- [ ] Offline reading — download manager
- [ ] My Library — downloaded issues, storage management
- [ ] Background sync
- [ ] Platform-native design (Android Material, iOS HIG)
- [ ] Push notifications for new issues (optional)
- [ ] Build & deploy to Google Play Store
- [ ] Build & deploy to Apple App Store

---

## Phase 4: Polish & Scale
> Goal: Production hardening, advanced features, growth

- [ ] Performance optimization (lazy loading, image optimization, caching)
- [ ] Meilisearch upgrade (if PostgreSQL FTS hits limits)
- [ ] CDN optimization for large PDF files
- [ ] Guided tour / onboarding for new users
- [ ] "On This Day" — historical highlights feature
- [ ] Editorial features (featured issues, curated collections)
- [ ] Advanced admin tools (scheduled publishing, batch operations)
- [ ] Error monitoring (Sentry)
- [ ] Uptime monitoring
- [ ] Load testing
