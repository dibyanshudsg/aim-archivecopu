import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getIndexingOverview } from '@/lib/db/indexing-repository';

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await getIndexingOverview(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Indexing status could not be loaded. Try refreshing.' },
      { status: 503 },
    );
  }
}
