import { uploadToR2 } from './r2-client';

export type SpreadOrientation = 'front-right' | 'front-left';

export interface CroppedCoverResult {
  publicUrl: string;
  /** Whether the input was detected as a spread and cropped (vs used as-is). */
  cropped: boolean;
  width: number;
  height: number;
}

// Width:height ratio above which we treat the image as a back+front spread.
// A typical magazine page is portrait (~0.65–0.75), so anything close to or
// wider than 1.1 is almost certainly a two-page spread. Single front-cover
// images stay below this threshold and pass through uncropped.
const SPREAD_RATIO_THRESHOLD = 1.1;

/**
 * Take an image (typically a combined back+front cover spread), crop the
 * front-cover half, and upload it to R2 as `<storagePath>-cover.jpg`.
 *
 * If the image is already a single portrait cover, it's uploaded unchanged.
 */
export async function cropAndUploadCover(
  imageBuffer: Buffer,
  storagePath: string,
  orientation: SpreadOrientation = 'front-right',
): Promise<CroppedCoverResult> {
  const { createCanvas, loadImage } = await import('canvas');

  const img = await loadImage(imageBuffer);
  const isSpread = img.width / img.height > SPREAD_RATIO_THRESHOLD;

  let outWidth: number;
  let outHeight: number;
  let sx: number;

  if (isSpread) {
    outWidth = Math.floor(img.width / 2);
    outHeight = img.height;
    sx = orientation === 'front-right' ? img.width - outWidth : 0;
  } else {
    outWidth = img.width;
    outHeight = img.height;
    sx = 0;
  }

  const canvas = createCanvas(outWidth, outHeight);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, 0, outWidth, outHeight, 0, 0, outWidth, outHeight);

  const out = canvas.toBuffer('image/jpeg', { quality: 0.9 });

  const coverKey = storagePath.replace(/\.pdf$/i, '-cover.jpg');
  const publicUrl = await uploadToR2(coverKey, out, 'image/jpeg');

  return {
    publicUrl,
    cropped: isSpread,
    width: outWidth,
    height: outHeight,
  };
}
