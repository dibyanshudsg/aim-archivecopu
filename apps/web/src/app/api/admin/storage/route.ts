import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { getAdminStorageData } from '@/lib/admin-data';
import { deleteFromR2 } from '@/lib/r2-client';
import { clearIssueCoverByStorageKeyInDb } from '@/lib/db';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { beginAdminOperation, settleAdminOperation } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit, adminReadRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/admin/storage
 * Returns a cross-referenced view of every object in R2 and every issue
 * whose file locations are missing or unsupported.
 */
export async function GET(request: Request) {
  const admin = await verifyAdmin('storage.view');
  if (!admin) return await adminAccessFailure();
  const limited = await adminReadRateLimit(request, admin.id);
  if (limited) return limited;

  try {
    return NextResponse.json(await getAdminStorageData());
  } catch (error) {
    console.error('Storage inventory failed:', error);
    return NextResponse.json(
      { error: 'Storage inventory is unavailable. Check the R2 connection and try again.' },
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
  const admin = await verifyAdmin('storage.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

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

  const operation = await beginAdminOperation(admin.id, 'storage.deleted', key);

  try {
    await deleteFromR2(key);
  } catch (err) {
    await settleAdminOperation(operation, 'storage.deleted', false);
    console.error('Storage deletion failed:', err);
    return NextResponse.json({ error: 'Could not delete the storage object. Check the R2 connection and try again.' }, { status: 500 });
  }

  try { await clearIssueCoverByStorageKeyInDb(key); }
  catch (error) { await settleAdminOperation(operation, 'storage.deleted', false, 'Storage deletion succeeded; catalogue cleanup failed'); throw error; }
  await settleAdminOperation(operation, 'storage.deleted', true);
  refreshPublicArchiveCaches();

  return NextResponse.json({ success: true });
}
