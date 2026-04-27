import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import { indexIssueFromUrl } from '@/lib/search-indexer';
import { generateThumbnailFromUrl } from '@/lib/pdf-thumbnail';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getClient();

  const { data: issue, error } = await supabase
    .from('issues')
    .select('id, title, pdf_url, cover_image_url')
    .eq('id', id)
    .single();

  if (error || !issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  let pagesIndexed = 0;
  let thumbnailUrl: string | null = issue.cover_image_url;

  // Reindex text content
  try {
    pagesIndexed = await indexIssueFromUrl(supabase, issue.id, issue.pdf_url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Indexing failed: ${message}` }, { status: 500 });
  }

  // Generate thumbnail if missing
  if (!issue.cover_image_url) {
    try {
      // Derive storage path from the public URL
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
    success: true,
    issue: issue.title,
    pagesIndexed,
    thumbnailUrl,
  });
}
