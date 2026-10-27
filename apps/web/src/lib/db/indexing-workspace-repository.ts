import { supportedAssetSql } from '../asset-url';
import type { InValue, Transaction } from '@libsql/client';
import { displayableAssetUrl, getDb } from './client';
import { EXTRACTION_VERSION } from '../pdf-extract';
import type {
  CoverageIssue,
  IndexingCatalogue,
  IndexingFilters,
  IndexingRun,
} from '../indexing-workspace';
import { enqueueInTransaction } from './indexing-repository';
import { listPageReviews } from './indexing-page-reviews';

export const coverageSql = `WITH page_counts AS (
  SELECT issue_id, COUNT(DISTINCT page_number) AS indexed_pages FROM issue_search_index GROUP BY issue_id
), base AS (
  SELECT i.id,i.title,i.theme,i.magazine_id,i.year,i.month,i.is_published,i.cover_image_url,i.pdf_url,
    m.name AS magazine_name,m.language,
    COALESCE(pc.indexed_pages,0) AS indexed_pages,
    COALESCE(j.total_pages,i.page_count) AS total_pages,
    c.total_pages AS verified_total,c.indexed_pages AS verified_count,c.pdf_url AS verified_url,c.extraction_version,
    c.blank_pages_json,c.review_pages_json,c.indexed_at,c.evidence,c.source_hash,
    j.status AS job_status,j.pdf_url AS job_url,COALESCE(j.completed_pages,0) AS completed_pages,
    COALESCE(j.attempts,0) AS attempts,j.error,COALESCE(j.available_at,0) AS available_at,
    (SELECT stage FROM indexing_runs WHERE job_id=j.id ORDER BY created_at DESC LIMIT 1) AS stage
  FROM issues i JOIN magazines m ON m.id=i.magazine_id
  LEFT JOIN page_counts pc ON pc.issue_id=i.id
  LEFT JOIN indexing_jobs j ON j.issue_id=i.id LEFT JOIN issue_indexing_coverage c ON c.issue_id=i.id
), coverage AS (
  SELECT *, CASE WHEN verified_url=pdf_url AND extraction_version=? AND verified_count=indexed_pages AND verified_total=total_pages THEN 1 ELSE 0 END AS verified,
    CASE
      WHEN language!='english' THEN 'excluded'
      WHEN NOT ${supportedAssetSql('pdf_url')} THEN 'unavailable'
      WHEN job_url=pdf_url AND job_status IN ('queued','processing','failed') THEN job_status
      WHEN indexed_pages=0 OR (verified_url IS NOT NULL AND verified_url!=pdf_url) THEN 'missing'
      WHEN verified_url=pdf_url AND extraction_version=? AND verified_count=indexed_pages AND verified_total=total_pages THEN
        CASE WHEN review_pages_json!='[]' THEN 'review' ELSE 'indexed' END
      ELSE 'unverified' END AS status
  FROM base
)`;

export async function getIndexingAttentionCounts(): Promise<{ missing: number; failed: number; review: number; unverified: number }> {
  const result = await getDb().execute({
    sql: coverageSql + ` SELECT status, COUNT(*) AS count FROM coverage WHERE status IN ('missing','failed','review','unverified') GROUP BY status`,
    args: [EXTRACTION_VERSION, EXTRACTION_VERSION],
  });
  const counts = { missing: 0, failed: 0, review: 0, unverified: 0 };
  for (const row of result.rows) {
    const status = String(row.status) as keyof typeof counts;
    if (status in counts) counts[status] = Number(row.count ?? 0);
  }
  return counts;
}

