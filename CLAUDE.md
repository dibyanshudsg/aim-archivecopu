# AIM Archive — Project Bible

> **All India Magazine Digital Archive** — A state-of-the-art spiritual magazine archive platform (Web + Android + iOS) for Sri Aurobindo Society's publications.

---

## 1. Project Overview

### What
A modern, beautiful digital archive platform to preserve and provide free public access to decades of monthly magazine publications by Sri Aurobindo Society. The platform serves as the definitive archive for magazines published in English, Hindi, Tamil, Marathi, Bengali, and other Indian languages.

### Who
- **Organization**: Sri Aurobindo Society (linked to Sri Aurobindo Ashram / Auroville)
- **Parent Website**: https://aim.aurosociety.org/ (legacy — this project is a fresh, modern rebuild)
- **Target Subdomain**: https://aimarchive.aurosociety.org/ (tentative)
- **Audience**: Devotees, spiritual seekers, researchers, and all people worldwide
- **Admin Team**: Multiple admins (no role hierarchy — all admins have equal access)

### Why
The magazines — especially **All India Magazine** (English) and **Agnisikha** (Hindi) — contain excerpts from the writings of Sri Aurobindo and The Mother on spirituality, philosophy, and self-improvement. Archives go back to ~1990. This platform preserves them digitally and makes them universally accessible with modern search, browse, and reading experiences.

### Platforms
- **Web App** (primary) — responsive for desktop, tablet, mobile browsers
- **Android App** — native feel, mirrors web features, supports offline reading
- **iOS App** — same as Android (shared codebase via React Native/Expo)

---

## 2. Magazines & Content

### Magazine Editions (5–6 languages)
| Magazine Name | Language | Status |
|---|---|---|
| All India Magazine (AIM) | English | Primary |
| Agnisikha | Hindi | Active |
| (TBD) | Tamil | Active |
| (TBD) | Marathi | Active |
| (TBD) | Bengali | Active |
| (TBD) | Other | Potential |

- **Branding is unified** across all language editions (same logo, same identity)
- Magazine names may differ per language, but they belong to the same family
- Each issue has **themes/topics** (e.g., "Surrender", "Karma Yoga", "Education", "The Psychic Being")

### Content Structure
```
Magazine
  └── Language Edition
        └── Year
              └── Month (Issue)
                    ├── PDF (source — always uploaded as PDF)
                    ├── EPUB (auto-converted from PDF — Phase 2)
                    ├── MOBI (auto-converted from PDF — Phase 2)
                    ├── Metadata (title, description, tags, topics, page count)
                    └── Extracted text (OCR via Tesseract.js for full-text search indexing)
```

### File Handling
- **Source format**: Always PDF (uploaded by admin)
- **Auto-conversion**: PDF → EPUB and PDF → MOBI (planned — Phase 2)
- **Bulk import**: Support uploading multiple PDFs at once with metadata assignment (planned)
- **Naming convention**: `{Magazine Name} {Month}-{Year}.pdf` (e.g., `All India Magazine Apr-2026.pdf`)
- **Note**: Current PDFs are Chrome print-to-PDF (Skia renderer) — no selectable text layer. OCR is required for text extraction.

---

## 3. Tech Stack

### Web Frontend
- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion (smooth, modern, slick transitions)
- **PDF Viewer**: react-pdf (pdf.js wrapper) — in-app reading experience
- **State Management**: Zustand (lightweight, bookmarks store with localStorage persistence)
- **Icons**: Lucide React

### Mobile App
- **Framework**: React Native with Expo (SDK 52+)
- **Navigation**: Expo Router (file-based, 4 tabs: Home, Browse, Search, Library)
- **PDF Viewer**: react-native-pdf
- **Offline Storage**: expo-file-system + SQLite (expo-sqlite)
- **Shared Logic**: Shared TypeScript types/utilities with web via @aim-archive/shared

### Backend & Infrastructure
- **API**: Next.js API Routes (Route Handlers) — 16 endpoints
- **Database**: Supabase (PostgreSQL) — free tier, South Asia (Mumbai) region
- **Project ID**: `glduurfsjyxpkdnxgdqz`
- **Authentication**: Session cookie-based admin auth (admin email + shared password)
- **File Storage**: Supabase Storage (`magazines` bucket, public access)
- **Full-Text Search**: PostgreSQL Full-Text Search via Supabase RPC function (`search_issues`)
  - Uses `plainto_tsquery`, `ts_rank` for relevance, `ts_headline` for highlighted snippets
  - Fallback to ILIKE on titles/topics when no full-text results
