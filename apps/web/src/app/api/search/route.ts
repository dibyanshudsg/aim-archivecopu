import { NextRequest, NextResponse } from 'next/server';
import { searchIssueMetadata, searchIssueText, listSearchTopics } from '@/lib/db';
import { getEmbargoState } from '@/lib/embargo';
import type { FullTextSearchResult } from '@/lib/api';
import { publicRateLimit } from '@/lib/rate-limit';

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
  pdf_url: string | null;
  magazines: MagazineRel;
}

interface FtsRow {
  issue_id: string;
  issue_title: string;
  theme: string | null;
  magazine_name: string;
  magazine_language: string;
  year: number;
  month: number;
  page_number: number | null;
  match_kind: FullTextSearchResult['match_kind'];
  snippet: string;
  rank: number;
  cover_image_url: string | null;
  pdf_url: string | null;
  is_embargoed: boolean;
  embargo_lift_label: string | null;
  embargo_lift_at: string | null;
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
  const limited = await publicRateLimit(request, 'search');
  if (limited) return limited;
  const { searchQuerySchema, parseSearchParams } = await import('@/lib/validations');

  const raw = parseSearchParams(request.nextUrl.searchParams);
  const suggestions = request.nextUrl.searchParams.get('suggestions') === '1';
  if (suggestions) raw.q = 'topics';
  const parsed = searchQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Check your query and filters', data: [], total: 0, type: 'none' },
      { status: 400 },
    );
  }

  const { q: query, magazine_id: magazineId, year_from: yearFrom, year_to: yearTo, availability } = parsed.data;

  try {
  if (suggestions) {
    const topics = await listSearchTopics({ query: '', magazineId, yearFrom, yearTo, availability });
    return NextResponse.json({ topics }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const [ftsResults, metaIssues] = await Promise.all([
    searchIssueText({
      query,
      magazineId: magazineId || undefined,
      yearFrom: yearFrom || undefined,
      yearTo: yearTo || undefined,
      limit: 50,
      availability,
    }),
    searchIssueMetadata({
      query,
      magazineId: magazineId || undefined,
      yearFrom: yearFrom || undefined,
      yearTo: yearTo || undefined,
      limit: 50,
      availability,
    }),
  ]);

  const now = new Date();
  const ftsIssueIds = new Set(ftsResults.map((r) => r.issue_id));
  const metaResults: FtsRow[] = metaIssues
    .filter((i) => !ftsIssueIds.has(i.id))
    .map((i) => {
      const state = i.pdf_url
        ? { isEmbargoed: false, embargoLiftLabel: null, embargoLiftAt: null }
        : getEmbargoState(i.year, i.month, now);
      return {
        issue_id: i.id,
        issue_title: i.title,
        theme: i.theme,
        magazine_name: i.magazines.name,
        magazine_language: i.magazines.language,
        year: i.year,
        month: i.month,
        page_number: null,
        match_kind: i.theme?.toLowerCase().includes(query.toLowerCase()) ? 'theme'
          : i.title.toLowerCase().includes(query.toLowerCase()) ? 'title'
          : i.description?.toLowerCase().includes(query.toLowerCase()) ? 'description' : 'topic',
        snippet: buildMetaSnippet(i, query) + (state.isEmbargoed ? ` · Public reading opens ${state.embargoLiftLabel}` : ''),
        rank: 0,
        cover_image_url: i.cover_image_url,
        pdf_url: state.isEmbargoed ? null : i.pdf_url,
        is_embargoed: state.isEmbargoed,
        embargo_lift_label: state.embargoLiftLabel,
        embargo_lift_at: state.embargoLiftAt,
      };
    });

  const combined = [...ftsResults, ...metaResults];

  return NextResponse.json(
    {
      data: combined,
      total: combined.length,
      type: combined.length > 0 ? 'matches' : 'none',
      limited: ftsResults.length >= 50 || metaIssues.length >= 50,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
  } catch {
    return NextResponse.json({ error: 'Search is temporarily unavailable' }, { status: 503 });
  }
}
