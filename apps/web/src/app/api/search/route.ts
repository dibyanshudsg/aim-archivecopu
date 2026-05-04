import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

interface MagazineRel {
  id: string;
  name: string;
  language: string;
  description: string;
  cover_image_url: string | null;
}

interface IssueRow {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  topics: string[];
  year: number;
  month: number;
  cover_image_url: string | null;
  pdf_url: string;
  magazines: MagazineRel;
}

interface FtsRow {
  issue_id: string;
  issue_title: string;
  magazine_name: string;
  magazine_language: string;
  year: number;
  month: number;
  page_number: number;
  snippet: string;
  rank: number;
  cover_image_url: string | null;
  pdf_url: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlight(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${safe})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function buildMetaSnippet(issue: IssueRow, query: string): string {
  const q = query.toLowerCase();
  if (issue.theme && issue.theme.toLowerCase().includes(q)) {
    return `Theme: ${highlight(issue.theme, query)}`;
  }
  if (issue.title.toLowerCase().includes(q)) {
    return highlight(issue.title, query);
  }
  if (issue.description) {
    const desc = issue.description;
    const idx = desc.toLowerCase().indexOf(q);
    if (idx >= 0) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(desc.length, idx + q.length + 60);
      let snippet = desc.slice(start, end);
      if (start > 0) snippet = '...' + snippet;
      if (end < desc.length) snippet = snippet + '...';
      return highlight(snippet, query);
    }
  }
  const matchingTopic = issue.topics?.find((t) => t.toLowerCase().includes(q));
  if (matchingTopic) return `Topic: ${highlight(matchingTopic, query)}`;
  return escapeHtml(issue.title);
}

export async function GET(request: NextRequest) {
  const { searchQuerySchema, parseSearchParams } = await import('@/lib/validations');

  const raw = parseSearchParams(request.nextUrl.searchParams);
  const parsed = searchQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { data: [], total: 0, type: 'none' },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  }

  const { q: query, magazine_id: magazineId, year_from: yearFrom, year_to: yearTo } = parsed.data;

  const supabase = getClient();

  // Run page-level OCR full-text search and issue-level metadata search in
  // parallel. Theme/title/topic matches that aren't surfaced by OCR (because
  // they don't appear on a printed page) still need to find their issue.
  let metaQuery = supabase
    .from('issues')
    .select(
      'id, title, theme, description, topics, year, month, cover_image_url, pdf_url, magazines!inner(id, name, language, description, cover_image_url)',
    )
    .eq('is_published', true)
    .or(
      `title.ilike.%${query}%,theme.ilike.%${query}%,description.ilike.%${query}%,topics.cs.{"${query}"}`,
    );

  if (magazineId) metaQuery = metaQuery.eq('magazine_id', magazineId);
  if (yearFrom) metaQuery = metaQuery.gte('year', yearFrom);
  if (yearTo) metaQuery = metaQuery.lte('year', yearTo);
  metaQuery = metaQuery.order('year', { ascending: false }).order('month', { ascending: false }).limit(50);

  const [ftsResp, metaResp] = await Promise.all([
    supabase.rpc('search_issues', {
      search_query: query,
      filter_magazine_id: magazineId || null,
      filter_year_from: yearFrom || null,
      filter_year_to: yearTo || null,
      result_limit: 50,
      result_offset: 0,
    }),
    metaQuery,
  ]);

  const ftsResults: FtsRow[] = !ftsResp.error && ftsResp.data ? (ftsResp.data as FtsRow[]) : [];
  const metaIssues: IssueRow[] = (metaResp.data as IssueRow[] | null) ?? [];

  // Dedupe — if an issue already has page-level FTS hits, drop its metadata
  // entry; FTS snippets carry more context.
  const ftsIssueIds = new Set(ftsResults.map((r) => r.issue_id));
  const metaResults: FtsRow[] = metaIssues
    .filter((i) => !ftsIssueIds.has(i.id))
    .map((i) => ({
      issue_id: i.id,
      issue_title: i.title,
      magazine_name: i.magazines.name,
      magazine_language: i.magazines.language,
      year: i.year,
      month: i.month,
      page_number: 1,
      snippet: buildMetaSnippet(i, query),
      rank: 0,
      cover_image_url: i.cover_image_url,
      pdf_url: i.pdf_url,
    }));

  const combined = [...ftsResults, ...metaResults];

  return NextResponse.json(
    {
      data: combined,
      total: combined.length,
      type: combined.length > 0 ? 'fulltext' : 'none',
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