function conditions(filters: IndexingFilters) {
  const clauses: string[] = [];
  const args: InValue[] = [EXTRACTION_VERSION, EXTRACTION_VERSION];
  if (filters.q?.trim()) {
    clauses.push(`(title LIKE ? ESCAPE '\\' OR theme LIKE ? ESCAPE '\\')`);
    const value =
      '%' +
      filters.q
        .trim()
        .slice(0, 200)
        .replace(/[\\%_]/g, '\\$&') +
      '%';
    args.push(value, value);
  }
  const status = filters.status ?? 'attention';
  if (status === 'attention')
    clauses.push(`status IN ('missing','failed','review','unverified','unavailable')`);
  else if (status === 'eligible') clauses.push(`status NOT IN ('excluded','unavailable')`);
  else if (status === 'active') clauses.push(`status IN ('queued','processing')`);
  else if (status !== 'all') {
    clauses.push('status=?');
    args.push(status);
  }
  if (filters.magazine && filters.magazine !== 'all') {
    clauses.push('magazine_id=?');
    args.push(filters.magazine);
  }
  if (filters.year && filters.year !== 'all') {
    clauses.push('year=?');
    args.push(Number(filters.year));
  }
  if (filters.publication === 'published' || filters.publication === 'draft') {
    clauses.push('is_published=?');
    args.push(filters.publication === 'published' ? 1 : 0);
  }
  return { where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', args };
}

function mapIssue(row: Record<string, unknown>): CoverageIssue {
  const verified = Number(row.verified) === 1;
  return {
    ...row,
    id: String(row.id),
    cover_image_url: displayableAssetUrl(row.cover_image_url as string | null),
    verified,
    blank_pages: verified ? JSON.parse(String(row.blank_pages_json || '[]')) : [],
    review_pages: verified ? JSON.parse(String(row.review_pages_json || '[]')) : [],
    indexed_at: row.verified_url === row.pdf_url ? row.indexed_at : null,
  } as unknown as CoverageIssue;
}

export async function listIndexingCatalogue(
  filters: IndexingFilters = {},
): Promise<IndexingCatalogue> {
  const db = getDb();
  const { where, args } = conditions(filters);
  const pageSize = 25;
  const count = await db.execute({
    sql: coverageSql + ` SELECT COUNT(*) AS n FROM coverage ${where}`,
    args,
  });
  const total = Number(count.rows[0].n);
  const page = Math.max(
    1,
    Math.min(Math.ceil(total / pageSize) || 1, Math.floor(filters.page || 1)),
  );
  const [rows, counts, worker, magazines, years, schedule] = await Promise.all([
    db.execute({
      sql:
        coverageSql +
        ` SELECT * FROM coverage ${where} ORDER BY CASE status WHEN 'failed' THEN 0 WHEN 'missing' THEN 1 WHEN 'processing' THEN 2 WHEN 'review' THEN 3 ELSE 4 END,year DESC,month DESC,id LIMIT ? OFFSET ?`,
      args: [...args, pageSize, (page - 1) * pageSize],
    }),
    db.execute({
      sql: coverageSql + ` SELECT status,COUNT(*) AS n FROM coverage GROUP BY status`,
      args: [EXTRACTION_VERSION, EXTRACTION_VERSION],
    }),
    db.execute('SELECT MAX(last_seen) AS last_seen FROM indexing_workers'),
    db.execute('SELECT id,name FROM magazines ORDER BY name'),
    db.execute('SELECT DISTINCT year FROM issues ORDER BY year DESC'),
    db.execute("SELECT * FROM indexing_schedule WHERE id='github-actions'"),
  ]);
  const summary = Object.fromEntries(counts.rows.map((r) => [String(r.status), Number(r.n)]));
  const lastHeartbeat = worker.rows[0]?.last_seen == null ? null : Number(worker.rows[0].last_seen);
  return {
    issues: Array.from(rows.rows, mapIssue),
    total,
    page,
    pageSize,
    counts: summary,
    eligible: Object.entries(summary)
      .filter(([s]) => !['excluded', 'unavailable'].includes(s))
      .reduce((n, [, v]) => n + v, 0),
    workerOnline: !!lastHeartbeat && lastHeartbeat > Date.now() - 60_000,
    lastHeartbeat,
    schedule: schedule.rows[0]
      ? {
          lastCheckedAt: Number(schedule.rows[0].last_checked_at),
          lastResult: String(schedule.rows[0].last_result),
        }
      : null,
    magazines: Array.from(magazines.rows, (row) => ({ id: String(row.id), name: String(row.name) })),
    years: Array.from(years.rows, (r) => Number(r.year)),
  };
}

export async function getIndexingIssueDetails(id: string) {
  const result = await getDb().execute({
    sql: coverageSql + ' SELECT * FROM coverage WHERE id=?',
    args: [EXTRACTION_VERSION, EXTRACTION_VERSION, id],
  });
  if (!result.rows[0]) return null;
  const runs = await getDb().execute({
    sql: `SELECT r.*,i.title,i.theme FROM indexing_runs r JOIN issues i ON i.id=r.issue_id WHERE r.issue_id=? ORDER BY r.created_at DESC LIMIT 30`,
    args: [id],
  });
  return {
    issue: mapIssue(result.rows[0]),
    runs: Array.from(runs.rows, (row) => ({ ...row })) as unknown as IndexingRun[],
    reviews: await listPageReviews(id),
  };
}

export async function listIndexingHistory(page = 1) {
  const total = Number((await getDb().execute('SELECT COUNT(*) n FROM indexing_runs')).rows[0].n);
  page = Math.max(1, Math.min(Math.ceil(total / 25) || 1, Math.floor(page)));
  const result = await getDb().execute({
    sql: `SELECT r.*,i.title,i.theme FROM indexing_runs r JOIN issues i ON i.id=r.issue_id ORDER BY r.created_at DESC,r.id LIMIT 25 OFFSET ?`,
    args: [(page - 1) * 25],
  });
  return { runs: Array.from(result.rows, (row) => ({ ...row })) as unknown as IndexingRun[], total, page, pageSize: 25 };
}

export async function queueWorkspaceIssues(input: {
  action: 'missing' | 'retry' | 'selected';
  ids?: string[];
  rebuild?: boolean;
}) {
  const db = getDb();
  const ids =
    input.action === 'selected'
      ? [...new Set(input.ids ?? [])]
      : (
          await db.execute({
            sql:
              coverageSql +
              ` SELECT id FROM coverage WHERE status=? ORDER BY year DESC,month DESC LIMIT 100`,
            args: [
              EXTRACTION_VERSION,
              EXTRACTION_VERSION,
              input.action === 'missing' ? 'missing' : 'failed',
            ],
          })
        ).rows.map((r) => String(r.id));
  if (ids.length > 100) throw new Error('Select at most 100 issues per batch.');
  const queued: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of ids) {
    const tx: Transaction = await db.transaction('write');
    let didQueue = false;
    try {
      const row = (
        await tx.execute({
          sql: coverageSql + ' SELECT * FROM coverage WHERE id=?',
          args: [EXTRACTION_VERSION, EXTRACTION_VERSION, id],
        })
      ).rows[0];
      if (
        !row ||
        ['excluded', 'unavailable', 'queued', 'processing'].includes(String(row.status)) ||
        (input.action === 'missing' && row.status !== 'missing') ||
        (input.action === 'retry' && row.status !== 'failed') ||
        (input.action === 'selected' &&
          !input.rebuild &&
          !['missing', 'failed'].includes(String(row.status)))
      ) {
        skipped.push({
          id,
          reason: row ? `Current state: ${String(row.status)}` : 'Issue no longer exists',
        });
      } else {
        const jobId = await enqueueInTransaction(
          tx,
          id,
          false,
          input.action === 'retry'
            ? 'retry'
            : input.action === 'missing'
              ? 'missing_batch'
              : 'manual',
        );
        didQueue = !!jobId;
      }
      await tx.commit();
      if (didQueue) queued.push(id);
    } catch {
      skipped.push({ id, reason: 'Could not save this job. Retry this issue.' });
    } finally {
      tx.close();
    }
  }
  return { queued, skipped };
}
