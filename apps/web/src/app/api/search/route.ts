import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ data: [], total: 0, type: 'none' });
  }

  const magazineId = searchParams.get('magazine_id');
  const yearFrom = searchParams.get('year_from');
  const yearTo = searchParams.get('year_to');

  const supabase = getClient();

  // Try full-text search first (page-level results with snippets)
  const { data: ftsResults, error: ftsError } = await supabase.rpc('search_issues', {
    search_query: query,
    filter_magazine_id: magazineId || null,
    filter_year_from: yearFrom ? parseInt(yearFrom) : null,
    filter_year_to: yearTo ? parseInt(yearTo) : null,
    result_limit: 50,
    result_offset: 0,
  });

  if (!ftsError && ftsResults && ftsResults.length > 0) {
    return NextResponse.json({
      data: ftsResults,
      total: ftsResults.length,
      type: 'fulltext',
    });
  }

  // Fallback: search issue titles, descriptions, and topics
  let fallbackQuery = supabase
    .from('issues')
    .select('*, magazines!inner(id, name, language, description, cover_image_url)')
    .eq('is_published', true)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,topics.cs.{"${query}"}`);

  if (magazineId) fallbackQuery = fallbackQuery.eq('magazine_id', magazineId);
  if (yearFrom) fallbackQuery = fallbackQuery.gte('year', parseInt(yearFrom));
  if (yearTo) fallbackQuery = fallbackQuery.lte('year', parseInt(yearTo));
  fallbackQuery = fallbackQuery.order('read_count', { ascending: false }).limit(50);

  const { data: fallbackResults } = await fallbackQuery;

  return NextResponse.json({
    data: fallbackResults || [],
    total: fallbackResults?.length || 0,
    type: 'fallback',
  });
}
