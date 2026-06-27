import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { listAdminMagazines } from '@/lib/admin-data';
import { createAdminMagazineInDb } from '@/lib/db';

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(await listAdminMagazines());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load magazines' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { magazineSchema, formatZodError } = await import('@/lib/validations');
  const body = await request.json();
  const parsed = magazineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const data = await createAdminMagazineInDb(parsed.data);
  return NextResponse.json(data, { status: 201 });
}
