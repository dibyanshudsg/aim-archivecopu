import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, revokeCurrentSession, verifyAdmin, ADMIN_COOKIE, SESSION_TTL_SECONDS } from '@/lib/admin-auth';
import { auditAdmin, findAdminAccountByEmail, publicAdmin } from '@/lib/db/admin-accounts';
import { getDb } from '@/lib/db/client';
import { verifyAdminPassword } from '@/lib/admin-password';
import { adminLoginRateLimit } from '@/lib/rate-limit';
import { sameOrigin } from '@/lib/admin-request';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const { loginSchema, formatZodError } = await import('@/lib/validations');
  if (Number(request.headers.get('content-length') || 0) > 4096) {
    const limited = await adminLoginRateLimit(request);
    return limited ?? NextResponse.json({ error: 'Invalid request' }, { status: 413 });
  }
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing body');
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) { await reader.cancel(); const limited = await adminLoginRateLimit(request); return limited ?? NextResponse.json({ error: 'Invalid request' }, { status: 413 }); }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const limited = await adminLoginRateLimit(request);
    return limited ?? NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    const limited = await adminLoginRateLimit(request);
    if (limited) return limited;
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const limited = await adminLoginRateLimit(request, email);
  if (limited) return limited;

  let admin = await findAdminAccountByEmail(email);
  const valid = admin?.passwordHash ? await verifyAdminPassword(password, admin.passwordHash)
    : Boolean(process.env.ADMIN_LEGACY_ENROLLMENT === '1' && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD);
  if (!admin || !admin.isActive || !valid) {
    if (admin) await auditAdmin(admin.id, 'auth.failed', admin.id);
    return NextResponse.json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (admin.passwordHash && admin.mustChangePassword && admin.temporaryPasswordExpiresAt && Date.parse(admin.temporaryPasswordExpiresAt) <= Date.now()) {
    await auditAdmin(admin.id, 'auth.temporary_expired', admin.id);
    return NextResponse.json({ error: 'Temporary password expired. Ask an Owner to reset it.', code: 'TEMPORARY_PASSWORD_EXPIRED' }, { status: 401 });
  }

  if (!admin.passwordHash) {
    await getDb().execute({ sql: 'UPDATE admins SET must_change_password=1, session_version=session_version+1 WHERE id=?', args: [admin.id] });
    admin = await findAdminAccountByEmail(email);
    if (!admin) return NextResponse.json({ error: 'Could not open account', code: 'SERVER_CONFIG' }, { status: 500 });
  }

  const token = await createSessionToken(admin, true);

  const response = NextResponse.json({ admin: publicAdmin(admin), mustChangePassword: admin.mustChangePassword });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });

  return response;
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const admin = await verifyAdmin();
  if (admin) await revokeCurrentSession();
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' });
  return response;
}
