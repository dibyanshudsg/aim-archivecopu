import { NextRequest, NextResponse } from 'next/server';
import { listPublicIssues, parsePublicIssueListInput } from '@/lib/public-issues';

export async function GET(request: NextRequest) {
  try {
    const result = await listPublicIssues(parsePublicIssueListInput(request.nextUrl.searchParams));
    return NextResponse.json(result, {
      headers: {
        // Edge-cache listings briefly; SWR absorbs the next request while a
        // fresh copy is fetched. Admin publishes show up within ~1 minute.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, code: 'DB_ERROR' }, { status: 500 });
  }
}
