import type { FullTextSearchResult } from '@/lib/api';
import { getEmbargoState } from '@/lib/embargo';
import { displayableAssetUrl, getDb } from './client';

export interface SearchInput {
  query: string;
  magazineId?: string;
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
}

export interface MetadataSearchIssue {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  topics: string[];
  year: number;
  month: number;
  cover_image_url: string | null;
  pdf_url: string | null;
  magazines: {
    id: string;
    name: string;
    language: string;
    description: string;
    cover_image_url: string | null;
  };
}

interface SearchRow {
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
  theme: string | null;
  topics_json: string | null;
}

export async function searchIssueText(input: SearchInput): Promise<FullTextSearchResult[]> {
  const query = input.query.trim();
  if (!query) return [];

  try {
    return await searchWithTursoFts(input);
  } catch (error) {
    if (!isMissingFtsError(error)) throw error;
    return searchWithLikeFallback(input);
  }
}

export async function searchIssueMetadata(input: SearchInput): Promise<MetadataSearchIssue[]> {
  const query = input.query.trim().toLowerCase();
  if (!query) return [];

  const filters = buildSearchFilters(input);
  const pattern = `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  const result = await getDb().execute({
    sql: `
      SELECT DISTINCT
        i.id,
        i.title,
        i.theme,
        i.description,
        i.topics_json,
        i.year,
        i.month,
        i.cover_image_url,
        i.pdf_url,
        m.id AS magazine_id,
        m.name AS magazine_name,
        m.language AS magazine_language,
        m.description AS magazine_description,
        m.cover_image_url AS magazine_cover_image_url
      FROM issues i
      JOIN magazines m ON m.id = i.magazine_id
      LEFT JOIN json_each(i.topics_json) topic ON true
      WHERE i.is_published = 1
        AND i.pdf_url NOT LIKE '%.supabase.co/%'
        AND (
          lower(i.title) LIKE ?
          OR lower(coalesce(i.theme, '')) LIKE ?
          OR lower(coalesce(i.description, '')) LIKE ?
          OR lower(coalesce(topic.value, '')) LIKE ?
        )
        ${filters.sql}
      ORDER BY i.year DESC, i.month DESC
      LIMIT ?
    `,
    args: [pattern, pattern, pattern, pattern, ...filters.args, input.limit ?? 50],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    theme: row.theme == null ? null : String(row.theme),
    description: row.description == null ? null : String(row.description),
    topics: parseTopics(row.topics_json == null ? null : String(row.topics_json)),
    year: Number(row.year),
    month: Number(row.month),
    cover_image_url: displayableAssetUrl(row.cover_image_url == null ? null : String(row.cover_image_url)),
    pdf_url: row.pdf_url == null ? null : String(row.pdf_url),
    magazines: {
      id: String(row.magazine_id),
      name: String(row.magazine_name),
      language: String(row.magazine_language),
      description: String(row.magazine_description ?? ''),
      cover_image_url: displayableAssetUrl(
        row.magazine_cover_image_url == null ? null : String(row.magazine_cover_image_url),
      ),
    },
  }));
}

async function searchWithTursoFts(input: SearchInput): Promise<FullTextSearchResult[]> {
  const filters = buildSearchFilters(input);
  const result = await getDb().execute({
    sql: `
      SELECT
        i.id AS issue_id,
        i.title AS issue_title,
        m.name AS magazine_name,
        m.language AS magazine_language,
        i.year,
        i.month,
        idx.page_number,
        fts_highlight(idx.content, '<mark>', '</mark>', ?) AS snippet,
        fts_score(idx.content, ?) AS rank,
        i.cover_image_url,
        i.pdf_url,
        i.theme,
        i.topics_json
      FROM issue_search_index idx
      JOIN issues i ON i.id = idx.issue_id
      JOIN magazines m ON m.id = i.magazine_id
      WHERE i.is_published = 1
        AND i.pdf_url NOT LIKE '%.supabase.co/%'
        AND fts_match(idx.content, ?)
        ${filters.sql}
      ORDER BY rank DESC, i.year DESC, i.month DESC
      LIMIT ?
    `,
    args: [input.query, input.query, input.query, ...filters.args, input.limit ?? 50],
  });

  return decorateSearchRows(result.rows as unknown as SearchRow[]);
}

async function searchWithLikeFallback(input: SearchInput): Promise<FullTextSearchResult[]> {
  const filters = buildSearchFilters(input);
  const pattern = `%${input.query.toLowerCase()}%`;
  const result = await getDb().execute({
    sql: `
      SELECT
        i.id AS issue_id,
        i.title AS issue_title,
        m.name AS magazine_name,
        m.language AS magazine_language,
        i.year,
        i.month,
        idx.page_number,
        idx.content AS snippet,
        0 AS rank,
        i.cover_image_url,
        i.pdf_url,
        i.theme,
        i.topics_json
      FROM issue_search_index idx
      JOIN issues i ON i.id = idx.issue_id
      JOIN magazines m ON m.id = i.magazine_id
      WHERE i.is_published = 1
        AND i.pdf_url NOT LIKE '%.supabase.co/%'
        AND lower(idx.content) LIKE ?
        ${filters.sql}
      ORDER BY i.year DESC, i.month DESC, idx.page_number ASC
      LIMIT ?
    `,
    args: [pattern, ...filters.args, input.limit ?? 50],
  });

  return decorateSearchRows((result.rows as unknown as SearchRow[]).map((row) => ({
    ...row,
    snippet: highlightSnippet(String(row.snippet), input.query),
  })));
}

function buildSearchFilters(input: SearchInput) {
  const clauses: string[] = [];
  const args: Array<string | number> = [];
  if (input.magazineId) {
    clauses.push('AND i.magazine_id = ?');
    args.push(input.magazineId);
  }
  if (input.yearFrom) {
    clauses.push('AND i.year >= ?');
    args.push(input.yearFrom);
  }
  if (input.yearTo) {
    clauses.push('AND i.year <= ?');
    args.push(input.yearTo);
  }
  return { sql: clauses.join('\n'), args };
}

function decorateSearchRows(rows: SearchRow[]): FullTextSearchResult[] {
  const now = new Date();
  const seenEmbargoed = new Set<string>();
  const results: FullTextSearchResult[] = [];

  for (const row of rows) {
    const state = getEmbargoState(Number(row.year), Number(row.month), now);
    if (state.isEmbargoed) {
      if (seenEmbargoed.has(row.issue_id)) continue;
      seenEmbargoed.add(row.issue_id);
    }

    results.push({
      issue_id: String(row.issue_id),
      issue_title: String(row.issue_title),
      magazine_name: String(row.magazine_name),
      magazine_language: String(row.magazine_language),
      year: Number(row.year),
      month: Number(row.month),
      page_number: state.isEmbargoed ? 1 : Number(row.page_number),
      snippet: state.isEmbargoed
        ? buildEmbargoSnippet(row.theme, parseTopics(row.topics_json), state.embargoLiftLabel)
        : String(row.snippet),
      rank: Number(row.rank ?? 0),
      cover_image_url: displayableAssetUrl(row.cover_image_url),
      pdf_url: state.isEmbargoed ? null : row.pdf_url,
      is_embargoed: state.isEmbargoed,
      embargo_lift_label: state.embargoLiftLabel,
    });
  }

  return results;
}

function buildEmbargoSnippet(theme: string | null, topics: string[], liftLabel: string | null): string {
  const parts: string[] = [];
  if (theme) parts.push(`Theme: ${escapeHtml(theme)}`);
  if (topics.length > 0) parts.push(`Topics: ${topics.slice(0, 4).map(escapeHtml).join(', ')}`);
  parts.push(liftLabel ? `Available ${escapeHtml(liftLabel)}` : 'Available to subscribers');
  return parts.join(' · ');
}

function parseTopics(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function highlightSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  const start = idx >= 0 ? Math.max(0, idx - 80) : 0;
  const end = idx >= 0 ? Math.min(content.length, idx + query.length + 120) : Math.min(content.length, 220);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = `...${snippet}`;
  if (end < content.length) snippet = `${snippet}...`;
  return escapeHtml(snippet).replace(new RegExp(`(${escapeRegExp(query)})`, 'gi'), '<mark>$1</mark>');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isMissingFtsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('no such function: fts_') || message.includes('near "USING"') || message.includes('fts_match');
}
