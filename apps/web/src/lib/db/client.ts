import { createClient, type Client } from '@libsql/client';

let cachedClient: Client | null = null;

export function getDb(): Client {
  if (cachedClient) return cachedClient;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error('Missing TURSO_DATABASE_URL');
  }

  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!authToken && !url.startsWith('file:')) {
    throw new Error('Missing TURSO_AUTH_TOKEN');
  }

  cachedClient = createClient({ url, authToken });
  return cachedClient;
}

export function isTursoDatabase(): boolean {
  return process.env.DATABASE_PROVIDER === 'turso';
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(): string {
  return crypto.randomUUID();
}

export function isSupabaseHostedUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.includes('.supabase.co/');
}

export function displayableAssetUrl(url: string | null | undefined): string | null {
  if (!url || isSupabaseHostedUrl(url)) return null;
  return url;
}
