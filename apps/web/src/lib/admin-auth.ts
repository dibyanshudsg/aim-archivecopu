import { cookies } from 'next/headers';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { auditStatement, findAdminAccount, type AdminAccount } from '@/lib/db/admin-accounts';
import { hasPermission, type AdminPermission } from '@/lib/admin-permissions';
import { getDb, nowIso } from '@/lib/db/client';

const ADMIN_COOKIE = 'aim-admin-session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  id: string;
  email: string;
  exp: number;
  version: number;
  sid: string;
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters');
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
    if (!parsed.id || !parsed.email || typeof parsed.exp !== 'number' || typeof parsed.version !== 'number' || typeof parsed.sid !== 'string' || parsed.sid.length < 32) return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return { id: parsed.id, email: parsed.email, exp: parsed.exp, version: parsed.version, sid: parsed.sid };
  } catch {
    return null;
  }
}

export async function verifyAdmin(permission?: AdminPermission): Promise<AdminAccount | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE);
  if (!session?.value) return null;

  try {
    const parsed = parseSessionToken(session.value);
    if (!parsed) return null;

    const admin = await findAdminAccount(parsed.id);
    if (!admin || !admin.isActive || admin.email !== parsed.email || admin.sessionVersion !== parsed.version) return null;
    const sessionRecord = await getDb().execute({ sql: 'SELECT id_hash FROM admin_sessions WHERE id_hash=? AND admin_id=? AND revoked_at IS NULL AND expires_at>? LIMIT 1', args: [createHash('sha256').update(parsed.sid).digest('hex'), admin.id, nowIso()] });
    if (!sessionRecord.rows.length) return null;
    if (admin.mustChangePassword && admin.passwordHash && admin.temporaryPasswordExpiresAt && Date.parse(admin.temporaryPasswordExpiresAt) <= Date.now()) return null;
    if (permission && (admin.mustChangePassword || !hasPermission(admin.roleId, admin.permissions, permission))) return null;
    return admin;
  } catch {
    return null;
  }
}

export async function createSessionToken(admin: { id: string; email: string; sessionVersion: number }, auditSignIn = false) {
  getSessionSecret();
  const sid = randomBytes(32).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const insert = { sql: 'INSERT INTO admin_sessions(id_hash,admin_id,expires_at,created_at) VALUES(?,?,?,?)', args: [createHash('sha256').update(sid).digest('hex'), admin.id, new Date(exp * 1000).toISOString(), nowIso()] };
  if (auditSignIn) await getDb().batch([insert, auditStatement(admin.id, 'auth.signed_in', admin.id)], 'write');
  else await getDb().execute(insert);
  const payload = base64url(
    JSON.stringify({
      id: admin.id,
      email: admin.email,
      version: admin.sessionVersion,
      exp,
      sid,
    } satisfies SessionPayload),
  );
  return `${payload}.${signPayload(payload)}`;
}

export async function revokeCurrentSession(): Promise<string | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const parsed = token ? parseSessionToken(token) : null;
  if (!parsed) return null;
  const tx = await getDb().transaction('write');
  try {
    const result = await tx.execute({ sql: 'UPDATE admin_sessions SET revoked_at=? WHERE id_hash=? AND admin_id=? AND revoked_at IS NULL', args: [nowIso(), createHash('sha256').update(parsed.sid).digest('hex'), parsed.id] });
    if (result.rowsAffected) await tx.execute(auditStatement(parsed.id, 'auth.signed_out', parsed.id));
    await tx.commit();
    return result.rowsAffected ? parsed.id : null;
  } catch (error) { await tx.rollback(); throw error; }
}

export { ADMIN_COOKIE, SESSION_TTL_SECONDS };
