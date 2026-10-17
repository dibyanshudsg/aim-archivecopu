import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { adminApiFailure, authorizeAdmin, sameOrigin } from '@/lib/admin-request';
import { findAdminAccount, listAdminRoles, resetAdminPassword, updateAdminAccount } from '@/lib/db/admin-accounts';
import { hashAdminPassword } from '@/lib/admin-password';
import { boundedJson } from '@/lib/request-body';

const schema = z.object({ name: z.string().trim().min(2).max(100).optional(), roleId: z.string().min(1).max(100).optional(), isActive: z.boolean().optional() }).strict();
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const { admin, error } = await authorizeAdmin('users.manage', request);
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const { id } = await params;
  const body = await boundedJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid user changes.' }, { status: 400 });
  if (parsed.data.roleId && !(await listAdminRoles()).some(role => role.id === parsed.data.roleId)) return NextResponse.json({ error: 'Choose an existing role.' }, { status: 400 });
  if (id === admin!.id && (parsed.data.isActive === false || parsed.data.roleId && parsed.data.roleId !== admin!.roleId))
    return NextResponse.json({ error: 'Use another Owner account to change your own access.' }, { status: 409 });
  try {
    if (!await updateAdminAccount(id, parsed.data, admin!.id)) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { return adminApiFailure(error, 'Could not update user.', 409, ['The last active Owner cannot be disabled or reassigned.']); }
}

export async function POST(request: NextRequest, { params }: Context) {
  const { admin, error } = await authorizeAdmin('users.manage', request);
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const { id } = await params;
  if (id === admin!.id) return NextResponse.json({ error: 'Change your own password from Change Password.' }, { status: 400 });
  if (!await findAdminAccount(id)) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  const temporaryPassword = randomBytes(24).toString('base64url');
  await resetAdminPassword(id, await hashAdminPassword(temporaryPassword), admin!.id);
  return NextResponse.json({ temporaryPassword }, { headers: { 'Cache-Control': 'no-store' } });
}
