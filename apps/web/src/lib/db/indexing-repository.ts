import type { Transaction } from '@libsql/client';
import { createId, getDb, nowIso } from './client';
import type { ExtractedDocument, ExtractedPage } from '../pdf-extract';
import { prepareSearchIndex } from '../search-indexer';
import { startIndexingRun, syncIndexingRun } from './indexing-history';

export const LEASE_MS = 120_000;
export const MAX_ATTEMPTS = 3;
export type IndexingJob = {
  id: string;
  issue_id: string;
  pdf_url: string;
  status: string;
  attempts: number;
  lease_token: string;
  source_hash: string | null;
  extraction_version: string | null;
};

/** Called inside the same transaction as issue creation / PDF replacement. */
export async function enqueueInTransaction(
  tx: Transaction,
  issueId: string,
  replace = false,
  trigger = 'manual',
) {
  const issue = (
    await tx.execute({
      sql: `SELECT i.pdf_url, m.language FROM issues i JOIN magazines m ON m.id=i.magazine_id WHERE i.id=?`,
      args: [issueId],
    })
  ).rows[0];
  if (!issue) throw new Error('Issue not found');
  if (issue.language !== 'english') return null;
  if (!issue.pdf_url || String(issue.pdf_url).includes('.supabase.co/'))
    throw new Error('Upload an available PDF before indexing');
  const existing = (
    await tx.execute({ sql: 'SELECT * FROM indexing_jobs WHERE issue_id=?', args: [issueId] })
  ).rows[0];
  if (
    !replace &&
    existing &&
    existing.pdf_url === issue.pdf_url &&
    ['queued', 'processing'].includes(String(existing.status))
  )
    return String(existing.id);
  // Retry failed work with its checkpoints; explicit reindex starts a fresh extraction.
  if (!replace && existing?.status === 'failed' && existing.pdf_url === issue.pdf_url) {
    await tx.execute({
      sql: `UPDATE indexing_jobs SET status='queued',attempts=0,available_at=0,lease_token=NULL,lease_until=NULL,error=NULL,updated_at=? WHERE id=?`,
      args: [nowIso(), existing.id],
    });
    await startIndexingRun(tx, issueId, String(existing.id), 'retry');
    return String(existing.id);
  }
  await tx.execute({ sql: 'DELETE FROM indexing_jobs WHERE issue_id=?', args: [issueId] });
  const id = createId();
  await tx.execute({
    sql: `INSERT INTO indexing_jobs(id,issue_id,pdf_url,created_at,updated_at) VALUES(?,?,?,?,?)`,
    args: [id, issueId, issue.pdf_url, nowIso(), nowIso()],
  });
  await startIndexingRun(tx, issueId, id, trigger);
  return id;
}

export async function queueIssueIndexing(issueId: string) {
  const tx = await getDb().transaction('write');
  try {
    const id = await enqueueInTransaction(tx, issueId);
    await tx.commit();
    return id;
  } finally {
    tx.close();
  }
}

export async function claimIndexingJob(): Promise<IndexingJob | null> {
  const time = Date.now();
  const tx = await getDb().transaction('write');
  try {
    await tx.execute({
      sql: `UPDATE indexing_jobs SET status='failed',lease_token=NULL,lease_until=NULL,error='Worker stopped repeatedly. Retry to resume saved pages.',updated_at=? WHERE status='processing' AND lease_until<? AND attempts>=?`,
      args: [nowIso(), time, MAX_ATTEMPTS],
    });
    const failed = await tx.execute(
      `SELECT id FROM indexing_jobs WHERE status='failed' AND id IN (SELECT job_id FROM indexing_runs WHERE finished_at IS NULL)`,
    );
    for (const row of failed.rows) await syncIndexingRun(tx, String(row.id));
    const result = await tx.execute({
      sql: `UPDATE indexing_jobs SET status='processing',attempts=attempts+1,lease_token=?,lease_until=?,updated_at=? WHERE id=(
      SELECT id FROM indexing_jobs WHERE attempts<? AND ((status='queued' AND available_at<=?) OR (status='processing' AND lease_until<?)) ORDER BY created_at LIMIT 1
    ) RETURNING *`,
      args: [createId(), time + LEASE_MS, nowIso(), MAX_ATTEMPTS, time, time],
    });
    if (result.rows[0]) await syncIndexingRun(tx, String(result.rows[0].id), 'downloading');
    await tx.commit();
    return result.rows.length ? (result.rows[0] as unknown as IndexingJob) : null;
  } finally {
    tx.close();
  }
}

