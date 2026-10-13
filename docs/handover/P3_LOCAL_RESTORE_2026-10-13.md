# Local database recovery verification — 13 October 2026

P3-02/03 are verified for an offline database restore. Full application/storage recovery and receiving demonstrations remain open. No R2 writes, production database writes, credential changes or deployment occurred.

`python scripts/backup-turso.py` captured the configured Turso source read-only from 05:49:21.832 to 05:49:35.036 UTC (11:19:21–11:19:35 IST). All 31 table digests and schema matched the remote read transaction. Private source: `D:\AIM (Project Directory)\P1-02_turso_2026-10-13_111920_IST`.

- Database SHA-256: `f915997948e089c07a05dc5c8aa989ba6ac57de787cf4c82409b4b3c5f13b4ba`.
- Trusted manifest SHA-256: `e0889e89ddfa880214fa17e604328f40e3d8900c27043da583885f04b7f80a88`.
- Restore: `D:\AIM (Project Directory)\P3_restore_2026-10-13`; private result is `restore-verification.json` there.

`scripts/restore-turso.py` verifies every manifest member, creates a new protected directory, copies the standalone database and compares all table contents/schema. It uses no credentials, network client, server or worker. It refuses existing destinations, paths outside the private parent, invalid manifests, modified files and nonempty standalone WAL files. Source manifest and restored byte hash are rechecked afterward.

All 31 tables matched, including 104 issues, 4,937 search rows, 102 indexing runs, 102 coverage rows, navigation, settings, admin records and counters. Integrity was `ok`, foreign-key violations zero, both FTS integrity commands passed, and sample search matched 2,100 text rows / 71 metadata rows. Empty jobs/checkpoints/reviews were preserved; this snapshot cannot demonstrate populated-review recovery.

Offline restore/verification took **2.360 seconds**, Python SQLite 3.35.5. This excludes capture, application startup, storage recovery and receiving access. No RTO/RPO target is agreed. Seven synthetic tests passed: round trip/no overwrite, wrong trusted digest, corruption, manifest traversal, nonempty WAL, destination escape and changed content with unchanged count. Sandbox ACL restrictions required narrow host execution; protection was retained. Private folders restrict access to the current user, SYSTEM and Administrators.

P3-01/06/07 remain open for final configuration recovery, targets, retention and scheduling. P3-04/05 still need asset checks and restored-service rehearsal. Real catalogue URLs remain in the copy: do not start app/admin/worker operations with production storage credentials. No separate R2 backup was requested or made. Same-drive copies do not protect against drive failure; independent receiving recovery remains P10-02.
