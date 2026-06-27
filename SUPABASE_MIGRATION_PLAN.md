# AIM Archive Supabase Migration Plan

Last updated: 2026-05-27

Purpose: move AIM Archive away from Supabase Free as a production dependency, without adding recurring cost, while preserving the public archive, admin workflow, OCR search, analytics counters, and R2 file storage.

This plan is based on:

- A live read-only audit of Supabase project `glduurfsjyxpkdnxgdqz`.
- A code audit of the current Next.js app and migration SQL.
- Current provider docs checked on 2026-05-27.

No Supabase secret values are included in this document.

## Migration Progress

Started: 2026-05-27.

Completed so far:

- Added ignored local backup directory `.migration/`.
- Added root migration scripts:
  - `pnpm.cmd migration:export:supabase`
  - `pnpm.cmd migration:import:turso -- --export .migration/supabase-export-... --reset`
  - `pnpm.cmd migration:verify:turso -- --export .migration/supabase-export-...`
- Added initial Turso/libSQL schema at `packages/turso/migrations/00001_initial_schema.sql`.
- Installed `@libsql/client` in the web app.
- Created the first live Supabase export at `.migration/supabase-export-20260527T142432Z`.
- Smoke-tested a local libSQL import at `.migration/turso-local-smoke.db` with `--skip-fts`.
- Verified local imported row counts match the Supabase export.
- Verified the default `draft-legacy-assets` policy leaves 0 published Supabase-hosted PDF/cover URLs.
- Added the first app-side Turso repository layer under `apps/web/src/lib/db/`.
- Type-checked the web app with the new repository layer.
- Created Turso database `libsql://aim-archive-mugdhanil.aws-ap-south-1.turso.io`.
- Imported the Supabase export into real Turso with `--skip-fts` because Turso custom index methods are experimental and were not enabled on this database.
- Verified real Turso counts match the Supabase export.
- Wired public/server read paths behind `DATABASE_PROVIDER=turso`:
  - homepage data
  - browse listing/facets through `lib/public-issues.ts`
  - search page and `/api/search`
  - issue detail page and metadata
  - public issue API and download API
  - public magazines API
  - public site-settings API
  - bookmarks page initial catalog
  - sitemap
- Ran a production build with `DATABASE_PROVIDER=turso`; it passed.
- Wired admin auth/check and admin read surfaces behind `DATABASE_PROVIDER=turso`:
  - admin login admin lookup
  - signed-cookie admin verification
  - dashboard stats
  - admin magazine list
  - admin issue list
  - admin site settings read
  - admin storage read
- Ran another production build with `DATABASE_PROVIDER=turso`; it passed.
- Wired first admin write surfaces behind `DATABASE_PROVIDER=turso`:
  - magazine create/update/delete
  - issue inline update/delete
  - topic list/delete/rename
  - site settings update
  - storage object delete cover cleanup
- Wired upload/reindex storage-writing surfaces behind `DATABASE_PROVIDER=turso`:
  - new issue upload creates Turso issue rows
  - OCR indexing writes Turso `issue_search_index` rows
  - PDF replace updates Turso issue rows and reindexes OCR
  - cover replace updates Turso issue rows
  - single issue reindex updates Turso OCR rows and missing cover
  - batch reindex updates Turso OCR rows
  - thumbnail backfill updates Turso cover URLs
- Ran Turso-mode TypeScript and production builds after these write-path changes; both passed.

First export manifest:

- `admins`: 1
- `magazines`: 2
- `issues`: 10
- `issue_search_index`: 424
- `analytics_visibility`: 5
- `site_settings`: 2
- `users`, `user_bookmarks`, `user_reading_history`: 0 each
- Issue sums: 174 reads, 0 downloads, 199610337 file bytes
- Legacy asset rows: 8 Supabase PDF URLs and 8 Supabase cover URLs

Next Turso dashboard steps:

1. Create a database named `aim-archive`.
2. Copy the database URL into local/Vercel env as `TURSO_DATABASE_URL`.
3. Create a database auth token and save it as `TURSO_AUTH_TOKEN`.
4. Do not paste the token into chat or commit it.

Current FTS note:

