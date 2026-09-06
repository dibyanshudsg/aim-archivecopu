import type { Transaction } from '@libsql/client';
import { createId, getDb, nowIso } from './client';
import type { ExtractedDocument } from '../pdf-extract';
import { EXTRACTION_VERSION } from '../pdf-extract';

export async function listPageReviews(issueId: string) {
  const result = await getDb().execute({
    sql: `SELECT r.* FROM indexing_page_reviews r WHERE issue_id=? ORDER BY reviewed_at DESC,id DESC`,
    args: [issueId],
  });
  return result.rows;
}

export async function resolvePageReview(
  input: {
    issueId: string;
    page: number;
    sourceHash: string;
    pdfUrl: string;
    decision: 'transcribe' | 'exclude';
    content: string;
    note: string;
  },
  adminId: string,
) {
  const tx = await getDb().transaction('write');
  try {
    const c = (
      await tx.execute({
        sql: `SELECT c.*,i.pdf_url AS current_url,i.page_count AS current_total,m.language,
        (SELECT COUNT(DISTINCT page_number) FROM issue_search_index WHERE issue_id=i.id) AS current_count,
        (SELECT status FROM indexing_jobs WHERE issue_id=i.id) AS job_status
        FROM issue_indexing_coverage c JOIN issues i ON i.id=c.issue_id
        JOIN magazines m ON m.id=i.magazine_id WHERE c.issue_id=?`,
        args: [input.issueId],
      })
    ).rows[0];
    if (
      !c ||
      c.language !== 'english' ||
      c.source_hash !== input.sourceHash ||
      c.pdf_url !== input.pdfUrl ||
      c.current_url !== input.pdfUrl ||
      c.extraction_version !== EXTRACTION_VERSION ||
      Number(c.current_count) !== Number(c.indexed_pages) ||
      Number(c.current_total) !== Number(c.total_pages) ||
      ['queued', 'processing'].includes(String(c.job_status))
    )
      throw Error('The PDF or indexing state changed. Refresh before reviewing.');
    const pages = JSON.parse(String(c.review_pages_json)) as number[];
    if (!pages.includes(input.page))
      throw Error('This page has already been reviewed. Refresh the details.');
    const content = input.content.trim();
    if (
      input.decision === 'transcribe' &&
      (!content || content.length > 20000 || /[<>]/.test(content))
    )
      throw Error('Enter verified plain text, without HTML, up to 20,000 characters.');
    if (!input.note.trim()) throw Error('Add a short note explaining the review decision.');
    await tx.execute({
      sql: `INSERT INTO indexing_page_reviews VALUES(?,?,?,?,?,?,?,?,?,?)`,
      args: [
        createId(),
        input.issueId,
        input.pdfUrl,
        input.sourceHash,
        input.page,
        input.decision,
        input.decision === 'transcribe' ? content : '',
        input.note.trim(),
        adminId,
        nowIso(),
      ],
    });
    // A review can only resolve a withheld page; other searchable pages are untouched.
    await tx.execute({
      sql: 'DELETE FROM issue_search_index WHERE issue_id=? AND page_number=?',
      args: [input.issueId, input.page],
    });
    if (input.decision === 'transcribe')
      await tx.execute({
        sql: 'INSERT INTO issue_search_index(id,issue_id,page_number,content,created_at) VALUES(?,?,?,?,?)',
        args: [createId(), input.issueId, input.page, content, nowIso()],
      });
    const remaining = pages.filter((p) => p !== input.page);
    await tx.execute({
      sql: `UPDATE issue_indexing_coverage SET review_pages_json=?,indexed_pages=(SELECT COUNT(DISTINCT page_number) FROM issue_search_index WHERE issue_id=?) WHERE issue_id=?`,
      args: [JSON.stringify(remaining), input.issueId, input.issueId],
    });
    await tx.execute({
      sql: `UPDATE indexing_jobs SET status=?,review_pages=?,indexed_pages=(SELECT indexed_pages FROM issue_indexing_coverage WHERE issue_id=?),updated_at=? WHERE issue_id=? AND status IN ('review','complete')`,
      args: [
        remaining.length ? 'review' : 'complete',
        remaining.length,
        input.issueId,
        nowIso(),
        input.issueId,
      ],
    });
    await tx.commit();
  } finally {
    tx.close();
  }
}

/** Preserve human decisions on an unchanged source, including explicitly requested rebuilds. */
export async function applyPageReviews(
  tx: Transaction,
  issueId: string,
  hash: string,
  pdfUrl: string,
  document: ExtractedDocument,
) {
  const rows = (
    await tx.execute({
      sql: 'SELECT * FROM indexing_page_reviews WHERE issue_id=? AND source_hash=? AND pdf_url=? ORDER BY reviewed_at,id',
      args: [issueId, hash, pdfUrl],
    })
  ).rows;
  const decisions = new Map(rows.map((r) => [Number(r.page_number), r]));
  return {
    ...document,
    pages: document.pages.map((page) => {
      const review = decisions.get(page.pageNumber);
      if (!review) return page;
      return { ...page, content: String(review.content), status: 'approved' as const };
    }),
  };
}
