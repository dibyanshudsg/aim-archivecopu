import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage } from 'canvas';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { BRAND_SLOTS, readBrandAssets, saveBrandAssetKeys, type BrandSlot } from '@/lib/brand-assets';
import { deleteFromR2, uploadToR2 } from '@/lib/r2-client';
import { auditAdmin } from '@/lib/db/admin-accounts';

export const runtime = 'nodejs';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function matchesRasterSignature(bytes: Buffer, type: string): boolean {
  if (type === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return type === 'image/webp' && bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

export async function GET() {
  const admin = await verifyAdmin('settings.view');
  if (!admin) return await adminAccessFailure();
  try { return NextResponse.json(await readBrandAssets(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return adminApiFailure(error, 'Could not load brand images'); }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('settings.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'upload');
  if (limited) return limited;
  if (Number(request.headers.get('content-length') || 0) > MAX_FILE_BYTES + 4096) return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get('image');
    const slots = BRAND_SLOTS.filter((slot) => form.get(slot) === 'true');
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_BYTES || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || slots.length === 0)
      return NextResponse.json({ error: 'Choose a PNG, JPEG or WebP image under 5 MB and at least one placement' }, { status: 400 });
    const source = Buffer.from(await file.arrayBuffer());
    if (!matchesRasterSignature(source, file.type)) return NextResponse.json({ error: 'Image content does not match its file type' }, { status: 400 });
    const imageSource = await loadImage(source).catch(() => null);
    if (!imageSource) return NextResponse.json({ error: 'Could not read this image. Try a standard PNG or JPEG.' }, { status: 400 });
    if (imageSource.width < 128 || imageSource.height < 128 || imageSource.width * imageSource.height > 25_000_000)
      return NextResponse.json({ error: 'Image must be a valid raster at least 128 × 128 pixels' }, { status: 400 });
    const keys: Partial<Record<BrandSlot, string>> = {};
    try {
      for (const slot of slots) {
        const size = slot === 'favicon' ? 256 : slot === 'social' ? 1200 : 512;
        const canvas = createCanvas(size, size);
        const scale = Math.min(size / imageSource.width, size / imageSource.height);
        const width = Math.round(imageSource.width * scale);
        const height = Math.round(imageSource.height * scale);
        canvas.getContext('2d').drawImage(imageSource, Math.floor((size - width) / 2), Math.floor((size - height) / 2), width, height);
        const image = canvas.toBuffer('image/png');
        if (image.length > 2 * 1024 * 1024) throw new Error('Processed image is too large');
        const key = `brand/${slot}/${crypto.randomUUID()}.png`;
        await uploadToR2(key, image, 'image/png');
        keys[slot] = key;
      }
      await saveBrandAssetKeys(keys, admin.id);
    } catch (error) {
      await Promise.allSettled(Object.values(keys).map((key) => deleteFromR2(key)));
      throw error;
    }
    await auditAdmin(admin.id, 'brand.updated', undefined, slots.join(','));
    return NextResponse.json(await readBrandAssets(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return adminApiFailure(error, 'Could not upload brand image'); }
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin('settings.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;
  const slot = new URL(request.url).searchParams.get('slot');
  if (!BRAND_SLOTS.includes(slot as BrandSlot)) return NextResponse.json({ error: 'Invalid placement' }, { status: 400 });
  try {
    await saveBrandAssetKeys({ [slot as BrandSlot]: null }, admin.id);
    await auditAdmin(admin.id, 'brand.restored', undefined, slot ?? undefined);
    return NextResponse.json(await readBrandAssets());
  } catch (error) { return adminApiFailure(error, 'Could not restore default image'); }
}
