import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import { generateThumbnailFromUrl } from '@/lib/pdf-thumbnail';
import { storageKeyFromUrl } from '@/lib/r2-client';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * POST /api/admin/thumbnails
 * Generates thumbnails for all issues that don't have one yet.
 * Processes one issue per call (call repeatedly to batch through all).
 */
export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getClient();

  // Find issues missing thumbnails
  const { data: issues } = await supabase
    .from('issues')
    .select('id, title, pdf_url')
    .is('cover_image_url', null)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (!issues || issues.length === 0) {
    return NextResponse.json({
      processed: 0,
      remaining: 0,
      message: 'All issues already have thumbnails',
    });
  }

  const issue = issues[0];

  try {
    const storageKey = storageKeyFromUrl(issue.pdf_url);
    if (!storageKey) {
      return NextResponse.json({
        error: `Could not derive storage key from PDF URL for "${issue.title}"`,
      }, { status: 500 });
    }

    const thumbnailUrl = await generateThumbnailFromUrl(issue.pdf_url, storageKey);

    await supabase
      .from('issues')
      .update({ cover_image_url: thumbnailUrl })
      .eq('id', issue.id);

    return NextResponse.json({
      processed: 1,
      remaining: issues.length - 1,
      issue: issue.title,
      thumbnailUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({
      error: `Failed to generate thumbnail for "${issue.title}": ${message}`,
    }, { status: 500 });
  }
}
