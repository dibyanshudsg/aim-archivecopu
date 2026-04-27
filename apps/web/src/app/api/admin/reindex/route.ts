import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import { indexIssueFromUrl } from '@/lib/search-indexer';
import { generateThumbnailFromUrl } from '@/lib/pdf-thumbnail';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getClient();
  const body = await request.json().catch(() => ({}));
  const force = body.force === true;

  // Get all issues
  const { data: allIssues } = await supabase
    .from('issues')
    .select('id, title, pdf_url, cover_image_url')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (!allIssues || allIssues.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, total: 0 });
  }

  // Find issues that need indexing
  let toIndex = allIssues;
  if (!force) {
    const { data: indexed } = await supabase
      .from('issue_search_index')
      .select('issue_id')
      .limit(10000);

    const indexedIds = new Set((indexed || []).map((r) => r.issue_id));
    toIndex = allIssues.filter((i) => !indexedIds.has(i.id));
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
    const pagesIndexed = await indexIssueFromUrl(supabase, issue.id, issue.pdf_url);

    // Generate thumbnail if missing
    let thumbnailUrl: string | null = null;
    if (!issue.cover_image_url) {
      try {
        const url = new URL(issue.pdf_url);
        const storagePath = url.pathname.split('/storage/v1/object/public/magazines/')[1];
        if (storagePath) {
          thumbnailUrl = await generateThumbnailFromUrl(
            supabase,
            issue.pdf_url,
            decodeURIComponent(storagePath),
          );
          await supabase
            .from('issues')
            .update({ cover_image_url: thumbnailUrl })
            .eq('id', issue.id);
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
