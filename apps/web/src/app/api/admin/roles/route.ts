import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, sameOrigin } from '@/lib/admin-request';
import { roleSchema } from '@/lib/admin-role-validation';
import { createAdminRole, listAdminRoles } from '@/lib/db/admin-accounts';
import { boundedJson } from '@/lib/request-body';

export async function GET() {
  const { error } = await authorizeAdmin('roles.manage');
  if (error) return error;
  return NextResponse.json({ roles: await listAdminRoles() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const { admin, error } = await authorizeAdmin('roles.manage', request);
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const body = await boundedJson(request, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = roleSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: 'Enter a role name and valid permissions.' }, { status: 400 });
  try { return NextResponse.json({ id: await createAdminRole(parsed.data, admin!.id) }, { status: 201 }); }
  catch { return NextResponse.json({ error: 'Could not create role. The name may already be in use.' }, { status: 409 }); }
}
