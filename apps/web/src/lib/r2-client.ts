import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 client. R2 speaks the S3 API so we use @aws-sdk/client-s3
 * pointed at the R2 endpoint.
 *
 * Uploads go through the authenticated S3 API; reads happen via the public
 * `R2_PUBLIC_BASE_URL` (currently the `pub-*.r2.dev` subdomain — will be
 * swapped for a custom domain later via a single env-var change).
 */

let cached: S3Client | null = null;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getR2Client(): S3Client {
  if (cached) return cached;
  const accountId = env('R2_ACCOUNT_ID');
  cached = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  });
  return cached;
}

export function r2Bucket(): string {
  return env('R2_BUCKET');
}

export function r2PublicBaseUrl(): string {
  return env('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
}

/**
 * Build the public URL for a given object key. Path segments are
 * URL-encoded but the `/` separators are preserved.
 */
export function r2PublicUrl(key: string): string {
  const encoded = key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${r2PublicBaseUrl()}/${encoded}`;
}

/**
 * Upload a buffer to R2 and return the resulting public URL.
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return r2PublicUrl(key);
}

/**
 * Delete an object from R2. Safe to call on a non-existent key —
 * R2 (like S3) does not error on missing keys.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }),
  );
}

/**
 * Recover the R2 object key from a public R2 URL. Returns null if the URL
 * doesn't match the configured `R2_PUBLIC_BASE_URL`. Strips any query string
 * (e.g. cache-busters like `?v=123`) and URL-decodes the result.
 *
 *   https://pub-xxx.r2.dev/aim-2026/All%20India%20Magazine.pdf?v=1
 *   → "aim-2026/All India Magazine.pdf"
 */
export function keyFromPublicUrl(url: string): string | null {
  const base = r2PublicBaseUrl();
  if (!url.startsWith(base + '/')) return null;
  const rawKey = url.slice(base.length + 1).split('?')[0];
  return decodeURIComponent(rawKey);
}

/** True if the URL points at our configured R2 public base. */
export function isR2Url(url: string): boolean {
  return url.startsWith(r2PublicBaseUrl() + '/');
}

/** True if the URL looks like a legacy Supabase Storage public URL. */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/magazines/');
}

/**
 * Recover the object key from any public storage URL we've ever used — R2
 * (current) or Supabase Storage (legacy). Returns null if neither pattern
 * matches. Strips query strings and URL-decodes.
 *
 * The key is intentionally the same shape across both backends (e.g.
 * `agnishikha-2026/Agnishikha-Jan-2026.pdf`) so that an issue can be
 * migrated by re-uploading at the same key.
 */
export function storageKeyFromUrl(url: string): string | null {
  const r2Key = keyFromPublicUrl(url);
  if (r2Key) return r2Key;
  const marker = '/magazines/';
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const rawKey = url.slice(i + marker.length).split('?')[0];
  return decodeURIComponent(rawKey);
}
