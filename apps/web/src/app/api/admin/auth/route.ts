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
  const { email, password } = await request.json();

  // Simple admin auth: check if email exists in admins table
  // Password is checked against env var (shared admin password for MVP)
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
