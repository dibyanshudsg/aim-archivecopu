# Search extraction repair and completed rebuild

Verified: 6 September 2026. Extractor: `native-first-english-v5`.

## Result

All 102 supported English editions in the remote catalogue now have page-text indexes. The final verification compared every indexed page with its approved extraction checkpoint and checked catalogue counts, PDF references and publication states. Both earlier download failures succeeded on retry. There are no remaining failed English issues in this rebuild.

| Scope | English issues processed | Physical PDF pages | Indexed pages | Withheld for review |
|---|---:|---:|---:|---:|
| Remote catalogue | 102 | 4,902 | 4,885 | 17 cover pages |
| Eligible local test editions | 2 | 88 | 87 | January 2019 cover |

The remote extraction accounts for 4,335 native-text pages and 567 OCR pages. All 93 currently readable English editions have indexed text. No English page count remains unknown, and no duplicate or out-of-range indexed page numbers were found.

The remote catalogue still contains 104 listed editions: 94 readable and 10 awaiting public release. Hindi indexing remains excluded by the owner's earlier decision. Its existing 52 index rows were preserved; the readable Hindi edition remains metadata-searchable without a page-text index. Hash comparisons confirm that excluded indexes were unchanged in both database scopes.

The homepage showing **4 listed / 2 readable / 2 restricted** is using the local test database. That database has 12 records but only four published, usable public PDF references. Its two English editions with supported sources were rebuilt; five English records with legacy/missing public sources were excluded. Reindexing did not reduce the catalogue.

## What changed

- Use readable native PDF text first, with English OCR for image-only or unusable text layers.
- Filter uncertain OCR lines using confidence and readability checks, retaining original results and line coordinates in local review checkpoints. Preserve meaningful Unicode text.
- Select readable matching lines or sentences for search snippets, including wrapped phrases. Escape markup and keep query highlighting and reader context intact.
- Preserve physical page numbering independently of indexed-page count. Back up and atomically replace each issue's index; retain it when extraction or validation fails.
- Resume from PDF-hash/version checkpoints and revalidate source metadata before committing.
- Load and package PDF.js standard-font assets. Five 2015 editions needed their OCR pages regenerated; April 2015 page 49 recovered a previously omitted line. Unaffected extraction was reused after checking OCR-page font dependencies.

The reported January 2019 page-4 example now reads: “When superman is born as Nature’s king”. Its unreliable cover-art OCR is withheld.

## Review exceptions

Every withheld remote page is **physical PDF page 1**. The issue and its remaining indexed pages remain available; metadata search is preserved.

| Year | Editions requiring cover-text review |
|---|---|
| 2025 | January |
| 2021 | May |
| 2020 | February, May, July, August |
| 2019 | January, March |
| 2018 | February |
| 2017 | February, April, December |
| 2016 | January, September, November |
| 2015 | June |
| 2014 | December |

These are conservative search indexes, not certified transcriptions. Low-confidence lines can be omitted within otherwise indexed pages, and source line-end hyphenation can remain. Character counts and confidence scores are not an OCR accuracy percentage. Source PDFs were not edited.

## Verification and evidence

- Production build passed compilation, lint/types and 37-page generation. Deployment tracing includes the PDF.js standard-font assets.
- `test-search-extraction.cjs`: exact reported garbage rejected; valid titles/Unicode retained; safe HTML, wrapped phrases and actual sparse/native PDF extraction passed.
- `test-indexing.cjs`: real libSQL rollback, invalid/incomplete extraction, uncertain-page exclusion, physical numbering and Hindi preservation passed.
- `test-review.cjs` and `test-search-reader.cjs`: search/access restrictions, safe rendering, query context, geometry and reader links passed.
- `verify-rebuilt-search.cjs --complete` and its `--local` variant: every supported index matches its complete source checkpoint; catalogue/source/publication checks passed.
- Desktop (1440px) and phone (390px) browser checks: whole-card click lands on page 4 and highlights the matching line, with no browser exceptions. The notice fades after landing while the passage highlight remains.
- Final coverage audit: SQL LIKE fallback remains active; native `fts_match` is unavailable. No search-engine migration was performed.

Ignored local evidence directory: `.codex-logs/search-rebuild-v2/`.

| Evidence | Location within that directory |
|---|---|
| Final remote report, manifest and backups | `remote-1788684673363/` |
| Original full remote pass and backups | `remote-1788682453600/` |
| Initial remote pilot / first-batch backups | `remote-1788682150520/`, `remote-1788682190214/` |
| Initial local replacement backups | `local-1788682136732/` |
| Final local report and exclusion checks | `local-1788684524554/` |
| Source and per-page review checkpoints | `<issue-id>-<PDF-SHA256>-native-first-english-v5.json` |

Rebuild/retry commands are documented in [worker guide](INDEXING_WORKER.md#catalogue-rebuild-and-verification). Browser evidence is in `.cache/search-reader-qa/`.

## Remaining work

The original rebuild was followed by deployment and implementation of durable ingestion jobs, background execution and admin progress/retry controls; see [worker operations](INDEXING_WORKER.md) and the [September 19 release](PRODUCTION_RELEASE_2026-09-19.md). The earlier SI-06 implementation gap is superseded. The 17 cover pages still require individual review, and live Admin dispatch activation and source synchronization remain in the [active TODO](TO%20DO%20LIST.md).

## Historical baseline before the September 6 rebuild

The following is the pre-repair measurement, not current production status. The September 19 release subsequently enabled FTS5 trigram page/metadata search; the older `fts_match`/LIKE observations below describe the baseline only.


None of the 94 publicly readable editions in the configured local application's database has indexed page text. Metadata search remains available. The earlier Divine Grace excerpt-like result came from the issue description, not an indexed page.

| Language | Listed editions | Readable | Editions with indexed text | Readable editions with indexed text | Unknown page counts |
|---|---:|---:|---:|---:|---:|
| English | 102 | 93 | 0 | 0 | 102 |
| Hindi | 2 | 1 | 1 | 0 | 1 |
| Total | 104 | 94 | 1 | 0 | 103 |

The indexed Hindi edition is Agnishikha — May 2026 (restricted): 52 expected pages, 52 distinct indexed pages, and 52 nonempty pages. No out-of-range indexed pages or nonempty pages shorter than 31 characters were found in that edition. These checks establish structural coverage, not OCR accuracy.

## Method and limits

Run `node scripts/audit-search-coverage.mjs` from the repository root. `--details` includes per-issue metadata. The script reads the configured database and outputs no credentials or page excerpts. No database or storage mutations were performed.

Scope matches the listed online catalogue: published issues with nonblank PDF references excluding unsupported asset locations. Readability uses the five-year IST cutoff. Drafts and the wider print inventory are outside these totals. Database scope is the environment used by the local app; production was not independently queried.

Expected page totals are unknown for 103 editions, so a percentage of all physical pages indexed cannot be calculated. Blank source pages and OCR errors require comparison with the PDFs; character counts cannot prove transcription quality. No publicly readable indexed text exists in this scope to sample for text quality. Restricted OCR content was not copied into this report.

The `fts_match` probe was unavailable in this environment. The existing repository falls back to SQL LIKE text matching, which has different ranking and phrase behaviour from a full-text engine. Metadata also uses SQL LIKE. The UI must not label description/theme matches as page matches.

The former SC-01–SC-04 repair checklist is superseded by this report and the active TODO.
