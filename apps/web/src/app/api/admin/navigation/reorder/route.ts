import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { reorderNavigationItemsInDb } from '@/lib/db';
import { revalidateNavigationSurfaces } from '@/lib/navigation-revalidation';
import { formatZodError, navigationReorderSchema } from '@/lib/validations';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('navigation.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const body = await boundedJson(request, 16 * 1024);
  if (!body.ok) return body.response;
  const parsed = navigationReorderSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    const navigation = await reorderNavigationItemsInDb(parsed.data.menu_key, parsed.data.item_ids, admin.id);
    await auditAdmin(admin.id, 'navigation.reordered', parsed.data.menu_key);
    revalidateNavigationSurfaces();
    return NextResponse.json(navigation);
  } catch (error) {
    return adminApiFailure(error, 'Failed to reorder navigation');
  }
}
