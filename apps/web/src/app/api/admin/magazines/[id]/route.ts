import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { deleteAdminMagazineInDb, updateAdminMagazineInDb } from '@/lib/db';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { magazineSchema, formatZodError } = await import('@/lib/validations');
  const body = await request.json();
  const parsed = magazineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const data = await updateAdminMagazineInDb(id, parsed.data);
  if (!data) return NextResponse.json({ error: 'Magazine not found' }, { status: 404 });
  refreshPublicArchiveCaches();
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await deleteAdminMagazineInDb(id);
  refreshPublicArchiveCaches();
  return NextResponse.json({ success: true });
}
