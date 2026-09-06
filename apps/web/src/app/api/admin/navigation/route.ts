import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getAdminNavigation } from '@/lib/admin-data';

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(await getAdminNavigation());
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to read navigation') }, { status: 500 });
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