- Turso FTS requires the experimental `index_method` feature. The first real import skipped the FTS index.
- The app repository falls back to ordinary SQL `LIKE` search when Turso FTS functions are unavailable.
- With 424 OCR rows, fallback search is acceptable for the migration. Add/enable Turso FTS later as a performance upgrade.

Provider switch note:

- Local/prod runtime uses Turso only when `DATABASE_PROVIDER=turso`.
- Until that env var is set, the app remains on Supabase for rollback.
- Admin write routes now have Turso branches. Final cleanup still needs removal of fallback Supabase imports/env usage after manual admin smoke testing.

## Executive Recommendation

Use Turso/libSQL as the first-choice migration target for the application database.

Why:

- It keeps the current Vercel + Next.js shape intact.
- It has a zero-dollar free tier with published quotas that are far above the current archive size.
- It supports full-text search through Turso FTS, which can replace the current Supabase/Postgres `search_issues` RPC.
- The database migration can be done independently of the 8 legacy PDFs/covers. Those files can be reuploaded later; the important rule is that final production must not serve Supabase-hosted URLs.

Cloudflare D1 is a strong alternate if the project later moves the app runtime to Cloudflare Workers/Pages. It is less attractive as the first migration because using D1 directly from the current Vercel app is not as natural as using Turso from Node/Next route handlers.

Neon is the lowest-code Postgres-style fallback, but it still has serverless compute lifecycle/cold-start behavior and smaller free storage. It does not solve the broader "free managed Postgres policy may change under us" concern as cleanly as moving to a lightweight SQLite/libSQL data model.

## Why Migrate

Supabase Free can pause projects after low activity in a 7-day window. For a public archive, that is not just an inconvenience. A paused database would break:

- Homepage issue shelves and carousel data.
- Browse filters, facets, and pagination.
- Search.
- Issue detail pages and reader metadata.
- Admin login and all admin CRUD.
- Read/download counters.
- Site settings.

R2 reduces the file-storage risk, but the app still depends on Supabase for almost every data path.

Updated file policy:

- Do not make the database migration depend on copying the 8 remaining Supabase Storage PDFs/covers.
- During Turso import, preserve their metadata but do not keep them publicly reachable via Supabase URLs.
- Simplest zero-Supabase option: import issues whose PDF is still Supabase-hosted as drafts (`is_published = 0`) until their PDFs/covers are reuploaded to R2 through the admin panel.
- Alternative option: reupload those PDFs before final cutover and keep the rows published.
- Hard rule: no published production issue should point `pdf_url` or `cover_image_url` at `*.supabase.co`.

Official docs:

- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase pricing: https://supabase.com/pricing
- Turso pricing: https://turso.tech/pricing
- Turso FTS: https://docs.turso.tech/sql-reference/functions/fts
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Neon compute lifecycle: https://neon.com/docs/introduction/compute-lifecycle/

## Live Supabase Snapshot

Read-only audit date: 2026-05-27.

Project:

- Supabase project ID: `glduurfsjyxpkdnxgdqz`
- Magazines: 2
- Issues: 10
- Search index rows: 424
- Admins: 1
- Users: 0
- User bookmarks: 0
- User reading history: 0
- Analytics visibility rows: 5
- Site settings rows: 2

Magazine rows:

- `All India Magazine`, language `english`
- `Agnishikha`, language `hindi`

Issue data:

- 10 total issues.
- 10 published issues.
- 0 drafts.
- Year range: 2024 to 2026.
- Months present: 2024-02, 2026-01, 2026-02, 2026-03, 2026-04, 2026-05.
- Total recorded PDF pages: 424.
- Total recorded file size: about 190.4 MiB.
- Total reads: 174.
- Total downloads: 0.
- Unique topics: 15.

Current storage split:

- 8 issue PDFs still point to Supabase Storage.
- 8 issue covers still point to Supabase Storage.
- 2 issue PDFs point to Cloudflare R2.
- 2 issue covers point to Cloudflare R2.
- Supabase Storage bucket `magazines` still has top-level prefixes:
  - `agnisikha-2026`
  - `aim-2026`
  - `all-india-magazine-2024`

Decision: these 8 legacy assets do not block the database migration. They can be reuploaded later. Until then, they must either be drafts in the new database or have their URLs replaced with R2 URLs before publishing.

