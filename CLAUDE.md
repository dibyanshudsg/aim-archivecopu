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
                    ├── EPUB (auto-converted from PDF)
                    ├── MOBI (auto-converted from PDF)
                    ├── Metadata (title, description, tags, topics, page count)
                    └── Extracted text (for full-text search indexing)
```

### File Handling
- **Source format**: Always PDF (uploaded by admin)
- **Auto-conversion**: System converts PDF → EPUB and PDF → MOBI on upload
- **Bulk import**: Support uploading multiple PDFs at once with metadata assignment
- **Naming convention**: `{Magazine Name} {Month}-{Year}.pdf` (e.g., `All India Magazine Apr-2026.pdf`)

---

## 3. Tech Stack

### Web Frontend
- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion (smooth, modern, slick transitions)
- **PDF Viewer**: react-pdf (pdf.js wrapper) — in-app reading experience
- **State Management**: Zustand (lightweight, simple)
- **Icons**: Lucide React

### Mobile App
- **Framework**: React Native with Expo (SDK 52+)
- **Navigation**: React Navigation v7
- **PDF Viewer**: react-native-pdf
- **Offline Storage**: expo-file-system + SQLite (expo-sqlite)
- **Shared Logic**: Shared TypeScript types/utilities with web

### Backend & Infrastructure
- **API**: Next.js API Routes (Route Handlers)
- **Database**: Supabase (PostgreSQL) — free tier
- **Authentication**: Supabase Auth (Google OAuth for optional sign-in)
- **File Storage**: Supabase Storage (PDF/EPUB/MOBI files)
- **Full-Text Search**: PostgreSQL Full-Text Search via Supabase (upgrade path: Meilisearch)
- **PDF Text Extraction**: pdf-parse (Node.js, runs on upload for search indexing)
- **PDF Conversion**: Calibre CLI (`ebook-convert`) for PDF → EPUB/MOBI
- **Hosting**: Vercel (web app) — free tier
- **CDN**: Vercel Edge Network (automatic with Vercel hosting)

### DevOps
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Monorepo**: Turborepo (manages web + mobile + shared packages)
- **Package Manager**: pnpm
- **Linting**: ESLint + Prettier
- **Testing**: Vitest (unit) + Playwright (e2e for web)

---

## 4. Features — Detailed Breakdown

### 4.1 Public Features (No Login Required)

#### Browse & Discover
- Browse by **magazine name** (AIM, Agnisikha, etc.)
- Browse by **language**
- Browse by **year → month** (timeline view)
- Browse by **topic/theme** (tag-based)
- **Latest issues** on homepage with cover thumbnails
- **"On This Day"** or historical highlights section

#### Read
- **In-app PDF viewer** (web + mobile) — no need to download to read
- Page-by-page navigation, zoom, fullscreen
- **Reading progress** saved locally
- Smooth, fast rendering

#### Search
- **Global full-text search** across ALL issues ever published
- Search results show: issue name, year, page number, text snippet
- **Sort** results by: relevance, date (newest/oldest)
- **Filter** results by: magazine, language, year range, topic/theme
- **Search within a specific PDF** while reading

#### Download
- Download **individual issues** (PDF, EPUB, or MOBI format)
- **Bulk download**: select multiple issues → download as ZIP
- Select by range (e.g., "AIM Jan 2020 – Dec 2020") for bulk download

#### Bookmark / Favorites
- **Floating Action Button (FAB)** to bookmark/favorite an issue
- Bookmarks stored locally (no login needed)
- **"My Bookmarks"** page to view all saved issues

#### User Preferences (Local — No Login)
- Reading preferences (font size, theme if applicable)
- Bookmarks and favorites
- Reading history / recently viewed
- All stored in localStorage (web) / AsyncStorage (mobile)

### 4.2 Optional Sign-In Features (Google OAuth)

#### Sync Across Devices
- Sign in with Google (one-tap)
- **Syncs**: bookmarks, reading history, preferences
- Works seamlessly — app functions fully without login
- Login is purely optional, only for cross-device sync

### 4.3 Admin Panel

#### Authentication
- Admin login (separate from public Google sign-in)
- Multiple admins with equal access (no role hierarchy)

#### Magazine Management
- **Add/edit/delete** magazine editions
- **Add/edit/delete** individual issues
- **Upload PDFs** (single or bulk)
- Auto-triggers: PDF → EPUB/MOBI conversion + text extraction for search
- **Edit metadata**: title, description, tags/topics, cover image
- **Bulk metadata editing** for imported issues
- **Reorder** or organize issues

#### Analytics Dashboard (Admin View)
- Total issues archived, total downloads, total reads
- Most popular issues (by reads/downloads)
- Traffic over time (daily/weekly/monthly)
- Search query analytics (what are users searching for?)
- Per-issue analytics (reads, downloads, time spent)

#### Public Analytics Control
- Admin decides **which stats to show publicly** (toggle per metric)
- No data manipulation — exact data, just visibility control
- Public-facing stats examples:
  - "This issue was read 5,000 times"
  - "Most popular issue this month"
  - Total archive stats ("850 issues archived since 1990")

### 4.4 Mobile-Specific Features

#### Offline Reading
- Download any issue for offline reading (tap download icon)
- **"My Library"** section showing all downloaded issues
- Full reader functionality offline (PDF viewer works without internet)
- **Background sync** when online: updates bookmarks, checks for new issues
- **Storage management**: shows space used per issue, total, option to delete

#### Native Feel
- Platform-appropriate navigation (bottom tabs on Android/iOS)
- Native share sheet integration
- Push notifications for new issues (optional)
- Smooth native animations and gestures

---

## 5. Design System

### Color Palette
- **Primary**: White (#FFFFFF) — clean, bright
- **Accent**: Light Gold / Saffron (#D4A843 or similar) — spiritual warmth
- **Secondary accent**: Soft orange/amber tones (inspired by the logo flame)
- **Text**: Dark charcoal (#1A1A1A) for readability
- **Background**: Off-white / light cream for content areas
- **Cards/Surfaces**: White with subtle gold border or shadow

### Logo
- File: `images/AIM_logo.png`
- A luminous golden flame with a figure of light — deeply spiritual
- Logo should be used as-is, not modified

### Typography
- Clean, modern serif or sans-serif font
- Consider: Inter (UI), Playfair Display (headings), or similar elegant pairing
- Must support Devanagari, Tamil, Bengali, Marathi scripts for multilingual content

### Animation & Feel
- **Modern, slick, smooth** — not flashy, but refined
- Page transitions with Framer Motion
- Subtle hover effects on cards
- Smooth scroll animations
- Loading skeletons (not spinners)
- Micro-interactions on buttons, FABs, bookmarks

### Design Philosophy
- **State of the art** — this is NOT a legacy spiritual website
- Think: Apple-level polish meets spiritual warmth
- Light, bright, airy — like a well-lit ashram library
- Content-first: magazines are the hero, UI gets out of the way
- Accessibility: readable fonts, good contrast, keyboard navigation

---

## 6. Database Schema (High-Level)

### Core Tables
```
magazines
  - id (uuid, PK)
  - name (text) — e.g., "All India Magazine"
  - language (text) — e.g., "English"
  - description (text)
  - cover_image_url (text)
  - created_at, updated_at

