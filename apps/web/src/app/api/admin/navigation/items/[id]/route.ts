import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { deleteNavigationItemFromDb, updateNavigationItemInDb } from '@/lib/db';
import { revalidateNavigationSurfaces } from '@/lib/navigation-revalidation';
import { formatZodError, navigationItemSchema } from '@/lib/validations';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin('navigation.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const parsed = navigationItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const item = await updateNavigationItemInDb(id, parsed.data, admin.id);
    if (!item) return NextResponse.json({ error: 'Navigation item not found' }, { status: 404 });
    await auditAdmin(admin.id, 'navigation.updated', id);
    revalidateNavigationSurfaces();
    return NextResponse.json(item);
  } catch (error) {
    return adminApiFailure(error, 'Failed to update navigation item');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin('navigation.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  try {
    const { id } = await params;
    const deleted = await deleteNavigationItemFromDb(id);
    if (!deleted) return NextResponse.json({ error: 'Navigation item not found' }, { status: 404 });
    await auditAdmin(admin.id, 'navigation.deleted', id);
    revalidateNavigationSurfaces();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminApiFailure(error, 'Failed to delete navigation item');
  }
}