Search/index observations:

- `search_issues` RPC works in production.
- Query sample `smile` returned page-level OCR hits.
- One current issue, May 2026 All India Magazine, has `page_count = null` and no indexed OCR rows in the audit result.
- A few older indexed issue rows have `max(page_number)` greater than `issues.page_count`. Preserve current page numbers during migration first; investigate normalization separately.

Site settings:

- `feedback_form_url`
- `feedback_form_edit_url`

## Current Supabase Usage In Code

Central clients:

- `apps/web/src/lib/supabase-server.ts`
  - `createPublicClient()`
  - `createAdminClient()`
- Several API routes also create Supabase clients directly with `@supabase/supabase-js`.
- `packages/supabase/src/client.ts` exports shared Supabase helpers but is not the only app usage.

Public data paths:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/browse/page.tsx`
- `apps/web/src/lib/public-issues.ts`
- `apps/web/src/app/search/page.tsx`
- `apps/web/src/app/api/search/route.ts`
- `apps/web/src/app/issue/[id]/page.tsx`
- `apps/web/src/app/issue/[id]/layout.tsx`
- `apps/web/src/app/bookmarks/page.tsx`
- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/api/magazines/route.ts`
- `apps/web/src/app/api/issues/[id]/route.ts`
- `apps/web/src/app/api/issues/[id]/download/route.ts`
- `apps/web/src/app/api/site-settings/route.ts`

Admin data paths:

- `apps/web/src/lib/admin-data.ts`
- `apps/web/src/lib/admin-auth.ts`
- `apps/web/src/lib/site-settings.ts`
- `apps/web/src/lib/search-indexer.ts`
- `apps/web/src/app/api/admin/auth/route.ts`
- `apps/web/src/app/api/admin/magazines/route.ts`
- `apps/web/src/app/api/admin/magazines/[id]/route.ts`
- `apps/web/src/app/api/admin/issues/[id]/route.ts`
- `apps/web/src/app/api/admin/issues/[id]/cover/route.ts`
- `apps/web/src/app/api/admin/issues/[id]/pdf/route.ts`
- `apps/web/src/app/api/admin/issues/[id]/reindex/route.ts`
- `apps/web/src/app/api/admin/upload/route.ts`
- `apps/web/src/app/api/admin/reindex/route.ts`
- `apps/web/src/app/api/admin/thumbnails/route.ts`
- `apps/web/src/app/api/admin/topics/route.ts`
- `apps/web/src/app/api/admin/topics/rename/route.ts`
- `apps/web/src/app/api/admin/site-settings/route.ts`
- `apps/web/src/app/api/admin/storage/route.ts`

Supabase-specific behaviors to replace:

- PostgREST fluent table queries.
- Postgres `TEXT[]` topic filtering with `.overlaps()`.
- Postgres relation select syntax such as `magazines!inner(...)`.
- Postgres `ILIKE`.
- Postgres generated `TSVECTOR`.
- RPC `search_issues`.
- RPC `increment_issue_read_count`.
- RPC `increment_issue_download_count`.
- Legacy Supabase Storage deletes for old files.

## Target Architecture

Recommended runtime stack:

- Database: Turso/libSQL.
- Database client: `@libsql/client`.
- Migration/schema management: either Drizzle Kit or checked-in SQL migrations. Prefer Drizzle if we want generated TypeScript types and repeatable migrations.
- File storage: Cloudflare R2 only for all new uploads and all publicly served assets.
- App hosting: keep Vercel for now.
- Admin auth: keep current custom signed-cookie admin auth, backed by the new `admins` table.

Important design choice:

Do not scatter Turso calls directly through pages and routes the way Supabase calls are currently scattered. Create a small database/repository layer first, then migrate call sites to that layer. This keeps the next provider change much cheaper.

Suggested new files:

- `apps/web/src/lib/db/client.ts`
- `apps/web/src/lib/db/schema.ts`
- `apps/web/src/lib/db/public-repository.ts`
- `apps/web/src/lib/db/admin-repository.ts`
- `apps/web/src/lib/db/search-repository.ts`
- `apps/web/src/lib/db/site-settings-repository.ts`
- `apps/web/src/lib/db/storage-repository.ts`
- `scripts/export-supabase-data.mjs`
- `scripts/import-turso-data.mjs`
- `scripts/verify-migrated-data.mjs`

