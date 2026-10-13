# Source publication — 13 October 2026

The owner authorized source publication and repository sharing after reporting Society acceptance and continued participation. This is a source delivery, not a website release or final operational sign-off.

## Published source

- Private repository: [MugdhanilK/aim-archive](https://github.com/MugdhanilK/aim-archive), default branch `main`.
- Source commit: [`c44eb459325dfd8835a0a632b2ece735d7e15764`](https://github.com/MugdhanilK/aim-archive/commit/c44eb459325dfd8835a0a632b2ece735d7e15764).
- Parent: `e4d860fb7fc540481ab7bf23d768bedd8cbb3c6c`; normal fast-forward push, no history rewrite.
- 366 files: reviewed source/docs plus a receiving README. The 24 intentional retired/generated removals match the reconciliation selection.
- Original `D:\AIM Project` HEAD remains `4c02a99a3ecb7aa17a3be8f0c724c9c6127e676b`. Commit/staging occurred only in `.cache/publication-2026-10-13/repo`; original index and private environment hashes were unchanged.

Every selected staged file matched its recorded bytes and modes. Gitleaks directory scan and exact known-secret checks found zero matches. Earlier tested runtime source was retained; the CI script additionally runs the seven new synthetic restore tests. Those tests passed from the isolated checkout. Existing CRLF, vendor license whitespace and dated Markdown line breaks were retained; `git diff --check` is not recorded as clean. Local manifests and sanitized operation evidence are in `.cache/publication-2026-10-13` and are not required to run the delivered source.

Hosted verification: [Verify source run 38358541234](https://github.com/MugdhanilK/aim-archive/actions/runs/38358541234) completed successfully on Ubuntu 24.04. Locked install, isolated verification (runtime, migrations, security/search/worker/native OCR, seven restore tests, lint/types/build, budgets and HTTP/image startup) and the dependency gate passed. The gate still reports native-only findings separately; success does not mean all monorepo dependencies are vulnerability-free.

## Live service preserved

Fresh inspection confirmed Vercel's Git connection targets `main` with root `apps/web`; the original ignored-build setting was null. A temporary ignored-build command matched only the source commit above. The triggered production build `dpl_G7MEmb1fXqUbFgi653TWmeUVy1K3` reached `CANCELED`; the previous setting was restored and verified. Public alias `aim-archive.vercel.app` remained on `dpl_5V2XphXmDRLfDB4ku83WkYgeSf7x` throughout these checks. The guard is not a permanent suspension: future pushes still need deployment coordination.

No application deployment, database migration, R2 change, production indexing, credential rotation or session invalidation was performed. The Cloudflare request remains pending and unsent. The worker source is now on GitHub; dedicated storage/dispatch configuration and an actual production worker verification remain open.

## Receiving access and remaining boundaries

Repository visibility was verified private. At publication only the owner's account had collaborator access; no invitations existed. The recipient account [dibyanshudsg](https://github.com/dibyanshudsg) was supplied by the owner and verified. The owner instructed that the invitation remain on hold while cleanup is completed. No invitation was sent. A personal private repository offers collaborators write access; the access decision and receiving verification remain open.

Begin with [README](../../README.md), [technical specification](../../TECHNICAL_SPECIFICATION.md), [setup](../../SETUP.md) and [active tracker](../../TO%20DO%20LIST.md). Credentials and private recovery data stay outside Git. The unchanged exposed password, old PR/external-copy limits, dependency/support work, staging/origin closure and full operational acceptance remain explicitly open. Native source is a skeleton, not a completed app.

## Authorized source cleanup

The owner requested a complete tracked-file audit and then authorized cleanup before inviting the recipient. All 366 files were classified. The first 12 removals are:

- Two personal correspondence preparation documents: `HANDOVER_EMAIL_DRAFT.md` and `DIBYANSHU_REQUEST_REVIEW.md` under `docs/handover`.
- Four unused source brand images under root `images/`; the runtime `apps/web/public/logo.png` is retained.
- Four retired tools under `scripts/`: `preserve-workspace.py`, `verify-preservation.py`, `inspect-indexing-sources.mjs`, `pilot-search-extraction.mjs`.
- Redundant `.pnpmrc.json`; the supported root package build allowlist is retained.
- Unreferenced `apps/web/src/components/layout/index.ts` re-export file; Header/Footer implementations remain.

All 12 originals plus the pre-cleanup tracker were preserved and hash-verified in private `D:\AIM (Project Directory)\SOURCE_cleanup_2026-10-13` (13 files, 29,537,021 bytes; manifest SHA-256 `e28ed3c4ab8799c9c1a1b247401ec9c5c5a7da083ea07426cffe0c269e3f2630`). Documentation references were repaired, and conversational/personal drafting notes were removed from the active tracker while retaining technical decisions and task IDs. The current tree is smaller; earlier Git commits still contain the removed files. This is not a history purge.

The native skeleton, optional historical/design evidence, migrations, tests, font licenses, PDF worker and useful recovery/portability tools remain. Dependency removal was not mixed into this cleanup.

The isolated cleaned candidate contains 355 files. A fresh Ubuntu install with pinned Node 22.23.3 / pnpm 10.33.0 and `--frozen-lockfile` passed without `.pnpmrc.json`; the retained package build allowlist supports the native PDF/OCR checks. The exact `scripts/ci-verify.sh` passed runtime/environment, migration, PDF security, search/worker, restore, lint, TypeScript, production build, performance budgets and HTTP/image startup checks. A local wrapper setup error was corrected before running the suite; it was not an application failure. The assembled candidate passed Gitleaks and exact known-secret scans with zero matches, and Markdown relative links resolve. Original index/private environment hashes remain unchanged.

The cleaned follow-up is prepared for a normal fast-forward source commit using the same exact-commit Vercel guard. Hosted results must be checked on the [Verify source workflow](https://github.com/MugdhanilK/aim-archive/actions/workflows/verify.yml); the initial hosted result above applies specifically to `c44eb45`. No production rollout or recipient invitation is authorized by a passing source check.
