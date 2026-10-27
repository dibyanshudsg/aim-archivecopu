import { NextRequest, NextResponse } from 'next/server';
import { listPublicIssues, parsePublicIssueListInput } from '@/lib/public-issues';
import { publicRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await publicRateLimit(request, 'catalogue');
  if (limited) return limited;
  try {
    const result = await listPublicIssues(parsePublicIssueListInput(request.nextUrl.searchParams));
    return NextResponse.json(result, {
      headers: {
        // Month-boundary publication and admin hero changes are immediate.
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not load issues.', code: 'DB_ERROR' }, { status: 500 });
  }
}
