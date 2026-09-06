import type { Transaction } from '@libsql/client';
import { createId, nowIso } from './client';

export async function startIndexingRun(
  tx: Transaction,
  issueId: string,
  jobId: string,
  trigger: string,
) {
  const now = nowIso();
  await tx.execute({
    sql: `UPDATE indexing_runs SET status='superseded',stage='superseded',finished_at=?,updated_at=? WHERE issue_id=? AND finished_at IS NULL`,
    args: [now, now, issueId],
  });
  await tx.execute({
    sql: `INSERT INTO indexing_runs(id,job_id,issue_id,trigger,status,stage,created_at,updated_at) VALUES(?,?,?,?,'queued','queued',?,?)`,
    args: [createId(), jobId, issueId, trigger, now, now],
  });
}

export async function syncIndexingRun(tx: Transaction, jobId: string, stage?: string) {
  await tx.execute({
    sql: `UPDATE indexing_runs SET
    status=(SELECT status FROM indexing_jobs WHERE id=?),
    stage=COALESCE(?,(SELECT status FROM indexing_jobs WHERE id=?)),
    attempts=(SELECT attempts FROM indexing_jobs WHERE id=?),
    completed_pages=(SELECT completed_pages FROM indexing_jobs WHERE id=?),
    total_pages=(SELECT total_pages FROM indexing_jobs WHERE id=?),
    indexed_pages=(SELECT indexed_pages FROM indexing_jobs WHERE id=?),
    review_pages=(SELECT review_pages FROM indexing_jobs WHERE id=?),
    error=(SELECT error FROM indexing_jobs WHERE id=?),
    started_at=CASE WHEN started_at IS NULL AND (SELECT attempts FROM indexing_jobs WHERE id=?)>0 THEN ? ELSE started_at END,
    finished_at=CASE WHEN (SELECT status FROM indexing_jobs WHERE id=?) IN ('complete','review','failed') THEN ? ELSE NULL END,
    updated_at=? WHERE job_id=? AND finished_at IS NULL`,
    args: [
      jobId,
      stage ?? null,
      jobId,
      jobId,
      jobId,
      jobId,
      jobId,
      jobId,
      jobId,
      jobId,
      nowIso(),
      jobId,
      nowIso(),
      nowIso(),
      jobId,
    ],
  });
}
