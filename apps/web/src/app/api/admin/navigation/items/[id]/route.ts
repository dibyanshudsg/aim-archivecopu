import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { deleteNavigationItemFromDb, updateNavigationItemInDb } from '@/lib/db';
import { revalidateNavigationSurfaces } from '@/lib/navigation-revalidation';
import { formatZodError, navigationItemSchema } from '@/lib/validations';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = navigationItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const item = await updateNavigationItemInDb(id, parsed.data, admin.id);
    if (!item) return NextResponse.json({ error: 'Navigation item not found' }, { status: 404 });
    revalidateNavigationSurfaces();
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update navigation item' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const deleted = await deleteNavigationItemFromDb(id);
    if (!deleted) return NextResponse.json({ error: 'Navigation item not found' }, { status: 404 });
    revalidateNavigationSurfaces();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete navigation item' }, { status: 500 });
  }
}