Published asset invariant:

- Repository methods that return public issues should never return a Supabase-hosted `pdf_url`.
- Import scripts should either:
  - set legacy-Supabase-asset issues to draft, or
  - require replacement R2 URLs before marking them published.

## Data Model Conversion

Keep IDs stable. Existing issue URLs, bookmarks snapshots, reader history snapshots, and admin workflows all benefit if UUIDs remain unchanged.

### magazines

Supabase columns:

- `id UUID`
- `name TEXT`
- `language TEXT`
- `description TEXT`
- `cover_image_url TEXT`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Turso columns:

- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `language TEXT NOT NULL DEFAULT 'english'`
- `description TEXT NOT NULL DEFAULT ''`
- `cover_image_url TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

Indexes:

- `idx_magazines_name`
- optional unique index on `name, language` if desired later.

### issues

Supabase columns:

- `id UUID`
- `magazine_id UUID`
- `title TEXT`
- `year INT`
- `month INT`
- `description TEXT`
- `topics TEXT[]`
- `pdf_url TEXT`
- `epub_url TEXT`
- `mobi_url TEXT`
- `cover_image_url TEXT`
- `page_count INT`
- `file_size_bytes BIGINT`
- `read_count INT`
- `download_count INT`
- `is_published BOOLEAN`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`
- `theme TEXT`

Turso columns:

- `id TEXT PRIMARY KEY`
- `magazine_id TEXT NOT NULL REFERENCES magazines(id) ON DELETE CASCADE`
- `title TEXT NOT NULL`
- `year INTEGER NOT NULL`
- `month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12)`
- `description TEXT`
- `topics_json TEXT NOT NULL DEFAULT '[]'`
- `pdf_url TEXT NOT NULL`
- `epub_url TEXT`
- `mobi_url TEXT`
- `cover_image_url TEXT`
- `page_count INTEGER`
- `file_size_bytes INTEGER NOT NULL DEFAULT 0`
- `read_count INTEGER NOT NULL DEFAULT 0`
- `download_count INTEGER NOT NULL DEFAULT 0`
- `is_published INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `theme TEXT`

Indexes:

- `idx_issues_magazine`
- `idx_issues_year_month`
- `idx_issues_published`
- `idx_issues_updated_at`
- `idx_issues_read_count`
- `idx_issues_title`

Topic filtering:

- Store topics as JSON text.
- Query topics with SQLite JSON functions:
  - `EXISTS (SELECT 1 FROM json_each(issues.topics_json) WHERE value IN (...))`
- Repository methods must convert `topics_json` back to `topics: string[]` so UI components do not change.

### issue_search_index

Supabase columns:

- `id UUID`
- `issue_id UUID`
- `page_number INT`
- `content TEXT`
- `search_vector TSVECTOR`
- `created_at TIMESTAMPTZ`

Turso columns:

- `id TEXT PRIMARY KEY`
- `issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE`
- `page_number INTEGER NOT NULL`
- `content TEXT NOT NULL`
- `created_at TEXT NOT NULL`

Indexes:

- `idx_search_issue`
- Turso FTS index over `content`.

Suggested Turso FTS index:

```sql
CREATE INDEX idx_issue_search_content_fts
ON issue_search_index USING fts (content);
```

Search behavior:

- Replace Supabase RPC `search_issues` with a TypeScript function `searchIssues()`.
- Use `fts_match(content, ?)` for filtering.
- Use `fts_score(content, ?)` for ranking.
- Use `fts_highlight(content, '<mark>', '</mark>', ?)` or fetch `content` and build a smaller snippet in TypeScript.
- Continue applying the existing embargo rule before returning snippets publicly.

### admins

Turso columns:

- `id TEXT PRIMARY KEY`
- `email TEXT UNIQUE NOT NULL`
- `name TEXT NOT NULL`
- `created_at TEXT NOT NULL`

Do not migrate any secret admin session value. The app currently uses signed cookies and checks the `admins` table.

### users, user_bookmarks, user_reading_history

These are empty in live Supabase.

Options:

- Create equivalent tables now for future sync.
- Or defer them until Google OAuth/cross-device sync work starts.

Recommendation: create them now to keep migration parity and avoid future archaeology.

### analytics_visibility

Turso columns:

- `id TEXT PRIMARY KEY`
- `metric_name TEXT UNIQUE NOT NULL`
- `is_public INTEGER NOT NULL DEFAULT 0`
- `updated_by TEXT REFERENCES admins(id)`
- `updated_at TEXT NOT NULL`

Migrate all 5 current rows.

### site_settings

Current live rows:

- `feedback_form_url`
- `feedback_form_edit_url`

Turso columns:

- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL DEFAULT ''`
- `description TEXT`
- `updated_by TEXT REFERENCES admins(id)`
- `updated_at TEXT NOT NULL`

