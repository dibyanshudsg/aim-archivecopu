# P4-04 — Ordinary lint and Windows runner verification

10 October 2026. Engineering/Codex, authorized local handover preparation. Candidate is the dirty working folder at local HEAD `4c02a99a3ecb7aa17a3be8f0c724c9c6127e676b`, not a committed or deployed release. Source reconciliation remains P4-01.

## Changes and scope

The web flat ESLint configuration now excludes `.next-*/**` alongside `.next/**`, covering existing `.next-verify` and `.next-performance` outputs. It also excludes Turbo output, static export output and the specifically named vendored `public/pdf.worker-*.min.mjs`. The root configuration carries equivalent exclusions and generated `next-env.d.ts` exclusions for workspace use. Application TypeScript/TSX, configuration modules and authored public JavaScript remain lint candidates. No rule was weakened, and the PDF.js worker remains a required runtime/source asset.

## Verification

- Ordinary `pnpm.cmd lint` from `apps/web`: exit 0, no errors or warnings.
- Required `pnpm.cmd build` from `apps/web` on the Windows host runner: exit 0, successful compilation, lint/types, generation of all 43 static pages and build tracing. No deployment followed.
- Ordinary `pnpm.cmd lint` from the repository root on the Windows host runner: exit 0; shared lint, shared `tsc --noEmit`, mobile lint and web lint all passed (four tasks, zero cached).
- Repeated ordinary root lint to exercise the failing cache/log path: exit 0, all four cache hits replayed their logs successfully.
- Explicit web CLI checks reported both verification-build manifests and the vendored worker as ignored, while `src/app/page.tsx`, `src/lib/pdf-delivery.ts` and the ESLint configuration were linted without findings. Root ESLint API probes also confirmed generated/vendor exclusions and authored public-JavaScript inclusion. An initial ad hoc web API probe could not resolve the Next plugin; the ordinary web CLI and explicit CLI checks succeeded. No dependency change was needed.
- Existing `node scripts/test-release-exclusions.cjs`: passed Git/deployment exclusions, retained source/examples/workflow/docs and absence of tracked private/generated artifacts hidden by ignore rules.

The first sandboxed root lint reproduced `Access is denied` while Turbo created task logs, before lint could complete. The narrow host-runner retry passed with the same command and existing cache directories. No cache deletion, ACL broadening, cache disablement or replacement lint command was required. In this Codex Windows sandbox, use narrow escalation for this specific runner failure; it is not evidence of a source defect or a reason to suppress lint. Future ordinary terminal/CI runners need writable workspace task/cache directories.

The uncached run emitted a non-failing Turbo warning because shared `build` is `tsc --noEmit` while the generic build task declares output files. All checks passed and cache replay worked; no compiled shared output is expected. Clean Linux install/build/lint remains P4-09. Passing mobile lint does not complete the native app.

No credentials, sessions, cloud configuration, Git index or remote refs were changed. Cloudflare work remains pending and its request unsent. These results verify local tooling, not production readiness.
