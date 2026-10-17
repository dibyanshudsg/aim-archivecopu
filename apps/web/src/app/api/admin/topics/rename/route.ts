import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { renameTopicInDb } from '@/lib/db';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';

/** POST /api/admin/topics/rename  body: { from, to } → rename across every issue */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.edit');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const body = await boundedJson(request, 4096);
  if (!body.ok) return body.response;
  const { from, to } = body.value as { from?: unknown; to?: unknown };
  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  }
  const newName = to.trim().slice(0, 100);
  if (!newName) return NextResponse.json({ error: 'to cannot be empty' }, { status: 400 });
  if (from === newName) return NextResponse.json({ success: true, updated: 0 });

  const updated = await renameTopicInDb(from, newName);
  if (updated) await auditAdmin(admin.id, 'topic.renamed', undefined, `${from} → ${newName}`);
  refreshPublicArchiveCaches();
  return NextResponse.json({ success: true, updated });
}
