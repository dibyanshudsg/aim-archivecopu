# P1-04/05 preservation and reference checks

Verified 8 October 2026. Applicable checks passed; no remote data or access configuration changed.

Private evidence: `D:\AIM (Project Directory)\P1-04_05_evidence_2026-10-08_145517_IST`.

## Supplied originals and working evidence

All 12 supplied originals (10 PDFs and two JPEG covers, 183,182,461 bytes) matched both the P1-01 manifest and its preserved copies by SHA-256. Sources are `AIM 2026`, `Agnisikha 2026` and `AIM Issues`.

An additional 800 extraction/review evidence files (385,301,801 bytes) from `.codex-logs/indexing-pilot` and `.codex-logs/search-rebuild-v2` were copied into the restricted private evidence folder and hash-verified. This includes downloaded working PDFs, generated text/JSON and review images; these are distinguished from supplied originals. Reusable OCR model files were excluded. JSON evidence was parsed successfully.

The detailed `preservation.json` report has SHA-256 `ce356548c51b848a65e15dacbd64b5f1a5126e6da49662bc71fd19b21475344f`. The one-time verification script is privately retained under `D:\AIM (Project Directory)\SOURCE_cleanup_2026-10-13`, following the 13 October source cleanup. The dated result is unchanged.

## Database and live object reconciliation

The P1-02 backup manifest and files were rehashed successfully. Its standalone SQLite database reopened with integrity `ok`, zero foreign-key violations and 104 issues. The earlier [database capture evidence](P1-02_TURSO_BACKUP.md) documents full snapshot/schema/table and FTS verification.

Live read-only reconciliation completed at 14:58:44 IST:

| Check | Result |
|---|---|
| Catalogue issues | 104 |
| PDF/cover references | 208 |
| R2 objects | 208 |
| Total object bytes | 327,407,755 |
| Missing or unsupported references | 0 |
| Unreferenced objects | 0 |
| Size, content-type or listing/HEAD discrepancies | 0 |
| Catalogue references and object listing stable across check | Yes |

Private `r2-reconciliation.json` contains reference mapping and object metadata. Script: `scripts/reconcile-r2-readonly.cjs`. Only SELECT, object listing and HEAD operations were used; object bodies were not downloaded. ETags are metadata, not verified content SHA-256 hashes. This is not an atomic cross-service snapshot or proof that every live PDF renders correctly.

## Completion and limits

P1-04 and the applicable P1-05 checks are complete. The owner excluded a separate R2 backup under P1-03; no such backup or complete replacement-source collection is certified. Same-drive preservation does not protect against drive failure. Phase 3 still requires an isolated application/database restore demonstration. The PDF-access rollback approach is recorded in [P1-06](P1-06_PDF_ACCESS_ROLLBACK.md).
