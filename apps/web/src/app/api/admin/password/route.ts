import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, createSessionToken, ADMIN_COOKIE, SESSION_TTL_SECONDS } from '@/lib/admin-auth';
import { hashAdminPassword, validateAdminPassword, verifyAdminPassword } from '@/lib/admin-password';
import { setAdminPassword, findAdminAccount } from '@/lib/db/admin-accounts';
import { sameOrigin } from '@/lib/admin-request';
import { adminLandingPath } from '@/lib/admin-permissions';
import { adminMutationRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const limited = await adminMutationRateLimit(request, admin.id, 'credential');
  if (limited) return limited;
  let body: { currentPassword?: unknown; newPassword?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  if (typeof body.currentPassword !== 'string' || !validateAdminPassword(body.newPassword))
    return NextResponse.json({ error: 'Enter your current password and a new password of at least 12 characters.' }, { status: 400 });
  const valid = admin.passwordHash
    ? await verifyAdminPassword(body.currentPassword, admin.passwordHash)
    : Boolean(process.env.ADMIN_LEGACY_ENROLLMENT === '1' && process.env.ADMIN_PASSWORD && body.currentPassword === process.env.ADMIN_PASSWORD);
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  if (body.currentPassword === body.newPassword) return NextResponse.json({ error: 'Choose a different password.' }, { status: 400 });
  await setAdminPassword(admin.id, await hashAdminPassword(body.newPassword), admin.id);
  const updated = await findAdminAccount(admin.id);
  if (!updated) return NextResponse.json({ error: 'Account unavailable.' }, { status: 500 });
  const response = NextResponse.json({ success: true, redirectTo: adminLandingPath(updated.permissions) });
  response.cookies.set(ADMIN_COOKIE, await createSessionToken(updated), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_TTL_SECONDS, path: '/',
  });
  return response;
}
