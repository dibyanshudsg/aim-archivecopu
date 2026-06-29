import { NextRequest, NextResponse } from 'next/server';
import { isEmbargoed } from '@/lib/embargo';
import { getPublicIssueById, incrementIssueReadCount } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const issue = await getPublicIssueById(id);
  if (!issue) {
    return NextResponse.json({ error: 'Issue not found', code: 'NOT_FOUND' }, { status: 404 });
  }
  if (!isEmbargoed(issue.year, issue.month)) {
    try {
      await incrementIssueReadCount(id);
    } catch (incrementError) {
      console.error('Failed to increment read count:', incrementError);
    }
  }
  return NextResponse.json(issue, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
