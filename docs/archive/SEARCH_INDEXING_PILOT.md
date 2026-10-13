# Search indexing — diagnosis and local pilot

> Historical record, archived 19 September 2026. Status claims and commands below describe the original work; use [the active TODO](../../TO%20DO%20LIST.md) and current operating guides for today's tasks. This record does not authorize replaying migrations or deployments.

Date: 6 September 2026  
Delivery tracker: [Website Review Action Plan](../../WEBSITE_REVIEW_ACTION_PLAN.md), SI-01–SI-06.

## Implementation update — 6 September 2026

The diagnostic/prototype sections below are historical. The application now uses `native-first-english-v5`: readable native text first, English OCR otherwise, confidence/readability filtering and a bounded isolated-line retry. PDF.js standard-font assets are resolved for OCR rendering and included in deployment tracing. Uncertain pages are withheld and retained in local review checkpoints. Snippets select readable matching lines/sentences, preserve phrase matches across line breaks and safely escape markup.

The integrated pilot covered September 2021, January 2019 and January 2014: 147 physical pages, 137 native pages, 10 OCR pages, 146 indexed pages. January 2019 cover page 1 remains uncertain; its artwork-generated garbage is excluded. Its title is still available through metadata search. Real page-4 search and desktop/phone navigation/highlighting passed against the rebuilt local index; the same query passed against the remote index.

The owner-authorized rebuild is complete: 102 remote English editions, 4,902 physical pages, 4,885 indexed pages and 17 uncertain covers withheld. Both eligible local English editions are also rebuilt (87 indexed pages out of 88 physical pages). Both download failures succeeded on retry. Full checkpoint/catalogue verification and excluded-index hash comparisons passed. See [Completed Rebuild Report](../../SEARCH_REBUILD_REPORT.md) for final coverage, review exceptions and evidence. Hindi and unusable legacy local records remain excluded.

The first full pass exposed missing standard fonts in some older PDFs. The v5 repair probes the font dependencies of each previously OCR-processed page. Unaffected v4 results are reused; affected PDFs retain their native text and regenerate all OCR pages with the bundled fonts. April 2015 physical page 49 recovered a previously omitted line after this repair. Existing non-ASCII text is not stripped to conceal extraction errors.

Production build, actual native-PDF extraction, safe snippets, search/access fixtures, reader matching and transaction rollback tests pass. Application code is not deployed. Durable upload-job status, admin progress/retry controls and moving automatic ingestion out of the request lifecycle are still SI-06 work; the resumable command-line rebuild does not implement that UI/service.

Environment distinction: the local smoke database contains 12 records, of which only four have published, usable public PDF references (two readable and two restricted). Its remaining five English records have legacy/missing public sources and are excluded from this rebuild. The remote catalogue contains 104 publicly listed editions (102 English and two Hindi), with 94 readable under the current five-year policy. A homepage showing 4/2/2 is using the local test catalogue; indexing does not delete catalogue records or change publication state.

### Rebuild and verification commands

Run from the repository root. The default target uses the remote database configured in `apps/web/.env.local`; `--local` explicitly selects `.migration/turso-local-smoke.db`.

```powershell
# Extract/review only; no index writes
node scripts/rebuild-search-index.cjs
# Apply validated extraction to all supported English editions
node scripts/rebuild-search-index.cjs --apply
# Restrict a retry to explicit issue IDs
node scripts/rebuild-search-index.cjs --apply --ids <comma-separated-issue-ids>
# Local test catalogue
node scripts/rebuild-search-index.cjs --local --apply
# Verify every supported index against its source checkpoint and catalogue snapshot
node scripts/verify-rebuilt-search.cjs --complete
node scripts/verify-rebuilt-search.cjs --local --complete
```

Reports, backups, source PDFs and per-page review details stay in ignored `.codex-logs/search-rebuild-v2/`; the directory name is historical, while each checkpoint records the actual extraction version. Runs are locked per database scope. An interrupted run can resume from saved pages; only remove a stale lock after confirming its recorded process has stopped.

