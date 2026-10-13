# P4-08/09 isolated candidate verification

10 October 2026. Local preparation only; no commit, push, deployment, credential change or recipient message.

## Candidate identity and assembly

The P4-01 selection was rechecked before copying: all 351 selected files still matched their recorded SHA-256 hashes. Local HEAD remains `4c02a99a3ecb7aa17a3be8f0c724c9c6127e676b`; the assembly base is sanitized remote main `e4d860fb7fc540481ab7bf23d768bedd8cbb3c6c`.

Assembly started from a read-only Git archive of that remote-main commit, overlaid only the selected files, and applied the 24 reviewed removals/exclusions. File inventory and every selected byte hash matched; no private environment, database, recovery copy, generated OCR download or dependency/build directory was included. Git file modes were applied to the tar entries. Existing Windows source and index were not staged/reset.

- Source: `.cache/p4-release/candidate/` (351 files).
- Archive: `.cache/p4-release/candidate.tar.gz`.
- Archive SHA-256: `b5cfcb3458c069eabb85ecc51132341f9cc25571ddf7a5267e7d4530c637ff5d`.
- Selection: `.codex-logs/p4-source/selection-2026-10-10.json`, SHA-256 `0a4adf20b51284d62b143ce545562b996043aa2ff5a75053a527cae2f09858ef`.
- Runtime/operator fingerprint: `e83456f0abdfd1ab4678b2e1069b00a95bf91b42a278a6d890b5bd974a6626bc`.

This immutable test snapshot contains the documentation as selected under P4-01. This verification report and subsequent tracker updates are companion evidence, not silently substituted files inside that archive. Final publication/transfer must reconcile and scan any later documentation or source changes.

## Package scan

Gitleaks 8.30.1 directory scan: zero findings, exit 0. Exact comparison of all 351 raw file byte sequences against locally configured credential values: zero matches. Secret values were never printed or copied. Binary/compressed contents were not decoded; history is not part of the source tarball. This completes the assembled-candidate scan for this exact archive, not universal erasure or security acceptance.

GitHub's old PR #1 reference and external clones/caches/private recovery copies may retain the active password. Rotation remains deferred by the owner. Neither the current login nor existing sessions were changed.

## Linux verification environment

Existing Ubuntu 26.04 x64 under WSL2, kernel `6.6.87.2-microsoft-standard-WSL2`. A new Linux filesystem directory `/var/tmp/aim-p4-dFCMlA8t` contains tools, source, logs, database fixtures, OCR cache and a dedicated empty pnpm store. Windows node_modules/build/OCR caches were not copied or used. Docker was unavailable; no Docker service or new Linux distribution was installed.

Downloaded Node 22.16.0 Linux x64 from the official distribution and checked its SHA-256 against the official version manifest. Installed pnpm 10.33.0 in the task tools directory. Cold `pnpm install --frozen-lockfile` passed: 1,232 packages added, zero reused store packages; canvas and Tesseract setup completed. Existing policy skipped sharp/unrs-resolver lifecycle scripts; no blanket script approval or dependency upgrade was performed. Native canvas/runtime verification subsequently passed.

The selected source was extracted into a fresh disposable Git index for exclusion checks, without a release commit or remote. This verifies clean selected-source reproducibility; it is not a claim that a committed checkout of this release exists yet. Build configuration uses a newly migrated local database and synthetic values only. Hosted Turso/R2/admin/GitHub credentials were not supplied.

## Completed verification

Passed: runtime/font/native dependency checks; all 18 environment names and Turbo behavior; migration lifecycle; package exclusions; nine PDF security suites; search/review; cache/FTS performance; I/O/ZIP limits; reader matching; asset locations; bounded worker runner; four Python scheduling tests; real PDF/native/scanned English OCR; root lint (four tasks) and full cache replay; web TypeScript check; cold root production build, including Next generation of all 43 static pages and build tracing.

The root build completed three tasks with zero cache hits. Its mobile task is the existing `echo 'Mobile build — use EAS CLI'` placeholder and emitted Turbo's no-output warning; this is recorded rather than represented as a native build. No application/configuration fix was needed for Linux. The selected source is byte-for-byte unchanged.

Production-manifest gzip budgets passed: homepage 204.6 KiB / 220, Browse 207.5 / 220 and reader 300.7 / 350; the homepage initial scripts exclude the PDF engine. Additional extraction checks passed for native glyphs, physical page provenance, noisy cover rejection, English/Indic text and HTML-safe snippets.

Started the built Next server on loopback port 3134 with a fresh synthetic catalogue/admin. Thirteen HTTP checks passed: Home, Browse, Search, Bookmarks, login page, magazines/issues APIs, unauthenticated admin rejection, retired local-PDF denial, missing-issue PDF denial, synthetic login and authenticated session check. This is HTTP startup/auth verification, not hosted browser/CORS acceptance. The test server was stopped and its port confirmed closed.

Final integrity verification confirmed all 351 Linux source hashes and modes remain identical to the selection; `git diff --exit-code` passed against the disposable index. The Linux candidate has no private `.env.local`. The original Windows Git index and private environment match their protected hashes, and only the two existing OCR removals remain staged.

Twenty-three logs are retained under `.cache/p4-release/linux-evidence/`, with log hashes and results in `result.json`, as well as in the isolated Linux task's `logs/` directory. Orchestration scripts in the Windows `.cache/` directory are local evidence, not production workflows. P4-10 CI remains separate.

## Remaining gates

P4-08 assembly/review is complete for the identified archive; commit/push remains outside this batch and open. P4-09 clean selected-source Linux verification is complete; a future release commit must be checked against these exact files, and any changed source reverified. Clean Linux success does not certify native app completion, current dependency security, external CORS/public-origin closure, staging, production deployment, live migration-ledger adoption, hosted worker synchronization or Society acceptance. The Cloudflare request remains pending and unsent.
