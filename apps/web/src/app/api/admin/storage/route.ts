import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getAdminStorageData } from '@/lib/admin-data';
import { deleteFromR2 } from '@/lib/r2-client';
import { clearIssueCoverByStorageKeyInDb } from '@/lib/db';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';

/**
 * GET /api/admin/storage
 * Returns a cross-referenced view of every object in R2 and every issue
 * whose file locations are missing or unsupported.
 */
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(await getAdminStorageData());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load storage data' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/storage
 * Body: { key: string }
 *
 * Removes the object from R2. If the deleted key was an issue's
 * `cover_image_url`, that column is also nulled so the UI doesn't render
 * a broken image. PDF URLs are NOT NULL in the schema and are left
 * pointing at the now-missing file; caller is expected to re-upload.
 */
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const key =
    typeof body === 'object' && body !== null && 'key' in body && typeof (body as { key: unknown }).key === 'string'
      ? (body as { key: string }).key
      : null;
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  try {
    await deleteFromR2(key);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Delete failed: ' + message }, { status: 500 });
  }

  await clearIssueCoverByStorageKeyInDb(key);
  refreshPublicArchiveCaches();

  return NextResponse.json({ success: true });
}
