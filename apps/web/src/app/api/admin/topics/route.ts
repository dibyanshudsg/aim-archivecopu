import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { deleteTopicFromDb, listTopicCountsFromDb } from '@/lib/db';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';

/** GET /api/admin/topics → list of all topics with usage counts */
export async function GET() {
  const admin = await verifyAdmin('catalogue.view');
  if (!admin) return await adminAccessFailure();

  return NextResponse.json(await listTopicCountsFromDb());
}

/** DELETE /api/admin/topics  body: { name } → remove topic from every issue */
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.edit');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const body = await boundedJson(request, 4096);
  if (!body.ok) return body.response;
  const { name } = body.value as { name?: unknown };
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const updated = await deleteTopicFromDb(name);
  if (updated) await auditAdmin(admin.id, 'topic.deleted', undefined, name);
  refreshPublicArchiveCaches();
  return NextResponse.json({ success: true, updated });
}
