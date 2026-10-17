import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { adminAccessFailure } from '@/lib/admin-request';
import { getMagazineNameFromDb, getAdminIssueFileRowFromDb } from '@/lib/db';
import { replacementTicket } from '@/lib/replacement-upload';
import { PDF_HEADERS } from '@/lib/pdf-access';
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
  return `${magazineSlug}-${year}/${crypto.randomUUID()}-${safeStorageFileName(filename)}`;
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.edit');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'upload');
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const magazineId = typeof body?.magazine_id === 'string' ? body.magazine_id : '';
  const filename = typeof body?.filename === 'string' ? body.filename : '';
  const contentType = typeof body?.content_type === 'string' ? body.content_type : '';
  const size = Number(body?.size);
  const year = Number(body?.year);

  if (typeof body?.issue_id === 'string') {
    if (contentType !== 'application/pdf' || !Number.isSafeInteger(size) || size <= 0 || size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'A PDF under 100MB is required' }, { status: 400 });
    }
    const issue = await getAdminIssueFileRowFromDb(body.issue_id);
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    const key = `staging/replacement-${crypto.randomUUID()}.pdf`;
    await auditAdmin(admin.id, 'issue.pdf_upload_authorized', issue.id);
    return NextResponse.json({
      uploadUrl: createR2PresignedPutUrl(key),
      uploadTicket: replacementTicket({ adminId: admin.id, issueId: issue.id, source: issue.pdf_url, key, size }),
    }, { headers: PDF_HEADERS });
  }

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
  await auditAdmin(admin.id, 'issue.upload_authorized', magazineId);
  return NextResponse.json({
    uploadUrl: createR2PresignedPutUrl(storageKey),
    publicUrl: r2PublicUrl(storageKey),
    storageKey,
  }, { headers: PDF_HEADERS });
}
