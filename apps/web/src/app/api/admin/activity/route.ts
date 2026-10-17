import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { listAdminActivity } from '@/lib/db/admin-accounts';
import { adminReadRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin('audit.view');
  if (!admin) return adminAccessFailure();
  const limited = await adminReadRateLimit(request, admin.id);
  if (limited) return limited;
  const params = request.nextUrl.searchParams;
  const page = Number(params.get('page') || '1');
  return NextResponse.json(await listAdminActivity({
    page: Number.isFinite(page) ? page : 1,
    q: params.get('q')?.trim().slice(0, 100) || undefined,
    action: params.get('action')?.trim().slice(0, 30) || undefined,
    actorId: params.get('actorId')?.trim().slice(0, 100) || undefined,
  }), { headers: { 'Cache-Control': 'no-store' } });
}
