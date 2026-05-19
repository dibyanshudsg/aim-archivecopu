# Agent Instructions

This file is the day-to-day runbook for coding agents working in this repo. It is intentionally shorter than `CLAUDE.md`.

## First Files To Read

1. Read `CLAUDE.md` for the full product, architecture, database, deployment, and design context.
2. Read `TO DO LIST.md` for the freshest task status and near-term priorities.
3. Use `ROADMAP.md` as historical planning context only. It is older than `CLAUDE.md` and `TO DO LIST.md`, and some completed items are still marked pending there.

Do not paste secrets from docs or `.env.local` into chat. Summarize sensitive configuration instead.

## Verified Reality Snapshot

Last verified: 2026-05-02.

The repo is a pnpm/Turborepo monorepo:

- Root package: `aim-archive`
- Web app: `apps/web`, package `@aim-archive/web`
- Mobile app skeleton: `apps/mobile`, package `@aim-archive/mobile`
- Shared package: `packages/shared`
- Supabase package and migrations: `packages/supabase`
- ESLint config package: `packages/eslint-config`

The web app is Next.js 15.5.15, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Supabase, `react-pdf`, `pdfjs-dist@4.8.69`, `canvas`, Tesseract.js, Zustand, Zod, and Lucide React.

The mobile app is an Expo skeleton with four tabs: Home, Browse, Search, Library. It is not feature-complete.

Local source PDFs exist in `AIM 2026/` and `Agnishikha 2026/` with 8 real PDFs total.

## Run Locally

Prefer running the web app directly from `apps/web`:

```powershell
cd "d:/AIM Project/apps/web"
pnpm.cmd dev
```

The app runs at:

```text
http://localhost:3000
```

PowerShell may block the `pnpm.ps1` shim with an execution-policy error. Use `pnpm.cmd` instead of `pnpm`.

If `localhost:3000` hangs or times out, check for a stuck process occupying the port:

```powershell
netstat -ano | Select-String ':3000'
```

If a stale Node/Next process is listening on `3000` but not responding, stop only that owning process, then restart the dev server.

## Common Commands

From `apps/web`:

```powershell
pnpm.cmd dev
pnpm.cmd build
pnpm.cmd start
```

From the repo root:

```powershell
pnpm.cmd --filter @aim-archive/web dev
pnpm.cmd --filter @aim-archive/web build
pnpm.cmd build
pnpm.cmd format:check
```

The direct `apps/web` command is easier for daily local work. The filtered root command is also valid.

## Build Status

Verified production build command:

```powershell
cd "d:/AIM Project/apps/web"
pnpm.cmd build
```

Build result on 2026-05-02: passes when run outside the sandbox permission limitation.

Current warnings:

- `apps/web/src/app/browse/browse-client.tsx`: `setLoading` is assigned but unused.
- `apps/web/src/app/read/[id]/page.tsx`: two React hook dependency warnings involving `issue` and `numPages`.

If the build fails with `spawn EPERM` or a webpack cache `EPERM` inside the Codex sandbox, rerun with elevated permission. That failure is environmental, not necessarily a code failure.

## Docs Claims Vs Reality

`CLAUDE.md` is mostly accurate for product direction and architecture, but it has some stale details:

- It says 19 API endpoints/routes. The build currently shows 20 route handlers, including `/api/admin/issues/[id]/cover`.
- Its project structure omits the current admin bulk upload page at `/admin/issues/bulk`.
- Its "Admin Enhancements (Planned)" list is stale. Many of those items are now implemented: bulk select/actions, manual cover upload, download count column, pagination, status/topic filters, CSV export, bulk upload, duplicate issue, and custom toast/confirm UI.
- It says the backend API count is 16 in one older tech-stack bullet and 19 later. Reality is 20 route handler files.

`TO DO LIST.md` is the freshest status tracker:

- Admin issues page enhancements are mostly complete, except batch topic editing.
- Current Phase 1.5 remaining work includes Lighthouse, accessibility, custom domain, browse/search polish, auth hardening, server-side browse scalability, mobile readiness, tests, lint tooling cleanup, and optional font/PDF-worker resilience.
- A Cloudflare R2 storage migration is planned but not implemented.

`ROADMAP.md` is stale:

- It still marks Vercel deployment, SEO, and Zod validation as pending, but the code/docs/build indicate those are done.
- It still marks admin enhancements as pending even though many are implemented.
- It claims "production build - 0 errors, 0 warnings"; current build passes but has warnings.

