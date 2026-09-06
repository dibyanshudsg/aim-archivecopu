import { NextRequest, NextResponse } from 'next/server';
import { listPublicIssuesByIds } from '@/lib/db';

export async function GET(request: NextRequest) {
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
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, code: 'DB_ERROR' }, { status: 500 });
  }
}