export async function renewIndexingLease(job: IndexingJob) {
  const result = await getDb().execute({
    sql: `UPDATE indexing_jobs SET lease_until=?,updated_at=? WHERE id=? AND lease_token=? AND status='processing' AND lease_until>?`,
    args: [Date.now() + LEASE_MS, nowIso(), job.id, job.lease_token, Date.now()],
  });
  if (!result.rowsAffected) throw new Error('Indexing lease lost');
}

async function assertLease(tx: Transaction, job: IndexingJob) {
  const result = await tx.execute({
    sql: `SELECT j.id FROM indexing_jobs j JOIN issues i ON i.id=j.issue_id JOIN magazines m ON m.id=i.magazine_id
    WHERE j.id=? AND j.lease_token=? AND j.status='processing' AND j.lease_until>? AND j.pdf_url=i.pdf_url AND m.language='english'`,
    args: [job.id, job.lease_token, Date.now()],
  });
  if (!result.rows.length) throw new Error('Indexing lease or PDF source changed');
}

export async function prepareIndexingCheckpoint(
  job: IndexingJob,
  hash: string,
  version: string,
): Promise<ExtractedPage[]> {
  const tx = await getDb().transaction('write');
  try {
    await assertLease(tx, job);
    if (job.source_hash !== hash || job.extraction_version !== version) {
      await tx.execute({ sql: 'DELETE FROM indexing_job_pages WHERE job_id=?', args: [job.id] });
      await tx.execute({
        sql: `UPDATE indexing_jobs SET source_hash=?,extraction_version=?,completed_pages=0,total_pages=NULL,indexed_pages=0,review_pages=0 WHERE id=?`,
        args: [hash, version, job.id],
      });
    }
    const rows = (
      await tx.execute({
        sql: 'SELECT payload FROM indexing_job_pages WHERE job_id=? ORDER BY page_number',
        args: [job.id],
      })
    ).rows;
    await tx.commit();
    return rows.map((row) => JSON.parse(String(row.payload)) as ExtractedPage);
  } finally {
    tx.close();
  }
}

export async function saveIndexingPage(job: IndexingJob, page: ExtractedPage, total: number) {
  const tx = await getDb().transaction('write');
  try {
    await assertLease(tx, job);
    await tx.execute({
      sql: `INSERT INTO indexing_job_pages(job_id,page_number,payload) VALUES(?,?,?) ON CONFLICT(job_id,page_number) DO UPDATE SET payload=excluded.payload`,
      args: [job.id, page.pageNumber, JSON.stringify(page)],
    });
    await tx.execute({
      sql: `UPDATE indexing_jobs SET completed_pages=(SELECT COUNT(*) FROM indexing_job_pages WHERE job_id=?),total_pages=?,lease_until=?,updated_at=? WHERE id=?`,
      args: [job.id, total, Date.now() + LEASE_MS, nowIso(), job.id],
    });
    await syncIndexingRun(tx, job.id, 'extracting');
    await tx.commit();
  } finally {
    tx.close();
  }
}

