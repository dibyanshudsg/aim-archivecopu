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
        // Edge-cache listings briefly; SWR absorbs the next request while a
        // fresh copy is fetched. Admin publishes show up within ~1 minute.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not load issues.', code: 'DB_ERROR' }, { status: 500 });
  }
}
