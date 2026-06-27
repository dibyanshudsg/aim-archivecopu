import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import {
  deleteAdminIssueInDb,
  getIssueStorageUrlsFromDb,
  updateAdminIssueInDb,
} from '@/lib/db';
import {
  deleteFromR2,
  isR2Url,
  storageKeyFromUrl,
} from '@/lib/r2-client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { issueUpdateSchema, formatZodError } = await import('@/lib/validations');
  const body = await request.json();
  const parsed = issueUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const data = await updateAdminIssueInDb(id, parsed.data);
  if (!data) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  return NextResponse.json(data);
}

/**
 * Delete an issue and clean up its stored files.
 *
 * Files may live on R2; both `pdf_url` and `cover_image_url` are removed when
 * the URL resolves to the configured R2 bucket.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const issue = await getIssueStorageUrlsFromDb(id);
  await deleteAdminIssueInDb(id);

  const cleanups: Array<string | null | undefined> = [issue?.pdf_url, issue?.cover_image_url];
  for (const url of cleanups) {
    if (!url) continue;
    const key = storageKeyFromUrl(url);
    if (!key || !isR2Url(url)) continue;
    try {
      await deleteFromR2(key);
    } catch (cleanupErr) {
      console.error(`R2 cleanup failed for ${url}:`, cleanupErr);
    }
  }

  return NextResponse.json({ success: true });
}
