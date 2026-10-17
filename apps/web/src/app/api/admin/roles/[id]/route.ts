import { NextRequest, NextResponse } from 'next/server';
import { adminApiFailure, authorizeAdmin, sameOrigin } from '@/lib/admin-request';
import { deleteAdminRole, updateAdminRole } from '@/lib/db/admin-accounts';
import { roleSchema } from '@/lib/admin-role-validation';
import { boundedJson } from '@/lib/request-body';

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: NextRequest, { params }: Context) {
  const { admin, error } = await authorizeAdmin('roles.manage', request);
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const body = await boundedJson(request, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = roleSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: 'Enter a role name and valid permissions.' }, { status: 400 });
  try {
    const changed = await updateAdminRole((await params).id, parsed.data, admin!.id);
    return changed ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Role not found.' }, { status: 404 });
  } catch (error) { return adminApiFailure(error, 'Could not update role.', 409, ['Owner permissions cannot be edited.']); }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { admin, error } = await authorizeAdmin('roles.manage', request);
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const deleted = await deleteAdminRole((await params).id, admin!.id);
  return deleted ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'This role is built in or still assigned to users.' }, { status: 409 });
}
