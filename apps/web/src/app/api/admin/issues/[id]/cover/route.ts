import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { getAdminIssueFileRowFromDb, updateIssueCoverInDb } from '@/lib/db';
import { cropAndUploadCover, type SpreadOrientation } from '@/lib/crop-cover-spread';
import { uploadToR2 } from '@/lib/r2-client';
import { pdfKeyFromLocator } from '@/lib/pdf-access';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { deliverCover } from '@/lib/cover-delivery';
import { beginAdminOperation, settleAdminOperation } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deliverCover(request, (await params).id, false, true);
}
export const HEAD = GET;

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin('catalogue.edit');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'upload');
  if (limited) return limited;

  const { id } = await params;

  const issue = await getAdminIssueFileRowFromDb(id);
  if (!issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const sourceKey = pdfKeyFromLocator(issue.pdf_url);
  const storageKey = sourceKey?.replace(/\.pdf$/i, `-cover-revision-${crypto.randomUUID()}.pdf`);
  if (!storageKey) {
    return NextResponse.json({ error: 'Could not derive storage key' }, { status: 500 });
  }

  const formData = await request.formData();
  const cover = formData.get('cover') as File | null;
  if (!cover || cover.size === 0 || !cover.type.startsWith('image/')) {
    return NextResponse.json({ error: 'A cover image is required' }, { status: 400 });
  }
  if (cover.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Cover image must be under 25MB' }, { status: 400 });
  }

  const orientationRaw = formData.get('cover_orientation');
  const coverSource = formData.get('cover_source');
  const orientation: SpreadOrientation =
    orientationRaw === 'front-left' ? 'front-left' : 'front-right';

  const operation = await beginAdminOperation(admin.id, 'issue.cover_updated', id);

  try {
    const buf = Buffer.from(await cover.arrayBuffer());
    if (coverSource === 'pdf-first-page') {
      const thumbnailKey = storageKey.replace(/\.pdf$/i, '-thumb.jpg');
      const publicUrl = await uploadToR2(thumbnailKey, buf, cover.type || 'image/jpeg');
      await updateIssueCoverInDb(id, publicUrl);
      refreshPublicArchiveCaches(id);
      await settleAdminOperation(operation, 'issue.cover_updated', true);
      return NextResponse.json({ cover_image_url: publicUrl, cropped: false });
    }

    const result = await cropAndUploadCover(buf, storageKey, orientation);
    await updateIssueCoverInDb(id, result.publicUrl);
    refreshPublicArchiveCaches(id);
    await settleAdminOperation(operation, 'issue.cover_updated', true);

    return NextResponse.json({ cover_image_url: result.publicUrl, cropped: result.cropped });
  } catch (err) {
    await settleAdminOperation(operation, 'issue.cover_updated', false);
    return adminApiFailure(err, 'Cover upload failed');
  }
}