- **PDF Text Extraction**: OCR pipeline — Tesseract.js + pdfjs-dist (v4) + node-canvas
  - Renders each PDF page to PNG via pdfjs-dist → node-canvas
  - OCR via Tesseract.js (eng+hin languages)
  - ~3-5 seconds per page, runs synchronously during admin upload
  - Supports scanned/image-based PDFs (no text layer required)
- **Hosting**: Vercel (web app) — free tier (planned deployment)
- **CDN**: Vercel Edge Network (automatic with Vercel hosting)

### DevOps
- **Version Control**: Git + GitHub (`MugdhanilK/aim-archive`, private repo)
- **CI/CD**: GitHub Actions (planned)
- **Monorepo**: Turborepo (manages web + mobile + shared packages)
- **Package Manager**: pnpm 10.33.0
- **Linting**: ESLint + Prettier (Tailwind plugin)
- **Testing**: Vitest (unit) + Playwright (e2e for web) — planned

---

## 4. Current Implementation Status

### 4.1 What's Built and Working

#### Public Web Pages (All Live)
- **Homepage** — hero section, animated bookshelf, features grid, archive stats, CTA
- **Browse page** — issue card grid with filters (magazine, year, language, topic)
- **Issue detail page** — cover display, metadata, topics, download/read/bookmark buttons
- **In-app PDF reader** — page navigation, zoom, fullscreen, page scrubber, bookmark
- **Search page** — full-text search with highlighted snippets, page numbers, advanced filters
- **Bookmarks page** — saved issues list with clear all (persisted via Zustand + localStorage)
- **Header** — responsive nav, mobile hamburger menu, search/bookmark icons
- **Footer** — links, branding, discreet admin link

#### Admin Panel (All Live)
- **Login** (`/admin/login`) — email + password authentication, session cookies
- **Dashboard** (`/admin`) — stat cards (magazines, issues, reads, downloads), popular issues, quick links
- **Magazine management** (`/admin/magazines`) — add/edit/delete with language selector
- **Issue management** (`/admin/issues`) — table with search, filters (magazine, year), sortable columns (title, date, reads, size), inline row editing (title, topics, description, month, year), publish/unpublish toggle, delete
- **Upload** (`/admin/issues/new`) — drag-drop PDF zone, auto-generated title, topics, description, uploads to Supabase Storage + OCR indexing

#### API Routes (16 endpoints)
| Route | Methods | Purpose |
|---|---|---|
| `/api/magazines` | GET | List all magazines |
| `/api/issues` | GET | List issues with filters/pagination |
| `/api/issues/[id]` | GET | Single issue detail + increment read count |
| `/api/search` | GET | Full-text search (RPC) with ILIKE fallback |
| `/api/pdf/[...path]` | GET | Serve local PDFs during development |
| `/api/admin/auth` | POST, DELETE | Admin login/logout |
| `/api/admin/auth/check` | GET | Verify admin session |
| `/api/admin/stats` | GET | Dashboard statistics |
| `/api/admin/magazines` | GET, POST | List/create magazines |
| `/api/admin/magazines/[id]` | PUT, DELETE | Update/delete magazine |
| `/api/admin/issues` | GET | List all issues (admin view) |
| `/api/admin/issues/[id]` | PUT, DELETE | Update/delete issue |
| `/api/admin/issues/[id]/reindex` | POST | Re-run OCR on single issue |
| `/api/admin/upload` | POST | Upload PDF + create issue + OCR index |
| `/api/admin/reindex` | POST | Batch reindex (one issue per call) |

#### Database (8 tables, Supabase PostgreSQL)
- `magazines` — 2 records (All India Magazine, Agnisikha)
- `issues` — 8 records (Jan–Apr 2026 × 2 magazines)
- `issue_search_index` — 384 pages of OCR-extracted text indexed
- `admins` — 1 admin (admin@aurosociety.org)
- `users` — empty (for future Google OAuth sync)
- `user_bookmarks` — empty (for future sync)
- `user_reading_history` — empty (for future sync)
- `analytics_visibility` — 5 metric configs seeded

#### OCR + Full-Text Search Pipeline
- **384 pages** indexed across 8 issues via Tesseract.js OCR
- Search returns page-level results with highlighted snippets and relevance ranking
- Example: searching "smile" returns results like:
  > **All India Magazine Apr-2026** — Page 24
  > "...light and faith and confidence and joy. If difficulty comes, even that can be faced with a **smile**..."
