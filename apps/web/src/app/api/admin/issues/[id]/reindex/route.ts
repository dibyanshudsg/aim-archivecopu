import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { queueIssueIndexing } from '@/lib/db/indexing-repository';
export const runtime = 'nodejs';
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const jobId = await queueIssueIndexing(id);
    return NextResponse.json(
      { indexing: jobId ? 'queued' : 'skipped', jobId },
      { status: jobId ? 202 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not queue indexing';
    return NextResponse.json(
      { error: message },
      { status: message === 'Issue not found' ? 404 : 500 },
    );
  }
}
