# AIM Archive — Project Bible

> **All India Magazine Digital Archive** — A state-of-the-art spiritual magazine archive platform (Web + Android + iOS) for Sri Aurobindo Society's publications.

---

## 1. Project Overview

### What
A modern, beautiful digital archive platform to preserve and provide free public access to decades of monthly magazine publications by Sri Aurobindo Society. Current public catalogue scope is English and Hindi; additional languages require an editorial decision.

### Who
- **Organization**: Sri Aurobindo Society (linked to Sri Aurobindo Ashram / Auroville)
- **Parent Website**: https://aim.aurosociety.org/ (legacy — this project is a fresh, modern rebuild)
- **Target Subdomain**: https://aimarchive.aurosociety.org/ (preferred; setup/spending deferred)
- **Audience**: Devotees, spiritual seekers, researchers, and all people worldwide
- **Admin Team**: Multiple admins (no role hierarchy — all admins have equal access)

### Why
The magazines — especially **All India Magazine** (English) and **Agnishikha** (Hindi) — contain excerpts from the writings of Sri Aurobindo and The Mother on spirituality, philosophy, and self-improvement. Archives go back to ~1990. This platform preserves them digitally and makes them universally accessible with modern search, browse, and reading experiences.

### Platforms
- **Web App** (primary) — responsive for desktop, tablet, mobile browsers
- **Android App** — planned; current Expo implementation is a skeleton
- **iOS App** — planned through the shared React Native/Expo codebase

---

## 2. Magazines & Content

### Current Magazine Editions
| Magazine Name | Language | Status |
|---|---|---|
| All India Magazine (AIM) | English | Primary |
| Agnishikha | Hindi | Existing catalogue retained; new uploads on hold by owner decision, 8 October 2026 |
Additional languages are optional future scope, not currently promised editions.

Current ingestion focuses on English All India Magazine issues only. Do not resume Agnishikha uploads without a new owner/editorial decision. Dynamic Pages is excluded from the planned handover; it is not an outstanding implementation commitment.

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
- **Bulk import**: Multiple-PDF bulk upload with metadata assignment is implemented
- **Naming convention**: `{Magazine Name} {Month}-{Year}.pdf` (e.g., `All India Magazine Apr-2026.pdf`)
- **Text extraction**: source PDFs vary; use native text where readable and OCR only where needed. Do not infer text-layer quality from the PDF producer alone.

---

## 3. Tech Stack

- Web candidate (10 October, not deployed): Next.js 15.5.27, Node 22.23.3, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Zustand, Lucide and Zod. See SETUP.md for the tested runtime contract.
- Database: Turso/libSQL through `@libsql/client` and server repositories in `apps/web/src/lib/db/`.
- Storage: Cloudflare R2 for PDFs and covers. Catalogue assets use the configured R2 base; unsupported locations are excluded from public queries.
- Search: FTS5 trigram indexes for page text and metadata, with SQL fallback when unavailable. Migrations 00007 and 00008 were applied for the September 19 release.
- Extraction: native English text first, English OCR where needed, using PDF.js v4, canvas and Tesseract.js. Hindi OCR is excluded by owner decision.
- Indexing: durable database jobs and checkpoints processed outside Vercel by a manual GitHub Actions worker. See [worker guide](INDEXING_WORKER.md) and [GitHub setup](GITHUB_INDEXING.md).
- Reader: react-pdf and pdfjs-dist 4.8.69, with a self-hosted browser worker.
- Mobile: Expo/React Native skeleton with Home, Browse, Search and Library tabs; reader/offline/sync features remain planned.
- Tooling: pnpm/Turborepo, ESLint, TypeScript, Node regression scripts and Playwright browser verification. See root `package.json` for available tests.
- Hosting: Vercel website; GitHub worker code deployment is separate from a Vercel deployment.

---

## 4. Current Implementation Status

13 October owner update: Society acceptance is reported and the owner will continue participating. Immediate delivery is the complete reviewed Git source for Dibyanshu Ji. Operational access, final release acceptance and hosted checks remain open. See the tracker; earlier withdrawal/acceptance-pending text in dated correspondence is historical.

