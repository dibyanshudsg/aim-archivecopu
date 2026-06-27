import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getAdminIssueFileRowFromDb, updateIssueCoverInDb } from '@/lib/db';
import { cropAndUploadCover, type SpreadOrientation } from '@/lib/crop-cover-spread';
import { storageKeyFromUrl } from '@/lib/r2-client';

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
  const cover = formData.get('cover') as File | null;
  if (!cover || cover.size === 0 || !cover.type.startsWith('image/')) {
    return NextResponse.json({ error: 'A cover image is required' }, { status: 400 });
  }
  if (cover.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Cover image must be under 25MB' }, { status: 400 });
  }

  const orientationRaw = formData.get('cover_orientation');
  const orientation: SpreadOrientation =
    orientationRaw === 'front-left' ? 'front-left' : 'front-right';

  try {
    const buf = Buffer.from(await cover.arrayBuffer());
    const result = await cropAndUploadCover(buf, storageKey, orientation);

    await updateIssueCoverInDb(id, result.publicUrl);

    return NextResponse.json({ cover_image_url: result.publicUrl, cropped: result.cropped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cover upload failed' },
      { status: 500 },
    );
  }
}