## Query/API Replacement Map

### Public homepage

Current file: `apps/web/src/app/page.tsx`

Replace:

- `supabase.from('issues')...eq('is_published', true)...order(...).limit(...)`
- `supabase.from('magazines')...order('created_at')`

With:

- `getRecentIssues({ limit: 8, overfetch: 32 })`
- `getCarouselDataForReleaseWindow(now)`
- `listMagazines({ orderBy: 'created_at' })`

### Browse

Current files:

- `apps/web/src/app/browse/page.tsx`
- `apps/web/src/lib/public-issues.ts`

Replace:

- Supabase relation selects.
- `in`, `eq`, `overlaps`, and relation filters.
- Client-side metadata search over fetched issue rows.

With:

- One repository method:
  - `listPublicIssues(input): PublicIssueListResult`
- SQL query builder that:
  - Joins `issues` to `magazines`.
  - Applies published-only filter.
  - Applies year/month/magazine/language/topic filters.
  - Applies metadata search against title, theme, description, magazine name, and topics JSON.
  - Computes facets with grouped SQL queries or small table scans while the dataset is small.

### Search API

Current file: `apps/web/src/app/api/search/route.ts`

Replace:

- Supabase RPC `search_issues`.
- Supabase `.or(title.ilike..., topics.cs...)`.

With:

- `searchIssues({ q, magazineId, yearFrom, yearTo, limit })`
- `searchIssueMetadata(...)`
- Merge and dedupe exactly as the current route does.
- Preserve embargo behavior:
  - No OCR snippet for embargoed issues.
  - Metadata-only snippet for embargoed issues.
  - `pdf_url: null` for embargoed issues.

### Issue detail and reader data

Current files:

- `apps/web/src/app/issue/[id]/page.tsx`
- `apps/web/src/app/issue/[id]/layout.tsx`
- `apps/web/src/app/api/issues/[id]/route.ts`

Replace:

- Single issue Supabase select with join.
- RPC read counter increment.

With:

- `getPublicIssueById(id)`
- `incrementIssueReadCount(id)`

Counter SQL:

```sql
UPDATE issues
SET read_count = read_count + 1,
    updated_at = ?
WHERE id = ?
  AND is_published = 1;
```

### Download route

Current file: `apps/web/src/app/api/issues/[id]/download/route.ts`

Replace:

- Single issue Supabase select with join.
- RPC download counter increment.

With:

- `getPublicIssueDownloadTarget(id)`
- `incrementIssueDownloadCount(id)`

Counter SQL:

```sql
UPDATE issues
SET download_count = download_count + 1,
    updated_at = ?
WHERE id = ?
  AND is_published = 1;
```

### Admin data

Current file: `apps/web/src/lib/admin-data.ts`

Replace with repository methods:

- `getAdminStats()`
- `listAdminMagazines()`
- `listAdminIssues()`
- `getAdminSiteSettings()`
- `getAdminStorageData()`

Keep R2 listing logic. Remove Supabase Storage dependency from runtime code. Legacy Supabase-hosted assets are treated as "needs reupload" data, not as files the migrated app manages.

### Admin mutations

Current files:

- `apps/web/src/app/api/admin/magazines/*`
- `apps/web/src/app/api/admin/issues/*`
- `apps/web/src/app/api/admin/upload/route.ts`
- `apps/web/src/app/api/admin/topics/*`
- `apps/web/src/app/api/admin/site-settings/route.ts`

Replace:

- Supabase inserts, updates, deletes.
- Supabase `.single()` response handling.
- Supabase Storage cleanup fallback.

