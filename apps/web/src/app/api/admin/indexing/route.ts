import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { getIndexingOverview } from '@/lib/db/indexing-repository';
import { adminReadRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const admin = await verifyAdmin('indexing.view');
  if (!admin) return await adminAccessFailure();
  const limited = await adminReadRateLimit(request, admin.id);
  if (limited) return limited;
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
