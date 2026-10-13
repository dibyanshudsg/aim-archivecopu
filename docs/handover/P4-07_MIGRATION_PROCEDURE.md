# Explicit migration targets and schema history

10 October 2026. Local tooling verified; no production ledger or schema change was made. The live configured Turso schema was read-only compared with all eight current migrations and matches their 57 schema objects. It has no migration ledger; adoption must be a reviewed release action after a fresh backup.

## Commands and safeguards

Run from the repository root after frozen installation. The runner no longer loads `.env.local` or selects the configured database implicitly. `--only` and `--skip-fts` are removed: dependencies must be applied in order and FTS must not be silently omitted.

```powershell
# Read-only status; does not even create the file if absent.
node scripts/apply-turso-migrations.mjs --local .cache/setup-fixture.db --status
# Fresh isolated schema: all eight migrations, including FTS5 trigram indexes.
node scripts/apply-turso-migrations.mjs --local .cache/setup-fixture.db --apply
# Repeat is a no-op. Optional --through takes a full migration filename.
node scripts/apply-turso-migrations.mjs --local .cache/setup-fixture.db --apply --through 00008_metadata_search.sql
```

A new schema seeds navigation only, not admins, credentials or catalogue data. Create authorized admin identities through a separate controlled setup. Never import old Supabase data merely to initialize the schema. Database isolation alone does not isolate R2: keep writes disabled or use synthetic storage settings.

For an existing target, obtain a consistent backup and rehearse on a private copy first. Select configuration explicitly; use an isolated configuration file rather than casually pointing commands at the working production `.env.local`.

```powershell
# SETUP_DB_URL / SETUP_DB_TOKEN are names provisioned privately for the chosen target.
node scripts/apply-turso-migrations.mjs --url-env SETUP_DB_URL --token-env SETUP_DB_TOKEN --status --through 00008_metadata_search.sql
```

Optional `--env-file <private-path>` loads only that requested file, without overriding values already in the launch environment. Status prints a target fingerprint, applied ledger names and pending names; it never prints the URL/token. `--through` with status verifies the exact expected schema without writing. Without a ledger, “pending” means **unrecorded**, not evidence that live migrations are missing. `needsBaseline: true` prohibits ordinary apply.

After schema comparison, recovery verification and authorization, baseline an existing matching target using `--baseline --through <last-existing-migration> --backup-ref <private-record-id>`. Remote baseline/apply additionally requires `--confirm-target <targetId-from-status>`; the reference is an identifier, never a password or token. Baseline records the reviewed prefix without replaying seeds/backfills or changing catalogue rows. It refuses schema mismatches and already-recorded histories. This guard is an operator confirmation, not a replacement for authorization or backup verification.

Subsequent `--apply` runs verify the recorded prefix and apply only missing migrations. Record release ID, target ID, backup reference, before/after status and verification results privately. Do not adopt the live schema in this task: production release/staging gates remain open.

## Ledger and failure behavior

`aim_schema_migrations` stores filename, SHA-256, application timestamp, mode (`apply` or `baseline`) and evidence reference. Checksums normalize CRLF to LF so Windows/Linux checkouts agree. Migration filenames must form a consecutive numbered sequence. Never edit an applied migration; add a reviewed forward migration.

Before writing, the runner compares the recorded schema against a reference built in isolated memory. It rejects unknown entries, gaps, changed checksums, downgrades and schema drift. All selected SQL and ledger entries share one write transaction; failures roll back. Integrity and foreign-key checks must pass before commit. A concurrent writer cannot slip in between state verification and migration within that transaction. Pause application/worker writes during real release work; long migrations can block them and hosted transaction/time limits still need staging verification.

Use `-- statement-breakpoint` between statements for every new migration containing triggers or SQL bodies with internal semicolons. Preserve trigger bodies intact. This is a controlled migration-file format, not a general-purpose SQL parser. A new migration containing transaction control or nontransactional operations needs separate tooling review.

Schema comparison is intentionally conservative and includes SQL definitions, FTS shadow objects, indexes, views and triggers. A semantically equivalent but differently formatted legacy definition can require manual reconciliation; never bypass the check or relabel arbitrary state. The comparator is not a row-content/backup check. Validate FTS queries/backfills and application behavior separately.

`pnpm.cmd test:migrations` covers fresh setup; populated 00006→00008 upgrades; FTS backfill/update/delete; navigation preservation during baseline; no-op reruns; invalid SQL rollback; checksum/gap/schema-drift rejection; explicit targets; and read-only status. These synthetic tests do not complete Phase 3 recovery or authorize production migrations.
