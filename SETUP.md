# Runtime, installation and configuration

P4-05/06, 10 October 2026. This describes the local handover candidate, not a new production release. [Clean Linux verification](docs/handover/P4-08_09_CANDIDATE_VERIFICATION.md) passed for the identified assembled source snapshot; a release commit/push remains separate. Current production configuration is inventoried in [batch evidence](docs/handover/P4_BATCH1_REPRODUCIBILITY.md).

## Runtime contract

- Web/operator baseline: Node **22.23.3** (`.node-version`), pnpm **10.33.0** (`packageManager`). Engines require 22.23.3+ within major 22; `verify:runtime` requires the exact tested pin. Both local workflows read the version file; neither this upgrade nor the new CI has been published. Hosted Node settings remain a release check.
- [P4-10/P6-01 verification](docs/handover/P4-10_P6-01_CI_SECURITY_REVIEW.md) passed on a fresh Linux installation. The Windows host runtime and installed dependencies were not replaced: select the pinned Node version and run the frozen install before using this updated candidate locally. Remaining native dependency findings and the Next 15 support horizon keep P6-01 open.
- Next **15.5.27**, PDF.js **4.8.69**, canvas 3.x and the lockfile form the compatibility baseline. Do not upgrade PDF.js to v5 without reworking and testing server canvas rendering.
- Preserve root `pnpm.overrides` for both React type packages. The native Expo app is a skeleton; root command success does not certify native delivery.

Install from the repository root using the pinned tools:

```powershell
node --version
pnpm.cmd --version
pnpm.cmd install --frozen-lockfile
pnpm.cmd verify:runtime
pnpm.cmd test:environment
pnpm.cmd test:migrations
pnpm.cmd lint
pnpm.cmd --filter @aim-archive/web build
```

On Linux use `pnpm` instead of `pnpm.cmd`. A cold install needs registry/native-binary network access. `--offline` works only with a populated pnpm store; it is not a cold-install guarantee. Do not use `--ignore-scripts` for the working installation: approved canvas/Tesseract dependency setup must run. Do not broadly approve unrelated dependency scripts.

For development, run `pnpm.cmd dev` from `apps/web`. Keep `INDEXING_LOCAL_WORKER` unset/0. Set it in the launch environment only when deliberately starting the continuous local worker; setting it in Next's `.env.local` alone is too late for the parent launcher. Production website `pnpm.cmd start` runs after building and does not start indexing. Manual indexing uses its separate workflow.

## Native dependencies and OCR

For the installed canvas v3, prebuilt support includes Windows x64 and Linux x64/glibc. Do not assume Alpine/musl or another architecture has a compatible binary. When source compilation is required on Ubuntu, install build-essential, pkg-config, Python 3, libcairo2-dev, libpango1.0-dev, libjpeg-dev, libgif-dev and librsvg2-dev through the receiving host's provisioning process. See the versioned [canvas v3 instructions](https://github.com/Automattic/node-canvas/tree/v3.2.3#compiling); no host packages were installed in this task.

`verify:runtime` loads canvas and generates a PDF, checks the browser PDF worker against the installed PDF.js bytes, verifies standard fonts, and checks UI-font/license hashes. `node scripts/test-indexing-worker-pdf.cjs` exercises actual native-text extraction and scanned-page English OCR with synthetic PDFs and an isolated database. It does not read or write production catalogue/storage.

PDF.js server standard fonts come from `pdfjs-dist/standard_fonts`; Next tracing in `next.config.ts` includes their real pnpm location for admin routes. The worker needs the installed dependency tree too. These fonts are separate from the website UI fonts below.

English OCR needs a writable cache (`INDEXING_OCR_CACHE_PATH` on the worker); first use may download English trained data. Git/deployment packages intentionally exclude generated traineddata. Preserve a controlled worker cache or arrange first-use download before indexing. This task does not claim a cold offline OCR install. Hindi OCR is excluded.

## Fonts without build-time downloads

