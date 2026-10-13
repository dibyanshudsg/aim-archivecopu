import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, r2Bucket } from './r2-client';
import { pdfKeyFromLocator } from './pdf-access';

/** Server/worker only: authenticated reads of configured catalogue locators. */
export async function readPrivatePdf(locator: string): Promise<Buffer> {
  const key = pdfKeyFromLocator(locator);
  if (!key) throw new Error('Unsupported PDF source');
  const limit = 100 * 1024 * 1024;
  try {
    const object = await getR2Client().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }), {
      abortSignal: AbortSignal.timeout(120_000),
    });
    if (!object.Body) throw new Error('Empty PDF');
    const stream = object.Body.transformToWebStream();
    if (!object.ContentLength || object.ContentLength > limit || object.ContentType !== 'application/pdf') {
      await stream.cancel(); throw new Error('Invalid PDF metadata');
    }
    const reader = stream.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) { await reader.cancel(); throw new Error('PDF too large'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const buffer = Buffer.concat(chunks);
    if (size !== object.ContentLength || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF bytes');
    return buffer;
  } catch { throw new Error('Private PDF read failed; check storage access and file integrity'); }
}
