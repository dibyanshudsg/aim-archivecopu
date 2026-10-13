import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { createHash, createHmac } from 'node:crypto';
import { normalizePublicAssetUrl } from './asset-url';

/**
 * Cloudflare R2 client. R2 speaks the S3 API so we use @aws-sdk/client-s3
 * pointed at the R2 endpoint.
 *
 * Uploads and server/worker reads use the authenticated S3 API. Public readers
 * use short-lived grants issued by the application access gate.
 * R2_PUBLIC_BASE_URL remains the stored catalogue locator namespace even when
 * that origin's public access is disabled; it is not an authorization mechanism.
 */

let cached: S3Client | null = null;

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function validateBucketName(bucket: string): string {
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error(
      'Invalid R2_BUCKET: use the raw Cloudflare bucket slug, for example "aim-archive". Do not use a URL, display name, or value with spaces.',
    );
  }
  return bucket;
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
  return validateBucketName(env('R2_BUCKET'));
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

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function signingKey(secret: string, date: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

/**
 * Create a short-lived browser PUT URL for direct uploads to R2. This keeps
 * large PDFs out of Vercel's 4.5MB request-body path.
 */
export function createR2PresignedPutUrl(key: string, expiresInSeconds = 900): string {
  const accountId = env('R2_ACCOUNT_ID');
  const accessKeyId = env('R2_ACCESS_KEY_ID');
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY');
  const bucket = r2Bucket();
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;
  const canonicalUri = `/${[bucket, ...key.split('/')].map(encodeRfc3986).join('/')}`;
  const queryParams: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresInSeconds)],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  const canonicalQuery = queryParams
    .map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`)
    .sort()
    .join('&');
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = hmacHex(signingKey(secretAccessKey, dateStamp, region, service), stringToSign);

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
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
      CacheControl: 'private, no-store, max-age=0',
    }),
  );
  return r2PublicUrl(key);
}

/** Verify an authenticated object using metadata and only the PDF signature. */
export async function verifyR2Pdf(key: string, expectedSize: number): Promise<void> {
  const client = getR2Client();
  const metadata = await client.send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
  if (metadata.ContentLength !== expectedSize || metadata.ContentType !== 'application/pdf') {
    throw new Error('Stored PDF size or content type does not match the upload');
  }
  const result = await client.send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key, Range: 'bytes=0-4' }));
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes || Buffer.from(bytes).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF signature');
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
  url = normalizePublicAssetUrl(url);
  const base = r2PublicBaseUrl();
  if (!url.startsWith(base + '/')) return null;
  const rawKey = url.slice(base.length + 1).split('?')[0];
  return decodeURIComponent(rawKey);
}

/** True if the URL points at our configured R2 public base. */
export function isR2Url(url: string): boolean {
  return normalizePublicAssetUrl(url).startsWith(r2PublicBaseUrl() + '/');
}

/**
 * Recover keys only from configured R2 asset locations. Never infer a managed
 * object key from a path fragment on an unrelated host.
 */
export function storageKeyFromUrl(url: string): string | null {
  return keyFromPublicUrl(url);
}
