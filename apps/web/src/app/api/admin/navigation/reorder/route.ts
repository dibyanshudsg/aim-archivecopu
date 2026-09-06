import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { reorderNavigationItemsInDb } from '@/lib/db';
import { revalidateNavigationSurfaces } from '@/lib/navigation-revalidation';
import { formatZodError, navigationReorderSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = navigationReorderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    const navigation = await reorderNavigationItemsInDb(parsed.data.menu_key, parsed.data.item_ids, admin.id);
    revalidateNavigationSurfaces();
    return NextResponse.json(navigation);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to reorder navigation' }, { status: 500 });
  }
}
