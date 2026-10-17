import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
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
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { getDb } from '@/lib/db/client';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin('catalogue.edit');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const { id } = await params;
  const { issueUpdateSchema, formatZodError } = await import('@/lib/validations');
  const body = await boundedJson(request, 64 * 1024);
  if (!body.ok) return body.response;
  const parsed = issueUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const current = await getDb().execute({ sql: 'SELECT is_published FROM issues WHERE id=? LIMIT 1', args: [id] });
  if (current.rows[0] && Boolean(current.rows[0].is_published) !== parsed.data.is_published && !admin.permissions.includes('catalogue.publish'))
    return NextResponse.json({ error: 'Publishing permission is required to change issue visibility.' }, { status: 403 });

  const data = await updateAdminIssueInDb(id, parsed.data);
  if (!data) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  await auditAdmin(admin.id, 'issue.updated', id, JSON.stringify({ published: parsed.data.is_published }));
  refreshPublicArchiveCaches(id);
  return NextResponse.json(data);
}

/**
 * Delete an issue and clean up its stored files.
 *
 * Files may live on R2; both `pdf_url` and `cover_image_url` are removed when
 * the URL resolves to the configured R2 bucket.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin('catalogue.publish');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const { id } = await params;
  const issue = await getIssueStorageUrlsFromDb(id);
  await deleteAdminIssueInDb(id);
  await auditAdmin(admin.id, 'issue.deleted', id);
  refreshPublicArchiveCaches(id);

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
