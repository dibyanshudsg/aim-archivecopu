import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getAdminByIdAndEmail } from '@/lib/db';

const ADMIN_COOKIE = 'aim-admin-session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  id: string;
  email: string;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('Missing ADMIN_PASSWORD or ADMIN_SESSION_SECRET');
  return secret;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function verifySignature(payload: string, signature: string): boolean {
  const expected = signPayload(payload);
  const actualBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function parseSessionToken(token: string): SessionPayload | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !verifySignature(payload, signature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    if (!parsed.id || !parsed.email || typeof parsed.exp !== 'number') return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return { id: parsed.id, email: parsed.email, exp: parsed.exp };
  } catch {
    return null;
  }
}

export async function verifyAdmin(): Promise<{ id: string; email: string; name: string } | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE);
  if (!session?.value) return null;

  try {
    const parsed = parseSessionToken(session.value);
    if (!parsed) return null;

    return getAdminByIdAndEmail(parsed.id, parsed.email);
  } catch {
    return null;
  }
}

export function createSessionToken(admin: { id: string; email: string }) {
  const payload = base64url(
    JSON.stringify({
      id: admin.id,
      email: admin.email,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    } satisfies SessionPayload),
  );
  return `${payload}.${signPayload(payload)}`;
}

export { ADMIN_COOKIE, SESSION_TTL_SECONDS };
