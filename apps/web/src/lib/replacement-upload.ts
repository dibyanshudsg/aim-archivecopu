import { createHmac, timingSafeEqual } from 'node:crypto';

type Upload = { adminId: string; issueId: string; source: string; key: string; size: number; exp: number };
function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('Missing session secret');
  return createHmac('sha256', secret).update('replacement-upload:' + value).digest();
}
export function replacementTicket(input: Omit<Upload, 'exp'>): string {
  const body = Buffer.from(JSON.stringify({ ...input, exp: Date.now() + 30 * 60_000 })).toString('base64url');
  return body + '.' + sign(body).toString('base64url');
}
export function verifyReplacementTicket(ticket: unknown, adminId: string, issueId: string): Upload | null {
  try {
    if (typeof ticket !== 'string' || ticket.length > 8192) return null;
    const parts = ticket.split('.');
    if (parts.length !== 2) return null;
    const [body, signature] = parts;
    const bytes = Buffer.from(signature, 'base64url'), expected = sign(body);
    if (bytes.length !== expected.length || !timingSafeEqual(bytes, expected)) return null;
    const value = JSON.parse(Buffer.from(body, 'base64url').toString()) as Upload;
    if (value.adminId !== adminId || value.issueId !== issueId || value.exp <= Date.now() || !Number.isFinite(value.exp)
      || !Number.isSafeInteger(value.size) || value.size <= 0 || value.size > 100 * 1024 * 1024
      || typeof value.source !== 'string' || !/^staging\/replacement-[a-f0-9-]+\.pdf$/.test(value.key)) return null;
    return value;
  } catch { return null; }
}