Deployed release evidence: [19 September 2026](PRODUCTION_RELEASE_2026-09-19.md). The 10 October local candidate includes private PDF delivery, patched dependencies and locally verified CI; publication, hosted CI and origin closure remain open. Start with the [Society discussion package](docs/handover/SOCIETY_DOCUMENT_INDEX.md) for handover context. Active unfinished work belongs in [TO DO LIST.md](TO%20DO%20LIST.md).

### Public web

Home, Browse, Search, Bookmarks, issue detail and Reader are deployed. Public pages fetch initial data on the server and pass it to client components. Features include paginated shelves/listings, English indexed search with page links/highlights, local bookmarks and reading history, PDF previews/readers, individual downloads and bounded ZIP downloads. The five-year access policy restricts recent editions.

### Admin

Login, dashboard, magazine/issue management, bulk upload/actions, PDF and cover replacement, topics, CSV export, storage inspection, settings, navigation management and the dedicated indexing workspace are implemented. See [navigation guide](NAVIGATION_MANAGEMENT.md). All privileged API work must verify admin authentication.

### Indexing and release limits

The English rebuild covered 102 editions and withheld 17 uncertain cover pages; see [rebuild evidence](SEARCH_REBUILD_REPORT.md). The catalogue check recorded 104 issues, supported asset references and no missing themes. These are dated measurements, not permanent totals.

Admin **Start indexing** still needs `INDEXING_GITHUB_TOKEN` in Vercel and a controlled live run. Local worker performance changes must also be synced to GitHub main. The latest website deployment alone does not do that.

### Route and implementation inventory

Use `rg --files apps/web/src/app -g 'page.tsx'` and `rg --files apps/web/src/app/api -g 'route.ts'` for the current inventory. Avoid maintaining a second stale route-count table here. Public queries must exclude drafts and enforce access restrictions before exposing asset URLs.

### Deferred scope

Domain/CDN setup and spending are explicitly deferred. EPUB/MOBI conversion, public accounts/sync, expanded analytics and a functional native app are future work; consult the active TODO before treating any historical plan as authorization.

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
- **UI font**: Inter (variable, bundled via `next/font/local`)
- **Additional fonts**: Aboreto, Tiro Devanagari Hindi and Tangerine, bundled via `next/font/local`; see `apps/web/src/app/layout.tsx` and the CSS font tokens for actual usage. Pinned WOFF2 sources, hashes and OFL licenses are in `apps/web/src/app/fonts`; builds no longer download Google Fonts. See [setup](SETUP.md).
- Support English and Devanagari for the current catalogue; validate additional scripts when language expansion is approved.

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

The authoritative schema is [Turso migrations](packages/turso/migrations/00001_initial_schema.sql) plus the ordered additive migrations in `packages/turso/migrations/`.

- Core catalogue, admin and future account tables: magazines, issues, issue_search_index, admins, users, user_bookmarks, user_reading_history and analytics_visibility; site_settings stores configurable public destinations.
- Migration 00002 adds navigation management.
- Migrations 00003–00006 add durable indexing jobs, page checkpoints, worker health, coverage/history and indexing controls.
- Migrations 00007–00008 add FTS5 trigram search for page text and metadata.
- Use libSQL-compatible types, parameterized queries and transactions through the repository layer.
- Enforce public visibility/access in server queries and admin permissions through `verifyAdmin()`. Keep index replacement and associated job/coverage writes atomic.

Use the current [backup and recovery notes](MIGRATION_RECOVERY.md); restore only into an explicitly selected isolated target.

Migration tooling now defaults to read-only status and requires an explicit target, records checksums in `aim_schema_migrations`, and refuses to replay an existing schema without reviewed baselining. The live database still has no ledger; no adoption was performed. See the [migration procedure](docs/handover/P4-07_MIGRATION_PROCEDURE.md).

---

## 7. Project Structure (Monorepo)

