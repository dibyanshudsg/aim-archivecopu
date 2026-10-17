import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { listReindexCandidatesFromDb } from '@/lib/db';
import { queueIssueIndexing } from '@/lib/db/indexing-repository';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('indexing.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'indexing');
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const issues = await listReindexCandidatesFromDb(body.force === true);
  let queued = 0;
  const errors: { issueId: string; error: string }[] = [];
  for (const issue of issues) {
    try {
      if (await queueIssueIndexing(issue.id)) queued++;
    } catch {
      errors.push({
        issueId: issue.id,
        error: 'Could not queue this issue. Retry from its PDF controls.',
      });
    }
  }
  if (queued) await auditAdmin(admin.id, 'indexing.queued', undefined, `${queued} issues`);
  return NextResponse.json({ queued, errors, total: issues.length }, { status: 202 });
}
