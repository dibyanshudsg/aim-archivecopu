# P1-02 Turso database backup evidence

Completed and verified: 8 October 2026. This captures the current configured remote Turso database without modifying its application data. It does not back up R2 file bytes or complete the full application recovery rehearsal.

## Private location

`D:\AIM (Project Directory)\P1-02_turso_2026-10-08_131813_IST`

Use `database.sqlite` as the standalone database backup. The folder also retains the source replica, `capture.json`, `verification.json`, `manifest.json` and `manifest.sha256`. Treat all contents as private application data; do not commit them. Source endpoint identity is recorded only in the private capture report. Credentials were read from `apps/web/.env.local`, not printed or deliberately exported by the backup scripts.

The backup folder has inheritance disabled and grants access only to the creating Windows user, SYSTEM and Administrators. The database file's inherited permissions were checked. The parent directory's permissions were not changed.

## Capture and verification

- Capture window: 8 October 2026, 13:18:13–13:18:27 IST (07:48:13–07:48:27 UTC).
- Source: the remote Turso endpoint configured in `apps/web/.env.local`; no fresh comparison with Vercel environment values was performed.
- Method: create a fresh libSQL embedded replica and explicitly synchronize it. Compare every table's row-content digest and the schema against a remote read transaction. No SQL writes were sent to the source.
- Convert the closed replica to a standalone file using Python's SQLite backup API, then reopen with no network connection or Turso credentials.
- Compare all rows and schema to the replica, including FTS virtual and shadow tables. All 31 tables matched; no schema/data exclusions were applied.
- `PRAGMA integrity_check`: `ok`. `PRAGMA foreign_key_check`: zero violations.
- Offline FTS queries executed successfully against both text and metadata indexes.
- Rehash all retained files against the manifest; independently recheck the manifest's hash after completion.

| Preserved data | Count |
|---|---:|
| Issues | 104 |
| Magazines | 2 |
| Search text rows | 4,937 |
| Indexing runs | 102 |
| Issue indexing coverage rows | 102 |
| Navigation menus / items | 5 / 15 |
| Site settings | 2 |
| Admin records | 1 |

Jobs, page checkpoints, page reviews and dispatch tables are present but empty at capture time. Other tables and exact counts are in the private report. Empty tables were preserved rather than omitted.

Database size: 38,686,720 bytes (about 36.9 MiB).

Database SHA-256:
`1b9efa93a1b560a3d7e8e6e5ca75807d03e0efb0e33a7a1263e056b2624a7b9a`

Manifest SHA-256:
`a686e107f6a5cfcc9a459c1bed734229224c0a306b65dcbcd119f5ad5ceb6268`

## Repeating or using the backup

From the project root, `python scripts/backup-turso.py` creates a new dated private folder and invokes `scripts/capture-turso-replica.mjs`. It requires installed web dependencies, Python with SQLite/FTS5 support, Node, Windows ACL tools, working remote credentials and access to the approved private parent directory. It refuses to overwrite an existing backup; failed captures are retained without a successful verification report. Do not use the replication helper to run application writes.

For a recovery rehearsal, verify the manifest and copy `database.sqlite` into a new isolated environment. Never overwrite this baseline or point production to it merely to inspect it. Confirm the intended target before starting any worker or admin operations.

This is same-drive preservation, not protection from drive failure. It includes asset references but no PDF/cover bytes, and it does not replace Society-controlled backup scheduling or Phase 3/10 independent recovery demonstrations. The capture remains valid for its timestamp; later changes require a fresh backup before final transfer.

P1-03 remains open. Society ownership of the live R2 bucket does not by itself establish recovery from accidental deletion or replacement; the owner questioned the need for a separate asset copy, so no R2 backup was made in this task.
