import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { deleteTopicFromDb, listTopicCountsFromDb } from '@/lib/db';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';

/** GET /api/admin/topics → list of all topics with usage counts */
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(await listTopicCountsFromDb());
}

/** DELETE /api/admin/topics  body: { name } → remove topic from every issue */
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const updated = await deleteTopicFromDb(name);
  refreshPublicArchiveCaches();
  return NextResponse.json({ success: true, updated });
}
