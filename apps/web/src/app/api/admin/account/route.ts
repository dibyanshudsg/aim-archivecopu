import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminApiFailure } from '@/lib/admin-request';
import { updateOwnAdminName } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await adminMutationRateLimit(request, admin.id, 'credential');
  if (limited) return limited;
  const parsed = await boundedJson(request, 1024);
  if (!parsed.ok) return parsed.response;
  const name = typeof parsed.value === 'object' && parsed.value !== null && 'name' in parsed.value
    ? String(parsed.value.name).trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > 80 || /[<>\u0000-\u001f]/.test(name))
    return NextResponse.json({ error: 'Enter a display name of 2 to 80 characters' }, { status: 400 });
  try {
    await updateOwnAdminName(admin.id, name);
    return NextResponse.json({ name });
  } catch (error) { return adminApiFailure(error, 'Could not update your display name'); }
}
