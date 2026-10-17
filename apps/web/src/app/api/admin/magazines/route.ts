import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { listAdminMagazines } from '@/lib/admin-data';
import { createAdminMagazineInDb } from '@/lib/db';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';

export async function GET() {
  const admin = await verifyAdmin('catalogue.view');
  if (!admin) return await adminAccessFailure();

  try {
    return NextResponse.json(await listAdminMagazines());
  } catch (error) {
    return adminApiFailure(error, 'Failed to load magazines');
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.edit');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const { magazineSchema, formatZodError } = await import('@/lib/validations');
  const body = await request.json();
  const parsed = magazineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const data = await createAdminMagazineInDb(parsed.data);
  await auditAdmin(admin.id, 'magazine.created', data.id);
  refreshPublicArchiveCaches();
  return NextResponse.json(data, { status: 201 });
}