## Current Web Surface

Public pages on disk:

- `/`
- `/browse`
- `/search`
- `/bookmarks`
- `/issue/[id]`
- `/read/[id]`

Admin pages on disk:

- `/admin/login`
- `/admin`
- `/admin/magazines`
- `/admin/issues`
- `/admin/issues/new`
- `/admin/issues/bulk`

Public routes use the server-component wrapper pattern with client children where needed. Keep this pattern for public data pages.

## Current API Surface

Route handler files currently on disk:

- `/api/magazines`
- `/api/issues`
- `/api/issues/[id]`
- `/api/issues/[id]/download`
- `/api/search`
- `/api/pdf/[...path]`
- `/api/admin/auth`
- `/api/admin/auth/check`
- `/api/admin/stats`
- `/api/admin/magazines`
- `/api/admin/magazines/[id]`
- `/api/admin/issues`
- `/api/admin/issues/[id]`
- `/api/admin/issues/[id]/cover`
- `/api/admin/issues/[id]/reindex`
- `/api/admin/upload`
- `/api/admin/reindex`
- `/api/admin/thumbnails`
- `/api/admin/topics`
- `/api/admin/topics/rename`

Admin routes should call `verifyAdmin()` before privileged work.

Public API caching currently exists for:

- `/api/magazines`: `s-maxage=600`, `stale-while-revalidate=3600`
- `/api/issues`: `s-maxage=60`, `stale-while-revalidate=300`
- `/api/search`: `s-maxage=60`, `stale-while-revalidate=300`

`/api/issues/[id]` is intentionally not cached because it increments read analytics. `/api/issues/[id]/download` increments download analytics.

## Database And Storage

Migrations currently on disk:

- `00001_initial_schema.sql`: core tables, indexes, RLS, triggers, seed analytics visibility.
- `00002_search_rpc.sql`: `search_issues` RPC.
- `00003_analytics_counters.sql`: atomic read/download counter RPCs.

Core tables claimed in docs match the migration:

- `magazines`
- `issues`
- `issue_search_index`
- `admins`
- `users`
- `user_bookmarks`
- `user_reading_history`
- `analytics_visibility`

Storage is currently Supabase Storage bucket `magazines`. Cloudflare R2 migration is planned in `TO DO LIST.md`, but code still uses Supabase Storage.

The `magazines` bucket must allow PDF and image MIME types because upload/thumbnail/cover flows write PDFs and JPEG/PNG assets.

## Important Implementation Rules

- Do not remove the root `pnpm.overrides` for `@types/react` and `@types/react-dom`. Vercel builds are sensitive to duplicate React type versions.
- Keep `pdfjs-dist` on v4.x unless the server-side canvas rendering path is deliberately reworked.
- Client components using `useSearchParams()` in Next 15 need a Suspense boundary from a server wrapper page.
- Keep public pages data-first: fetch initial public data in server components and pass it into colocated client components.
- Public queries should exclude drafts with `is_published = true`.
- Search snippets rendered as HTML must be sanitized.
- Avoid reintroducing heavy visual effects that hurt scroll performance, especially backdrop blur, infinite particles, and heavy radial gradients.
- The content title format is magazine name, separator, full month name, and year, for example `All India Magazine - February 2024`. Existing docs/code use a typographic dash as the separator; preserve the existing display convention when editing title-generation code.

## Git Notes

This workspace may appear as a dubious-ownership repo inside sandboxed agents. Use a one-command override for read-only Git checks:

```powershell
git -c safe.directory='D:/AIM Project' status --short
```

Never revert or overwrite unrelated dirty work. At the time this file was created, the working tree already had many modified and untracked files from prior work.

## Editing Workflow Notes

- Prefer targeted in-place patches for existing files. Do not delete and recreate a file just to make a code change.
- For large refactors, still patch section by section unless the file is genuinely being removed or renamed.
- Deleting and recreating a file can confuse the Next.js/Turbopack dev server and leave it with a stale "module not found" state until restart.
- If a full rewrite is truly unavoidable, expect to restart the dev server afterward and make that tradeoff explicit.

## Deployment Notes

Vercel project is linked in `.vercel/project.json` as `aim-archive`.

Production URL in docs:

```text
https://aim-archive.vercel.app
```

Standard production verification before deploy:

```powershell
cd "d:/AIM Project/apps/web"
pnpm.cmd build
```

Required environment variables are managed locally in `apps/web/.env.local` and in Vercel. Do not expose their values in chat.
