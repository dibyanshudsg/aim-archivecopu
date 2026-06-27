import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import {
  getAdminIssueFileRowFromDb,
  updateIssueCoverInDb,
  updateIssuePdfInDb,
} from '@/lib/db';
import { extractPdfText } from '@/lib/pdf-extract';
import { indexIssue } from '@/lib/search-indexer';
import { generateAndUploadThumbnail } from '@/lib/pdf-thumbnail';
import { storageKeyFromUrl, uploadToR2 } from '@/lib/r2-client';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';

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

  const issue = await getAdminIssueFileRowFromDb(id);
  if (!issue) {
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

  // Cache-bust so reader/clients pick up the new file
  const cacheBustedUrl = `${newPublicUrl}?v=${Date.now()}`;

  await updateIssuePdfInDb(id, cacheBustedUrl, file.size);

  // Reindex OCR
  let pagesIndexed = 0;
  try {
    const pages = await extractPdfText(buffer);
    pagesIndexed = await indexIssue(id, pages);
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
        const cacheBustedThumb = `${thumbnailUrl}?v=${Date.now()}`;
        await updateIssueCoverInDb(id, cacheBustedThumb);
      }
    } catch (thumbErr) {
      console.error('Thumbnail regeneration failed (non-blocking):', thumbErr);
    }
  }
  refreshPublicArchiveCaches(id);

  return NextResponse.json({
    success: true,
    pdf_url: cacheBustedUrl,
    file_size_bytes: file.size,
    pages_indexed: pagesIndexed,
    cover_image_url: thumbnailUrl,
  });
}