issues
  - id (uuid, PK)
  - magazine_id (FK → magazines)
  - title (text) — e.g., "All India Magazine Apr-2026"
  - year (int)
  - month (int)
  - description (text)
  - topics (text[]) — e.g., ["Surrender", "Divine Grace"]
  - pdf_url (text)
  - epub_url (text, nullable)
  - mobi_url (text, nullable)
  - cover_image_url (text, nullable)
  - page_count (int, nullable)
  - file_size_bytes (bigint)
  - read_count (int, default 0)
  - download_count (int, default 0)
  - is_published (boolean, default true)
  - created_at, updated_at

issue_search_index
  - id (uuid, PK)
  - issue_id (FK → issues)
  - page_number (int)
  - content (text) — extracted text
  - search_vector (tsvector) — PostgreSQL FTS index

admins
  - id (uuid, PK)
  - email (text, unique)
  - name (text)
  - created_at

users (optional — only for syncing preferences)
  - id (uuid, PK)
  - google_id (text, unique)
  - email (text)
  - display_name (text)
  - created_at

user_bookmarks
  - id (uuid, PK)
  - user_id (FK → users)
  - issue_id (FK → issues)
  - created_at

user_reading_history
  - id (uuid, PK)
  - user_id (FK → users)
  - issue_id (FK → issues)
  - last_page (int)
  - last_read_at (timestamp)

analytics_visibility
  - id (uuid, PK)
  - metric_name (text) — e.g., "read_count", "most_popular"
  - is_public (boolean)
  - updated_by (FK → admins)
  - updated_at