- `apps/web/`: Next.js app; routes in `src/app`, UI in `src/components`, repositories and services in `src/lib`.
- `apps/mobile/`: Expo skeleton.
- `packages/shared/`: shared types/utilities.
- `packages/turso/migrations/`: current database migrations.
- `packages/eslint-config/`: shared lint configuration.
- `scripts/`: development, regression tests, migrations and indexing operators.
- `.github/workflows/`: hosted worker workflows.
- `docs/archive/`: historical plans and verification records.
- `TO DO LIST.md`: active backlog; operating guides are linked from `AGENTS.md`.

Use the filesystem for the detailed route/component inventory; generated outputs and private configuration are not source documentation.

---

## 8. Credentials & Configuration

Runtime configuration is stored privately in `apps/web/.env.local` and Vercel; never paste values into chat or commit them. Consult `apps/web/.env.local.example` and the relevant source modules for variable names.

- Database: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
- R2: account/bucket credentials and public asset URL configuration.
- Admin: environment password/session configuration and the admins table; no default password fallback.
- GitHub repository: `MugdhanilK/aim-archive`, branch `main`. Manual worker dispatch configuration is documented in [GITHUB_INDEXING.md](GITHUB_INDEXING.md).
- `aimarchive.aurosociety.org` is the preferred website domain, with setup/spending deferred. An asset hostname has not been selected. See [asset delivery plan](ASSET_DELIVERY_PLAN.md).

---

## 9. Delivery Status

The public website is deployed at https://aim-archive.vercel.app. Build and browser verification evidence is in the [latest release report](PRODUCTION_RELEASE_2026-09-19.md). A deployed website does not imply completion of admin mutation checks, worker source synchronization or native mobile development.

---

## 10. Planning

[TO DO LIST.md](TO%20DO%20LIST.md) is the single active backlog. [vision.md](vision.md) preserves optional product ideas; these are not automatically approved scope. Completed plans and dated measurements live in [docs/archive](docs/archive/README.md).

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
- Input validation with Zod
- Admin routes protected by `verifyAdmin()` check

### Database
- Runtime migrations belong in `packages/turso/migrations/`.
- Use parameterized libSQL queries, appropriate indexes and atomic transactions.
- Enforce public publication/access checks and authenticate admin writes server-side.
- Keep migration/export tooling distinct from application runtime.

