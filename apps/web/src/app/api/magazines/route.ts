import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('magazines')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
  }

  // Magazines are very stable — admin edits are infrequent. Cache aggressively
  // on the edge; SWR keeps responses warm during revalidation.
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
