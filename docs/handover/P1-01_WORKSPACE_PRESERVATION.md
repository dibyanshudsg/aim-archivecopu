# P1-01 workspace preservation evidence

Completed: 8 October 2026. Executed by Codex on the owner's instruction. The owner selected a private folder on the same drive and authorized the copy. This completes workspace preservation only; P1-02 and P1-03 remain open for the current remote database and object storage.

## Recovery location

`D:\AIM (Project Directory)\P1-01_workspace_2026-10-08_103323_IST`

The `workspace` subfolder contains the preserved files. The backup root contains `manifest.json`, `manifest.sha256`, `exclusions.json`, `verification.json` and `git-status.txt`. Treat the entire folder as confidential: it includes private environment configuration and Git history. It is a recovery copy, not a sanitized handover package.

## Scope and verification

- 7,627 files, totalling 940,242,895 bytes (about 897 MiB), copied from `D:\AIM Project`.
- Included working source, tracked/untracked application and worker files, migrations, documentation, Git history, private configuration, local source media, root/web OCR data and historical local backups.
- Excluded dependency stores, generated build/compiler caches, and runtime/browser evidence directories `.cache`, `.codex-logs`, `.lighthouse` and `.playwright-cli`. Exact exclusions are in the private manifest. Useful extraction evidence in excluded logs still requires selective preservation under P1-04.
- Preflight verified that no existing Git-tracked file was excluded. The initial preflight found two tracked OCR files; the scope was corrected before copying.
- Every included file passed source/copy/source SHA-256 comparison, then a second complete source/destination hash pass. Source inventory, Git status and HEAD were stable during capture.
- Manifest SHA-256: `64afd357418d15caca17812b2b25ef3257b991c6318f6cb7fa5e927207aa6065`; independently checked against `manifest.sha256`.
- `git fsck --full` on the copied repository exited 0. It reported dangling objects retained from the source, with no missing/corrupt object failure. No pruning or history cleanup was performed.
- Backup-folder ACL inheritance is disabled. Access is limited to the owner's Windows account, local Administrators and SYSTEM. Verified both the folder ACL and a copied private environment file. The parent folder's broader permissions were not changed.

## Source and deployment baseline

| Item | Recorded state |
|---|---|
| Capture timestamp | 2026-10-08 10:33:23 IST |
| Local HEAD | `8aad9b805102a45ed4bc77f3f5b8c6c9938acfa2` |
| Remote GitHub main | `7d73dce038e178525db16fd615e20365af7eea17`, fresh read-only lookup |
| Documented website deployment | `dpl_5V2XphXmDRLfDB4ku83WkYgeSf7x` |
| Deployment evidence | `PRODUCTION_RELEASE_2026-09-19.md`; no fresh Vercel deployment inspection in this task |
| Dirty/untracked source | Captured in `workspace` and recorded in private `git-status.txt` |

The source, remote branch and deployed release have not been reconciled by this task. That remains Phase 4 work.

## Use and limitations

Restore into a new directory, preserving this copy unchanged. Verify the manifest before restoration, retain private permissions, and use frozen-lockfile dependency installation to reconstruct excluded dependencies. Do not overwrite the working project or replay database imports merely to inspect the backup. Full independent clean-checkout/build and disaster-recovery rehearsals remain later tasks.

This backup is on the same drive, is not encrypted by this task, and does not protect against drive failure. Historical/local database files are not certified consistent snapshots of the remote Turso service. R2 objects were not downloaded by this task. Independent Society-controlled backup remains required.

The snapshot contains the tracker at its in-progress state. This completion report and the subsequent checkbox update were deliberately written after verification and do not retroactively change the preserved baseline. The one-time workstation preservation script was archived privately under `D:\AIM (Project Directory)\SOURCE_cleanup_2026-10-13` during authorized source cleanup; it is not a receiving setup dependency. Current database recovery uses the tools in `MIGRATION_RECOVERY.md`.

## Next task

P1-02: capture a consistent current Turso database backup and record its environment/schema baseline. Brief the owner on scope, consistency strategy, destination and verification before starting. Do not label the historical `.migration` contents as that completed backup.