With:

- Parameterized SQL through repository methods.
- R2-only file cleanup. The migrated app should not call Supabase Storage APIs.
- Explicit transactions when a DB mutation and search-index mutation must stay consistent.

### OCR indexing

Current file: `apps/web/src/lib/search-indexer.ts`

Replace:

- `supabase.from('issue_search_index').delete().eq(...)`
- `supabase.from('issue_search_index').insert(rows)`
- `supabase.from('issues').update({ page_count })`

With:

- `deleteSearchIndexForIssue(issueId)`
- `insertSearchIndexRows(issueId, pages)`
- `updateIssuePageCount(issueId, pageCount)`
- Run `OPTIMIZE INDEX idx_issue_search_content_fts` after bulk import or large reindex batches.

## Migration Phases

### Phase 0: Stabilize and export current Supabase before migration

Goal: reduce immediate pause risk while migration is being built and capture a repeatable data backup.

Tasks:

- Add a temporary low-impact Vercel Cron endpoint that reads one public row daily.
- Add a manual JSON export script for all Supabase tables.
- Add an export verification script that prints only counts and checksums.
- Decide the cutover asset policy:
  - `draft-legacy-assets`: import legacy Supabase-hosted issues as drafts until reupload.
  - `reupload-before-cutover`: reupload the 8 files to R2 before final production switch.

Reason:

The migration should not be blocked by old PDFs, but production must not depend on Supabase URLs after cutover.

### Phase 1: Create target database and schema

Tasks:

- Create Turso database under the Society-controlled account if possible.
- Add local env vars:
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
- Add Vercel env vars for production/preview/development.
- Add `@libsql/client`.
- Add Drizzle dependencies if using Drizzle migrations.
- Create initial Turso schema migration.
- Add `updated_at` helper in code, since SQLite does not use the current Postgres trigger.
- Decide local dev behavior:
  - Option A: local SQLite file via libSQL client for offline dev.
  - Option B: remote Turso dev database.

Acceptance criteria:

- Empty schema can be created from scratch.
- `pnpm.cmd build` still passes with Supabase code unchanged.
- No production traffic has moved yet.

### Phase 2: Export live Supabase data

Tasks:

- Create `scripts/export-supabase-data.mjs`.
- Load Supabase env vars from `apps/web/.env.local`.
- Export tables to JSON files under a timestamped ignored directory, for example:
  - `.migration/supabase-export-YYYYMMDD-HHMMSS/magazines.json`
  - `.migration/supabase-export-YYYYMMDD-HHMMSS/issues.json`
  - `.migration/supabase-export-YYYYMMDD-HHMMSS/issue_search_index.json`
  - `.migration/supabase-export-YYYYMMDD-HHMMSS/admins.json`
  - `.migration/supabase-export-YYYYMMDD-HHMMSS/analytics_visibility.json`
  - `.migration/supabase-export-YYYYMMDD-HHMMSS/site_settings.json`
  - empty future tables too, for parity.
- Do not commit exported data unless the team explicitly wants a sanitized seed.
- Print only counts and checksums, not secrets.

Suggested checksums:

- Row count per table.
- SHA-256 hash per exported JSON file.
- Sum of `read_count`, `download_count`, `file_size_bytes`.
- Search index row count.

Acceptance criteria:

- Export count equals live audit count.
- Export can be repeated safely.

### Phase 3: Import into Turso

Tasks:

- Create `scripts/import-turso-data.mjs`.
- Import in dependency order:
  1. `admins`
  2. `magazines`
  3. `issues`
  4. `issue_search_index`
  5. `analytics_visibility`
  6. `site_settings`
  7. optional empty user tables
- Convert:
  - UUIDs to TEXT, preserving values.
  - timestamptz values to ISO text.
  - booleans to 0/1.
  - `topics` arrays to JSON text.
- Use transactions or chunked batches.
- Build/optimize FTS index after import.

Acceptance criteria:

- Turso table counts match Supabase export.
- Total file bytes, reads, downloads match.
- Search index row count matches 424.
- Imported rows obey the chosen asset policy:
  - If `draft-legacy-assets`, legacy Supabase-hosted rows are drafts.
  - If `reupload-before-cutover`, published rows have R2 or other non-Supabase URLs.