### Content Conventions
- **Magazine Title format** (the `title` column): `{Magazine Name} — {Full Month} {Year}` — e.g. `All India Magazine — February 2024`, `Agnishikha — April 2026`.
  - Em dash (`—`, U+2014), **not** a hyphen-minus.
  - **Full** month name only — never abbreviated (`February`, not `Feb`).
  - Space between month and year (no hyphen).
  - Auto-generated by the upload form and by the inline edit form (skipping first render so a customised title isn't clobbered on open).
- **Theme Title** (the `theme` column, optional): the issue's overarching theme as printed on the cover — e.g. "Sunlit Path", "सूर्यलोकित पथ", "On Education", "Surrender". Displayed in gold-flame gradient with a small vertical accent bar across all surfaces (browse cards, list view, issue detail, reader info drawer, continue-reading shelf, admin table). Nullable — older issues without a printed theme leave this blank.
- **No italic on theme display** — Devanagari (and other non-Latin scripts) lack a real italic font, so `font-style: italic` is faked via CSS skew. Combined with `bg-clip-text`, the skew bleeds past the original layout box and clips the rightmost glyph's gradient. Mitigation: never use `italic` on `bg-clip-text` content; pad with `pr-1` for safety. See §15 Known Issues.
- **PDF source quality bar** (per the Feb 2024 reference issues from Hemlata Di):
  - Prefer PDFs with readable native text; inspect actual text and image quality instead of assuming a producer always rasterizes.
  - Embedded images at ≥ 300 DPI (≈ 1500 px on the long side for a 5″-wide page).
- **Cover image format**: front + back covers as separate files preferred. Combined front-back spread is also accepted — the upload form auto-detects spreads (aspect ratio > 1.1) and lets the admin pick which half is the front, then crops automatically.

---

## 12. Key Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Web framework | Next.js 15 | SSR for SEO, App Router, React ecosystem |
| Mobile framework | React Native + Expo | Cross-platform, shares React knowledge |
| Database | Turso/libSQL | Current server repository backend |
| Monorepo | Turborepo + pnpm | Fast builds, shared packages |
| Styling | Tailwind CSS 4 | Rapid development, consistent design |
| Animations | Framer Motion | Smooth, declarative, React-native |
| Search | FTS5 trigram + native-first English extraction/OCR | Indexed page text and metadata with guarded fallback |
| PDF text extraction | Native text first, English OCR fallback | Preserve readable source text and withhold uncertain pages |
| PDF viewer | react-pdf | Mature, pdf.js based, customizable |
| Auth (admin) | Session cookies + admins table | Simple, no external auth provider needed |
| Auth (public) | Deferred; provider undecided | Preserve local bookmarks/history when sync is added |
| Hosting | Vercel + Turso + R2 | Website, database and assets; GitHub hosts manual indexing |
| PDF rendering for OCR | pdfjs-dist v4 + node-canvas | v4 compatible with node-canvas, v5 breaks |

---

## 13. Environment & Accounts

The website uses Vercel, Turso and R2. Manual indexing uses GitHub Actions. Public OAuth and native app store setup remain future work; custom-domain setup is deferred. Track unfinished configuration in the active TODO, not a second account checklist.

---

## 14. Reference Files

- **Current technical handover specification**: [TECHNICAL_SPECIFICATION.md](TECHNICAL_SPECIFICATION.md)
- **Handover findings and acceptance**: [HANDOVER_ASSESSMENT_2026-10-08.md](HANDOVER_ASSESSMENT_2026-10-08.md)
- **DigitalOcean options and migration sequence**: [DIGITALOCEAN_MIGRATION.md](DIGITALOCEAN_MIGRATION.md)
- **Logo**: `images/AIM_logo.png` — Golden flame with luminous figure
- **Source PDFs**: `AIM 2026/` and `Agnishikha 2026/` folders (not in git)
- **TODO**: `TO DO LIST.md` — task tracking
- **History**: [archived plans and verification](docs/archive/README.md)
- **Env example**: `apps/web/.env.local.example` — environment variable template

---

## 15. Known Issues & Notes

- Current limitations and measured fixes: [performance implementation](PERFORMANCE_IMPLEMENTATION.md) and [active TODO](TO%20DO%20LIST.md).
- Development uses `scripts/dev-web.cjs`; Next runs without starting an indexing worker unless explicitly opted in. See [worker operation](INDEXING_WORKER.md).
- Public data comes from server repositories; keep initial server data and endpoint-specific cache policies. Detail analytics must not be hidden behind a cached side-effecting response.
- Asset host aliases, Next image allowlists and R2 CORS must match the selected delivery configuration. Domain setup is deferred.

- **pdfjs-dist version**: Must use v4.x (4.8.69). v5.x breaks compatibility with node-canvas for server-side rendering.
- **Scroll performance**: Removed `backdrop-blur`, infinite CSS animations, and heavy radial gradients after observing scroll lag. Header uses `bg-white/95` instead of blur.
- **Tesseract.js trained data**: `eng.traineddata` and `hin.traineddata` files are in `apps/web/` — these are auto-downloaded by Tesseract.js on first use.
- **React types must be unified across the workspace**: `apps/mobile` declares `@types/react@~18.3.0` while `apps/web` uses `@types/react@^19.1.2`. Without intervention, TypeScript resolves both versions and JSX-element checks (most visibly `Suspense`) fail at build time. Root `package.json` uses `pnpm.overrides` to pin both `@types/react` and `@types/react-dom` to `^19.1.2` workspace-wide. **Do not remove these overrides** — Vercel build will break.
- **`useSearchParams` requires Suspense in Next 15**: any client page that calls `useSearchParams()` (e.g. `/browse`) must be wrapped in a `<Suspense>` boundary or the production build fails with "useSearchParams should be wrapped in a suspense boundary". The pattern is: keep `app/<route>/page.tsx` as a **server component** that imports a `'use client'` inner component and wraps it in `<Suspense>`. See `apps/web/src/app/browse/page.tsx` (server) + `browse-client.tsx` ('use client').
- **Browser extensions cause hydration warnings on `<body>`**: Grammarly and similar inject `data-*` attrs before React hydrates. `app/layout.tsx` has `suppressHydrationWarning` on `<body>` to swallow that one specific (and benign) mismatch.
- **Devanagari + `bg-clip-text` + `italic` clips the rightmost glyph**: non-Latin scripts (Hindi, Bengali, Tamil, Marathi) usually have no real italic font, so `font-style: italic` is faked by the browser as a CSS skew transform. `bg-clip-text` clips the gradient to the text's *original* layout box, not the skewed one — so the rightmost character's tail loses its gradient and visually appears cut off. **Mitigation**: never use `italic` on `bg-clip-text` content. Pad with `pr-1` as belt-and-braces. The Theme Title display follows this rule everywhere (browse cards, list view, issue detail, reader info drawer, continue-reading shelf, admin table).
- **Animating `<tr>` and `<tbody>` heights**: Framer Motion's `height: auto` animation works on table elements when wrapped in `motion.tr`/`motion.div` with `overflow: hidden` during animation. The admin Issues edit panel uses `transitionEnd: { overflow: 'visible' }` on the `animate` prop so dropdowns inside the panel (e.g. Topic Tags) aren't clipped after the slide-in completes. See `EditRowForm` in `apps/web/src/app/admin/(dashboard)/issues/page.tsx`.
- **`overflow-x-auto` implicitly clips overflow-y**: per CSS spec, setting `overflow-x` to anything other than `visible` makes `overflow-y` compute to `auto` rather than visible. The admin Issues table wrapper has `overflow-x-auto` for narrow viewports, which means hover previews positioned absolutely inside table rows get vertically clipped at the wrapper's edges. **Mitigation**: render hover previews via `react-dom`'s `createPortal` to `document.body` and position them with `position: fixed` based on `getBoundingClientRect()`. Auto-clamp vertically against the viewport so the preview stays fully on-screen for top/bottom rows. See `CoverThumbnail` in the admin Issues page.
- **Card-style hover on table rows**: each issue is wrapped in its own `<tbody>` (HTML5 allows multiple tbodies per table) so a `transform: scale()` and `box-shadow` on hover applies as a unit to both the main row and the actions row. `relative` + `z-10` on hover prevents the elevated card from being clipped by adjacent rows. Border separation between issues comes from `border-b border-gray-100` on each tbody (with `last:border-b-0` to keep the bottom of the table clean).
- **R2 CORS origins must match the actual application origin**: development uses port 3000. The complete current bucket CORS allowlist is not verified; historical origins are not proof of current settings. Dibyanshu Ji or the storage administrator must inspect and configure actual staging/receiving origins under P2-08 before browser/upload acceptance.
- **`next.config.ts` images.remotePatterns for R2 — wildcard caveat**: R2 public URLs are of the form `pub-<hex>.r2.dev` and the hex is per-bucket. A bare `*.r2.dev` wildcard would technically work but is broader than needed — pin to the exact `pub-*` hostname for least privilege.

---

## 16. Deployment Flow

The existing Vercel project is `aim-archive`, linked through `.vercel/project.json`; production is https://aim-archive.vercel.app.

1. Verify the intended changes and run `pnpm.cmd build` from `apps/web`, plus checks appropriate to the change.
2. Check required private configuration: Turso database URL/token, R2 settings, admin password/session secret and public app URL. GitHub Admin dispatch additionally requires the connection described in [GITHUB_INDEXING.md](GITHUB_INDEXING.md).
3. When deployment is authorized, use the existing Vercel project. Git-based deployment requires a verified connection and an authorized push; CLI deployment from the repository root uses `pnpm.cmd dlx vercel --prod`.
4. Verify deployment readiness and real public flows; record the result in a dated release report.

The September 19 deployment used the existing project and passed production browser checks. It did not commit/push local changes. GitHub Actions uses its own repository checkout, so worker changes must reach GitHub separately.

Custom website and asset-domain setup/spending remain deferred. A documentation-only cleanup does not require a website redeploy.

### Retained deployment lessons

Verify the Git integration before assuming a push will deploy. Keep the root React type overrides and server wrappers/Suspense around `useSearchParams()`; prior production builds exposed failures when these were missing.
