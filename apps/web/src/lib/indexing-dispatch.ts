import { createId, getDb } from './db/client';
import { coverageSql } from './db/indexing-workspace-repository';
import { enqueueInTransaction } from './db/indexing-repository';
import { EXTRACTION_VERSION } from './pdf-extract';
import type { DispatchState } from './indexing-workspace';

const repo = 'MugdhanilK/aim-archive';
const workflow = 'search-indexing.yml';
type Run = { id: number; status: string; conclusion: string | null; display_title: string };
const pendingSql =
  coverageSql +
  ` SELECT id,status FROM coverage WHERE status IN ('missing','queued') OR (status='processing' AND id IN (SELECT issue_id FROM indexing_jobs WHERE lease_until<?))`;
class GitHubError extends Error {
  constructor(public status: number) {
    super('Worker service request failed');
  }
}
async function github(path: string, body?: object) {
  const response = await fetch(`https://api.github.com/repos/${repo}/actions/${path}`, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
    headers: {
      Authorization: `Bearer ${process.env.INDEXING_GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new GitHubError(response.status);
  return response.status === 204 ? null : response.json();
}
async function update(
  id: string,
  status: string,
  message: string,
  active: boolean,
  runId?: string,
) {
  await getDb().execute({
    sql: 'UPDATE indexing_dispatches SET status=?,message=?,active=?,checked_at=?,run_id=COALESCE(?,run_id) WHERE id=? AND active=1',
    args: [status, message, active ? 1 : null, Date.now(), runId ?? null, id],
  });
}
export async function getDispatchState(force = false): Promise<DispatchState> {
  const configured = !!process.env.INDEXING_GITHUB_TOKEN;
  let row = (
    await getDb().execute(
      'SELECT * FROM indexing_dispatches ORDER BY active DESC,created_at DESC LIMIT 1',
    )
  ).rows[0];
  if (configured && row?.active && (force || Number(row.checked_at) < Date.now() - 30000)) {
    // One status fetch per interval across all tabs and admins.
    const claim = await getDb().execute({
      sql: 'UPDATE indexing_dispatches SET checked_at=? WHERE id=? AND checked_at=? AND active=1',
      args: [Date.now(), row.id, row.checked_at],
    });
    if (claim.rowsAffected)
      try {
        let run: Run | undefined;
        if (row.run_id) run = await github(`runs/${row.run_id}`);
        else {
          const since = encodeURIComponent(
            '>=' + new Date(Number(row.created_at) - 60000).toISOString(),
          );
          const result = await github(
            `workflows/${workflow}/runs?branch=main&event=workflow_dispatch&created=${since}&per_page=100`,
          );
          run = result.workflow_runs.find(
            (r: Run) => r.display_title === `Admin indexing ${row.id}`,
          );
        }
        if (run) {
          const done = run.status === 'completed';
          const status = done
            ? run.conclusion === 'success'
              ? 'complete'
              : 'failed'
            : run.status === 'in_progress'
              ? 'running'
              : 'waiting';
          await update(
            String(row.id),
            status,
            done
              ? status === 'complete'
                ? 'Run finished. Check the queue for remaining issues.'
                : 'The run stopped before finishing. Saved pages and queued work are retained.'
              : status === 'running'
                ? 'Indexing run in progress. Page progress appears below.'
                : 'Waiting for the indexing worker to start.',
            !done,
            String(run.id),
          );
        } else if (Number(row.created_at) < Date.now() - 120000) {
          await update(
            String(row.id),
            'unknown',
            'Start confirmation is delayed. Check status again; another start is blocked to prevent duplicate runs.',
            true,
          );
        }
      } catch {
        await update(
          String(row.id),
          String(row.status),
          'Worker status is temporarily unavailable. Refresh to check again; another start is blocked.',
          true,
        );
      }
    row = (
      await getDb().execute({ sql: 'SELECT * FROM indexing_dispatches WHERE id=?', args: [row.id] })
    ).rows[0];
  }
  const pending = (
    await getDb().execute({
      sql: pendingSql,
      args: [EXTRACTION_VERSION, EXTRACTION_VERSION, Date.now()],
    })
  ).rows.length;
  return {
    configured,
    pending,
    active: !!row?.active,
    status: String(row?.status || 'idle'),
    message: !configured
      ? 'Starting from Admin needs the worker connection configured.'
      : String(row?.message || 'Ready when eligible issues need indexing.'),
  };
}

export async function startIndexing(adminId: string) {
  if (!process.env.INDEXING_GITHUB_TOKEN)
    throw Error('The worker connection is not configured yet.');
  if ((await getDispatchState(true)).active)
    throw Error('An indexing run is already starting or active.');
  const id = createId();
  const tx = await getDb().transaction('write');
  try {
    if ((await tx.execute('SELECT id FROM indexing_dispatches WHERE active=1')).rows.length)
      throw Error('An indexing run is already starting or active.');
    const pending = await tx.execute({
      sql: pendingSql,
      args: [EXTRACTION_VERSION, EXTRACTION_VERSION, Date.now()],
    });
    if (!pending.rows.length)
      throw Error(
        'No eligible issues need indexing. Completed indexes and page reviews are not queued.',
      );
    await tx.execute({
      sql: `INSERT INTO indexing_dispatches(id,status,active,requested_by,created_at,checked_at,message) VALUES(?,'preparing',1,?,?,?,'Preparing the indexing run.')`,
      args: [id, adminId, Date.now(), Date.now()],
    });
    // Bound the transaction; subsequent manual runs pick up any remaining missing issues.
    for (const row of pending.rows.filter((r) => r.status === 'missing').slice(0, 100))
      await enqueueInTransaction(tx, String(row.id), false, 'missing_batch');
    await tx.commit();
  } finally {
    tx.close();
  }
  let sent = false;
  try {
    // Detect runs started directly in the private repository, including waiting runners.
    const results = await Promise.all(
      ['queued', 'in_progress', 'waiting', 'pending', 'requested'].map((status) =>
        github(`workflows/${workflow}/runs?branch=main&status=${status}&per_page=1`),
      ),
    );
    const existing = results.flatMap((result) => result.workflow_runs as Run[])[0];
    if (existing) {
      await update(
        id,
        'waiting',
        'An indexing run is already active. Following its progress here.',
        true,
        String(existing.id),
      );
    } else {
      sent = true;
      await github(`workflows/${workflow}/dispatches`, {
        ref: 'main',
        inputs: { verify_worker: false, request_id: id },
      });
      await update(id, 'waiting', 'Start requested. Waiting for the indexing worker.', true);
    }
  } catch (error) {
    // A network timeout after POST might still have started a run. Never dispatch twice blindly.
    const uncertain = sent && (!(error instanceof GitHubError) || error.status >= 500);
    await update(
      id,
      uncertain ? 'unknown' : 'start_failed',
      uncertain
        ? 'Start confirmation was interrupted. Checking for the run before allowing another start.'
        : 'Could not start the worker. Check its connection and permissions, then retry. The queue is retained.',
      uncertain,
    );
  }
  return getDispatchState();
}

export async function releaseUnconfirmedStart() {
  const state = await getDispatchState(true);
  if (state.status !== 'unknown') throw Error('The run state changed. Refresh before continuing.');
  // The worker atomically checks this reservation before touching the queue. A delayed
  // dispatch for a released request will exit; an admitted worker changes status first.
  const result = await getDb().execute({
    sql: `UPDATE indexing_dispatches SET active=NULL,status='start_failed',message='Unconfirmed request released. You can start the retained queue again.' WHERE active=1 AND status='unknown' AND run_id IS NULL AND created_at<?`,
    args: [Date.now() - 120000],
  });
  if (!result.rowsAffected)
    throw Error('The worker may have started. Refresh its status before continuing.');
  return getDispatchState();
}
