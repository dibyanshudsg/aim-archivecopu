# AIM Archive admin walkthrough and acceptance draft

**17 October update:** The review site now has individual Admin accounts and roles; use the [current handover status](CURRENT_STATUS_2026-10-17.md) for deployed behavior. This remains a draft for an isolated staging rehearsal, not evidence that Society operators completed it.

13 October update: Society acceptance is owner-reported and the owner continues participating. The technical demonstrations below remain draft/unperformed unless separately evidenced. [Offline database restore](P3_LOCAL_RESTORE_2026-10-13.md) now passed; full service and receiving recovery remain open.

Prepared 10 October 2026 for the future editorial operator and Society IT. This is a rehearsal guide based on the current local implementation, not a completed receiving-team demonstration. Finalize it against the selected deployed release. Track results under P5, P8 and P10 in the [active tracker](../../TO%20DO%20LIST.md).

## Before the walkthrough

Engineering must provide an identified staging release, isolated database and private fixture bucket, approved test admin access and a working manual indexing connection. Preview settings currently share production configuration in the recorded inventory: a preview URL alone does not make mutation tests safe. Use a small synthetic English PDF/cover and record its fixture IDs. Do not use production issues for practice.

Current Admin access uses an individual account password, assigned role and signed seven-day session. Obtain credentials privately; do not paste them into this guide or screenshots. Coordinate any historical credential/session rotation with the receiving operators.

## Editorial walkthrough

| Step | Operator action | Expected result to demonstrate |
| --- | --- | --- |
| Sign in | Open `/admin/login` and use approved test access | Dashboard opens; unauthenticated access to privileged operations is denied |
| Upload | Open Issues, choose Upload Issue and select the synthetic English PDF; check magazine, full month/year, title, theme/topics and cover | Correct issue record and preview; no reliance on filename guesses without review |
| Check publication | Inspect the resulting Published/Draft state; set the fixture to Draft while checking it | Public catalogue/search exclude the draft; admin preview remains available. Do not assume upload defaults to Draft |
| Correct metadata | Use the issue editing controls and Save changes | Correct title, date, magazine, topics and page count persist after reload |
| Check replacements | Replace the fixture cover and PDF separately | New versions appear without stale public/admin assets; replacement PDF receives appropriate new indexing work |
| Index English text | Open Search Indexing and choose Start indexing once the connection is verified | Waiting/running/completion are visible; another manual start handles remaining work after a bounded batch |
| Review withheld pages | Inspect the issue's withheld-page preview; save verified transcription or intentional exclusion with a note | Saved decision and search inclusion/exclusion match the page; never invent unreadable text |
| Recover a failed job | Inspect the reported failure; resolve the cause and use Retry failed | Retry progresses without destroying valid prior results. Rebuild search index is a distinct confirmed action |
| Publish and check reading | Publish only the fixture approved for demonstration; inspect public browse/search/reader/download | Published status does not bypass the five-year restriction. Verify released reading, restricted denial and signed-link expiry as appropriate |
| Other administration | Rehearse bulk upload/actions, topic rename, CSV, navigation and settings on isolated fixtures | Saved results persist and public views refresh; no accidental broad selection or live contact-link change |
| Remove fixture | Confirm the exact disposable records/assets selected before deletion | Only fixture data is removed; remaining catalogue and storage references are intact |

If the indexing connection is unavailable, record that result and retain the queued work. Do not enable schedules or bypass configuration to make the demonstration appear complete. Follow the [manual indexing guide](../../GITHUB_INDEXING.md), [worker guide](../../INDEXING_WORKER.md) and [navigation guide](../../NAVIGATION_MANAGEMENT.md).

For ongoing editorial operation, new uploads are English AIM only; Agnishikha uploads remain paused. Existing Hindi issues are retained without a promise of Hindi OCR. Catalogue coverage for this handover is already sufficient: this walkthrough does not require uploading additional historical issues.

## Proposed receiving acceptance evidence

These are evidence requirements for discussion, not signed acceptance or additional task completion marks.

| Receiving role | Demonstration or record needed | Current status |
| --- | --- | --- |
| Application maintainer | Independently check out identified release, install, build, deploy/restart and roll back using the runbook | Pending appointment, published release and receiving-host verification |
| Infrastructure operator | Restore backup in isolation, compare data/search and diagnose a simulated failure; record recovered timestamp and duration | Local snapshot verified; full application and independent restore pending |
| Editorial operator | Independently complete upload/correction/publication/manual indexing/review and retry on bounded fixtures | Guide drafted; receiving rehearsal pending |
| Security/release operator | Verify restricted/draft denial at old and new origins plus released/admin/worker access; verify the agreed credential transition | Local PDF tests pass; hosted closure and credential transition pending |
| Billing/account custodian | Demonstrate service sign-in, recovery, costs/alerts, secret renewal and ownership without dependence on personal credentials | Pending receiving accounts and checks |
| Acceptance authority | Record release/deployment, 104-issue scope, evidence, any accepted noncritical exceptions, named ongoing owners, transfer date and finite support period | Pending Society agreement; no exceptions accepted by this draft |

Production acceptance repeats only the agreed bounded fixture after the release and fresh preservation checks. Receiving access must work before departing access is revoked. Retire personal services only after continuity, acceptance and an explicit retention/retirement decision. The owner retains the private GitHub repository by intention; source availability does not itself commit the owner to indefinite operations.
