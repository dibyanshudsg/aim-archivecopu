import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import {
  getAdminIssueFileRowFromDb,
  updateIssuePdfInDb,
} from '@/lib/db';
import { canIndexIssue } from '@/lib/search-indexer';
import { generateAndUploadThumbnail } from '@/lib/pdf-thumbnail';
import { getR2Client, r2Bucket, r2PublicUrl, verifyR2Pdf, deleteFromR2 } from '@/lib/r2-client';
import { CopyObjectCommand } from '@aws-sdk/client-s3';
import { pdfKeyFromLocator, PDF_HEADERS } from '@/lib/pdf-access';
import { verifyReplacementTicket } from '@/lib/replacement-upload';
import { readPrivatePdf } from '@/lib/private-pdf';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { deliverPdf } from '@/lib/pdf-delivery';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deliverPdf(request, (await params).id, 'admin');
}
export const HEAD = GET;

/**
 * Replace the PDF for an existing issue. The new PDF is always written to
 * R2, replacing the previous PDF reference.
 * Each replacement uses a unique key so in-flight readers and indexing jobs
 * continue to see the original immutable source.
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

  const body = await request.json().catch(() => null);
  const upload = verifyReplacementTicket(body?.uploadTicket, admin.id, id);
  if (!upload) return NextResponse.json({ error: 'Upload authorization is invalid or expired. Upload again.' }, { status: 400 });
  if (upload.source !== issue.pdf_url) return NextResponse.json({ error: 'The PDF changed during upload. Refresh and try again.' }, { status: 409 });
  const originalKey = pdfKeyFromLocator(issue.pdf_url);
  if (!originalKey) {
    return NextResponse.json({ error: 'Could not derive storage key' }, { status: 500 });
  }
  const storageKey = originalKey.replace(/(?:-revision-[a-f0-9-]+)?\.pdf$/i, '') + `-revision-${crypto.randomUUID()}.pdf`;

  try {
    // Promote to a server-only key. Reusing the staging PUT cannot mutate an active source.
    await getR2Client().send(new CopyObjectCommand({
      Bucket: r2Bucket(), Key: storageKey,
      CopySource: `${r2Bucket()}/${upload.key.split('/').map(encodeURIComponent).join('/')}`,
      MetadataDirective: 'REPLACE', ContentType: 'application/pdf', CacheControl: 'private, no-store, max-age=0',
    }), { abortSignal: AbortSignal.timeout(30_000) });
    await verifyR2Pdf(storageKey, upload.size);
  } catch {
    return NextResponse.json({ error: 'Uploaded PDF could not be verified. Check storage access and retry.' }, { status: 502 });
  }
  const cacheBustedUrl = r2PublicUrl(storageKey);

  // Regenerate auto-thumbnail only if the current cover was auto-generated
  // (custom uploaded covers live at <path>-cover.jpg; page-1 thumbnails at <path>-thumb.jpg).
  let thumbnailUrl: string | null = issue.cover_image_url;
  const isAutoThumb = !issue.cover_image_url || issue.cover_image_url.includes('-thumb.jpg');
  if (isAutoThumb) {
    try {
      thumbnailUrl = await generateAndUploadThumbnail(await readPrivatePdf(cacheBustedUrl), storageKey);
    } catch {
      console.error('Thumbnail regeneration failed; existing cover retained.');
    }
  }
  try {
    await updateIssuePdfInDb(id, cacheBustedUrl, upload.size, upload.source,
      thumbnailUrl && thumbnailUrl !== issue.cover_image_url ? { previous: issue.cover_image_url, next: thumbnailUrl } : undefined);
  } catch (error) {
    if (error instanceof Error && error.message === 'PDF_SOURCE_CHANGED') return NextResponse.json({ error: 'The PDF changed during upload. Refresh and try again.' }, { status: 409 });
    return NextResponse.json({ error: 'Could not save replacement. Refresh before retrying.' }, { status: 503 });
  }
  const indexing = await canIndexIssue(id) ? 'queued' : 'skipped';
  await deleteFromR2(upload.key).catch(() => console.error('Replacement saved; staging file cleanup remains pending.'));
  refreshPublicArchiveCaches(id);

  return NextResponse.json({
    success: true,
    pdf_url: cacheBustedUrl,
    file_size_bytes: upload.size,
    indexing,
    cover_image_url: thumbnailUrl,
  }, { headers: PDF_HEADERS });
}
