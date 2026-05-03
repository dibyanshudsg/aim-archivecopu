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

### 1.5 Polish & Deploy ⬜ UP NEXT
- [ ] SEO optimization (meta tags, sitemap, structured data)
- [ ] Performance audit (Lighthouse score)
- [ ] Accessibility check
- [ ] Input validation with Zod on all API routes
- [ ] Deploy to Vercel
- [ ] Connect domain (aimarchive.aurosociety.org)

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
- [x] Add magazine filter chips: All, AIM, Agnisikha
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
