import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createCanvas, loadImage } from 'canvas';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { readAdminAvatarKey, saveAdminAvatarKey } from '@/lib/admin-avatar';
import { adminApiFailure } from '@/lib/admin-request';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { deleteFromR2, getR2Client, r2Bucket, uploadToR2 } from '@/lib/r2-client';

export const runtime = 'nodejs';
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function defaultAvatar(name: string): Response {
  const letter = name.trim().slice(0, 1).toLocaleUpperCase().replace(/[^\p{L}\p{N}]/gu, '') || 'A';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="#fff3e8"/><text x="128" y="150" text-anchor="middle" font-family="Arial,sans-serif" font-size="106" font-weight="700" fill="#c2410c">${letter}</text></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return new Response(null, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  try {
    const key = await readAdminAvatarKey(admin.id);
    if (!key) return defaultAvatar(admin.name);
    const object = await getR2Client().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
    if (!object.Body || object.ContentType !== 'image/png' || !object.ContentLength || object.ContentLength > 1024 * 1024) return defaultAvatar(admin.name);
    const bytes = await object.Body.transformToByteArray();
    if (bytes.length !== object.ContentLength) return defaultAvatar(admin.name);
    return new Response(Buffer.from(bytes), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return defaultAvatar(admin.name); }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await adminMutationRateLimit(request, admin.id, 'upload');
  if (limited) return limited;
  if (Number(request.headers.get('content-length') || 0) > MAX_FILE_BYTES + 4096) return NextResponse.json({ error: 'Image must be under 3 MB' }, { status: 413 });
  try {
    const file = (await request.formData()).get('image');
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_BYTES || !IMAGE_TYPES.includes(file.type))
      return NextResponse.json({ error: 'Choose a PNG, JPEG or WebP image under 3 MB' }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const valid = file.type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) return NextResponse.json({ error: 'Image content does not match its file type' }, { status: 400 });
    const source = await loadImage(bytes).catch(() => null);
    if (!source || source.width < 64 || source.height < 64 || source.width * source.height > 25_000_000)
      return NextResponse.json({ error: 'Use an image at least 64 × 64 pixels' }, { status: 400 });
    const canvas = createCanvas(256, 256);
    const side = Math.min(source.width, source.height);
    canvas.getContext('2d').drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, 256, 256);
    const output = canvas.toBuffer('image/png');
    if (output.length > 1024 * 1024) return NextResponse.json({ error: 'Processed image is too large' }, { status: 400 });
    const key = `admin-avatars/${admin.id}/${crypto.randomUUID()}.png`;
    const oldKey = await readAdminAvatarKey(admin.id);
    await uploadToR2(key, output, 'image/png');
    try { await saveAdminAvatarKey(admin.id, key); }
    catch (error) { await deleteFromR2(key).catch(() => {}); throw error; }
    await auditAdmin(admin.id, 'admin.avatar.updated', admin.id);
    if (oldKey) await deleteFromR2(oldKey).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error) { return adminApiFailure(error, 'Could not upload avatar'); }
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;
  try {
    const oldKey = await readAdminAvatarKey(admin.id);
    await saveAdminAvatarKey(admin.id, null);
    await auditAdmin(admin.id, 'admin.avatar.removed', admin.id);
    if (oldKey) await deleteFromR2(oldKey).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error) { return adminApiFailure(error, 'Could not remove avatar'); }
}
