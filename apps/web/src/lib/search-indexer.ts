import type { ExtractedDocument } from './pdf-extract';
import { extractPdfText } from './pdf-extract';
import { readPrivatePdf } from './private-pdf';
import { createId, getDb, nowIso } from '@/lib/db/client';
import type { InStatement } from '@libsql/client';

/** Magazine language is the source of truth, not a guessed title or filename. */
export async function canIndexIssue(issueId: string): Promise<boolean> {
  const result = await getDb().execute({
    sql: `SELECT m.language FROM issues i JOIN magazines m ON m.id = i.magazine_id WHERE i.id = ?`,
    args: [issueId],
  });
  return result.rows[0]?.language === 'english';
}

export async function indexIssueFromBuffer(
  issueId: string,
  buffer: Buffer,
  onProgress?: (page: number, total: number) => void,
): Promise<number> {
  if (!(await canIndexIssue(issueId))) return 0;
  return indexIssue(issueId, await extractPdfText(buffer, onProgress));
}

/**
 * Index extracted pages into the issue_search_index table.
 * Replace an index atomically. Extraction/validation failures retain the old
 * index, and physical page counts never depend on how many pages contain text.
 */
export async function indexIssue(issueId: string, document: ExtractedDocument): Promise<number> {
  if (!(await canIndexIssue(issueId))) return 0;
  const { statements, indexedPages } = prepareSearchIndex(issueId, document);
  await getDb().batch(statements, 'write');
  return indexedPages;
}

/** Shared validation/writes so the worker can commit the index and job together. */
export function prepareSearchIndex(
  issueId: string,
  document: ExtractedDocument,
): {
  statements: InStatement[];
  indexedPages: number;
} {
  const { totalPages, pages } = document;
  if (!Number.isSafeInteger(totalPages) || totalPages < 1) {
    throw new Error('Extraction did not return a valid PDF page count');
  }
  const seen = new Set<number>();
  for (const page of pages) {
    if (
      !Number.isSafeInteger(page.pageNumber) ||
      page.pageNumber < 1 ||
      page.pageNumber > totalPages ||
      seen.has(page.pageNumber)
    ) {
      throw new Error('Extraction contains duplicate or out-of-range pages');
    }
    seen.add(page.pageNumber);
  }
  if (document.version && pages.length !== totalPages)
    throw new Error('Extraction did not account for every physical page; existing index retained');
  const reviewPages = pages.filter((page) => page.status === 'review').length;
  if (reviewPages > Math.max(4, Math.floor(totalPages * 0.15)))
    throw new Error('Too many uncertain pages; existing index retained for review');
  const searchable = pages.filter(
    (page) => page.content.trim().length > 0 && page.status !== 'review' && page.status !== 'empty',
  );
  if (searchable.length === 0) {
    throw new Error('No searchable text extracted; existing index retained');
  }

  return {
    indexedPages: searchable.length,
    statements: [
      { sql: 'DELETE FROM issue_search_index WHERE issue_id = ?', args: [issueId] },
      ...searchable.map((page) => ({
        sql: `
        INSERT INTO issue_search_index (id, issue_id, page_number, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
        args: [createId(), issueId, page.pageNumber, page.content, nowIso()],
      })),
      {
        sql: 'UPDATE issues SET page_count = ?, updated_at = ? WHERE id = ?',
        args: [totalPages, nowIso(), issueId],
      },
    ],
  };
}

/**
 * Download a PDF from a URL, extract text, and index it.
 * Used for reindexing existing issues.
 */
export async function indexIssueFromUrl(issueId: string, pdfUrl: string): Promise<number> {
  if (!(await canIndexIssue(issueId))) return 0;
  const source = await getDb().execute({ sql: 'SELECT pdf_url FROM issues WHERE id=?', args: [issueId] });
  if (source.rows[0]?.pdf_url !== pdfUrl) throw new Error('PDF source changed');
  const buffer = await readPrivatePdf(pdfUrl);

  const { statements, indexedPages } = prepareSearchIndex(issueId, await extractPdfText(buffer));
  const tx = await getDb().transaction('write');
  try {
    const current = await tx.execute({ sql: 'SELECT i.pdf_url,m.language FROM issues i JOIN magazines m ON m.id=i.magazine_id WHERE i.id=?', args: [issueId] });
    if (current.rows[0]?.pdf_url !== pdfUrl || current.rows[0]?.language !== 'english') throw new Error('PDF source changed');
    for (const statement of statements) await tx.execute(statement);
    await tx.commit();
    return indexedPages;
  } finally { tx.close(); }
}
