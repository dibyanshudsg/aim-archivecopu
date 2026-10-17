import { after, NextRequest, NextResponse } from 'next/server';
import { isEmbargoed } from '@/lib/embargo';
import { getPublicIssueById, incrementIssueReadCount } from '@/lib/db';
import { publicRateLimit } from '@/lib/rate-limit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await publicRateLimit(_request, 'catalogue');
  if (limited) return limited;
  const { id } = await params;
  const issue = await getPublicIssueById(id);
  if (!issue) {
    return NextResponse.json({ error: 'Issue not found', code: 'NOT_FOUND' }, { status: 404 });
  }
  if (!isEmbargoed(issue.year, issue.month)) {
    after(async () => {
      try {
        await incrementIssueReadCount(id);
      } catch (incrementError) {
        console.error('Failed to increment read count:', incrementError);
      }
    });
  }
  return NextResponse.json(issue, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
