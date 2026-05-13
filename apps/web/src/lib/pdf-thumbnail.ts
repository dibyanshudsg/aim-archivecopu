import { uploadToR2 } from './r2-client';

/**
 * Render the first page of a PDF to a JPEG thumbnail and upload it to R2.
 * Returns the public URL of the uploaded thumbnail.
 *
 * `storagePath` is the source PDF's object key (e.g.
 * `agnishikha-2026/Agnishikha-Jan-2026.pdf`); the thumbnail is uploaded
 * to the sibling key `<...>-thumb.jpg`.
 */
export async function generateAndUploadThumbnail(
  pdfBuffer: Buffer,
  storagePath: string,
): Promise<string> {
  const { createCanvas } = await import('canvas');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;

  try {
    const page = await doc.getPage(1);
    // Scale to produce a ~600px wide thumbnail (good quality for cards)
    const desiredWidth = 600;
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = desiredWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });

    page.cleanup();

    const thumbnailKey = storagePath.replace(/\.pdf$/i, '-thumb.jpg');
    return uploadToR2(thumbnailKey, imageBuffer, 'image/jpeg');
  } finally {
    doc.destroy();
  }
}

/**
 * Generate a thumbnail from a PDF URL (used by backfill / reindex routes).
 * The PDF may currently live on R2 or Supabase Storage — `pdfUrl` is just
 * fetched over HTTPS — but the thumbnail is always written to R2.
 */
export async function generateThumbnailFromUrl(
  pdfUrl: string,
  storagePath: string,
): Promise<string> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return generateAndUploadThumbnail(buffer, storagePath);
}
