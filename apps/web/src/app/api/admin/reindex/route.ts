import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { listReindexCandidatesFromDb } from '@/lib/db';
import { queueIssueIndexing } from '@/lib/db/indexing-repository';
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  return NextResponse.json({ queued, errors, total: issues.length }, { status: 202 });
}
