import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { listNavigationDestinations } from '@/lib/admin-data';

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(await listNavigationDestinations());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to read destinations' }, { status: 500 });
  }
}
