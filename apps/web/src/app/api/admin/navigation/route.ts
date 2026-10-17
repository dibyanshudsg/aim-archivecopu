import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { getAdminNavigation } from '@/lib/admin-data';

export async function GET() {
  const admin = await verifyAdmin('navigation.view');
  if (!admin) return await adminAccessFailure();

  try {
    return NextResponse.json(await getAdminNavigation());
  } catch (error) {
    return adminApiFailure(error, 'Failed to read navigation');
  }
}
