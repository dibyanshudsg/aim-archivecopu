import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { getAdminNavigation } from '@/lib/admin-data';

export async function GET() {
  const admin = await verifyAdmin('navigation.view');
  if (!admin) return await adminAccessFailure();

  try {
    return NextResponse.json(await getAdminNavigation());
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to read navigation') }, { status: 500 });
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
