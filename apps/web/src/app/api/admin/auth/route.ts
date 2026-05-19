import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSessionToken, ADMIN_COOKIE, SESSION_TTL_SECONDS } from '@/lib/admin-auth';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

function rateLimitKey(request: NextRequest, email: string): string {
  return `${clientIp(request)}:${email.toLowerCase()}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_LOGIN_ATTEMPTS;
}

function clearAttempts(key: string) {
  attempts.delete(key);
}

export async function POST(request: NextRequest) {
  const { loginSchema, formatZodError } = await import('@/lib/validations');
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const passwordFromEnv = process.env.ADMIN_PASSWORD;

  if (!passwordFromEnv) {
    console.error('ADMIN_PASSWORD is not configured');
    return NextResponse.json({ error: 'Admin login is not configured', code: 'SERVER_CONFIG' }, { status: 500 });
  }

  const key = rateLimitKey(request, email);
  if (isRateLimited(key)) {
    return NextResponse.json({ error: 'Too many login attempts', code: 'RATE_LIMITED' }, { status: 429 });
  }

  if (password !== passwordFromEnv) {
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

  clearAttempts(key);
  const token = createSessionToken(admin);

  const response = NextResponse.json({ admin });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' });
  return response;
}
