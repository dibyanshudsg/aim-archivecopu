import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const params = { N: 1 << 17, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password, salt, 64, params, (error, key) => error ? reject(error) : resolve(key)));
}

export function validateAdminPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12 && password.length <= 256;
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyAdminPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  if (n !== params.N || r !== params.r || p !== params.p) return false;
  const salt = Buffer.from(parts[4], 'base64url');
  const expected = Buffer.from(parts[5], 'base64url');
  if (salt.length !== 16 || expected.length !== 64) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, expected);
}
