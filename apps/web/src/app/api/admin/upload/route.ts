import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { createAdminIssueInDb, getMagazineNameFromDb } from '@/lib/db';
import { generateAndUploadThumbnail } from '@/lib/pdf-thumbnail';
import { cropAndUploadCover, type SpreadOrientation } from '@/lib/crop-cover-spread';
import { uploadToR2, verifyR2Pdf } from '@/lib/r2-client';
import { pdfKeyFromLocator } from '@/lib/pdf-access';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { readPrivatePdf } from '@/lib/private-pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Upload a new issue.
 *
 * Streams NDJSON progress events so the form can show per-step progress —
 * R2 upload is the dominant cost (~3-5s) and cover processing is another
 * 2-5s. Event shapes (one JSON object per line):
 *   { type: 'status', step: 'uploading-pdf' | 'processing-cover' | 'creating-record', message: string }
 *   { type: 'done',   issue: {...}, indexing: 'queued' | 'skipped' }
 *   { type: 'error',  message: string }
 *
 * The issue and durable indexing job are saved atomically. A separate worker
 * performs extraction after upload; completion here means the issue is saved.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { issueUploadSchema, formatZodError } = await import('@/lib/validations');

  const formData = await request.formData();
  const file = formData.get('pdf') as File | null;
  const directPdfUrl = String(formData.get('pdf_url') ?? '');
  const directStorageKey = String(formData.get('storage_key') ?? '');
  const directFileSize = Number(formData.get('file_size_bytes'));

  const hasDirectPdf = Boolean(directPdfUrl && directStorageKey && Number.isFinite(directFileSize));
  if ((!file || file.type !== 'application/pdf') && !hasDirectPdf) {
    return NextResponse.json({ error: 'A valid PDF file is required', code: 'VALIDATION' }, { status: 400 });
  }
  if (file && file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF must be under 100MB', code: 'VALIDATION' }, { status: 400 });
  }
  if (hasDirectPdf && (directFileSize <= 0 || directFileSize > 100 * 1024 * 1024)) {
    return NextResponse.json({ error: 'PDF must be under 100MB', code: 'VALIDATION' }, { status: 400 });
  }
  if (hasDirectPdf && pdfKeyFromLocator(directPdfUrl) !== directStorageKey) {
    return NextResponse.json({ error: 'Invalid uploaded PDF URL', code: 'VALIDATION' }, { status: 400 });
  }

  const parsed = issueUploadSchema.safeParse({
    magazine_id: formData.get('magazine_id'),
    title: formData.get('title'),
    theme: formData.get('theme'),
    year: formData.get('year'),
    month: formData.get('month'),
    description: formData.get('description'),
    topics: formData.get('topics'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const { magazine_id: magazineId, title, theme, year, month, description, topics: topicsStr } = parsed.data;
  const topics = topicsStr ? topicsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const themeTrimmed = theme.trim();

  const magazineName = await getMagazineNameFromDb(magazineId);
  if (!magazineName) return NextResponse.json({ error: 'Magazine not found' }, { status: 404 });

  const storageKey =
    hasDirectPdf && directStorageKey
      ? directStorageKey
      : `${magazineName.replace(/ /g, '-').toLowerCase()}-${year}/${crypto.randomUUID()}.pdf`;
  const initialBuffer = file ? Buffer.from(await file.arrayBuffer()) : null;

  const coverFile = formData.get('cover') as File | null;
  const coverSource = formData.get('cover_source');
  const orientationRaw = formData.get('cover_orientation');
  const orientation: SpreadOrientation =
    orientationRaw === 'front-left' ? 'front-left' : 'front-right';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        let buffer: Buffer | null = initialBuffer;
        let pdfPublicUrl = directPdfUrl;

        if (file && buffer) {
          // Step 1: Upload PDF to R2 (~3-5s)
          send({ type: 'status', step: 'uploading-pdf', message: 'Uploading PDF to storage…' });
          try {
            pdfPublicUrl = await uploadToR2(storageKey, buffer, 'application/pdf');
          } catch (uploadErr) {
            const message = uploadErr instanceof Error ? uploadErr.message : 'Unknown error';
            send({ type: 'error', message: 'Upload failed: ' + message });
            controller.close();
            return;
          }
        } else {
          send({ type: 'status', step: 'verifying-pdf', message: 'Verifying uploaded PDF…' });
          try {
            await verifyR2Pdf(directStorageKey, directFileSize);
          } catch (downloadErr) {
            const message = downloadErr instanceof Error ? downloadErr.message : 'Unknown error';
            send({ type: 'error', message: 'Uploaded PDF could not be verified: ' + message });
            controller.close();
            return;
          }
        }

        // Step 2: Cover image (crop uploaded image or render page 1) (~2-5s)
        send({ type: 'status', step: 'processing-cover', message: 'Processing cover image…' });
        let coverImageUrl: string | null = null;
        if (coverFile && coverFile.size > 0 && coverFile.type.startsWith('image/')) {
          try {
            const coverBuf = Buffer.from(await coverFile.arrayBuffer());
            if (coverSource === 'pdf-first-page') {
              const thumbnailKey = storageKey.replace(/\.pdf$/i, '-thumb.jpg');
              coverImageUrl = await uploadToR2(thumbnailKey, coverBuf, coverFile.type || 'image/jpeg');
            } else {
              const result = await cropAndUploadCover(coverBuf, storageKey, orientation);
              coverImageUrl = result.publicUrl;
            }
          } catch (coverErr) {
            console.error('Cover crop/upload failed (falling back to PDF page 1):', coverErr);
          }
        }
        if (!coverImageUrl) {
          try {
            // Only transfer the complete PDF when no usable cover was supplied.
            if (!buffer) {
              buffer = await readPrivatePdf(directPdfUrl);
            }
            coverImageUrl = await generateAndUploadThumbnail(buffer, storageKey);
          } catch (thumbErr) {
            console.error('Thumbnail generation failed; saving without a cover:', thumbErr);
          }
        }

        // Step 3: DB insert (~500ms)
        send({ type: 'status', step: 'creating-record', message: 'Saving issue…' });
        const issue = await createAdminIssueInDb({
          magazine_id: magazineId,
          title,
          theme: themeTrimmed || null,
          year,
          month,
          description: description || null,
          topics,
          pdf_url: pdfPublicUrl,
          cover_image_url: coverImageUrl,
          file_size_bytes: file?.size ?? directFileSize,
          is_published: true,
        });
        refreshPublicArchiveCaches(String(issue.id));

        send({ type: 'done', issue, indexing: issue.indexing_job_id ? 'queued' : 'skipped' });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        send({ type: 'error', message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