### Phase 4: Add database repository layer

Tasks:

- Create the new `apps/web/src/lib/db/*` files.
- Keep existing public TypeScript output shapes:
  - `ApiMagazine`
  - `ApiIssue`
  - search result shape
  - admin issue/magazine/settings shapes
- Add helpers:
  - `rowToApiIssue(row)`
  - `parseTopics(topics_json)`
  - `toDbBoolean(value)`
  - `nowIso()`
  - `createId()` using `crypto.randomUUID()`
- Add integration tests around repository methods if test tooling is ready.

Acceptance criteria:

- New repository methods can read the imported Turso data in local scripts.
- No app routes use the repository yet.

### Phase 5: Migrate read paths first

Tasks:

- Homepage reads.
- Browse reads and facets.
- Search page magazine reads.
- Search API OCR + metadata search.
- Issue detail/read API reads.
- Sitemap.
- Bookmarks page initial data.
- Public magazines API.
- Public site settings API.

Acceptance criteria:

- Public site works against Turso with Supabase still available as rollback.
- Search results match Supabase for a test query set:
  - `smile`
  - `Mother`
  - `Surrender`
  - one Hindi query from known OCR content
  - one topic-only query
  - one theme-only query
- Embargo behavior still hides PDFs/snippets for embargoed issues.
- No public read path returns a Supabase-hosted PDF URL.

### Phase 6: Migrate admin reads and writes

Tasks:

- Admin auth lookup.
- Admin dashboard stats.
- Magazine create/update/delete.
- Issue list.
- Issue inline edit.
- Issue delete.
- Issue PDF replace.
- Cover replace.
- Upload new issue.
- Bulk upload.
- Reindex.
- Thumbnail backfill.
- Topics list/delete/rename.
- Site settings edit.
- Storage page.

Acceptance criteria:

- Admin can upload a test PDF to R2 and create a Turso issue row.
- Admin can reindex a test issue.
- Admin can replace a cover.
- Admin can rename and delete topics.
- Admin can delete an issue and its R2 files.
- Admin can reupload a legacy issue PDF and move it from draft back to published.
- No admin route imports `@supabase/supabase-js`.

### Phase 7: Remove Supabase runtime dependency

Tasks:

- Remove runtime Supabase imports from `apps/web`.
- Remove `@aim-archive/supabase` dependency from `apps/web/package.json` if no longer used.
- Decide whether to keep `packages/supabase` as historical migration source or rename/archive it.
- Remove Supabase env vars from Vercel after final verification:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Keep old Supabase export files offline until after a full verification window.

Acceptance criteria:

- `rg "@supabase/supabase-js|createPublicClient|createAdminClient|supabase\\.storage|rpc\\(" apps/web/src` returns no active runtime dependency.
- Production build passes.
- Production smoke test passes.
- No published migrated issue has a Supabase-hosted `pdf_url` or `cover_image_url`.

### Phase 8: Decommission Supabase

Tasks:

- Keep Supabase project alive until at least one full upload/edit/search cycle has succeeded on Turso.
- Keep the Supabase JSON export.
- Once stable, let Supabase pause naturally or manually archive according to team preference.
- Do not delete the Supabase project until the Society confirms the migrated site is stable.

## Verification Checklist

Public:

- Homepage loads recent issues.
- Five-years-ago carousel loads expected month.
- Browse filters by year, month, magazine, language, and topic.
- Browse search matches title, theme, description, magazine name, and topics.
- Search returns OCR page hits with snippets.
- Search returns metadata-only hits.
- Issue detail page loads all metadata.
- Reader opens issues whose PDFs are on R2 or another non-Supabase host.
- Legacy Supabase-hosted issues are not publicly readable until reuploaded, unless they were reuploaded before cutover.
- Download route redirects to PDF and increments counter.
- Sitemap includes published issues.

Admin:

- Login works.
- Dashboard stats match migrated counts.
- Magazine CRUD works.
- Issue edit works.
- Topic rename/delete works.
- Upload stores PDF and cover in R2.
- OCR indexing populates `issue_search_index`.
- Reindex replaces old rows.
- PDF replace updates R2 URL and search rows.
- Cover replace updates R2 URL.
- Delete removes DB row and R2 objects.
- Storage page shows R2 objects and can flag draft issues that still need asset reupload.
- Site settings update works.

