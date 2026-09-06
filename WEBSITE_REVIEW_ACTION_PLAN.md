# AIM Archive — Website Review Action Plan

Updated: 6 September 2026

This tracker contains remaining approved work. Completed public-site review tasks, the English search rebuild, the dedicated indexing workspace, and manual GitHub worker setup have been removed from the active checklist. Their evidence remains in [website verification](WEBSITE_REVIEW_VERIFICATION.md), [rebuild report](SEARCH_REBUILD_REPORT.md), and [worker guide](GITHUB_INDEXING.md).

## Current implementation — Admin indexing and page review

| ID | Task | Status | Acceptance criteria |
|---|---|---|---|
| AI-01 | Start indexing entirely inside Admin | Verified locally; activation pending AI-07 | Authenticated server dispatch; private repository and credential stay server-side; no GitHub navigation required. |
| AI-02 | Start only genuine pending work | Verified locally | Server rechecks missing/queued English issues and expired processing leases; completed indexes and page reviews are excluded; failed retries and confirmed rebuilds stay explicit. |
| AI-03 | Prevent duplicate runs and explain progress | Verified locally | Database lock across admins/tabs; detect worker runs already waiting/running; reconcile completion; retain queues on dispatch failure; ambiguous timeouts never blindly dispatch again. Safe explicit release uses a worker admission check. |
| AI-04 | Resolve withheld page text | Verified locally | Inspect PDF, enter verified plain text or intentionally exclude; confirmation and note required; atomically save decision and affected-page index; retain audit history. |
| AI-05 | Preserve decisions and existing content | Verified locally | Decisions tied to PDF URL and fingerprint; retained for unchanged-source rebuilds; never applied to a different PDF; article indexes, physical page counts and access policy preserved. |
| AI-06 | Verify and release | Release in progress | Isolated transaction/concurrency/error tests, build, authenticated desktop/mobile checks, additive migration, targeted deployment and preservation checks. |
| AI-07 | Configure Admin-to-worker connection | Needs credential | Vercel environment names checked: no GitHub credential exists. Configure INDEXING_GITHUB_TOKEN privately with access only to this repository and Actions read/write. Verify live dispatch with controlled data. |

Start processes at most three issues per run and stops claiming new work after 20 minutes. Any remaining work requires another manual start. No hourly schedule is being added.

## Page review follow-up

- [ ] Inspect the 17 flagged cover pages and save a verified transcription or intentional exclusion for each. Do not bulk-dismiss flags.
- [ ] Confirm reviewed cover text appears in search with correct issue/page provenance, or remains absent when intentionally excluded.
- [ ] Exercise upload and PDF replacement through Admin using a controlled fixture, verify queue/worker/review lifecycle, and remove only the fixture afterward.

Current verified baseline: all 17 flagged editions have only PDF page 1 withheld; their remaining pages are indexed. This is OCR quality review, not 17 failed jobs. The database contains 104 issues and 4,937 indexed page rows; the English rebuild covers 102 issues, 4,902 physical pages and 4,885 searchable pages. These are dated observations, not fixed UI constants.

## Other remaining decisions

- [ ] P3-07: Curated selections and an editorial maintainer — deferred by the owner.
- [ ] Obtain a verified official print-subscription contact destination before adding that link.
- Deferred scope: adjustable text-reading editions, EPUB/MOBI, online subscription entitlements, bookmark/history sync, a new search engine, physical digitisation counts, and a visual redesign. These need separate approval or evidence.

## Evidence and release tracking

- 6 September: current database confirmed all 17 review flags concern page 1 only.
- 6 September: Vercel environment-name inspection confirmed no GitHub worker-dispatch credential. No secret values were displayed or copied.
- Local tests: `node scripts/test-indexing-controls.cjs` covers real isolated transactions, rollback, source changes, reviewed text surviving rebuilds, concurrent starts through separate database clients, waiting/running/completion, rejection, timeout and release recovery. Existing queue and real native/scanned-PDF worker tests passed. Python admission/probe tests passed (4 cases).
- Authenticated desktop (1440px) and phone (390px) checks passed: no-op disabled state, no external GitHub link, auth/origin guards, review validation, stale-save input retention, and pending-work enablement using a mock worker connection. Browser review writes were intercepted; no actual cover decisions were saved.
- Impeccable finish review: ship for the scoped UI extension; no material findings. Detector returned no findings. Lower review controls were assessed in source and browser interactions rather than all appearing in the screenshots.
- Additive migration 00006 applied. Pre-release snapshot: 104 issues / 4,937 index rows / 208 R2 objects. Final release and post-release preservation evidence will be recorded after deployment.
