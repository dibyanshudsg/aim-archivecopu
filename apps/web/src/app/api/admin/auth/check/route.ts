import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { publicAdmin } from '@/lib/db/admin-accounts';

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ admin: publicAdmin(admin) });
}