- New uploads are automatically OCR-indexed during the upload process

#### Mobile App (Skeleton)
- Expo project with 4 tab screens (Home, Browse, Search, Library)
- Tab navigation configured with AIM color scheme
- Placeholder content on all screens

### 4.2 What's Not Built Yet

#### Admin Enhancements (Planned)
- Bulk select & bulk actions
- Cover image upload per issue
- View/open link to public page
- Download count column
- Pagination for large lists
- Status filter (Published/Draft) + topic filter
- Export as CSV
- Bulk upload (multiple PDFs with auto-detect)
- Duplicate issue for quick uploads
- Confirmation toasts

#### Phase 1.5: Polish & Deploy
- SEO optimization (meta tags, sitemap, structured data)
- Input validation with Zod on all API routes
- Performance audit (Lighthouse)
- Accessibility check
- Deploy to Vercel
- Connect domain (aimarchive.aurosociety.org)

#### Phase 2: Enhanced Web Features
- PDF → EPUB/MOBI auto-conversion (Calibre CLI)
- Bulk download (select issues → ZIP)
- Google OAuth sign-in (optional, for cross-device sync)
- Cross-device sync (bookmarks, history, preferences)
- Advanced search (within-PDF search, highlighted results in reader)
- Public analytics display (admin-controlled visibility)
- Admin analytics dashboard (charts, search query analytics)

#### Phase 3: Mobile App (Android + iOS)
- Full feature parity with web
- Offline reading (download + local storage)
- My Library with storage management
- Push notifications for new issues
- Google Play + App Store deployment

#### Phase 4: Polish & Scale
- Meilisearch upgrade (if PostgreSQL FTS hits limits)
- "On This Day" historical highlights
- Guided tour / onboarding
- Error monitoring (Sentry)
- CDN optimization for large PDFs

---

## 5. Design System