Data parity:

- `magazines`: 2 rows.
- `issues`: 10 rows.
- `issue_search_index`: 424 rows, unless May 2026 All India is intentionally reindexed first.
- `admins`: 1 row.
- `analytics_visibility`: 5 rows.
- `site_settings`: 2 rows.
- Read count sum: 174 at audit time.
- Download count sum: 0 at audit time.
- Total file bytes: 199610337 at audit time.

Performance:

- Browse first page remains fast.
- Browse facets remain fast with 10 issues and should scale acceptably to hundreds.
- Search response is acceptable for 424 pages and should be tested after importing a larger sample.
- R2 PDF/cover loads do not depend on database provider.

Security:

- Turso auth token is server-only.
- No database token is exposed to client bundles.
- Admin routes still call `verifyAdmin()`.
- Public routes only return published issues.
- Embargo logic still strips PDFs/snippets when needed.
- Search snippets remain sanitized.

## Rollback Plan

During migration:

- Keep Supabase env vars and code path available until Turso read/write parity is verified.
- Use a feature flag such as `DATABASE_PROVIDER=supabase|turso` if the migration is spread across multiple commits.
- For a simpler cutover, keep work on a branch and merge only after local/staging verification.

Rollback before final decommission:

- Restore `DATABASE_PROVIDER=supabase`.
- Redeploy Vercel.
- Keep R2 URLs in Supabase rows; Supabase can still store URLs that point to R2.

Rollback after final decommission:

- Restore from exported JSON into a fresh database.
- This is why the export/import scripts and checksums are part of the migration deliverable.

## Main Risks And Mitigations

Risk: Turso FTS does not exactly match Postgres `plainto_tsquery` ranking/snippets.

Mitigation:

- Preserve result shape, not exact ranking.
- Build deterministic snippet logic in TypeScript.
- Use a fixed regression query set.

Risk: SQLite JSON topic filtering is slower than Postgres array indexes at large scale.

Mitigation:

- Current data is tiny.
- If needed later, normalize topics into `issue_topics(issue_id, topic)` for fast filtering.
- Consider adding this join table during migration if batch topic editing is still a near-term feature.

Risk: Legacy Supabase Storage URLs remain in rows.

Mitigation:

- Make 0 published Supabase URLs a hard acceptance criterion.
- Import legacy-asset rows as drafts if the files are not reuploaded before cutover.
- Keep a visible admin filter/status for issues that need asset reupload.

Risk: Admin upload relies on long OCR work inside Vercel.

Mitigation:

- This risk already exists today.
- Keep current `after()` behavior initially.
- Retain per-issue reindex retry.
- Later move OCR to a background job if uploads grow.

Risk: Page number anomalies in existing search index.

Mitigation:

- Preserve current data during first migration.
- Add a later audit task to compare PDF page count, indexed row count, and max page number.

Risk: Provider free tiers can change.

Mitigation:

- Keep exports and migrations portable.
- Avoid provider-specific calls outside `apps/web/src/lib/db`.
- Keep R2 file storage independent.

## Suggested Implementation Order

1. Add temporary keepalive and export scripts.
2. Create Turso schema and import scripts.
3. Import live data into Turso using the chosen asset policy.
4. Build repository layer.
5. Migrate public read paths.
6. Migrate search.
7. Migrate admin reads.
8. Migrate admin writes/uploads/reindex.
9. Verify admin reupload can publish a formerly legacy-asset issue.
10. Remove Supabase runtime dependency.
11. Run production-like verification.
12. Cut over environment variables.
13. Keep Supabase as rollback for a short stability window.

## Definition Of Done

The migration is complete when:

- Production app runs without Supabase env vars.
- No runtime app code imports `@supabase/supabase-js`.
- No published issue points to a Supabase-hosted PDF or cover URL.
- Public browse/search/reader behavior is verified.
- Admin upload/edit/delete/reindex behavior is verified.
- Admin reupload can restore legacy-asset draft issues without Supabase.
- Export/import scripts exist and can recreate the database from a backup.
- The project owner has a copy of the latest database export.
