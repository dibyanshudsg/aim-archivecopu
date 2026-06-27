import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { renameTopicInDb } from '@/lib/db';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';

/** POST /api/admin/topics/rename  body: { from, to } → rename across every issue */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { from, to } = await request.json();
  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  }
  const newName = to.trim().slice(0, 100);
  if (!newName) return NextResponse.json({ error: 'to cannot be empty' }, { status: 400 });
  if (from === newName) return NextResponse.json({ success: true, updated: 0 });

  const updated = await renameTopicInDb(from, newName);
  refreshPublicArchiveCaches();
  return NextResponse.json({ success: true, updated });
}
