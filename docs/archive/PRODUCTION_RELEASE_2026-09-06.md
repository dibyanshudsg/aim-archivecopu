# Production release — 6 September 2026

> Historical record, archived 19 September 2026. Status claims and commands below describe the original work; use [the active TODO](../../TO%20DO%20LIST.md) and current operating guides for today's tasks. This record does not authorize replaying migrations or deployments.

Website: https://aim-archive.vercel.app

Admin indexing workspace: https://aim-archive.vercel.app/admin/indexing

Final Vercel deployment: `dpl_8eYEdNLdWMbTyr7LcCNqCSL41oxH`, READY and aliased to production. Deployed from the authorized working tree through the existing linked Vercel project; this is not a new Git commit. Existing production configuration was retained.

## Delivered and verified

- Dedicated Search Indexing workspace, catalogue coverage, filters, pagination, selections, confirmed batch actions, run history, issue details and authenticated PDF preview.
- Production admin authentication and unauthorized API rejection; desktop and phone flows pass without page errors. Final browser check uses America/New_York against explicit Asia/Kolkata time formatting to verify server/client rendering consistency.
- Authenticated restricted-edition PDF preview renders and navigates on desktop and phone. Signed-out preview requests redirect to login.
- Production search highlights Superman; clicking the January 2019 page 4 result opens the reader and highlights its matching passage.
- Production coverage reports 102 eligible English editions: 85 indexed without withheld pages, 17 requiring page review. Two Hindi editions remain outside the current extraction scope.
- Local and Vercel builds pass. PDF.js font tracing resolves the real pnpm package directory to avoid packaging a dependency path as both a symlink and a directory. All 16 font assets were checked in the build trace.

## Data preservation

Private pre/post snapshots are saved under the ignored `.codex-logs/production-release/` directory, excluded from deployment. Comparison passed after the final release:

| Data | Before | After |
| --- | ---: | ---: |
| Issues | 104 | 104 |
| Search page rows | 4,937 | 4,937 |
| Verified coverage records | 102 | 102 |
| R2 objects | 208 | 208 |

Hashes of issue metadata, complete search rows, and sorted R2 key/size/ETag inventory match. Read/download counters and issue update timestamps are excluded from the issue hash because normal reader verification can update analytics. No production PDF replacement, issue deletion, or index rebuild was performed during release verification. Browser batch requests were mocked; durable write behavior was verified with isolated database and PDF-worker tests.

## Still outstanding

The production worker has not been hosted independently. The development launcher and updated local worker are running against the full catalogue; a connected heartbeat is evidence of that local process, not cloud automation.

The owner requested free hosting alternatives before choosing. GitHub Actions scheduled/on-demand execution is proposed, not implemented. It needs a quota check, protected secrets, bounded runs, concurrency controls, caching and scheduled-worker status copy. No paid hosting service was created. Continuous Railway hosting remains another option. Details and current pricing sources are in [INDEXING_WORKER.md](../../INDEXING_WORKER.md).

After choosing execution hosting, verify a controlled upload, interruption/resume, retry and PDF replacement on that hosted worker. Review of 17 withheld cover pages and unsupported-language extraction remain separate tasks. Production checks here are focused smoke tests, not a complete repeat of every earlier website-review acceptance test.
