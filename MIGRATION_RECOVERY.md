# Backup and recovery notes

Updated: 13 October 2026. The current database is Turso/libSQL; PDFs and covers are in Society-owned Cloudflare R2.

Handover update, 8 October 2026: current backup and isolated restore are a prerequisite for transfer. See [handover assessment](HANDOVER_ASSESSMENT_2026-10-08.md) and [DigitalOcean migration plan](DIGITALOCEAN_MIGRATION.md). Moving the web server does not itself require changing the database engine.

## Verified database snapshot

P1-02 captured all 31 tables, schema, triggers and search indexes. The replica matched a remote read transaction, and the standalone SQLite backup passed offline integrity, foreign-key and content checks. Exact location, hashes and limitations are in [P1-02 evidence](docs/handover/P1-02_TURSO_BACKUP.md).

To capture another private snapshot on the current Windows workstation, run from the project root:

```powershell
python scripts/backup-turso.py
```

The tool creates a new dated folder under the approved private parent directory, refuses to overwrite a backup and does not write to the remote database. It requires dependencies, configured credentials and access to the backup destination. Society-managed scheduling/storage remains to be established; this workstation tool is not an institutional backup service.

## Isolated restore rehearsal

The fresh 13 October snapshot passed an offline restore/comparison of all 31 tables/schema, integrity, relationships and both FTS indexes. [Evidence and limits](docs/handover/P3_LOCAL_RESTORE_2026-10-13.md). Python 3.10+ with SQLite/FTS5 and permission to protect a new private directory are required. Verified command:

```powershell
python scripts/restore-turso.py --backup 'D:/AIM (Project Directory)/P1-02_turso_2026-10-13_111920_IST' --destination 'D:/AIM (Project Directory)/P3_restore_2026-10-13' --manifest-sha256 e0889e89ddfa880214fa17e604328f40e3d8900c27043da583885f04b7f80a88
```

That destination now exists; choose a new direct child of the private parent for another rehearsal. Obtain the expected digest from trusted capture evidence. The tool never overwrites. On failure retain the failed directory privately, inspect inputs/permissions and retry in a new directory; no success report means unverified recovery. Safeguards: `python scripts/test-turso-restore.py`. This command loads no credentials and does not start the application. Final configuration recovery, receiving backup retention/frequency and full service recovery remain open.

1. Verify the snapshot manifest and copy `database.sqlite` into a new private, isolated directory.
2. Point only the rehearsal process at that copy using a `file:` database URL. Never overwrite the baseline or redirect production merely to inspect it.
3. Validate integrity, foreign keys, tables, schema and search, then test the application with isolated admin/worker configuration.
4. Keep asset writes disabled or use a separate fixture bucket. Restored catalogue URLs refer to live assets unless deliberately changed; a local database alone does not isolate R2 writes.
5. Record target, recovered timestamp, comparisons and application behavior before declaring full recovery complete.

Current migrations are in `packages/turso/migrations/`. Follow the [explicit-target migration procedure](docs/handover/P4-07_MIGRATION_PROCEDURE.md): read-only status first, verify schema/checksums, baseline a reviewed restored legacy schema if needed, then apply only missing migrations. Preserve the new `aim_schema_migrations` ledger in future backups. The live database has not been baselined. The database has been reopened offline; the full application restore demonstration remains Phase 3.

## Asset recovery scope

The owner explicitly excluded a separate R2 backup during current preparation, relying on Society-owned storage and available originals for re-upload. No independent object backup or complete original-to-current-object comparison is certified. Continue reference checks and safe asset handling; Society IT selects its ongoing backup/retention arrangements.

## Historical material

Retired migration tools, old exports and pre-cleanup documents are preserved outside the delivery project in a restricted private archive. They are not current setup instructions and must not be replayed against production. Preservation and remaining account-retirement actions are tracked in [TO DO LIST.md](TO%20DO%20LIST.md).