```

---

## 7. Project Structure (Monorepo)

```
d:/AIM Project/
├── CLAUDE.md                    # This file
├── README.md                    # Project readme
├── images/                      # Brand assets
│   └── AIM_logo.png
├── content/                     # Sample magazine PDFs (for development)
│   ├── AIM 2026/
│   └── Agnisikha 2026/
├── apps/
│   ├── web/                     # Next.js 15 web app
│   │   ├── app/                 # App Router pages
│   │   │   ├── (public)/        # Public routes
│   │   │   │   ├── page.tsx     # Homepage
│   │   │   │   ├── browse/      # Browse magazines
│   │   │   │   ├── read/[id]/   # PDF reader
│   │   │   │   ├── search/      # Search page
│   │   │   │   └── bookmarks/   # My bookmarks
│   │   │   ├── admin/           # Admin panel
│   │   │   │   ├── dashboard/
│   │   │   │   ├── magazines/
│   │   │   │   ├── issues/
│   │   │   │   └── analytics/
│   │   │   ├── api/             # API routes
│   │   │   │   ├── magazines/
│   │   │   │   ├── issues/
│   │   │   │   ├── search/
│   │   │   │   ├── upload/
│   │   │   │   └── analytics/
│   │   │   └── layout.tsx
│   │   ├── components/          # React components
│   │   │   ├── ui/              # Base UI components
│   │   │   ├── magazine/        # Magazine-specific components
│   │   │   ├── reader/          # PDF reader components
│   │   │   ├── search/          # Search components
│   │   │   └── admin/           # Admin components
│   │   ├── lib/                 # Utilities, hooks, configs
│   │   ├── public/              # Static assets
│   │   └── styles/              # Global styles
│   └── mobile/                  # React Native (Expo) app
│       ├── app/                 # Expo Router pages
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── assets/
├── packages/
│   ├── shared/                  # Shared TypeScript types & utilities
│   │   ├── types/               # Shared type definitions
│   │   ├── constants/           # Shared constants
│   │   └── utils/               # Shared utility functions
│   ├── supabase/                # Supabase client & migrations
│   │   ├── migrations/          # SQL migration files
│   │   ├── seed/                # Seed data
│   │   └── client.ts            # Supabase client config
│   └── eslint-config/           # Shared ESLint config
├── turbo.json                   # Turborepo config
├── pnpm-workspace.yaml          # pnpm workspace config
├── package.json                 # Root package.json
└── .github/
    └── workflows/               # CI/CD pipelines
```

---

## 8. MVP Definition (Phase 1)

The MVP is what the user sees — the complete public-facing skeleton with real functionality:

### MVP Includes
1. **Homepage** — hero section, latest issues grid, archive stats
2. **Browse page** — filter by magazine, language, year
3. **Issue detail page** — cover, metadata, download buttons, read button
4. **In-app PDF reader** — smooth, responsive, page navigation
5. **Search** — global full-text search with filters
6. **Bookmarks** — FAB to save, bookmarks page to view (local storage)
7. **Download** — individual PDF download (EPUB/MOBI conversion in Phase 2)
8. **Responsive design** — works beautifully on desktop, tablet, mobile
9. **Admin panel (basic)** — login, upload PDFs, edit metadata, view issues
10. **Database + API** — full backend with Supabase

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

## 9. Development Phases

### Phase 1: Foundation + MVP Web App
- Project scaffolding (monorepo, configs, tooling)
- Supabase setup (database, storage, auth)
- Core API routes (magazines, issues, search, upload)
- Homepage, browse, issue detail, reader, search, bookmarks
- Admin panel (basic CRUD + upload)
- PDF text extraction pipeline
- Responsive design + animations
- Testing + deployment to Vercel

### Phase 2: Enhanced Web Features
- EPUB/MOBI auto-conversion pipeline
- Bulk download (ZIP)
- Google OAuth + preference syncing
- Advanced search filters + sort
- Public analytics display
- Admin analytics dashboard
- Bulk import tool

### Phase 3: Mobile App
- Expo project setup
- Core screens (home, browse, reader, search, bookmarks)
- Offline reading (download + local storage)
- My Library with storage management
- Background sync
- Platform-native design adjustments
- App store deployment (Google Play + Apple App Store)

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

## 10. Coding Standards

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
- One logical change per commit
- Branch naming: `feature/`, `fix/`, `chore/` prefixes

### API
- RESTful conventions
- Consistent error response format: `{ error: string, code: string }`
- Input validation with Zod
- Rate limiting on public endpoints

### Database
- All migrations in `packages/supabase/migrations/`
- Use Row Level Security (RLS) policies
- Index frequently queried columns

---

## 11. Key Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Web framework | Next.js 15 | SSR for SEO, App Router, React ecosystem |
| Mobile framework | React Native + Expo | Cross-platform, shares React knowledge |
| Database | Supabase (PostgreSQL) | Free tier, built-in auth/storage/realtime |
| Monorepo | Turborepo + pnpm | Fast builds, shared packages |
| Styling | Tailwind CSS | Rapid development, consistent design |
| Animations | Framer Motion | Smooth, declarative, React-native |
| Search | PostgreSQL FTS | Free, built-in, sufficient for MVP |
| PDF viewer | react-pdf | Mature, pdf.js based, customizable |
| Auth | Supabase Auth (Google) | Simple, free, works with existing stack |
| Hosting | Vercel + Supabase | Free tiers, excellent DX |

---

## 12. Environment & Accounts Needed

- [ ] GitHub repository (to be created)
- [ ] Supabase project (free tier — https://supabase.com)
- [ ] Vercel account (free tier — https://vercel.com)
- [ ] Google Cloud Console project (for OAuth client ID)
- [ ] Expo account (for mobile builds — https://expo.dev)
- [ ] Domain DNS access (to configure aimarchive.aurosociety.org)

---

## 13. Reference Files

- **Logo**: `images/AIM_logo.png` — Golden flame with luminous figure
- **Sample PDFs**: `AIM 2026/` and `Agnisikha 2026/` folders
- **TODO**: `TO DO LIST.md` — high-level task tracking
