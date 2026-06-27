import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { listReindexCandidatesFromDb, updateIssueCoverInDb } from '@/lib/db';
import { indexIssueFromUrl } from '@/lib/search-indexer';
import { generateThumbnailFromUrl } from '@/lib/pdf-thumbnail';
import { storageKeyFromUrl } from '@/lib/r2-client';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const force = body.force === true;

  const allIssues = await listReindexCandidatesFromDb(true);

  if (allIssues.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, total: 0 });
  }

  // Find issues that need indexing
  let toIndex = allIssues;
  if (!force) {
    toIndex = await listReindexCandidatesFromDb(false);
  }

  if (toIndex.length === 0) {
    return NextResponse.json({
      processed: 0,
      remaining: 0,
      total: allIssues.length,
      message: 'All issues already indexed',
    });
  }

  // Process the first unindexed issue
  const issue = toIndex[0];
  try {
    const pagesIndexed = await indexIssueFromUrl(issue.id, issue.pdf_url);

    // Generate thumbnail if missing
    let thumbnailUrl: string | null = null;
    if (!issue.cover_image_url) {
      try {
        const storageKey = storageKeyFromUrl(issue.pdf_url);
        if (storageKey) {
          thumbnailUrl = await generateThumbnailFromUrl(issue.pdf_url, storageKey);
          await updateIssueCoverInDb(issue.id, thumbnailUrl);
          refreshPublicArchiveCaches(issue.id);
        }
      } catch (thumbErr) {
        console.error('Thumbnail generation failed (non-blocking):', thumbErr);
      }
    }

    return NextResponse.json({
      processed: 1,
      remaining: toIndex.length - 1,
      total: allIssues.length,
      indexed: { title: issue.title, pages: pagesIndexed, thumbnailUrl },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({
      processed: 0,
      remaining: toIndex.length,
      total: allIssues.length,
      error: `Failed to index "${issue.title}": ${message}`,
    });
  }
}
