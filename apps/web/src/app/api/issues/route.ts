import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { issuesQuerySchema, parseSearchParams } = await import('@/lib/validations');

  const supabase = createPublicClient();
  const raw = parseSearchParams(request.nextUrl.searchParams);
  const parsed = issuesQuerySchema.safeParse(raw);

  const magazineId = parsed.success ? parsed.data.magazine_id : undefined;
  const year = parsed.success ? parsed.data.year : undefined;
  const month = parsed.success ? parsed.data.month : undefined;
  const language = parsed.success ? (raw.language as string) : undefined;
  const topic = parsed.success ? parsed.data.topic : undefined;
  const page = parsed.success ? parsed.data.page : 1;
  const pageSize = parsed.success ? parsed.data.page_size : 20;

  let query = supabase
    .from('issues')
    .select('*, magazines!inner(id, name, language, description, cover_image_url)', { count: 'exact' })
    .eq('is_published', true)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (magazineId) {
    query = query.eq('magazine_id', magazineId);
  }
  if (year) {
    query = query.eq('year', year);
  }
  if (month) {
    query = query.eq('month', month);
  }
  if (language) {
    query = query.eq('magazines.language', language);
  }
  if (topic) {
    query = query.contains('topics', [topic]);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
  }

  return NextResponse.json(
    {
      data,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
    {
      headers: {
        // Edge-cache listings briefly; SWR absorbs the next request while a
        // fresh copy is fetched. Admin publishes show up within ~1 minute.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
