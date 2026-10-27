import { GetObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { BRAND_SLOTS, readBrandAssetKeys, type BrandSlot } from '@/lib/brand-assets';
import { getR2Client, r2Bucket } from '@/lib/r2-client';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  if (!BRAND_SLOTS.includes(slot as BrandSlot)) return new Response(null, { status: 404 });
  try {
    const key = (await readBrandAssetKeys())[slot as BrandSlot];
    if (!key) return NextResponse.redirect(new URL(slot === 'favicon' ? '/icon.png' : '/logo.png', request.url), { headers: { 'Cache-Control': 'no-store' } });
    const object = await getR2Client().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
    if (!object.Body || object.ContentType !== 'image/png' || !object.ContentLength || object.ContentLength > 2 * 1024 * 1024) return new Response(null, { status: 404 });
    const bytes = await object.Body.transformToByteArray();
    if (bytes.length !== object.ContentLength) return new Response(null, { status: 503 });
    return new Response(Buffer.from(bytes), { headers: { 'Content-Type': 'image/png', 'Content-Length': String(bytes.length), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 503 }); }
}

export const HEAD = GET;
