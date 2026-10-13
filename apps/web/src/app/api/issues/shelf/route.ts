import { NextRequest, NextResponse } from 'next/server';
import { listHomeShelfIssues } from '@/lib/db';

export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get('year'));
  if (!Number.isInteger(year) || year < 1800 || year > 2200) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }
  try {
    return NextResponse.json(await listHomeShelfIssues(240, year), {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'Shelf temporarily unavailable' }, { status: 503 });
  }
}
