# AIM Archive

Web archive for Sri Aurobindo Society's All India Magazine and existing Hindi Agnishikha catalogue. Includes public browsing/search/reading, local bookmarks/history, catalogue administration and manual English indexing.

## Receiving this source

GitHub `main` contains the current deployed web source for Dibyanshu Ji and Society IT. The 17 October security release is live at `https://aim-archive.vercel.app`; this review deployment is not a declaration of final operational acceptance or official public launch. Read the [current handover status](docs/handover/CURRENT_STATUS_2026-10-17.md) before older dated reports.

Start here:

1. [Current handover status](docs/handover/CURRENT_STATUS_2026-10-17.md) — deployed version, implementation, accepted exceptions and receiving checks.
2. [Society document index](docs/handover/SOCIETY_DOCUMENT_INDEX.md) — receiving decisions and supporting evidence.
3. [Technical specification](TECHNICAL_SPECIFICATION.md) — architecture, APIs, data and implementation boundaries.
4. [Setup](SETUP.md) — exact runtime, native dependencies, environment names and installation.
5. [Active tracker](TO%20DO%20LIST.md) — outstanding work and settled scope; historical plans are not current commitments.
6. [Recovery guide](MIGRATION_RECOVERY.md) and [indexing guide](GITHUB_INDEXING.md) — controlled operator procedures.

## Layout and verification

- `apps/web`: Next.js 15 / React 19 application, including server APIs.
- `apps/mobile`: preserved Expo skeleton; native-app completion is excluded.
- `packages/shared`, `packages/turso`: shared types and ordered database migrations.
- `scripts`, `.github/workflows`: verification, recovery and manual indexing tools.
- `docs`: handover evidence and dated archive material.

Use Node **22.23.3** and pnpm **10.33.0**. On a clean Linux checkout without service credentials or private environment files:

```sh
pnpm install --frozen-lockfile
bash scripts/ci-verify.sh
node scripts/check-dependency-advisories.cjs
python3 scripts/test-turso-restore.py
```

The CI script uses isolated synthetic data and starts/stops its own local test server. It needs network access for installation/OCR data. It does not configure a development environment or test live services. For Windows installation and normal development, follow [SETUP.md](SETUP.md); use `pnpm.cmd`. Never point installation, migration or mutation tests at production merely to make them pass.

## Services and private material

The web server uses Turso/libSQL for data and Cloudflare R2's S3-compatible API for PDFs/covers. GitHub Actions performs manual indexing; Vercel hosts the current website. Application HTTP routes are in `apps/web/src/app/api`. Extraction/OCR runs through PDF.js and Tesseract.

Secrets, private environment files, database snapshots, magazine PDFs, historical correspondence, generated caches and dependencies are intentionally absent from Git. They are not missing source. Use the example environment and arrange authorized service access separately. Keep current login/session configuration unchanged until explicitly instructed.

## Release limitations

Private PDF delivery is deployed through the application. Direct access through the old public R2 origin remains an accepted exception awaiting Society IT action; see [current status](docs/handover/CURRENT_STATUS_2026-10-17.md). Hosted staging and full Admin mutation/recovery demonstrations remain open. Native tooling advisories and the Next 15 support transition remain [tracked release work](docs/handover/P6_SUPPORT_REVIEW_2026-10-13.md). [Offline database restore](docs/handover/P3_LOCAL_RESTORE_2026-10-13.md) passed; full restored-service and receiving demonstrations remain open. No separate R2 backup is requested.

The historically exposed admin password remains unchanged by owner instruction. Cleaned branch history and source scans do not erase old PR references, caches, clones or private backups. See [credential review](docs/handover/P4-03_SECRET_HISTORY_REVIEW.md).

Do not manually run production indexing solely because this source is available. Verify web/worker configuration, storage access and the relevant release gates in the tracker before the next operational change.
