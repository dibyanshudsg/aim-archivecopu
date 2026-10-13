# Agent Instructions

This file is the day-to-day runbook for coding agents working in this repo. It is intentionally shorter than `CLAUDE.md`.

## First Files To Read

1. Read `CLAUDE.md` for the full product, architecture, database, deployment, and design context.
2. Read `TO DO LIST.md` for the freshest task status and near-term priorities.
3. Use [docs/archive/README.md](docs/archive/README.md) for historical evidence only; the active backlog is `TO DO LIST.md`.

Do not paste secrets from docs or `.env.local` into chat. Summarize sensitive configuration instead.

## Verified Reality Snapshot

Updated: 2026-09-19. pnpm/Turborepo monorepo: web in `apps/web`, Expo skeleton in `apps/mobile`, shared types in `packages/shared`.

Web candidate updated 10 October: Next.js 15.5.27, Node 22.23.3, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Turso/libSQL, Cloudflare R2, react-pdf, pdfjs-dist 4.8.69, canvas, Tesseract.js, Zustand, Zod and Lucide. Keep root React type overrides and PDF.js v4 compatibility. See SETUP.md for the exact runtime contract; this local candidate is not deployed.

The web runtime uses Turso repositories and R2 assets. Public catalogue scope is English/Hindi; new extraction/OCR is English-only. The native app is not feature-complete.

## Run Locally

Use [SETUP.md](SETUP.md) for pinned Node/pnpm installation, native dependencies, local fonts and environment scope. Database changes use the [explicit-target migration procedure](docs/handover/P4-07_MIGRATION_PROCEDURE.md); a bare migration command no longer selects the configured live database.

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

## Verification and Current Status

The September 19 website release passed build, TypeScript/lint and production browser checks; see [release evidence](PRODUCTION_RELEASE_2026-09-19.md). These are dated results, not a substitute for checks after a new change.

Run `pnpm.cmd build` from `apps/web`. If a build encounters sandbox `spawn EPERM` or cache permissions, follow the session's sandbox instructions and use the narrow required escalation; do not infer a code defect from a runner failure.

[TO DO LIST.md](TO%20DO%20LIST.md) is the single active backlog. Domain/CDN setup and spending are deferred. Admin manual dispatch still needs `INDEXING_GITHUB_TOKEN` in Vercel and live verification. Local worker changes require GitHub source synchronization separately from website deployment.

## Current Web and API Surface

Public routes: Home, Browse, Search, Bookmarks, issue detail and Reader. Admin includes magazines, issues/bulk upload, storage/settings, navigation and indexing. Discover current routes from disk instead of relying on historical counts:

```powershell
rg --files apps/web/src/app -g 'page.tsx'
rg --files apps/web/src/app/api -g 'route.ts'
```

Keep public server-component wrappers with initial repository data. Privileged API work must call `verifyAdmin()`. Public queries exclude drafts and enforce the five-year access policy before returning PDF URLs. Search snippet HTML must be sanitized.

Respect endpoint-specific public caching and invalidation; do not cache away read/download analytics side effects. See [performance implementation](PERFORMANCE_IMPLEMENTATION.md).

## Database and Storage

Runtime migrations are in `packages/turso/migrations/`: core schema (00001), navigation (00002), durable indexing/workspace/controls (00003–00006), and FTS5 trigram page/metadata search (00007–00008). Use parameterized libSQL queries and transactions; authorization is enforced by the application.

R2 stores PDFs/covers. The September 19 catalogue check found 104 issues. Current file locations must match configured R2 bases. The owner excluded a separate R2 backup during handover preparation; see P1-03.

Operating references:

- [Manual GitHub indexing](GITHUB_INDEXING.md) and [worker/rebuild guide](INDEXING_WORKER.md).
- [Navigation management](NAVIGATION_MANAGEMENT.md).
- [Migration recovery notes](MIGRATION_RECOVERY.md).
- [Deferred asset delivery](ASSET_DELIVERY_PLAN.md).

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

- Follow the phase/task IDs in `TO DO LIST.md`. Before starting each task, brief the owner on its purpose, choices, necessary questions, planned actions, expected outcome and verification. Resolve consequential missing choices before dependent work; do not repeat questions already answered.
- Record progress, decisions and completion evidence as work proceeds. Check off a task only after verification; brief the next task before starting it.

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
