import { NextRequest, NextResponse } from 'next/server';
import { searchIssueMetadata, searchIssueText } from '@/lib/db';
import { getEmbargoState } from '@/lib/embargo';

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
  magazine_name: string;
  magazine_language: string;
  year: number;
  month: number;
  page_number: number;
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

/** Snippet shown in place of any OCR excerpt for embargoed issues. Leaks
 *  metadata only (theme + topics) so the result is discoverable, but the
 *  printed page contents never reach the public. */
function buildEmbargoSnippet(
  theme: string | null,
  topics: string[] | null,
  liftLabel: string | null,
): string {
  const parts: string[] = [];
  if (theme) parts.push(`Theme: ${escapeHtml(theme)}`);
  if (topics && topics.length > 0) {
    parts.push(`Topics: ${topics.slice(0, 4).map(escapeHtml).join(', ')}`);
  }
  parts.push(liftLabel ? `Available ${escapeHtml(liftLabel)}` : 'Available to subscribers');
  return parts.join(' · ');
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

  const [ftsResults, metaIssues] = await Promise.all([
    searchIssueText({
      query,
      magazineId: magazineId || undefined,
      yearFrom: yearFrom || undefined,
      yearTo: yearTo || undefined,
      limit: 50,
    }),
    searchIssueMetadata({
      query,
      magazineId: magazineId || undefined,
      yearFrom: yearFrom || undefined,
      yearTo: yearTo || undefined,
      limit: 50,
    }),
  ]);

  const now = new Date();
  const ftsIssueIds = new Set(ftsResults.map((r) => r.issue_id));
  const metaResults: FtsRow[] = metaIssues
    .filter((i) => !ftsIssueIds.has(i.id))
    .map((i) => {
      const state = getEmbargoState(i.year, i.month, now);
      return {
        issue_id: i.id,
        issue_title: i.title,
        magazine_name: i.magazines.name,
        magazine_language: i.magazines.language,
        year: i.year,
        month: i.month,
        page_number: 1,
        snippet: state.isEmbargoed
          ? buildEmbargoSnippet(i.theme, i.topics, state.embargoLiftLabel)
          : buildMetaSnippet(i, query),
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
      type: combined.length > 0 ? 'fulltext' : 'none',
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
