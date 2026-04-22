import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const supabase = createPublicClient();
  const { searchParams } = request.nextUrl;

  const magazineId = searchParams.get('magazine_id');
  const year = searchParams.get('year');
  const language = searchParams.get('language');
  const topic = searchParams.get('topic');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(searchParams.get('page_size') || '20'), 100);

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
    query = query.eq('year', parseInt(year));
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

  return NextResponse.json({
    data,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}
