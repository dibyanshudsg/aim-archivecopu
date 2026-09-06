# Scheduled search indexing

The workflow is `.github/workflows/search-indexing.yml`. It checks hourly at minute 23 UTC and supports a manual **Run workflow** from GitHub Actions. Scheduled starts may be delayed. Existing search reads saved database rows independently of this workflow.

## Activation requirements

Execution is gated by the repository variable `INDEXING_ENABLED=true`. An unset or false variable skips the job, including manually dispatched runs. Keep it disabled until both requirements are satisfied:

1. Confirm GitHub Actions paid overages are blocked in the owner's billing settings. This private repository uses the account's shared included allowance; the saved Git credential cannot read the current allowance. Do not assume an empty usage counter or promise a zero bill without that check.
2. Authorize and configure `INDEXING_TURSO_DATABASE_URL` and `INDEXING_TURSO_AUTH_TOKEN` as encrypted repository Actions secrets. These grant the worker access to the existing archive database. No R2 write key or admin password is needed. The automatic approval reviewer rejected their upload pending destination-specific user authorization; they were not uploaded.

After activation, manually run with **verify_worker** enabled. This runs the real native/scanned PDF test against an isolated temporary database, then processes any currently queued production work. Verify the successful run and scheduled status in `/admin/indexing` before declaring cloud indexing live.

## Execution

- Standard Ubuntu runner, Node 22, pinned action revisions, read-only repository permissions and one concurrent production run.
- A dependency-free Python queue probe exits cheaply when there is no due work. Credentials are scoped to the probe, processing and completion steps, not dependency installation or cache actions.
- Dependencies and English OCR data are cached. Only a nonempty queue or an explicitly requested worker verification installs dependencies.
- `node scripts/indexing-worker.cjs --drain` processes at most three jobs. It stops claiming more jobs after 20 minutes, allowing the current job to finish under its existing 45-minute watchdog. The workflow has a 75-minute outer timeout. An empty queue exits immediately; retry backoff can defer work to the next scheduled/manual run.
- Existing leases and page checkpoints protect against overlap, cancellation and stale source PDFs. No workflow step clears or rebuilds every existing index.
- Migration `00005_indexing_schedule.sql`, applied to both configured databases, stores the last actual scheduled check. The admin workspace distinguishes hourly scheduling from an offline worker and flags a check older than three hours. The run link permits manual checks. A local worker can coexist; a live heartbeat alone does not establish which host is running.
- If a run fails, inspect its logs and issue history. Do not print credentials in logs. Re-run safely; compatible page checkpoints are retained.

## Verification completed before activation

- `python scripts/test-indexing-schedule.py`: empty/due queue decisions, stale-lease inclusion, schedule status, no job/index mutation in the probe.
- `node scripts/test-indexing-runner.cjs`: immediate empty exit, three-job cap, claiming deadline and heartbeat cleanup.
- `node scripts/test-indexing-jobs.cjs`: existing transaction/lease/retry/checkpoint regression suite.
- `node scripts/test-indexing-worker-pdf.cjs`: real native-text and scanned-PDF extraction locally in an isolated database.
- Production build; browser-only scheduled/overdue fixtures for desktop and phone. These are not evidence of execution on GitHub.

## Ongoing operation

Upload or replace an English PDF as usual, or queue selected issues in Search Indexing. The next scheduled/manual run processes due work. A pause in Actions or an exhausted allowance leaves the queue saved and existing search working.

To pause this workflow, set `INDEXING_ENABLED=false` or disable it in GitHub. Do not delete the stored issue indexes. Check billing usage periodically. If the repository is ever made public, GitHub can disable inactive schedules after 60 days without repository activity.

References: [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [scheduling](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [budget controls](https://docs.github.com/en/billing/how-tos/set-up-budgets).
