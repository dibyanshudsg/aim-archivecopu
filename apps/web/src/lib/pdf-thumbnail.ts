import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Render the first page of a PDF to a PNG thumbnail and upload it to Supabase Storage.
 * Returns the public URL of the uploaded thumbnail.
 */
export async function generateAndUploadThumbnail(
  supabase: SupabaseClient,
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

    // Encode as JPEG for smaller file size
    const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });

    page.cleanup();

    // Upload to Supabase Storage alongside the PDF
    const thumbnailPath = storagePath.replace(/\.pdf$/i, '-thumb.jpg');

    const { error: uploadErr } = await supabase.storage
      .from('magazines')
      .upload(thumbnailPath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Thumbnail upload failed: ${uploadErr.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('magazines')
      .getPublicUrl(thumbnailPath);

    return urlData.publicUrl;
  } finally {
    doc.destroy();
  }
}

/**
 * Generate a thumbnail from a PDF URL (for backfilling existing issues).
 */
export async function generateThumbnailFromUrl(
  supabase: SupabaseClient,
  pdfUrl: string,
  storagePath: string,
): Promise<string> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return generateAndUploadThumbnail(supabase, buffer, storagePath);
}