The four existing families now use `next/font/local`: Inter variable (100–900), Aboreto 400, Tiro Devanagari Hindi 400, and Tangerine 400/700. CSS variable names, swap behavior and Tangerine's disabled preload are retained. The vendored WOFF2 files and four OFL licenses are in `apps/web/src/app/fonts`; `manifest.json` records an immutable Google Fonts commit, original SHA-256 and output SHA-256. Full fonts preserve their glyph coverage; compressed font assets total 565,396 bytes. Final page/network performance remains P6-09.

Normal installation and builds need neither Google Fonts nor Python font tools. A maintainer updating fonts can review `scripts/vendor-fonts.py` (fonttools[woff] 4.54.1); it refuses to overwrite an existing manifest. Update in a separate reviewed directory, retain licenses, compare hashes/glyph coverage, then verify the build/browser. Do not run a font refresh as part of deployment. Local-font behavior is documented by [Next](https://nextjs.org/docs/app/getting-started/fonts#local-fonts).

## Environment contract

Copy `apps/web/.env.local.example` only for a **new** isolated setup; populate values privately. Do not overwrite the existing environment file. Next loads its web environment files; ordinary operator scripts vary, so follow each command's target instructions. Existing login/session configuration must remain unchanged until a new owner instruction.

| Names | Scope and behavior |
|---|---|
| `DATABASE_PROVIDER`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Server/worker. Provider is `turso`; token may be omitted for isolated `file:` databases. Build/prerender may read the selected DB. |
| `ADMIN_PASSWORD` | Server-only login and current fallback signing secret. Never use a public prefix. |
| `ADMIN_SESSION_SECRET` | Optional independent signing secret. Omission preserves password fallback; changing it invalidates sessions and outstanding replacement-upload tickets. Do not provision/change it on this installation without authorization. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Server/worker private storage. Separate staging and production credentials; worker uses a dedicated read scope. |
| `R2_PUBLIC_BASE_URL` | Stored asset-locator namespace and allowed host. Required even when its public origin is closed; this name does not imply public access is safe. |
| `R2_LEGACY_PUBLIC_BASE_URLS` | Optional exact former locator bases. URL mapping only; does not grant or revoke access. |
| `PDF_DELIVERY_DISABLED` | Server; only `1` enables the unavailable-PDF fallback. Requires the host's normal restart/redeploy. Does not stop worker/admin writes. |
| `NEXT_PUBLIC_APP_URL` | Public canonical origin, used during build and server rendering. Set correctly for each target; preview must not inherit an unsuitable production origin. |
| `NEXT_PUBLIC_ENABLE_WEB_VITALS` | Public build-time opt-in (`true`); defaults off. Rebuild to change client behavior. Not error monitoring. |
| `INDEXING_GITHUB_TOKEN` | Server-only manual dispatch; absent means Admin Start is unconfigured. |
| `INDEXING_OCR_CACHE_PATH` | Worker cache path; must be writable. |
| `INDEXING_LOCAL_WORKER` | Launch-environment dev opt-in; default off. |
| `NEXT_DIST_DIR` | Build/dev output; default `.next`. Use `.next-*` for isolated builds covered by Turbo/lint rules. |

Turbo strict-mode tasks receive all 18 names above. Environment files and `.node-version` are global cache inputs; CLI environment values also participate in hashes. Cache hashes are not a secret-storage mechanism: keep local/remote caches access-controlled. Environment files remain excluded from Git/deployment. See [Turbo's environment guidance](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables).

GitHub secret names are mapped explicitly by the workflow: `INDEXING_TURSO_DATABASE_URL/AUTH_TOKEN` to `TURSO_*`, and `INDEXING_R2_ACCOUNT_ID/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY` to `R2_*`. `INDEXING_REQUEST_ID` and `GITHUB_*` are workflow-run metadata, not static web settings. Repository variables supply R2 locator bases. No GitHub secret value or workflow setting was changed remotely.

Operator-only settings (`LOCAL_TURSO_DB`, `PREWARM_BASE_URL`, `ADMIN_EMAIL`) are not app build inputs. Prewarm can authenticate against its selected target; do not run it against production as an installation check. Migration targets are explicit: see [migration procedure](docs/handover/P4-07_MIGRATION_PROCEDURE.md).
