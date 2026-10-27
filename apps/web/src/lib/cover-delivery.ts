import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getDb } from './db/client';
import { getR2Client, r2Bucket } from './r2-client';
import { assetKeyFromLocator, PDF_HEADERS, validCatalogueId } from './pdf-access';
import { currentAdmin } from './pdf-delivery';
import { releasedIssueSql } from './embargo';

const MAX_COVER_BYTES = 4 * 1024 * 1024;
async function coverLocator(id: string, magazine: boolean, admin = false): Promise<string | null> {
  const { rows } = await getDb().execute({
    sql: magazine ? 'SELECT cover_image_url FROM magazines WHERE id=? LIMIT 1' : `SELECT cover_image_url FROM issues WHERE id=? ${admin ? '' : `AND ${releasedIssueSql('issues')}`} LIMIT 1`, args: [id],
  });
  return typeof rows[0]?.cover_image_url === 'string' ? rows[0].cover_image_url : null;
}

function rasterType(bytes: Uint8Array): string | null {
  const b = Buffer.from(bytes);
  if (b.length >= 24 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString('ascii',12,16)==='IHDR') return 'image/png';
  if (b.length >= 4 && b[0]===255 && b[1]===216 && b[2]===255) return 'image/jpeg';
  if (b.length >= 16 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP') return 'image/webp';
  return null;
}

const defaults = { locator: coverLocator, client: getR2Client, bucket: r2Bucket, admin: currentAdmin };
export function createCoverDelivery(overrides: Partial<typeof defaults> = {}) {
  const deps = { ...defaults, ...overrides };
  return async (request: Request, id: string, magazine = false, admin = false): Promise<Response> => {
    const fail = (status: number) => new Response(null, { status, headers: PDF_HEADERS });
    if (!validCatalogueId(id)) return fail(404);
    try {
      if (admin && !await deps.admin()) return fail(401);
      const locator = await deps.locator(id, magazine, admin);
      const key = locator ? assetKeyFromLocator(locator) : null;
      if (!key || !/\.(png|jpe?g|webp)$/i.test(key)) return fail(404);
      const object = await deps.client().send(new GetObjectCommand({ Bucket: deps.bucket(), Key: key }), {
        abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
      });
      if (!object.Body) return fail(404);
      const stream = object.Body.transformToWebStream();
      if (!object.ContentLength || object.ContentLength > MAX_COVER_BYTES || !['image/png','image/jpeg','image/webp'].includes(object.ContentType ?? '')) {
        await stream.cancel(); return fail(404);
      }
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > MAX_COVER_BYTES) { await reader.cancel(); return fail(404); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const body = Buffer.concat(chunks);
      const type = rasterType(body);
      if (size !== object.ContentLength || !type || type !== object.ContentType || await deps.locator(id, magazine, admin) !== locator) return fail(404);
      if (admin && !await deps.admin()) return fail(401);
      return new Response(request.method === 'HEAD' ? null : body, { headers: {
        ...PDF_HEADERS, 'Content-Type': type, 'Content-Length': String(size), 'Content-Disposition': 'inline',
      } });
    } catch (error) {
      return fail((error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404 ? 404 : 503);
    }
  };
}
export const deliverCover = createCoverDelivery();
