import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { queueIssueIndexing } from '@/lib/db/indexing-repository';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin('indexing.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'indexing');
  if (limited) return limited;
  const { id } = await params;
  try {
    const jobId = await queueIssueIndexing(id);
    if (jobId) await auditAdmin(admin.id, 'indexing.queued', id);
    return NextResponse.json(
      { indexing: jobId ? 'queued' : 'skipped', jobId },
      { status: jobId ? 202 : 200 },
    );
  } catch (error) {
    return adminApiFailure(error, 'Could not queue indexing', error instanceof Error && error.message === 'Issue not found' ? 404 : 500, ['Issue not found']);
  }
}
