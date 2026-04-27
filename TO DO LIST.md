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
- [ ] Bulk select & bulk actions (delete, publish/unpublish, edit topics in batch)
- [ ] Manual cover image upload per issue (override auto-generated)
- [ ] View/open link — quick link to public page or PDF
- [ ] Download count column in table
- [ ] Pagination for large issue lists (850+ issues)
- [ ] Status filter (Published / Draft)
- [ ] Topic filter dropdown
- [ ] Export issue list as CSV
- [ ] Bulk upload — multiple PDFs at once with auto-detected month/year from filename
- [ ] Duplicate issue — clone metadata for quick uploads
- [ ] Last modified date shown per row
- [ ] Confirmation toast after successful edit/delete/upload (replace `window.alert` / `window.confirm`)

## Up Next — Phase 1.5: Polish & Deploy
- [ ] Performance audit (Lighthouse score)
- [ ] Accessibility check
- [ ] Connect domain (aimarchive.aurosociety.org)
- [ ] Full-page search bar where the old horizontal filter row used to live (placeholder is in place)
- [ ] Browse: remember user's last open/closed panel state per device (currently per-browser via localStorage; future: cross-device after auth lands)

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
