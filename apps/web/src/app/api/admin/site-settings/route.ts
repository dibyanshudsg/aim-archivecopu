import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { boundedJson } from '@/lib/request-body';
import { upsertSiteSettingsInDb } from '@/lib/db';
import { getAdminSiteSettings } from '@/lib/admin-data';
import { formatZodError, siteSettingsSchema } from '@/lib/validations';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';

export async function GET() {
  const admin = await verifyAdmin('settings.view');
  if (!admin) return await adminAccessFailure();

  try {
    const settings = await getAdminSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return adminApiFailure(error, 'Failed to read settings');
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin('settings.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const body = await boundedJson(request, 16 * 1024);
  if (!body.ok) return body.response;
  const parsed = siteSettingsSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    await upsertSiteSettingsInDb(parsed.data, admin.id);
    await auditAdmin(admin.id, 'settings.updated');
    return NextResponse.json(parsed.data);
  } catch (error) {
    return adminApiFailure(error, 'Failed to save settings');
  }
}
