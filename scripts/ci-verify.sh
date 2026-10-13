#!/usr/bin/env bash
# Linux-only, synthetic CI gate. Never load a developer/hosted environment file.
set -euo pipefail
cd "$(dirname "$0")/.."
for name in TURSO_DATABASE_URL TURSO_AUTH_TOKEN R2_ACCOUNT_ID R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY ADMIN_PASSWORD ADMIN_SESSION_SECRET INDEXING_GITHUB_TOKEN; do
  if [[ -n "${!name:-}" ]]; then
    echo "Refusing inherited service configuration: $name" >&2
    exit 1
  fi
done
for file in .env* apps/web/.env*; do
  [[ ! -f "$file" || "$file" == *.example ]] || { echo 'Refusing private environment files' >&2; exit 1; }
done
task_dir=$(mktemp -d "${RUNNER_TEMP:-/tmp}/aim-ci-XXXXXXXX")
export NEXT_TELEMETRY_DISABLED=1 TURBO_TELEMETRY_DISABLED=1
export INDEXING_OCR_CACHE_PATH="$task_dir/ocr"
mkdir "$INDEXING_OCR_CACHE_PATH"
pnpm verify:runtime
pnpm test:environment
pnpm test:migrations
node scripts/test-release-exclusions.cjs
pnpm test:pdf-security
for suite in review performance performance-io search-reader search-extraction asset-locations indexing-runner indexing-worker-pdf; do
  node "scripts/test-$suite.cjs"
done
python3 scripts/test-indexing-schedule.py
python3 scripts/test-turso-restore.py
pnpm lint
pnpm --filter @aim-archive/web exec tsc --noEmit
node scripts/apply-turso-migrations.mjs --local "$task_dir/catalogue.db" --apply
export DATABASE_PROVIDER=turso TURSO_DATABASE_URL="file:$task_dir/catalogue.db"
export R2_PUBLIC_BASE_URL=https://assets.example R2_LEGACY_PUBLIC_BASE_URLS=''
export NEXT_PUBLIC_APP_URL=http://127.0.0.1:3134
export ADMIN_PASSWORD=synthetic-ci-only-password
pnpm --filter @aim-archive/web build
node scripts/check-performance-budget.cjs .next
node scripts/ci-startup-smoke.cjs
echo 'PASS isolated CI verification; no hosted service acceptance implied.'
