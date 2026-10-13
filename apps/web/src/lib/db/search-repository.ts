import { supportedAssetSql } from '../asset-url';
import type { FullTextSearchResult } from '@/lib/api';
import { getEmbargoState, readableCutoffIssueMonth } from '@/lib/embargo';
import { displayableAssetUrl, getDb } from './client';
import { buildSearchSnippet } from '../search-text-quality';
import { hasSearchIndex, literalFtsPhrase } from './search-capabilities';
import { publicPdfRoute, publicCoverRoute, magazineCoverRoute } from '../public-asset-routes';


export interface SearchInput {
  query: string;
  magazineId?: string;
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
  availability?: 'read' | 'subscriber' | 'all';
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

  // A quoted trigram phrase preserves literal substring/phrase searches,
  // including Indic scripts and punctuation. Short queries use the scan path.
  const indexed = Array.from(query).length >= 3 && await hasSearchIndex('issue_text_fts');
  return searchWithLikeFallback({ ...input, query }, indexed);
}

export async function searchIssueMetadata(input: SearchInput): Promise<MetadataSearchIssue[]> {
  const query = input.query.trim().toLowerCase();
  if (!query) return [];
  const indexed = Array.from(query).length >= 3 && await hasSearchIndex('issue_metadata_fts');

  const filters = buildSearchFilters(input);
  const pattern = `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  const result = await getDb().execute({
    sql: `
      SELECT
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
      WHERE i.is_published = 1
        AND ${supportedAssetSql('i.pdf_url')}
        ${indexed ? 'AND i.rowid IN (SELECT rowid FROM issue_metadata_fts WHERE issue_metadata_fts MATCH ?)' : ''}
        AND (
          lower(i.title) LIKE ? ESCAPE '\\'
          OR lower(coalesce(i.theme, '')) LIKE ? ESCAPE '\\'
          OR lower(coalesce(i.description, '')) LIKE ? ESCAPE '\\'
          OR EXISTS (SELECT 1 FROM json_each(i.topics_json) topic WHERE lower(coalesce(topic.value, '')) LIKE ? ESCAPE '\\')
        )
        ${filters.sql}
      ORDER BY i.year DESC, i.month DESC
      LIMIT ?
    `,
    args: [...(indexed ? [literalFtsPhrase(query)] : []), pattern, pattern, pattern, pattern, ...filters.args, input.limit ?? 50],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    theme: row.theme == null ? null : String(row.theme),
    description: row.description == null ? null : String(row.description),
    topics: parseTopics(row.topics_json == null ? null : String(row.topics_json)),
    year: Number(row.year),
    month: Number(row.month),
    cover_image_url: displayableAssetUrl(row.cover_image_url == null ? null : String(row.cover_image_url)) ? publicCoverRoute(String(row.id)) : null,
    pdf_url: row.pdf_url == null || getEmbargoState(Number(row.year), Number(row.month)).isEmbargoed ? null : publicPdfRoute(String(row.id)),
    magazines: {
      id: String(row.magazine_id),
      name: String(row.magazine_name),
      language: String(row.magazine_language),
      description: String(row.magazine_description ?? ''),
      cover_image_url: displayableAssetUrl(row.magazine_cover_image_url == null ? null : String(row.magazine_cover_image_url)) ? magazineCoverRoute(String(row.magazine_id)) : null,
    },
  }));
}

export async function listSearchTopics(input: SearchInput): Promise<string[]> {
  const filters = buildSearchFilters(input);
  const result = await getDb().execute({
    sql: `SELECT trim(topic.value) AS topic, count(DISTINCT i.id) AS uses
      FROM issues i JOIN json_each(i.topics_json) topic ON true
      WHERE i.is_published = 1 AND ${supportedAssetSql('i.pdf_url')}
        AND topic.type = 'text' AND length(trim(topic.value)) BETWEEN 1 AND 100
        ${filters.sql}
      GROUP BY trim(topic.value) ORDER BY uses DESC, topic COLLATE NOCASE LIMIT 12`,
    args: filters.args,
  });
  return result.rows.map((row) => String(row.topic));
}

async function searchWithLikeFallback(input: SearchInput, indexed = false): Promise<FullTextSearchResult[]> {
  const filters = buildSearchFilters(input);
  const pattern = `%${input.query.toLowerCase().replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
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
        AND ${supportedAssetSql('i.pdf_url')}
        ${indexed ? 'AND idx.rowid IN (SELECT rowid FROM issue_text_fts WHERE issue_text_fts MATCH ?)' : ''}
        AND lower(replace(replace(idx.content, char(10), ' '), char(13), ' ')) LIKE ? ESCAPE '\\'
        ${filters.sql}
      ORDER BY i.year DESC, i.month DESC, idx.page_number ASC
      LIMIT ?
    `,
    args: [...(indexed ? [literalFtsPhrase(input.query)] : []), pattern, ...filters.args, input.limit ?? 50],
  });

  return decorateSearchRows((result.rows as unknown as SearchRow[]).map((row) => ({
    ...row,
    snippet: buildSearchSnippet(String(row.snippet), input.query, Number(row.page_number)),
  })));
}

function buildSearchFilters(input: SearchInput) {
  const clauses: string[] = ["AND trim(i.pdf_url) <> ''"];
  const args: Array<string | number> = [];
  if (input.availability !== 'all') {
    const cutoff = readableCutoffIssueMonth();
    clauses.push(input.availability === 'subscriber'
      ? 'AND (i.year > ? OR (i.year = ? AND i.month > ?))'
      : 'AND (i.year < ? OR (i.year = ? AND i.month <= ?))');
    args.push(cutoff.year, cutoff.year, cutoff.month);
  }
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
      theme: row.theme == null ? null : String(row.theme),
      magazine_name: String(row.magazine_name),
      magazine_language: String(row.magazine_language),
      year: Number(row.year),
      month: Number(row.month),
      page_number: state.isEmbargoed ? null : Number(row.page_number),
      match_kind: 'page_text',
      snippet: state.isEmbargoed
        ? `Matches indexed text; excerpt available when public reading opens. ${buildEmbargoSnippet(row.theme, parseTopics(row.topics_json), state.embargoLiftLabel)}`
        : String(row.snippet),
      rank: Number(row.rank ?? 0),
      cover_image_url: displayableAssetUrl(row.cover_image_url) ? publicCoverRoute(String(row.issue_id)) : null,
      pdf_url: state.isEmbargoed ? null : publicPdfRoute(String(row.issue_id)),
      is_embargoed: state.isEmbargoed,
      embargo_lift_label: state.embargoLiftLabel,
      embargo_lift_at: state.embargoLiftAt,
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
