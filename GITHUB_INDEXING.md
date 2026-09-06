# Manual search indexing

[PR #1](https://github.com/MugdhanilK/aim-archive/pull/1) is merged with the owner's explicit approval. The two encrypted database secrets are configured. The hosted native/scanned PDF test and read-only production credential check [passed on GitHub](https://github.com/MugdhanilK/aim-archive/actions/runs/34040576130). The owner subsequently selected manual-only indexing. The hourly trigger and shared activation gate have been removed.

The workflow is `.github/workflows/search-indexing.yml`. It runs through an authenticated Admin start or a direct GitHub manual dispatch, on the main branch. There are no scheduled, push or pull-request triggers. Existing search reads saved database rows independently of this workflow.

## Run after uploading

1. Upload or replace an English issue. This queues its indexing job. Existing issues can be queued in Admin → Search Indexing.
2. In Search Indexing, choose **Start indexing**. This queues missing English issues and starts queued work. Completed indexes and page reviews are skipped.
3. Follow waiting, running, completion, and issue-level progress in Admin. If work remains after a bounded batch, start another run.
4. Use **Retry failed** explicitly for failed issues. Rebuilding a completed issue requires a separate confirmation. Inspect withheld pages in issue details and save verified text or an intentional exclusion.

## One-time Admin connection setup

Vercel environment names were checked on 6 September 2026: no GitHub dispatch credential is configured. The implementation remains disabled until this setup is completed.

1. The repository owner creates a fine-grained GitHub personal access token with access only to **MugdhanilK/aim-archive**, repository **Actions: read and write**, and the automatically included metadata access. Set an expiration and record a rotation reminder.
2. Add it directly in Vercel → aim-archive → Settings → Environment Variables as **INDEXING_GITHUB_TOKEN**, sensitive, **Production only**. Do not paste it in chat or commit it. Do not reuse the general desktop Git credential.
3. Redeploy after adding the variable. Verify the Admin connection and a controlled queued fixture; do not rebuild existing issues merely to test the button.

GitHub documents the required permission under [Create a workflow dispatch event](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event).

Migration **00006_indexing_controls.sql** must precede the application/workflow release. It adds dispatch reservations and immutable page-review records. Admin request IDs appear in workflow run names. The worker atomically admits only an active reservation before checking the queue. If a start response is lost, Admin checks for its run instead of dispatching twice; after two minutes an unconfirmed request can be explicitly released. A delayed worker for that released request exits without processing. An already admitted worker cannot be released.

Manual runs use the account's shared Actions allowance. Billing usage and paid-overage controls remain unverified through the available Git credential; manual-only operation avoids idle hourly checks but is not a guarantee of zero charges.

The owner authorized `INDEXING_TURSO_DATABASE_URL` and `INDEXING_TURSO_AUTH_TOKEN` as encrypted repository secrets. Both are configured and verified. No R2 write key or admin password was uploaded. Checking **verify_worker** runs isolated PDF tests and a read-only production connection test instead of processing queued issues, capped at 15 minutes.

## Execution

- Standard Ubuntu runner, Node 22, pinned action revisions, read-only repository permissions and one concurrent production run.
- A dependency-free Python queue probe exits cheaply when there is no due work. Credentials are scoped to the probe, processing and completion steps, not dependency installation or cache actions.
- Dependencies and English OCR data are cached. Only a nonempty queue or an explicitly requested worker verification installs dependencies.
- `node scripts/indexing-worker.cjs --drain` processes at most three jobs. It stops claiming more jobs after 20 minutes, allowing the current job to finish under its existing 45-minute watchdog. The workflow has a 75-minute outer timeout. An empty queue exits immediately; retry backoff can defer work to the next manual run.
- Existing leases and page checkpoints protect against overlap, cancellation and stale source PDFs. No workflow step clears or rebuilds every existing index.
- Migration `00005_indexing_schedule.sql` stores the last actual manual check. The admin page shows manual-only operation and the connection/run state. An old check is not treated as overdue.
- Local `pnpm dev` no longer starts an indexing worker. For deliberate local processing use `node scripts/indexing-worker.cjs --drain`; continuously running local development indexing is available only when explicitly started with `INDEXING_LOCAL_WORKER=1`.
- If a run fails, inspect its logs and issue history. Do not print credentials in logs. Re-run safely; compatible page checkpoints are retained.

## Verification completed before activation

- `python scripts/test-indexing-schedule.py`: empty/due queue decisions, stale-lease inclusion, schedule status, no job/index mutation in the probe.
- `node scripts/test-indexing-runner.cjs`: immediate empty exit, three-job cap, claiming deadline and heartbeat cleanup.
- `node scripts/test-indexing-jobs.cjs`: existing transaction/lease/retry/checkpoint regression suite.
- `node scripts/test-indexing-worker-pdf.cjs`: real native-text and scanned-PDF extraction locally in an isolated database.
- Production build and desktop/phone status checks. Earlier scheduled/overdue fixtures are historical; manual-only wording replaces those states.
- GitHub standard Ubuntu runner: native/scanned PDF verification and bounded-run tests passed in runs 34040429579 and 34040576130. The latter also verified encrypted credentials against the live database without modifying rows.

## Ongoing operation

Upload or replace an English PDF as usual, or queue selected issues in Search Indexing. Start a manual run to process due work. A pause in Actions or an exhausted allowance leaves the queue saved and existing search working.

To pause this workflow, disable it in GitHub. The old `INDEXING_ENABLED` variable no longer controls execution. Do not delete the stored issue indexes. Check billing usage periodically.

References: [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [scheduling](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [budget controls](https://docs.github.com/en/billing/how-tos/set-up-budgets).