### Color Palette
- **Primary**: White (#FFFFFF) — clean, bright
- **Accent**: Light Gold / Saffron (#D4A843) — spiritual warmth
- **Secondary accent**: Soft orange/amber tones (inspired by the logo flame)
- **Text**: Dark charcoal (#1A1A1A) for readability
- **Background**: Off-white / cream (#FFFCF5) for content areas
- **Cards/Surfaces**: White with subtle gold border or shadow
- **Implemented as**: Tailwind CSS 4 custom theme in `globals.css` with `gold-*` and `flame-*` color scales

### Logo
- File: `images/AIM_logo.png`
- A luminous golden flame with a figure of light — deeply spiritual
- Logo should be used as-is, not modified
- Copied to `apps/web/public/logo.png` for web use

### Typography
- **UI font**: Inter (variable, loaded via `next/font/google`)
- **Heading font**: Playfair Display (variable, loaded via `next/font/google`)
- Must support Devanagari, Tamil, Bengali, Marathi scripts for multilingual content

### Animation & Feel
- **Modern, slick, smooth** — not flashy, but refined
- Page transitions with Framer Motion
- Subtle hover effects on cards (border-gold, shadow)
- Loading skeletons (not spinners) — implemented on Browse, Search, Issue detail, Admin pages
- Micro-interactions on buttons, bookmarks
- **Performance note**: Removed backdrop-blur, infinite particle animations, and heavy CSS patterns after scroll lag was identified. Use GPU-friendly animations only.

### Design Philosophy
- **State of the art** — this is NOT a legacy spiritual website
- Think: Apple-level polish meets spiritual warmth
- Light, bright, airy — like a well-lit ashram library
- Content-first: magazines are the hero, UI gets out of the way
- Accessibility: readable fonts, good contrast, keyboard navigation

---

## 6. Database Schema

### Core Tables (Supabase PostgreSQL)
```sql
magazines
  - id UUID PK DEFAULT uuid_generate_v4()
  - name TEXT NOT NULL
  - language TEXT NOT NULL DEFAULT 'english'
  - description TEXT NOT NULL DEFAULT ''
  - cover_image_url TEXT
  - created_at TIMESTAMPTZ DEFAULT NOW()
  - updated_at TIMESTAMPTZ DEFAULT NOW()

issues
  - id UUID PK DEFAULT uuid_generate_v4()
  - magazine_id UUID FK → magazines(id) ON DELETE CASCADE
  - title TEXT NOT NULL
  - year INT NOT NULL
  - month INT NOT NULL CHECK (1-12)
  - description TEXT
  - topics TEXT[] DEFAULT '{}'
  - pdf_url TEXT NOT NULL
  - epub_url TEXT (nullable)
  - mobi_url TEXT (nullable)
  - cover_image_url TEXT (nullable)
  - page_count INT (nullable)
  - file_size_bytes BIGINT DEFAULT 0
  - read_count INT DEFAULT 0
  - download_count INT DEFAULT 0
  - is_published BOOLEAN DEFAULT TRUE
  - created_at, updated_at TIMESTAMPTZ
  - UNIQUE(magazine_id, year, month)
  - Indexes: magazine_id, year+month, topics (GIN), is_published (partial)

issue_search_index
  - id UUID PK
  - issue_id UUID FK → issues(id) ON DELETE CASCADE
  - page_number INT NOT NULL
  - content TEXT NOT NULL
  - search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
  - Indexes: search_vector (GIN), issue_id

admins
  - id UUID PK, email TEXT UNIQUE, name TEXT, created_at

users (for future cross-device sync)
  - id UUID PK, google_id TEXT UNIQUE, email TEXT, display_name TEXT, created_at

user_bookmarks
  - id UUID PK, user_id FK → users, issue_id FK → issues, UNIQUE(user_id, issue_id)

user_reading_history
  - id UUID PK, user_id FK → users, issue_id FK → issues, last_page INT, last_read_at

analytics_visibility
  - id UUID PK, metric_name TEXT UNIQUE, is_public BOOLEAN, updated_by FK → admins
```

### RPC Functions
```sql
search_issues(search_query, filter_magazine_id, filter_year_from, filter_year_to, result_limit, result_offset)
  → TABLE (issue_id, issue_title, magazine_name, magazine_language, year, month, page_number, snippet, rank, cover_image_url, pdf_url)
  -- Uses plainto_tsquery, ts_rank, ts_headline with <mark> highlights
```

### Row Level Security
- Magazines: public SELECT
- Issues: public SELECT where is_published = TRUE
- Search index: public SELECT
- Analytics visibility: public SELECT
- Users/bookmarks/history: authenticated users can manage own data
- Admin writes bypass RLS via service role key

### Auto-update Triggers
- `magazines.updated_at` and `issues.updated_at` auto-update on row change

---

## 7. Project Structure (Monorepo)

```
d:/AIM Project/
├── CLAUDE.md                    # This file (project bible)
├── ROADMAP.md                   # Phased development roadmap
├── TO DO LIST.md                # Task tracking
├── images/
│   └── AIM_logo.png             # Brand logo
├── AIM 2026/                    # Source PDFs (not in git)
│   ├── All India Magazine Jan-2026.pdf
│   ├── All India Magazine Feb-2026.pdf
│   ├── All India Magazine Mar-2026.pdf
│   └── All India Magazine Apr-2026.pdf
├── Agnisikha 2026/              # Source PDFs (not in git)
│   ├── Agnishikha Jan-2026.pdf
│   ├── Agnishikha Feb-2026.pdf
│   ├── Agnishikha Mar-2026.pdf
│   └── Agnishikha Apr-2026.pdf
├── apps/
│   ├── web/                     # Next.js 15 web app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx          # Root layout (Inter + Playfair Display)
│   │   │   │   ├── page.tsx            # Homepage (hero, bookshelf, features)
│   │   │   │   ├── browse/page.tsx     # Browse with filters
│   │   │   │   ├── search/page.tsx     # Full-text search with snippets
│   │   │   │   ├── bookmarks/page.tsx  # Bookmarked issues
│   │   │   │   ├── issue/[id]/page.tsx # Issue detail
│   │   │   │   ├── read/[id]/page.tsx  # PDF reader
│   │   │   │   ├── admin/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   └── (dashboard)/
│   │   │   │   │       ├── layout.tsx      # Sidebar nav
│   │   │   │   │       ├── page.tsx        # Dashboard
│   │   │   │   │       ├── magazines/page.tsx
│   │   │   │   │       └── issues/
│   │   │   │   │           ├── page.tsx    # Issue table
│   │   │   │   │           └── new/page.tsx # Upload
│   │   │   │   └── api/                # 16 API routes
│   │   │   ├── components/
│   │   │   │   ├── home/animated-bookshelf.tsx
│   │   │   │   ├── layout/header.tsx, footer.tsx
│   │   │   │   ├── magazine/issue-card.tsx
│   │   │   │   └── search/search-result-item.tsx
│   │   │   ├── lib/
│   │   │   │   ├── api.ts              # Client-side API + types
│   │   │   │   ├── admin-auth.ts       # Session verification
│   │   │   │   ├── bookmarks-store.ts  # Zustand store
│   │   │   │   ├── mock-data.ts        # Dev mock data (still used as fallback)
│   │   │   │   ├── pdf-extract.ts      # OCR pipeline (Tesseract + pdfjs + canvas)
│   │   │   │   ├── search-indexer.ts   # Index pages into Supabase
│   │   │   │   ├── supabase-server.ts  # Singleton Supabase clients
│   │   │   │   └── utils.ts           # formatFileSize, formatMonthYear, cn
│   │   │   └── styles/globals.css      # Tailwind theme (gold/flame colors)
│   │   ├── public/logo.png
│   │   ├── .env.local                  # Supabase keys (not in git)
│   │   ├── .env.local.example
│   │   ├── next.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── eslint.config.mjs
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── mobile/                  # React Native (Expo) — skeleton
│       ├── app/
│       │   ├── _layout.tsx
│       │   └── (tabs)/
│       │       ├── _layout.tsx
│       │       ├── index.tsx    # Home
│       │       ├── browse.tsx
│       │       ├── search.tsx
│       │       └── library.tsx
│       ├── app.json
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── shared/                  # @aim-archive/shared
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts         # Magazine, Issue, SearchResult, etc.
│   │       └── constants.ts     # MONTH_NAMES, LANGUAGE_NAMES, etc.
│   ├── supabase/                # @aim-archive/supabase
│   │   ├── migrations/
│   │   │   ├── 00001_initial_schema.sql    # All tables + RLS + triggers
│   │   │   └── 00002_search_rpc.sql        # search_issues() function
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts        # createClient, createServerClient
│   │       └── database.types.ts
│   └── eslint-config/           # @aim-archive/eslint-config
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── pnpm-lock.yaml
```

---

## 8. Credentials & Configuration

### Supabase
- **Project URL**: `https://glduurfsjyxpkdnxgdqz.supabase.co`
- **Project ID**: `glduurfsjyxpkdnxgdqz`
- **Region**: South Asia (Mumbai)
- **Storage bucket**: `magazines` (public)
- Keys stored in `apps/web/.env.local` (not committed to git)

### Admin Access
- **Email**: `admin@aurosociety.org`
- **Password**: `[REDACTED_ADMIN_PASSWORD]` (set via `ADMIN_PASSWORD` env var, defaults to this)
- **Admin panel URL**: `/admin/login`

### GitHub
- **Repository**: `MugdhanilK/aim-archive` (private)
- **Branch**: `main`

---

## 9. MVP Definition (Phase 1) — MOSTLY COMPLETE

### MVP Includes ✅
1. ✅ **Homepage** — hero section, animated bookshelf, archive stats, features
2. ✅ **Browse page** — filter by magazine, language, year, topic
3. ✅ **Issue detail page** — cover, metadata, download buttons, read button
4. ✅ **In-app PDF reader** — smooth, responsive, page navigation, zoom, fullscreen
5. ✅ **Search** — global full-text OCR search with highlighted snippets + page numbers
6. ✅ **Bookmarks** — heart icon to save, bookmarks page to view (local storage)
7. ✅ **Download** — individual PDF download via Supabase Storage CDN
8. ✅ **Responsive design** — works on desktop, tablet, mobile
9. ✅ **Admin panel** — login, upload PDFs, edit metadata, manage issues/magazines
10. ✅ **Database + API** — full backend with Supabase (8 tables, 16 API routes)

### MVP Remaining
- Deploy to Vercel
- SEO basics (meta tags, sitemap)
- Input validation (Zod)

### MVP Excludes (Phase 2+)
- EPUB/MOBI auto-conversion
- Bulk download as ZIP
- Google sign-in & cross-device sync
- Android/iOS native app
- Offline reading
- Public analytics display
- Advanced analytics dashboard
- Push notifications
- "On This Day" feature
- Bulk import with smart metadata detection

---

## 10. Development Phases

### Phase 1: Foundation + MVP Web App ✅ ~95% COMPLETE
- ✅ Project scaffolding (monorepo, configs, tooling)
- ✅ Supabase setup (database, storage, auth)
- ✅ Core API routes (magazines, issues, search, upload)
- ✅ Homepage, browse, issue detail, reader, search, bookmarks
- ✅ Admin panel (CRUD + upload + search/filter/sort)
- ✅ PDF OCR text extraction pipeline (Tesseract.js)
- ✅ Full-text search with ranked results and snippets
- ✅ Responsive design + animations
- ⬜ SEO optimization, Zod validation, deploy to Vercel

### Phase 2: Enhanced Web Features
- EPUB/MOBI auto-conversion pipeline
- Bulk download (ZIP)
- Google OAuth + preference syncing
- Advanced search filters + sort
- Public analytics display
- Admin analytics dashboard
- Bulk import tool

### Phase 3: Mobile App
- Expo project build-out (mirrors web features)
- Offline reading (download + local storage)
- My Library with storage management
- Background sync
- App store deployment

### Phase 4: Polish & Scale
- Performance optimization
- SEO optimization
- Accessibility audit
- Push notifications
- "On This Day" / editorial features
- Meilisearch upgrade (if PostgreSQL FTS hits limits)
- CDN optimization for large PDF files
- Guided tour of the system (onboarding)

---

## 11. Coding Standards

### General
- **TypeScript** everywhere — strict mode, no `any`
- **Functional components** only (React)
- **Named exports** preferred over default exports
- **Absolute imports** using `@/` alias
- File naming: `kebab-case` for files, `PascalCase` for components
- Keep components small and focused (< 150 lines ideally)
- Colocate related files (component + styles + tests together)

### Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- One logical change per commit (atomic commits going forward)
- Branch naming: `feature/`, `fix/`, `chore/` prefixes

### API
- RESTful conventions
- Consistent error response format: `{ error: string, code: string }`
- Input validation with Zod (planned)
- Admin routes protected by `verifyAdmin()` check

### Database
- All migrations in `packages/supabase/migrations/`
- Use Row Level Security (RLS) policies
- Index frequently queried columns
- Admin writes use service role key (bypasses RLS)

---

## 12. Key Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Web framework | Next.js 15 | SSR for SEO, App Router, React ecosystem |
| Mobile framework | React Native + Expo | Cross-platform, shares React knowledge |
| Database | Supabase (PostgreSQL) | Free tier, built-in auth/storage/realtime |
| Monorepo | Turborepo + pnpm | Fast builds, shared packages |
| Styling | Tailwind CSS 4 | Rapid development, consistent design |
| Animations | Framer Motion | Smooth, declarative, React-native |
| Search | PostgreSQL FTS + OCR | Free, built-in, works on image PDFs |
| PDF text extraction | Tesseract.js OCR | PDFs have no text layer (Chrome print-to-PDF) |
| PDF viewer | react-pdf | Mature, pdf.js based, customizable |
| Auth (admin) | Session cookies + admins table | Simple, no external auth provider needed |
| Auth (public) | Supabase Auth (Google) | Simple, free, works with existing stack — Phase 2 |
| Hosting | Vercel + Supabase | Free tiers, excellent DX |
| PDF rendering for OCR | pdfjs-dist v4 + node-canvas | v4 compatible with node-canvas, v5 breaks |

---

## 13. Environment & Accounts

- [x] GitHub repository (`MugdhanilK/aim-archive`, private)
- [x] Supabase project (free tier, Mumbai region)
- [ ] Vercel account (free tier — https://vercel.com)
- [ ] Google Cloud Console project (for OAuth client ID — Phase 2)
- [ ] Expo account (for mobile builds — https://expo.dev — Phase 3)
- [ ] Domain DNS access (to configure aimarchive.aurosociety.org)

---

## 14. Reference Files

- **Logo**: `images/AIM_logo.png` — Golden flame with luminous figure
- **Source PDFs**: `AIM 2026/` and `Agnisikha 2026/` folders (not in git)
- **TODO**: `TO DO LIST.md` — task tracking
- **Roadmap**: `ROADMAP.md` — phased development plan
- **Env example**: `apps/web/.env.local.example` — environment variable template

---

## 15. Known Issues & Notes

- **PDF text extraction**: PDFs created by Chrome Skia renderer have no selectable text. OCR (Tesseract.js) is required and adds ~3-5 seconds per page during upload.
- **Hindi OCR**: The PostgreSQL full-text search uses `'english'` language config. Hindi text is tokenized but not stemmed properly. A future enhancement could use `'simple'` config for non-English content.
- **pdfjs-dist version**: Must use v4.x (4.8.69). v5.x breaks compatibility with node-canvas for server-side rendering.
- **Scroll performance**: Removed `backdrop-blur`, infinite CSS animations, and heavy radial gradients after observing scroll lag. Header uses `bg-white/95` instead of blur.
- **Tesseract.js trained data**: `eng.traineddata` and `hin.traineddata` files are in `apps/web/` — these are auto-downloaded by Tesseract.js on first use.
