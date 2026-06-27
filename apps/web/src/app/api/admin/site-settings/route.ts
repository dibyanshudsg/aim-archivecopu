import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { upsertSiteSettingsInDb } from '@/lib/db';
import { getAdminSiteSettings } from '@/lib/admin-data';
import { formatZodError, siteSettingsSchema } from '@/lib/validations';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await getAdminSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to read settings');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = siteSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    await upsertSiteSettingsInDb(parsed.data, admin.id);
    return NextResponse.json(parsed.data);
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to save settings');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