## Finding and recommendation

**Scope update — owner decision:** Only English AIM editions will receive OCR/indexing work. Hindi OCR is excluded from uploads, PDF replacement/reindex flows, bulk candidates, and pilot processing. Existing Hindi content/index rows are not deleted. The Hindi findings below are historical diagnostic evidence, not pending implementation work. The active pilot is two English editions: 103 physical pages, 95 native-text pages and 8 OCR pages.

Use native extraction for usable text layers and OCR for pages that fail a language-aware quality check. The two sampled English editions have usable native interior text. The sampled Hindi edition uses a legacy font encoding: its visible Hindi becomes garbled Latin characters on extraction. It requires OCR, but handwritten English inserts on the same pages produce unreliable output.

Do not publish this pilot's raw OCR output automatically. Review English extraction quality before applying it. The earlier Hindi quality question is superseded by the owner's decision to exclude Hindi OCR. Confidence scores are triage signals, not proof of transcription accuracy.

## Pipeline diagnosis

| Location | Observed behaviour | Consequence / action |
|---|---|---|
| `apps/web/src/lib/pdf-extract.ts` | Existing application extractor OCRs every page with `eng+hin`; drops text of 20 characters or fewer | Wastes work on native English text; sparse/blank pages must not determine physical page count. Pilot a hybrid replacement before integration. |
| Upload API | Uses Next `after()` for indexing; route declares `maxDuration = 60`; failure is logged without durable indexing status | Long OCR jobs may exceed the request budget. This is a demonstrated architectural risk, not proof that every historical missing index timed out. |
| Per-issue/bulk reindex APIs | Manual retry processes whole issues; no durable per-page checkpoint or extraction version | Retrying repeats work; interrupted jobs cannot report reliable progress after restart. |
| Reindex candidate query | Treats any existing index row as an indexed issue | Partial coverage may be silently skipped. Use explicit job state/source fingerprint and physical page accounting. |
| `search-indexer.ts` before this change | Deletes old rows before writing replacements; sets `page_count` from extracted rows | Failure can lose a working index; blank pages make reader page totals inaccurate. Safe replacement and physical-count fixes are implemented in this work package. |
| Turso importer | Copies exported search rows; does not generate new extraction | Importing metadata does not create page text. The historical May export contains 10 issues, 424 index rows across 9 issues; it does not explain the later 104-issue catalogue by itself. |

The precise historical cause of each missing index is not recoverable from the inspected code/export alone. Do not label the migration or a server timeout as the established root cause. Durable job outcomes are needed going forward.

## Sample and measurements

Samples were selected from published, readable, usable-PDF records: newest and oldest readable English editions plus the readable Hindi edition. No drafts or restricted PDFs were included.

| Edition | Physical pages | Native pages | OCR pages | Page-processing time | Sampled Node RSS |
|---|---:|---:|---:|---:|---:|
| All India Magazine — September 2021 | 48 | 44 | 4 | 9.77 s | 241 MiB |
| All India Magazine — January 2014 | 55 | 51 | 4 | 10.61 s | 273 MiB |
| Agnishikha — January 2021 | 28 | 0 | 28 | 103.62 s | 239 MiB |
| Total | 131 | 95 | 36 | 124.00 s | Not additive |

Timings sum per-page extraction/render/OCR measurements from one local run. They exclude initial source inspection/download and checkpoint-write overhead, and are not deployment benchmarks. Node RSS was sampled after pages; it is not a measured operating-system peak or a guarantee for serverless execution. OCR used the installed Tesseract.js, English/Hindi language data, and PDF rendering at scale 2.5. Source download/native inspection with selected image renders took 4.20 s, 5.58 s, and 1.46 s respectively in the first run.

All three stored page counts were previously unknown. Physical page numbers are the PDF positions used by the reader. In January 2014, PDF page 3 visibly carries printed page number 4; indexing must preserve PDF page 3 as the navigation target rather than substituting the printed label.

