import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { resetNavigationMenuDefaultsInDb } from '@/lib/db';
import { NAVIGATION_MENU_DEFINITIONS } from '@/lib/navigation';
import { revalidateNavigationSurfaces } from '@/lib/navigation-revalidation';
import { formatZodError, navigationMenuResetSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = navigationMenuResetSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    let navigation = null;
    const menuKeys = parsed.data.menu_key ? [parsed.data.menu_key] : NAVIGATION_MENU_DEFINITIONS.map((menu) => menu.key);
    for (const menuKey of menuKeys) {
      navigation = await resetNavigationMenuDefaultsInDb(menuKey, admin.id);
    }
    revalidateNavigationSurfaces();
    return NextResponse.json(navigation);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to reset navigation' }, { status: 500 });
  }
}
