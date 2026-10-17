import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from './admin-auth';
import type { AdminPermission } from './admin-permissions';
import { adminMutationRateLimit } from './rate-limit';

export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === request.nextUrl.origin);
}

export async function adminAccessFailure() {
  const signedIn = await verifyAdmin();
  return NextResponse.json({ error: signedIn ? 'Forbidden' : 'Unauthorized' }, { status: signedIn ? 403 : 401 });
}

export async function authorizeAdmin(permission: AdminPermission, request?: Request) {
  const admin = await verifyAdmin();
  if (!admin) return { admin: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (admin.mustChangePassword || !admin.permissions.includes(permission))
    return { admin: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  if (request && request.method !== 'GET') {
    const limited = await adminMutationRateLimit(request, admin.id, permission === 'users.manage' || permission === 'roles.manage' ? 'credential' : 'general');
    if (limited) return { admin: null, error: limited };
  }
  return { admin, error: null };
}

/** Keep database, storage and provider exception details out of Admin API responses. */
export function adminApiFailure(error: unknown, publicMessage: string, status = 500, allowedMessages: readonly string[] = []) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined;
  console.error('Admin API failure', { name: error instanceof Error ? error.name : 'Unknown', code });
  const message = error instanceof Error && allowedMessages.includes(error.message) ? error.message : publicMessage;
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
