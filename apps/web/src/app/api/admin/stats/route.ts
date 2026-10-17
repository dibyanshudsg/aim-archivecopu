import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { getAdminStats } from '@/lib/admin-data';
import { adminReadRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const admin = await verifyAdmin('dashboard.view');
  if (!admin) return await adminAccessFailure();
  const limited = await adminReadRateLimit(request, admin.id);
  if (limited) return limited;

  try {
    return NextResponse.json(await getAdminStats());
  } catch (error) {
    return adminApiFailure(error, 'Failed to load stats');
  }
}
