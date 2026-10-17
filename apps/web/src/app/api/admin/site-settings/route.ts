import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { upsertSiteSettingsInDb } from '@/lib/db';
import { getAdminSiteSettings } from '@/lib/admin-data';
import { formatZodError, siteSettingsSchema } from '@/lib/validations';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export async function GET() {
  const admin = await verifyAdmin('settings.view');
  if (!admin) return await adminAccessFailure();

  try {
    const settings = await getAdminSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to read settings');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin('settings.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;

  const body = await request.json();
  const parsed = siteSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    await upsertSiteSettingsInDb(parsed.data, admin.id);
    await auditAdmin(admin.id, 'settings.updated');
    return NextResponse.json(parsed.data);
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to save settings');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
