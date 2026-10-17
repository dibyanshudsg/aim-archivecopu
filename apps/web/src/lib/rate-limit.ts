import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

type Bucket = { scope: string; identity: string; capacity: number; windowSeconds: number; cost?: number };
let localWriteGate: Promise<void> = Promise.resolve();

function keySecret() {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('RATE_LIMIT_SECRET or ADMIN_SESSION_SECRET must contain at least 32 characters.');
  return secret;
}

function keyHash(scope: string, identity: string) {
  return createHmac('sha256', keySecret()).update(`${scope}\0${identity}`).digest('hex');
}

function capacityScale() {
  const value = Number(process.env.RATE_LIMIT_SCALE || '1');
  if (!Number.isFinite(value) || value < 0.5 || value > 5) throw new Error('RATE_LIMIT_SCALE must be between 0.5 and 5.');
  return value;
}

export function clientAddress(request: Request): string {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1' && process.env.TRUST_PROXY_IP_HEADERS !== '1')
    throw new Error('Configure a trusted proxy before enabling production rate limits outside Vercel.');
  const header = process.env.VERCEL === '1'
    ? request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for')
    : process.env.TRUST_PROXY_IP_HEADERS === '1' || process.env.NODE_ENV !== 'production'
      ? request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      : null;
  const value = header?.split(',')[0]?.trim();
  if (!value || !isIP(value)) {
    if (process.env.RATE_LIMIT_LOCAL_PREVIEW === '1' && ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname)) return '127.0.0.1';
    if (process.env.NODE_ENV === 'production') throw new Error('Trusted client address header is missing or invalid.');
    return 'local-development';
  }
  return value.toLowerCase();
}

/** Atomically consume every bucket or none. State is shared across web instances. */
async function consumeOnce(buckets: Bucket[]): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const now = Date.now();
  const db = getDb();
  const tx = await db.transaction('write');
  try {
    const updates: { key: string; tokens: number; expires: number }[] = [];
    let retryAfter = 0;
    for (const bucket of buckets) {
      const key = keyHash(bucket.scope, bucket.identity);
      const capacity = Math.max(1, Math.floor(bucket.capacity * capacityScale()));
      const refillPerMs = capacity / (bucket.windowSeconds * 1000);
      const result = await tx.execute({ sql: 'SELECT tokens,updated_at_ms FROM rate_limit_buckets WHERE key_hash=?', args: [key] });
      const previous = result.rows[0];
      const available = previous ? Math.min(capacity, Number(previous.tokens) + Math.max(0, now - Number(previous.updated_at_ms)) * refillPerMs) : capacity;
      const cost = bucket.cost ?? 1;
      if (available < cost) retryAfter = Math.max(retryAfter, Math.ceil((cost - available) / refillPerMs / 1000));
      updates.push({ key, tokens: Math.max(0, available - cost), expires: now + bucket.windowSeconds * 2000 });
    }
    if (retryAfter) { await tx.rollback(); return { allowed: false, retryAfter: Math.max(1, Math.min(retryAfter, 3600)) }; }
    for (const entry of updates) await tx.execute({
      sql: 'INSERT INTO rate_limit_buckets(key_hash,tokens,updated_at_ms,expires_at_ms) VALUES(?,?,?,?) ON CONFLICT(key_hash) DO UPDATE SET tokens=excluded.tokens,updated_at_ms=excluded.updated_at_ms,expires_at_ms=excluded.expires_at_ms',
      args: [entry.key, entry.tokens, now, entry.expires],
    });
    if (Math.random() < 0.002) await tx.execute({ sql: 'DELETE FROM rate_limit_buckets WHERE expires_at_ms<?', args: [now] });
    await tx.commit();
    return { allowed: true };
  } catch (error) { await tx.rollback().catch(() => {}); throw error; }
}

export async function consumeRateLimit(buckets: Bucket[]): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  let release!: () => void;
  const previous = localWriteGate;
  localWriteGate = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    for (let attempt = 0; ; attempt++) {
      try { return await consumeOnce(buckets); }
      catch (error) {
        const code = (error as { code?: string }).code;
        if (!['SQLITE_BUSY', 'LIBSQL_BUSY'].includes(code || '') || attempt >= 7) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.min(120, 8 * 2 ** attempt) + Math.floor(Math.random() * 12)));
      }
    }
  } finally { release(); }
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json({ error: 'Too many requests. Try again later.', code: 'RATE_LIMITED' }, {
    status: 429,
    headers: { 'Retry-After': String(Math.max(1, Math.min(3600, retryAfter))), 'Cache-Control': 'no-store' },
  });
}

export async function publicRateLimit(request: Request, area: 'search' | 'catalogue' | 'cover' | 'pdf' | 'download' | 'vitals') {
  const policy = {
    search: { capacity: 30, windowSeconds: 60 },
    catalogue: { capacity: 180, windowSeconds: 60 },
    cover: { capacity: 300, windowSeconds: 60 },
    pdf: { capacity: 120, windowSeconds: 60 },
    download: { capacity: 30, windowSeconds: 60 },
    vitals: { capacity: 60, windowSeconds: 60 },
  }[area];
  const result = await consumeRateLimit([{ scope: `public:${area}`, identity: clientAddress(request), ...policy }]);
  return result.allowed ? null : rateLimitResponse(result.retryAfter);
}

export async function adminMutationRateLimit(request: Request, adminId: string, area: 'general' | 'upload' | 'indexing' | 'review' | 'credential' = 'general') {
  if (process.env.LOCAL_CATALOGUE_PREVIEW_READ_ONLY === '1')
    return NextResponse.json({ error: 'Admin changes are disabled in this local catalogue preview.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  const policies = {
    general: { capacity: 60, windowSeconds: 60 },
    upload: { capacity: 120, windowSeconds: 600 },
    indexing: { capacity: 20, windowSeconds: 3600 },
    review: { capacity: 120, windowSeconds: 600 },
    credential: { capacity: 15, windowSeconds: 3600 },
  };
  const result = await consumeRateLimit([
    { scope: 'admin:all', identity: adminId, capacity: 120, windowSeconds: 60 },
    { scope: `admin:${area}`, identity: adminId, ...policies[area] },
    { scope: 'admin:ip', identity: clientAddress(request), capacity: 240, windowSeconds: 60 },
  ]);
  return result.allowed ? null : rateLimitResponse(result.retryAfter);
}

export async function adminReadRateLimit(request: Request, adminId: string) {
  const result = await consumeRateLimit([
    { scope: 'admin:read', identity: adminId, capacity: 120, windowSeconds: 60 },
    { scope: 'admin:read-ip', identity: clientAddress(request), capacity: 300, windowSeconds: 60 },
  ]);
  return result.allowed ? null : rateLimitResponse(result.retryAfter);
}

export async function adminLoginRateLimit(request: Request, email?: string) {
  const buckets: Bucket[] = [{ scope: 'login:ip', identity: clientAddress(request), capacity: 30, windowSeconds: 900 }];
  if (email) buckets.push({ scope: 'login:account', identity: email.toLowerCase(), capacity: 8, windowSeconds: 900 });
  const result = await consumeRateLimit(buckets);
  return result.allowed ? null : rateLimitResponse(result.retryAfter);
}
