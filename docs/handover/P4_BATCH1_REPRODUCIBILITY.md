# P4-05/06/07 — Runtime, configuration and migrations

Completed locally, 10 October 2026, by Engineering/Codex on the owner's instruction. Candidate is the dirty working folder at local HEAD `4c02a99a3ecb7aa17a3be8f0c724c9c6127e676b`; this is not a committed release or production deployment. Existing unrelated work and staged OCR-file removals are retained.

## P4-05 — Repeatable runtime/build setup

Pinned the tested Node 22.16.0 baseline in `.node-version`, narrowed engines to Node 22.16+ within major 22, retained pnpm 10.33.0 and changed the local manual-worker workflow to read the same Node file. React type overrides and PDF.js 4.8.69 remain unchanged. This older Node patch is a reproducibility baseline, not a dependency-security sign-off; P6-01 remains required.

The four existing Google font families are now bundled via `next/font/local`. Full WOFF2 fonts, licenses, immutable upstream commit and SHA-256 provenance are retained in `apps/web/src/app/fonts`. Existing CSS variables and weight/preload behavior remain. Total font assets are 565,396 bytes; final performance acceptance remains P6-09. Normal builds no longer fetch Google Fonts. The acquisition script is maintainer-only and refuses to overwrite the manifest.

[SETUP.md](../../SETUP.md) documents frozen installs, native canvas prerequisites, PDF.js standard fonts/tracing, OCR-cache/first-download behavior and setup verification. No OS packages or global Node installation were changed.

Verification:

- Node 22.16.0 / pnpm 10.33.0 confirmed. Host-runner `pnpm.cmd install --frozen-lockfile --offline` passed, reporting an up-to-date lockfile/dependencies. This used the existing populated store, not a clean Linux install. The sandbox attempt aborted before replacement because its store context requested a node_modules purge; no purge was authorized or performed.
- `node scripts/verify-runtime-setup.cjs` passed canvas PDF creation, PDF.js worker byte identity and standard-font presence, React overrides and vendored font/license hashes.
- Web `pnpm.cmd build` passed compilation, lint/types, all 43 static pages and tracing.
- `node scripts/test-indexing-worker-pdf.cjs` passed real native-text extraction and scanned-page English OCR into isolated durable checkpoints/search rows.
- Playwright opened the built site on loopback port 3120 with a synthetic database and synthetic auth/storage settings. All four font families and configured weights loaded from local assets, including the Hindi sample. The font sample screenshot was visually checked at ignored `output/playwright/p4-fonts.png`; no production login or mutation occurred. Initial CLI quoting probes failed before the file-based probe succeeded.

## P4-06 — Environment contract and hosted inventory

Documented all 18 active app/dev names in the example and setup guide. Added missing Turbo propagation for Web Vitals, dispatch token, OCR cache, local-worker opt-in and isolated build output; retained PDF fallback and other existing variables. Environment files and Node pin now invalidate cache keys. Isolated `.next-*` outputs are covered. Shared `tsc --noEmit` explicitly declares no output artifacts, removing the previous misleading cache-output warning.

`node scripts/test-runtime-environment.cjs` passed source/example comparison and a real Turbo strict-mode dry run using synthetic values. Ordinary root lint passed all four tasks without the earlier output warning. Source/deployment exclusion checks passed, including retention of fonts, licenses and Node pin.

Read-only `vercel env ls` on the linked project reported these **names/target scopes only**:

| Hosted entries | Observed scope / remaining action |
|---|---|
| Turso URL/token, database provider, R2 account/key/secret/bucket/base, admin password | Preview and Production. Isolation is not established; do not run staging mutation tests with inherited values. |
| `NEXT_PUBLIC_APP_URL` | Production only. Preview origin must be explicitly reconciled during P2-08. |
| `INDEXING_GITHUB_TOKEN` | Not listed; live dispatch configuration/verification remains P5-01/02. |
| `ADMIN_SESSION_SECRET` | Not listed; keep password fallback and current sessions unchanged. Replacement remains owner-deferred under ADM-04. |
| `PDF_DELIVERY_DISABLED` | Not listed; defaults inactive. Hosted fallback rehearsal remains P2-08. |
| Optional Web Vitals and legacy locator aliases | Not listed; default-off/empty is supported. |
| Three historical Supabase variable names | Still listed in Production; coordinated removal remains SB-06. No values were retrieved or removed. |

Worker secret mappings are documented from the local workflow; GitHub secret installation/permissions were not verified by this batch. Vercel settings, credentials and sessions were not changed. The read-only inventory is not proof of environment-value correctness or Preview isolation.

## P4-07 — Explicit targets and migration ledger

The migration runner now requires an explicit local path or URL environment-variable name and defaults to read-only status. A selected env file is optional and never loaded implicitly. Fresh applications and reviewed existing-schema baselines record normalized SHA-256 checksums, timestamps, mode and evidence in `aim_schema_migrations`. Applying SQL and recording the ledger are atomic. History gaps, changed checksums, unknown entries, downgrades and schema mismatches fail closed. FTS migrations remain enabled on local fixtures.

[Migration procedure](P4-07_MIGRATION_PROCEDURE.md) replaces old `--only` instructions in active operating docs. It requires backup/rehearsal for existing databases and explicit target confirmation plus backup reference for remote writes. No historical SQL file was edited.

`node scripts/test-turso-migrations.mjs` passed fresh setup, populated upgrades, FTS backfill/update/delete, no-op repetition, baseline preservation/refusal, invalid-SQL rollback, checksum/gap/schema drift and CLI target safeguards. Tests use synthetic temporary file databases; the initial anonymous-memory fixture exposed libSQL's transaction reconnection behavior and was corrected to match actual file targets.

Read-only status/schema verification against configured Turso found **57 schema objects matching migrations 00001–00008**, with **no ledger**. `needsBaseline: true` is expected: “pending” names mean unrecorded, not missing live schema. No baseline, migration, catalogue change or backup was performed remotely. Reviewed adoption after a fresh backup remains a release action under P9-01/03; staging must verify hosted transaction/time behavior first.

## Remaining boundaries

Final source scan covered 340 current text files and 101 reachable commits: no Gitleaks findings or known-secret matches; the same eight already-classified historical documentation flags remain (scanner exit 1). External PR/copy limitations are unchanged. The refreshed 293-file runtime/operator candidate fingerprint is `b755891735d5fd0e68448aee366f6759d09124336ff01f6799ca5f7155582a62`, recorded at ignored `.codex-logs/p2-08/candidate-b755891735d5.json`; the Node pin is now included. This is a fingerprint, not a transfer archive or release commit. The task's loopback server and browser were stopped; Git refs and the two existing staged OCR removals remain unchanged.

P4-05/06/07 local preparation outcomes are complete. P4-01 source reconciliation, P4-08 source assembly, P4-09 clean Linux validation and P4-11 worker synchronization remain open. Source and native/font assets must be included in the reviewed release. Production access protection, staging, hosted credential configuration and public-origin closure remain P2-08/09; the Cloudflare request is still pending and unsent. Institutional acceptance is still pending. No commit, push, deployment, credential rotation, session invalidation or broad staging was performed.
