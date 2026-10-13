# Isolated CI and dependency review — 10 October 2026

P4-10 is implemented and verified locally; first hosted execution remains pending source publication. P6-01 is partial: compatible web/root fixes passed, but native dependency findings and framework support planning remain open. No commit, push, deployment, hosted setting, real credential or session was changed.

## Changes and scope

`.github/workflows/verify.yml` runs on pull requests, main pushes and manual dispatch with read-only contents permission, SHA-pinned actions and no service secrets. It installs the frozen lockfile, runs `scripts/ci-verify.sh`, and checks registry advisories. It does not deploy or invoke production indexing. The separate indexing workflow remains manual-only.

The Linux verification script refuses inherited service credentials and private environment files, then uses a newly created local database, synthetic password and reserved example asset URL. It checks runtime/environment/migrations, exclusions, PDF access protections, search/review/performance/asset paths, indexing worker/native OCR, scheduler, root lint, web types, production build, bundle budgets and HTTP startup. The startup check exercises native Sharp image optimization and authorization denial, then stops its server. Existing local PDF security tests supply the broader access-policy coverage; this is not a live authentication acceptance test.

| Component | Previous candidate | Tested candidate |
| --- | --- | --- |
| Node | 22.16.0 | 22.23.3 |
| Next / eslint-config-next | 15.5.15 | 15.5.27 |
| Turbo | 2.9.6 | 2.9.14 |
| PostCSS | affected 8.x | 8.5.23 |
| Sharp | 0.34.5 | 0.35.5 |
| source-map-js | 1.2.1 | 1.2.2 |

Root overrides constrain affected PostCSS, Sharp and source-map-js resolutions. React type overrides, pnpm 10.33.0, PDF.js 4.8.69 and the existing canvas path remain. Windows installed dependencies/runtime were preserved; use the updated SETUP.md before the next Windows verification.

Upgrade references: [Node release](https://nodejs.org/en/blog/release/v22.23.3), [Next September security release](https://nextjs.org/blog/september-2026-security-release), [Sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), [Turbo advisory](https://github.com/vercel/turborepo/security/advisories/GHSA-hcf7-66rw-9f5r), and [PostCSS advisories](https://github.com/postcss/postcss/security/advisories).

## Verification evidence

Tested source: `.cache/p6-security/candidate.tar.gz`; exact 356-file hashes/modes in `selection.json` beside it. This extends the earlier 351-file selection with four CI files and the previous Linux verification report. Final documentation is a separately identified package refresh; runtime source must match this tested selection.

Fresh Ubuntu 26.04 x64/WSL directory `/var/tmp/aim-p6-iRHtE6Uf`, checksum-verified official Node archive, fresh pnpm store: 1,232 packages installed with zero reuse. No Windows dependencies, build output, private environment or OCR cache copied. Logs are retained under `.cache/p6-security/linux-evidence/`.

- Frozen install, exact runtime/native canvas/PDF worker/fonts, environment checks and all eight migration fixtures passed.
- Nine PDF security suites, review/search/performance/asset/worker checks, real synthetic PDF/OCR and four Python scheduler tests passed.
- Root lint (four tasks), web TypeScript and Next production build passed; 43 static pages generated.
- Gzip budgets passed: home 205.5/220 KiB, browse 208.5/220 KiB, reader 301.6/350 KiB.
- Ten HTTP status checks plus image optimization passed; server port 3134 no longer listening afterward.
- Synthetic inherited-password and private-env-file refusal tests passed. Linux source remained unchanged after tests.
- Checksum-verified actionlint 1.7.12 validated both workflows; `bash -n` passed. Optional shellcheck/pyflakes integrations were disabled. This is local workflow validation, not a GitHub-hosted run; Ubuntu 24.04 runner compatibility still needs that run.
- Dependency gate passed with zero web/shared/root findings. Registry failures or findings on any such path fail the gate; native-only findings are reported separately.

## Remaining security and release limitations

The audit metadata decreased from 149 findings (7 low, 42 moderate, 96 high, 4 critical) to 107 (4 low, 25 moderate, 76 high, 2 critical). Counts include dependency-path/version duplication, not distinct vulnerabilities. Final output contains 96 advisory records / 78 unique GHSA identifiers, all exclusively under `apps__mobile`. Raw dated JSON remains in `.cache/p6-security/audit-before.json` and `audit-final.json`.

The native skeleton still carries critical shell-quote and tar findings and other vulnerable tooling; braces, node-forge and sprintf-js records include no published fix. Native feature completion is excluded, but its installation/tooling risks are not thereby accepted or resolved. Keep P6-01 open for an explicit scoped dependency upgrade or removal/retirement review. CI's web gate does not certify the whole monorepo as vulnerability-free.

Next 15 is currently in maintenance. The [published support policy](https://nextjs.org/support-policy) provides two years from initial release; applying that policy to its 21 October 2024 release gives **21 October 2026** as the maintenance-window endpoint (inference from the policy). A tested supported-major upgrade needs a separate compatibility review before final handover. This patch batch does not settle it.

First hosted CI execution and any required-check configuration remain pending publication. P4-08 source publication, P4-11 receiving-host verification, Phase 2 staging/public-origin closure, hosted migration adoption and Society acceptance remain separate. Password rotation remains owner-deferred; old PR #1 references, clones, caches and private backups can still retain the password. Package scanning cannot establish external erasure. Cloudflare request remains pending and unsent.

## Final local package

The documentation refresh is included in the 357-file `.cache/p6-security/candidate-final.tar.gz`. All non-Markdown source bytes/modes match the tested 356-file selection; final documentation adds this report and updates the tracker/setup/context. `selection-final.json` records exact files; `final-evidence.json` records archive/manifest/log hashes and scan results. Gitleaks and raw known-credential checks found zero matches in the selected package. Original Git index and private web environment hashes remained unchanged. This is a local source package, not a published release or complete credential-erasure claim.