## Quality observations

- English native text: inspected September 2021 page 5 and January 2014 page 3 against their visible source context. Headings/body text are usable. Running headers/footers appear before body text in extraction, and line-end hyphenation remains; normalization and reading-order checks are needed before final integration.
- Hindi native text: page 5 is visibly Hindi, but extraction contains zero Devanagari characters and garbled accented Latin symbols. Text length alone would incorrectly accept it.
- Hindi OCR: page 5 recovers much of the printed Hindi paragraph but adds nonsense from the handwritten English above it and misreads some numerals/footer text. Page 14 similarly recovers much of the printed passage but corrupts part of a key word. Page 3, largely handwriting, is unusable as raw search text.
- Five English OCR pages and 26 Hindi OCR pages have mean confidence below 70. This provisional threshold identifies review candidates; it is not an approved production publishing rule. No numerical OCR accuracy percentage is claimed.
- Printed text and handwriting can share one page. A future review decision may approve a printed-text region while withholding the uncertain handwriting; do not infer such regions from one hardcoded crop for every edition.

## Work completed and evidence

`scripts/inspect-indexing-sources.mjs` reads catalogue metadata, downloads only three readable sources, and saves page statistics/text plus selected images locally. `scripts/pilot-search-extraction.mjs` runs a local hybrid prototype with per-page checkpoints keyed to PDF SHA-256 and prototype version. It retains all page results for inspection; its heuristic is not yet the application's production extractor.

Evidence is in ignored `.codex-logs/indexing-pilot`: `source-inspection.json`, `pilot-summary.json`, per-issue extraction JSON, source PDFs, and selected page images/text. No credentials are printed. No database index rows, physical page counts, publication state, or storage assets were changed by the pilot.

Application foundation fixes:

- Extraction now returns physical `totalPages` separately from searchable pages, and cleans up the PDF if OCR-worker setup fails.
- Index replacement validates page numbers, rejects empty extraction without deleting an existing index, and commits delete/inserts/page-count update in one write transaction.
- `pnpm.cmd test:indexing` passed using an isolated real libSQL database, including an injected write failure proving rollback preserves the previous index/count. Invalid/duplicate/out-of-range pages and physical counts with blank pages are covered.
- `pnpm.cmd test:review` passed. `pnpm.cmd build` from `apps/web` passed compilation, lint/types, and generation of 37 static pages. Upload/reindex callers compile with the extraction result containing physical page count.

## Proposed next implementation

1. Integrate English-only native-first extraction, retain method/confidence and review state, and normalize line wrapping without inventing text. Do not process Hindi editions.
2. Review low-confidence pilot pages. Keep unapproved text out of the public index. Validate selected known phrases against the source and actual search/page links in an isolated database before applying the reviewed pilot to selected live records.
3. Add durable pending/processing/review/complete/failed state with source hash, extractor version, physical page count, approved/skipped/review page totals, attempts, and last error. A changed PDF invalidates the previous job fingerprint.
4. Use a resumable Node worker outside the web request lifecycle, initially one issue at a time. Keep the existing index until a reviewed replacement can be committed atomically. Confirm source fingerprint before committing and avoid parallel jobs for the same issue.
5. After the pilot review, process five English editions as the first measured batch. Expand only if quality and resource use hold. Hindi remains outside the indexing scope. Re-audit English coverage and report excluded/review pages explicitly.

If other English PDFs resemble these samples, extraction could take roughly 10 seconds per issue locally. That is a planning scenario, not an estimate for all 93 English editions: source types, network, OCR load, and review effort have not been sampled broadly enough. The 104-second Hindi sample already exceeds the upload route's declared 60-second budget, supporting a separate worker rather than a blanket request-based reindex.

Bulk execution and public pilot publication have not started. SI-01 is complete; SI-02 has verified safety fixes but hybrid integration remains; SI-03 has local extraction evidence but still needs a reviewed integrated pilot. SI-04–SI-06 remain open.
