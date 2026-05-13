import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import { extractPdfText } from '@/lib/pdf-extract';
import { indexIssue } from '@/lib/search-indexer';
import { generateAndUploadThumbnail } from '@/lib/pdf-thumbnail';
import { isSupabaseStorageUrl, storageKeyFromUrl, uploadToR2 } from '@/lib/r2-client';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Replace the PDF for an existing issue. The new PDF is always written to
 * R2 — if the issue was on Supabase Storage, this implicitly migrates it.
 * The storage key is preserved from the original URL so legacy and new
 * URLs share the same key shape.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getClient();

  const { data: issue, error: fetchErr } = await supabase
    .from('issues')
    .select('id, pdf_url, cover_image_url')
    .eq('id', id)
    .single();
  if (fetchErr || !issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const storageKey = storageKeyFromUrl(issue.pdf_url);
  if (!storageKey) {
    return NextResponse.json({ error: 'Could not derive storage key' }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('pdf') as File | null;
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'A valid PDF file is required' }, { status: 400 });
  }
  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF must be under 100MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let newPublicUrl: string;
  try {
    newPublicUrl = await uploadToR2(storageKey, buffer, 'application/pdf');
  } catch (uploadErr) {
    const message = uploadErr instanceof Error ? uploadErr.message : 'Unknown error';
    return NextResponse.json({ error: 'Upload failed: ' + message }, { status: 500 });
  }

  // If the previous URL was on Supabase Storage, drop the now-orphaned file.
  if (isSupabaseStorageUrl(issue.pdf_url)) {
    try {
      await supabase.storage.from('magazines').remove([storageKey]);
    } catch (legacyCleanupErr) {
      console.error('Legacy Supabase cleanup failed (non-blocking):', legacyCleanupErr);
    }
  }

  // Cache-bust so reader/clients pick up the new file
  const cacheBustedUrl = `${newPublicUrl}?v=${Date.now()}`;

  const { error: updErr } = await supabase
    .from('issues')
    .update({ pdf_url: cacheBustedUrl, file_size_bytes: file.size })
    .eq('id', id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Reindex OCR
  let pagesIndexed = 0;
  try {
    const pages = await extractPdfText(buffer);
    pagesIndexed = await indexIssue(supabase, id, pages);
  } catch (err) {
    console.error('Reindex after PDF replace failed (non-blocking):', err);
  }

  // Regenerate auto-thumbnail only if the current cover was auto-generated
  // (custom uploaded covers live at <path>-cover.jpg; page-1 thumbnails at <path>-thumb.jpg).
  let thumbnailUrl: string | null = issue.cover_image_url;
  const isAutoThumb = !issue.cover_image_url || issue.cover_image_url.includes('-thumb.jpg');
  if (isAutoThumb) {
    try {
      thumbnailUrl = await generateAndUploadThumbnail(buffer, storageKey);
      if (thumbnailUrl) {
        await supabase
          .from('issues')
          .update({ cover_image_url: `${thumbnailUrl}?v=${Date.now()}` })
          .eq('id', id);
      }
    } catch (thumbErr) {
      console.error('Thumbnail regeneration failed (non-blocking):', thumbErr);
    }
  }

  return NextResponse.json({
    success: true,
    pdf_url: cacheBustedUrl,
    file_size_bytes: file.size,
    pages_indexed: pagesIndexed,
    cover_image_url: thumbnailUrl,
  });
}
