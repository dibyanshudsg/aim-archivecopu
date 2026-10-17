import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdmin, sameOrigin } from '@/lib/admin-request';
import { createAdminAccount, listAdminAccounts, listAdminRoles, publicAdmin } from '@/lib/db/admin-accounts';
import { hashAdminPassword } from '@/lib/admin-password';
import { randomBytes } from 'node:crypto';
import { boundedJson } from '@/lib/request-body';

const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254), roleId: z.string().min(1).max(100) }).strict();

export async function GET() {
  const { error } = await authorizeAdmin('users.manage');
  if (error) return error;
  const users = await listAdminAccounts();
  return NextResponse.json({ users: users.map(publicAdmin) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const { admin, error } = await authorizeAdmin('users.manage', request);
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const body = await boundedJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: 'Enter a name, email and role.' }, { status: 400 });
  if (!(await listAdminRoles()).some(role => role.id === parsed.data.roleId)) return NextResponse.json({ error: 'Choose an existing role.' }, { status: 400 });
  const temporaryPassword = randomBytes(24).toString('base64url');
  try {
    const id = await createAdminAccount({ ...parsed.data, hash: await hashAdminPassword(temporaryPassword) }, admin!.id);
    return NextResponse.json({ id, temporaryPassword }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Could not create user. The email may already be in use.' }, { status: 409 }); }
}
