import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { createNavigationItemInDb } from '@/lib/db';
import { revalidateNavigationSurfaces } from '@/lib/navigation-revalidation';
import { formatZodError, navigationItemSchema } from '@/lib/validations';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('navigation.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const body = await boundedJson(request, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = navigationItemSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    const item = await createNavigationItemInDb(parsed.data, admin.id);
    await auditAdmin(admin.id, 'navigation.created', item.id);
    revalidateNavigationSurfaces();
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return adminApiFailure(error, 'Failed to create navigation item');
  }
}
