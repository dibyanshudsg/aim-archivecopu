import { NextRequest, NextResponse } from 'next/server';
import { listPublicIssuesByIds } from '@/lib/db';
import { publicRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await publicRateLimit(request, 'catalogue');
  if (limited) return limited;
  try {
    const ids = (request.nextUrl.searchParams.get('ids') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0 && id.length <= 128)
      .slice(0, 100);

    const data = await listPublicIssuesByIds(ids);
    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Could not load bookmarked issues.', code: 'DB_ERROR' }, { status: 500 });
  }
}
