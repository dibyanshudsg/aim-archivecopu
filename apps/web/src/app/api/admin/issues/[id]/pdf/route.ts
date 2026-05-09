import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import { extractPdfText } from '@/lib/pdf-extract';
import { indexIssue } from '@/lib/search-indexer';
import { generateAndUploadThumbnail } from '@/lib/pdf-thumbnail';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function storagePathFromPdfUrl(pdfUrl: string): string | null {
  const marker = '/magazines/';
  const i = pdfUrl.indexOf(marker);
  if (i < 0) return null;
  // Strip any query string (e.g. cache-bust ?v=…) before decoding
  const rawPath = pdfUrl.slice(i + marker.length).split('?')[0];
  return decodeURIComponent(rawPath);
}

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

  const storagePath = storagePathFromPdfUrl(issue.pdf_url);
  if (!storagePath) {
    return NextResponse.json({ error: 'Could not derive storage path' }, { status: 500 });
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

  const { error: uploadErr } = await supabase.storage
    .from('magazines')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true });
  if (uploadErr) {
    return NextResponse.json({ error: 'Upload failed: ' + uploadErr.message }, { status: 500 });
  }

  // Cache-bust the public URL so consumers refresh
  const { data: urlData } = supabase.storage.from('magazines').getPublicUrl(storagePath);
  const cacheBustedUrl = `${urlData.publicUrl}?v=${Date.now()}`;

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
      thumbnailUrl = await generateAndUploadThumbnail(supabase, buffer, storagePath);
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
