import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyAdmin } from './admin-auth';
import { getDb } from './db/client';
import { getR2Client, r2Bucket } from './r2-client';
import { authorizePdf, parsePdfRange, PDF_CACHE_CONTROL, PDF_GRANT_SECONDS, PDF_HEADERS, validCatalogueId, type PdfAccessIssue } from './pdf-access';
import { getLiveHeroIssueIds } from './hero-issues';

// Intentionally bypass catalogue and admin identity caches for delivery decisions.
async function currentIssue(id: string): Promise<PdfAccessIssue | null> {
  const { rows } = await getDb().execute({
    sql: 'SELECT id,title,year,month,is_published,pdf_url FROM issues WHERE id=? LIMIT 1', args: [id],
  });
  const row = rows[0];
  if (!row || typeof row.pdf_url !== 'string') return null;
  return { id: String(row.id), title: String(row.title), year: Number(row.year), month: Number(row.month), is_published: Number(row.is_published), pdf_url: row.pdf_url };
}

export async function currentAdmin(): Promise<boolean> {
  const admin = await verifyAdmin('catalogue.view');
  if (!admin) return false;
  const { rows } = await getDb().execute({ sql: 'SELECT id FROM admins WHERE id=? AND email=? LIMIT 1', args: [admin.id, admin.email] });
  return rows.length === 1;
}

function failure(status: number, head = false): Response {
  return new Response(head ? null : JSON.stringify({ error: status === 401 ? 'Unauthorized' : status === 404 ? 'Not found' : 'PDF unavailable' }),
    { status, headers: { ...PDF_HEADERS, 'Content-Type': 'application/json' } });
}

export interface PdfDeliveryDependencies {
  issue: typeof currentIssue;
  admin: typeof currentAdmin;
  client: typeof getR2Client;
  bucket: typeof r2Bucket;
  sign: typeof getSignedUrl;
  now: () => Date;
  featured: (id: string, now: Date) => Promise<boolean>;
}
const defaults: PdfDeliveryDependencies = {
  issue: currentIssue, admin: currentAdmin, client: getR2Client, bucket: r2Bucket, sign: getSignedUrl, now: () => new Date(),
  featured: async (id, now) => (await getLiveHeroIssueIds(now)).has(id),
};

/** Dependency seam permits isolated tests with the actual handler and signer. */
export function createPdfDelivery(overrides: Partial<PdfDeliveryDependencies> = {}) {
  const deps = { ...defaults, ...overrides };
  return async (request: Request, id: string, mode: 'grant' | 'public' | 'admin' | 'download'): Promise<Response> => {
    const head = request.method === 'HEAD';
    if (request.method !== 'GET' && !head) return failure(405);
    // Operational fallback: stop new PDF delivery while repairing a private-storage release.
    // Keep old origins denied; already issued grants expire independently.
    if (process.env.PDF_DELIVERY_DISABLED === '1') return failure(503, head);
    if (!validCatalogueId(id)) return failure(404, head);
    try {
      if (mode === 'admin' && !await deps.admin()) return failure(401, head);
      const firstIssue = await deps.issue(id);
      const firstNow = deps.now();
      const featured = mode !== 'admin' && firstIssue?.is_published === 1 && await deps.featured(id, firstNow);
      const key = authorizePdf(firstIssue, mode === 'admin', firstNow, featured);
      if (!key) return failure(404, head);
      const client = deps.client();
      const Bucket = deps.bucket();
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(120_000)]);
      const metadata = await client.send(new HeadObjectCommand({ Bucket, Key: key }), { abortSignal: signal });
      const size = metadata.ContentLength;
      if (metadata.ContentType?.split(';')[0].trim().toLowerCase() !== 'application/pdf' ||
          size === undefined || !Number.isSafeInteger(size) || size <= 0) return failure(404, head);

      // Check again after remote I/O, including publication changes and replacement.
      const current = await deps.issue(id);
      const secondNow = deps.now();
      const stillFeatured = mode !== 'admin' && current?.is_published === 1 && await deps.featured(id, secondNow);
      if (authorizePdf(current, mode === 'admin', secondNow, stillFeatured) !== key) return failure(404, head);
      if (mode === 'admin' && !await deps.admin()) return failure(401, head);
      const filename = (current?.title || id).replace(/[\x00-\x1f\x7f/\\]/g, '-').slice(0, 160) + '.pdf';
      const encodedFilename = encodeURIComponent(filename).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
      const disposition = `${mode === 'download' ? 'attachment' : 'inline'}; filename="${id}.pdf"; filename*=UTF-8''${encodedFilename}`;
      // Local catalogue copies cannot configure the Society bucket's browser
      // CORS policy. Stream the already-authorized public PDF through the
      // loopback preview only; hosted delivery keeps short-lived R2 redirects.
      const localPublicPreview = mode === 'public' &&
        process.env.LOCAL_CATALOGUE_PREVIEW_READ_ONLY === '1' &&
        process.env.TURSO_DATABASE_URL?.startsWith('file:');
      if (mode !== 'admin' && !localPublicPreview) {
        const now = deps.now();
        const command = head
          ? new HeadObjectCommand({ Bucket, Key: key })
          : new GetObjectCommand({ Bucket, Key: key, ResponseCacheControl: PDF_CACHE_CONTROL, ResponseContentType: 'application/pdf', ResponseContentDisposition: disposition });
        const url = await deps.sign(client, command, { expiresIn: PDF_GRANT_SECONDS, signingDate: now });
        if (mode === 'public' || mode === 'download') return new Response(null, { status: 307, headers: { ...PDF_HEADERS, Location: url } });
        return new Response(head ? null : JSON.stringify({ url, expires_at: new Date(now.getTime() + PDF_GRANT_SECONDS * 1000).toISOString() }),
          { headers: { ...PDF_HEADERS, 'Content-Type': 'application/json' } });
      }

      const headers: Record<string, string> = {
        ...PDF_HEADERS, 'Content-Type': 'application/pdf', 'Content-Disposition': disposition,
        'Accept-Ranges': 'bytes', 'Content-Length': String(size),
      };
      if (metadata.ETag) headers.ETag = metadata.ETag;
      if (head) return new Response(null, { headers });
      const rangeValue = request.headers.get('range');
      const ifRange = request.headers.get('if-range');
      const useRange = rangeValue && (!ifRange || (metadata.ETag && !metadata.ETag.startsWith('W/') && ifRange === metadata.ETag));
      const range = useRange ? parsePdfRange(rangeValue, size) : undefined;
      if (range === null) return new Response(null, { status: 416, headers: { ...PDF_HEADERS, 'Content-Range': `bytes */${size}` } });
      if (range) {
        headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
        headers['Content-Length'] = String(range.end - range.start + 1);
      }
      const object = await client.send(new GetObjectCommand({
        Bucket, Key: key, IfMatch: metadata.ETag,
        ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
      }), { abortSignal: signal });
      if (!object.Body) return failure(503);
      if (object.ContentLength !== Number(headers['Content-Length']) ||
          object.ContentType?.split(';')[0].trim().toLowerCase() !== 'application/pdf' ||
          (metadata.ETag && object.ETag !== metadata.ETag) ||
          (range && object.ContentRange !== headers['Content-Range'])) {
        await object.Body.transformToWebStream().cancel();
        return failure(503);
      }
      // AWS SDK WebStream bridge propagates cancellation to the underlying stream.
      return new Response(object.Body.transformToWebStream(), { status: range ? 206 : 200, headers });
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      return failure(status === 404 ? 404 : 503, head);
    }
  };
}

export const deliverPdf = createPdfDelivery();
