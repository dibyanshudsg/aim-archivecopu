import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSessionToken, ADMIN_COOKIE } from '@/lib/admin-auth';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const { loginSchema, formatZodError } = await import('@/lib/validations');
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const { email, password } = parsed.data;

  if (password !== (process.env.ADMIN_PASSWORD || '[REDACTED_ADMIN_PASSWORD]')) {
    return NextResponse.json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, email, name')
    .eq('email', email)
    .single();

  if (error || !admin) {
    return NextResponse.json({ error: 'Admin not found', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const token = createSessionToken(admin);

  const response = NextResponse.json({ admin });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' });
  return response;
}
