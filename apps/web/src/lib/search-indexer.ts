import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedPage } from './pdf-extract';
import { extractPdfText } from './pdf-extract';

/**
 * Index extracted pages into the issue_search_index table.
 * Idempotent — deletes existing entries for this issue first.
 */
export async function indexIssue(
  supabase: SupabaseClient,
  issueId: string,
  pages: ExtractedPage[],
): Promise<number> {
  // Clear existing index entries for this issue
  await supabase.from('issue_search_index').delete().eq('issue_id', issueId);

  if (pages.length === 0) return 0;

  // Batch insert all pages
  const rows = pages.map((page) => ({
    issue_id: issueId,
    page_number: page.pageNumber,
    content: page.content,
  }));

  const { error } = await supabase.from('issue_search_index').insert(rows);
  if (error) {
    throw new Error(`Failed to index issue ${issueId}: ${error.message}`);
  }

  // Update page_count on the issue
  await supabase
    .from('issues')
    .update({ page_count: pages.length })
    .eq('id', issueId);

  return pages.length;
}

/**
 * Download a PDF from a URL, extract text, and index it.
 * Used for reindexing existing issues.
 */
export async function indexIssueFromUrl(
  supabase: SupabaseClient,
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
  return indexIssue(supabase, issueId, pages);
}
