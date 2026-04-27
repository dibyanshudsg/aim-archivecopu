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

## Up Next — Admin Issues Page Enhancements
- [ ] Bulk select & bulk actions (delete, publish/unpublish, edit topics in batch)
- [ ] Cover image upload per issue
- [ ] View/open link — quick link to public page or PDF
- [ ] Download count column in table
- [ ] Pagination for large issue lists (850+ issues)
- [ ] Status filter (Published / Draft)
- [ ] Topic filter dropdown
- [ ] Export issue list as CSV
- [ ] Bulk upload — multiple PDFs at once with auto-detected month/year from filename
- [ ] Duplicate issue — clone metadata for quick uploads
- [ ] Last modified date shown per row
- [ ] Confirmation toast after successful edit/delete/upload

## Up Next — Phase 1.5: Polish & Deploy
- [ ] SEO optimization (meta tags, sitemap, structured data)
- [ ] Performance audit (Lighthouse score)
- [ ] Accessibility check
- [ ] Loading skeletons for all async pages
- [ ] Deploy to Vercel
- [ ] Connect domain (aimarchive.aurosociety.org)

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

1. Implement Proper Pagination system in the Browse page. 
2. is the deployment flow is properly updated in @CLAUDE.md file for references? If you have found something new or wrong,  update @CLAUDE.md file properly for future usage.  