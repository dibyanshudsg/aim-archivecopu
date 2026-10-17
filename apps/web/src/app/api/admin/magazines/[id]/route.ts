import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { deleteAdminMagazineInDb, updateAdminMagazineInDb } from '@/lib/db';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin('catalogue.edit');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const { id } = await params;
  const { magazineSchema, formatZodError } = await import('@/lib/validations');
  const body = await request.json();
  const parsed = magazineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const data = await updateAdminMagazineInDb(id, parsed.data);
  if (!data) return NextResponse.json({ error: 'Magazine not found' }, { status: 404 });
  await auditAdmin(admin.id, 'magazine.updated', id);
  refreshPublicArchiveCaches();
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin('catalogue.publish');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const { id } = await params;
  await deleteAdminMagazineInDb(id);
  await auditAdmin(admin.id, 'magazine.deleted', id);
  refreshPublicArchiveCaches();
  return NextResponse.json({ success: true });
}
