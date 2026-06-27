import { NextResponse } from 'next/server';
import { listMagazines } from '@/lib/db';

export async function GET() {
  const data = await listMagazines();
  // Magazines are very stable — admin edits are infrequent. Cache aggressively
  // on the edge; SWR keeps responses warm during revalidation.
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