export async function completeIndexingJob(job: IndexingJob, document: ExtractedDocument) {
  const { statements, indexedPages } = prepareSearchIndex(job.issue_id, document);
  const reviewPages = document.pages.filter((page) => page.status === 'review').length;
  const tx = await getDb().transaction('write');
  try {
    await assertLease(tx, job);
    await tx.batch(statements);
    await tx.execute({
      sql: `UPDATE indexing_jobs SET status=?,indexed_pages=?,review_pages=?,completed_pages=?,total_pages=?,error=NULL,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=?`,
      args: [
        reviewPages ? 'review' : 'complete',
        indexedPages,
        reviewPages,
        document.totalPages,
        document.totalPages,
        nowIso(),
        job.id,
      ],
    });
    // Keep only withheld pages for review after success. Retry checkpoints are retained on failure.
    await tx.execute({
      sql: `DELETE FROM indexing_job_pages WHERE job_id=? AND page_number NOT IN (${
        document.pages
          .filter((p) => p.status === 'review')
          .map(() => '?')
          .join(',') || 'NULL'
      })`,
      args: [
        job.id,
        ...document.pages.filter((p) => p.status === 'review').map((p) => p.pageNumber),
      ],
    });
    if (!reviewPages)
      await tx.execute({ sql: 'DELETE FROM indexing_job_pages WHERE job_id=?', args: [job.id] });
    await syncIndexingRun(tx, job.id);
    await tx.execute({
      sql: `INSERT INTO issue_indexing_coverage(issue_id,pdf_url,source_hash,extraction_version,total_pages,indexed_pages,blank_pages_json,review_pages_json,indexed_at,evidence)
      SELECT issue_id,pdf_url,source_hash,extraction_version,?,?,?,?,?,'worker' FROM indexing_jobs WHERE id=?
      ON CONFLICT(issue_id) DO UPDATE SET pdf_url=excluded.pdf_url,source_hash=excluded.source_hash,extraction_version=excluded.extraction_version,total_pages=excluded.total_pages,indexed_pages=excluded.indexed_pages,blank_pages_json=excluded.blank_pages_json,review_pages_json=excluded.review_pages_json,indexed_at=excluded.indexed_at,evidence=excluded.evidence`,
      args: [
        document.totalPages,
        indexedPages,
        JSON.stringify(document.pages.filter((p) => p.status === 'empty').map((p) => p.pageNumber)),
        JSON.stringify(
          document.pages.filter((p) => p.status === 'review').map((p) => p.pageNumber),
        ),
        nowIso(),
        job.id,
      ],
    });
    await tx.commit();
    return indexedPages;
  } finally {
    tx.close();
  }
}

export async function failIndexingJob(job: IndexingJob, error: unknown) {
  const message = error instanceof Error ? error.message : 'Indexing failed';
  // Errors shown to admins must not include credential-bearing URLs.
  const safeMessage = message.replace(/https?:\/\/\S+/g, '[PDF source]').slice(0, 400);
  const tx = await getDb().transaction('write');
  try {
    const result = await tx.execute({
      sql: `UPDATE indexing_jobs SET status=?,available_at=?,lease_token=NULL,lease_until=NULL,error=?,updated_at=? WHERE id=? AND lease_token=? AND status='processing'`,
      args: [
        job.attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
        Date.now() + 30_000 * 2 ** (job.attempts - 1),
        safeMessage,
        nowIso(),
        job.id,
        job.lease_token,
      ],
    });
    if (result.rowsAffected) await syncIndexingRun(tx, job.id);
    await tx.commit();
  } finally {
    tx.close();
  }
}

export async function setIndexingStage(job: IndexingJob, stage: 'extracting' | 'saving') {
  const tx = await getDb().transaction('write');
  try {
    await assertLease(tx, job);
    await syncIndexingRun(tx, job.id, stage);
    await tx.commit();
  } finally {
    tx.close();
  }
}

export async function heartbeatIndexingWorker(id: string) {
  await getDb().batch(
    [
      {
        sql: 'INSERT INTO indexing_workers(id,last_seen) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen',
        args: [id, Date.now()],
      },
      { sql: 'DELETE FROM indexing_workers WHERE last_seen<?', args: [Date.now() - 86400_000] },
    ],
    'write',
  );
}

export async function getIndexingOverview() {
  const db = getDb();
  const [jobs, counts, workers] = await Promise.all([
    db.execute(`SELECT j.id,j.issue_id,i.title,i.theme,j.status,j.attempts,j.completed_pages,j.total_pages,j.indexed_pages,j.review_pages,j.error,j.updated_at,
      (SELECT GROUP_CONCAT(page_number, ', ') FROM indexing_job_pages p WHERE p.job_id=j.id AND j.status='review') AS review_page_numbers
      FROM indexing_jobs j JOIN issues i ON i.id=j.issue_id
      ORDER BY CASE j.status WHEN 'processing' THEN 0 WHEN 'failed' THEN 1 WHEN 'queued' THEN 2 WHEN 'review' THEN 3 ELSE 4 END,j.updated_at DESC LIMIT 50`),
    db.execute('SELECT status,COUNT(*) AS count FROM indexing_jobs GROUP BY status'),
    db.execute({
      sql: 'SELECT COUNT(*) AS count FROM indexing_workers WHERE last_seen>?',
      args: [Date.now() - 60_000],
    }),
  ]);
  return {
    jobs: jobs.rows,
    counts: Object.fromEntries(counts.rows.map((r) => [String(r.status), Number(r.count)])),
    workerOnline: Number(workers.rows[0]?.count) > 0,
  };
}
