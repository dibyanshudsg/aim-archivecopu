# AIM Archive — Website Review Action Plan

Updated: 6 September 2026

Historical review record: [TO DO LIST.md](TO%20DO%20LIST.md) is the single active backlog. The checklists and IDs below preserve September review scope, not a second current tracker. Follow P5-01/02 for dispatch, P5-03/06 for admin fixtures and cover review, and Phase 6 for quality acceptance. Completed public-site review, English rebuild and indexing evidence remains in [website verification](docs/archive/WEBSITE_REVIEW_VERIFICATION.md), [rebuild report](SEARCH_REBUILD_REPORT.md), and [worker guide](GITHUB_INDEXING.md).

## Current implementation — Admin indexing and page review

| ID | Task | Status | Acceptance criteria |
|---|---|---|---|
| AI-01 | Start indexing entirely inside Admin | Deployed; activation pending AI-07 | Authenticated server dispatch; private repository and credential stay server-side; no GitHub navigation required. |
| AI-02 | Start only genuine pending work | Deployed; isolated and browser checks passed | Server rechecks missing/queued English issues and expired processing leases; completed indexes and page reviews are excluded; failed retries and confirmed rebuilds stay explicit. |
| AI-03 | Prevent duplicate runs and explain progress | Deployed; isolated tests passed | Database lock across admins/tabs; detect worker runs already waiting/running; reconcile completion; retain queues on dispatch failure; ambiguous timeouts never blindly dispatch again. Safe explicit release uses a worker admission check. |
| AI-04 | Resolve withheld page text | Deployed; isolated saves and production form checks passed | Inspect PDF, enter verified plain text or intentionally exclude; confirmation and note required; atomically save decision and affected-page index; retain audit history. |
| AI-05 | Preserve decisions and existing content | Deployed; preservation verified | Decisions tied to PDF URL and fingerprint; retained for unchanged-source rebuilds; never applied to a different PDF; article indexes, physical page counts and access policy preserved. |
| AI-06 | Verify and release | Deployed; live Admin dispatch awaits AI-07 | Isolated transaction/concurrency/error tests, build, authenticated desktop/mobile checks, additive migration, targeted deployment and preservation checks passed. |
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
- Additive migration 00006 applied. Before/after comparisons passed for all issue metadata, search rows, coverage records and R2 inventory: 104 issues / 4,937 index rows / 208 objects. Local private evidence: `.codex-logs/production-release/controls-before.json` and `controls-after.json`.
- Production application release: commit `7d73dce038e178525db16fd615e20365af7eea17`; Vercel `dpl_ybb6eH4d2iUevYWGqpwC5fZdfUkp` READY at [aim-archive.vercel.app](https://aim-archive.vercel.app). Final production build passed compilation, lint, types and generation of 41 static pages.
- Hosted verification [34044415385](https://github.com/MugdhanilK/aim-archive/actions/runs/34044415385) passed: bounded runner, new dispatch/review tests, Python admission tests, real native/scanned PDF worker, and read-only production database access. Production issue processing was skipped.
- Production desktop/phone Admin checks passed with real authentication and intercepted review writes. Public search returned Superman results; coverage remains 102 eligible / 85 indexed without flags / 17 with review flags. No actual cover text was changed. Live Admin-to-GitHub dispatch is explicitly not verified until AI-07 is configured.

Next action: repository owner configures the scoped token directly in Vercel using [the setup steps](GITHUB_INDEXING.md#one-time-admin-connection-setup). Then verify a controlled Admin start and review the 17 covers individually. These are remaining tasks, not completed work.
