import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getMagazineNameFromDb } from '@/lib/db';
import { createR2PresignedPutUrl, r2PublicUrl } from '@/lib/r2-client';

export const runtime = 'nodejs';

const MAX_PDF_BYTES = 100 * 1024 * 1024;

function safeStorageFileName(filename: string): string {
  const basename = filename.split(/[\\/]/).pop()?.trim() || 'issue.pdf';
  const normalized = basename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '-');
  return normalized.toLowerCase().endsWith('.pdf') ? normalized : `${normalized}.pdf`;
}

function buildStorageKey(magazineName: string, year: number, filename: string): string {
  const magazineSlug = magazineName.replace(/ /g, '-').toLowerCase();
  return `${magazineSlug}-${year}/${safeStorageFileName(filename)}`;
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const magazineId = typeof body?.magazine_id === 'string' ? body.magazine_id : '';
  const filename = typeof body?.filename === 'string' ? body.filename : '';
  const contentType = typeof body?.content_type === 'string' ? body.content_type : '';
  const size = Number(body?.size);
  const year = Number(body?.year);

  if (!magazineId || !filename || !Number.isInteger(year)) {
    return NextResponse.json({ error: 'Missing upload metadata' }, { status: 400 });
  }
  if (contentType !== 'application/pdf') {
    return NextResponse.json({ error: 'A valid PDF file is required' }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: 'PDF must be under 100MB' }, { status: 400 });
  }

  const magazineName = await getMagazineNameFromDb(magazineId);
  if (!magazineName) return NextResponse.json({ error: 'Magazine not found' }, { status: 404 });

  const storageKey = buildStorageKey(magazineName, year, filename);
  return NextResponse.json({
    uploadUrl: createR2PresignedPutUrl(storageKey),
    publicUrl: r2PublicUrl(storageKey),
    storageKey,
  });
}
