import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { resetNavigationMenuDefaultsInDb } from '@/lib/db';
import { NAVIGATION_MENU_DEFINITIONS } from '@/lib/navigation';
import { revalidateNavigationSurfaces } from '@/lib/navigation-revalidation';
import { formatZodError, navigationMenuResetSchema } from '@/lib/validations';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('navigation.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

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
      await auditAdmin(admin.id, 'navigation.reset', menuKey);
    }
    revalidateNavigationSurfaces();
    return NextResponse.json(navigation);
  } catch (error) {
    return adminApiFailure(error, 'Failed to reset navigation');
  }
}
