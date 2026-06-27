import type { ExtractedPage } from './pdf-extract';
import { extractPdfText } from './pdf-extract';
import { createId, getDb, nowIso } from '@/lib/db';

/**
 * Index extracted pages into the issue_search_index table.
 * Idempotent — deletes existing entries for this issue first.
 */
export async function indexIssue(issueId: string, pages: ExtractedPage[]): Promise<number> {
  await getDb().execute({
    sql: 'DELETE FROM issue_search_index WHERE issue_id = ?',
    args: [issueId],
  });

  if (pages.length === 0) return 0;

  await getDb().batch(
    pages.map((page) => ({
      sql: `
        INSERT INTO issue_search_index (id, issue_id, page_number, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [createId(), issueId, page.pageNumber, page.content, nowIso()],
    })),
    'write',
  );

  await getDb().execute({
    sql: 'UPDATE issues SET page_count = ?, updated_at = ? WHERE id = ?',
    args: [pages.length, nowIso(), issueId],
  });

  return pages.length;
}

/**
 * Download a PDF from a URL, extract text, and index it.
 * Used for reindexing existing issues.
 */
export async function indexIssueFromUrl(
  issueId: string,
  pdfUrl: string,
): Promise<number> {
  // Download the PDF
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract text
  const pages = await extractPdfText(buffer);

  // Index it
  return indexIssue(issueId, pages);
}
