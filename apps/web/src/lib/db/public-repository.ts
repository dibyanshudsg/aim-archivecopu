import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { applyEmbargoToIssueRow } from '@/lib/embargo';
import type { BrowseFacets, PublicIssueListInput, PublicIssueListResult } from '@/lib/public-issues';
import { LANGUAGE_NAMES, MONTH_NAMES, type Language, type MonthIndex } from '@aim-archive/shared';
import { getDb, isSupabaseHostedUrl, nowIso } from './client';
import { AsyncTtlCache } from './cache';
import { issueSelectSql, rowToIssue, rowToMagazine, type IssueJoinedRow, type MagazineRow } from './mappers';

const IMPOSSIBLE_ID = '__none__';
const SHORT_PUBLIC_CACHE_MS = 10_000;
const PUBLIC_LOOKUP_CACHE_MS = 30_000;
const publicListCache = new AsyncTtlCache<PublicIssueListResult>(SHORT_PUBLIC_CACHE_MS);
const magazineCache = new AsyncTtlCache<ApiMagazine[]>(PUBLIC_LOOKUP_CACHE_MS);
const issueArrayCache = new AsyncTtlCache<ApiIssue[]>(PUBLIC_LOOKUP_CACHE_MS);
const issueCache = new AsyncTtlCache<ApiIssue | null>(SHORT_PUBLIC_CACHE_MS);

export function clearPublicRepositoryCaches(): void {
  publicListCache.clear();
  magazineCache.clear();
  issueArrayCache.clear();
  issueCache.clear();
}

export async function listMagazines(options: { orderBy?: 'name' | 'created_at' } = {}): Promise<ApiMagazine[]> {
  const orderBy = options.orderBy === 'created_at' ? 'created_at' : 'name';
  return magazineCache.get(orderBy, async () => {
    const result = await getDb().execute(`SELECT * FROM magazines ORDER BY ${orderBy} ASC`);
    return result.rows.map((row) => rowToMagazine(row as unknown as MagazineRow));
  });
}

export async function listRecentPublicIssues(limit = 8, overfetch = 32): Promise<ApiIssue[]> {
  return issueArrayCache.get(`recent:${limit}:${overfetch}`, async () => {
    const result = await getDb().execute({
      sql: `
        SELECT ${issueSelectSql()}
        FROM issues i
        JOIN magazines m ON m.id = i.magazine_id
        WHERE i.is_published = 1
          AND i.pdf_url NOT LIKE '%.supabase.co/%'
        ORDER BY i.created_at DESC
        LIMIT ?
      `,
      args: [overfetch],
    });

    const now = new Date();
    return result.rows
      .map((row) => rowToIssue(row as unknown as IssueJoinedRow))
      .filter((issue) => !isSupabaseHostedUrl(issue.pdf_url))
      .map((issue) => applyEmbargoToIssueRow(issue, now))
      .filter((issue) => !issue.is_embargoed)
      .slice(0, limit);
  });
}

export async function listPublicIssuesForMonths(months: Array<{ year: number; month: number }>): Promise<ApiIssue[]> {
  if (months.length === 0) return [];
  return issueArrayCache.get(`months:${JSON.stringify(months)}`, async () => {
    const clauses = months.map(() => '(i.year = ? AND i.month = ?)').join(' OR ');
    const args = months.flatMap((item) => [item.year, item.month]);

    const result = await getDb().execute({
      sql: `
        SELECT ${issueSelectSql()}
        FROM issues i
        JOIN magazines m ON m.id = i.magazine_id
        WHERE i.is_published = 1
          AND i.pdf_url NOT LIKE '%.supabase.co/%'
          AND (${clauses})
        ORDER BY m.created_at ASC, i.year DESC, i.month DESC
      `,
      args,
    });

    const now = new Date();
    return result.rows
      .map((row) => rowToIssue(row as unknown as IssueJoinedRow))
      .map((issue) => applyEmbargoToIssueRow(issue, now))
      .filter((issue) => !issue.is_embargoed);
  });
}

export async function getPublicIssueById(id: string): Promise<ApiIssue | null> {
  return issueCache.get(id, async () => {
    const result = await getDb().execute({
      sql: `
        SELECT ${issueSelectSql()}
        FROM issues i
        JOIN magazines m ON m.id = i.magazine_id
        WHERE i.id = ?
          AND i.is_published = 1
          AND i.pdf_url NOT LIKE '%.supabase.co/%'
        LIMIT 1
      `,
      args: [id],
    });

    const row = result.rows[0];
    if (!row) return null;
    return applyEmbargoToIssueRow(rowToIssue(row as unknown as IssueJoinedRow));
  });
}

export async function getPublicIssueMetadataById(id: string): Promise<{
  title: string;
  description: string | null;
  magazineName: string;
} | null> {
  const result = await getDb().execute({
    sql: `
      SELECT i.title, i.description, m.name AS magazine_name
      FROM issues i
      JOIN magazines m ON m.id = i.magazine_id
      WHERE i.id = ?
        AND i.is_published = 1
        AND i.pdf_url NOT LIKE '%.supabase.co/%'
      LIMIT 1
    `,
    args: [id],
  });
  const row = result.rows[0];
  return row
    ? {
        title: String(row.title),
        description: row.description == null ? null : String(row.description),
        magazineName: String(row.magazine_name),
      }
    : null;
}

export async function listSitemapIssues(): Promise<Array<{ id: string; updated_at: string }>> {
  const result = await getDb().execute(`
    SELECT id, updated_at
    FROM issues
    WHERE is_published = 1
      AND pdf_url NOT LIKE '%.supabase.co/%'
    ORDER BY year DESC, month DESC
  `);
  return result.rows.map((row) => ({
    id: String(row.id),
    updated_at: String(row.updated_at),
  }));
}

export async function getPublicIssueDownloadTarget(id: string): Promise<{ id: string; pdf_url: string; year: number; month: number } | null> {
  const result = await getDb().execute({
    sql: `
      SELECT id, pdf_url, year, month
      FROM issues
      WHERE id = ?
        AND is_published = 1
        AND pdf_url IS NOT NULL
        AND pdf_url NOT LIKE '%.supabase.co/%'
      LIMIT 1
    `,
    args: [id],
  });

  const row = result.rows[0];
  if (!row || typeof row.pdf_url !== 'string') return null;
  return {
    id: String(row.id),
    pdf_url: row.pdf_url,
    year: Number(row.year),
    month: Number(row.month),
  };
}

export async function incrementIssueReadCount(id: string): Promise<void> {
  await incrementIssueCounter(id, 'read_count');
}

export async function incrementIssueDownloadCount(id: string): Promise<void> {
  await incrementIssueCounter(id, 'download_count');
}

async function incrementIssueCounter(id: string, column: 'read_count' | 'download_count'): Promise<void> {
  await getDb().execute({
    sql: `
      UPDATE issues
      SET ${column} = ${column} + 1,
          updated_at = ?
      WHERE id = ?
        AND is_published = 1
    `,
    args: [nowIso(), id],
  });
}

export async function listPublicIssues(input: PublicIssueListInput): Promise<PublicIssueListResult> {
  return publicListCache.get(JSON.stringify(input), () => listPublicIssuesUncached(input));
}

async function listPublicIssuesUncached(input: PublicIssueListInput): Promise<PublicIssueListResult> {
  const magazines = await listMagazines();
  const searchIssueIds = await queryIssueIdsMatchingSearch(input.q);
  const where = buildIssueWhere(input, magazines, undefined, searchIssueIds);
  const order = buildOrderBy(input);
  const offset = (input.page - 1) * input.pageSize;

  const [rowsResult, countResult, facets] = await Promise.all([
    getDb().execute({
      sql: `
        SELECT ${issueSelectSql()}
        FROM issues i
        JOIN magazines m ON m.id = i.magazine_id
        ${where.sql}
        ${order}
        LIMIT ? OFFSET ?
      `,
      args: [...where.args, input.pageSize, offset],
    }),
    getDb().execute({
      sql: `
        SELECT COUNT(*) AS count
        FROM issues i
        JOIN magazines m ON m.id = i.magazine_id
        ${where.sql}
      `,
      args: where.args,
    }),
    buildFacets(input, magazines, searchIssueIds),
  ]);

  const now = new Date();
  const data = rowsResult.rows
    .map((row) => rowToIssue(row as unknown as IssueJoinedRow))
    .map((row) => applyEmbargoToIssueRow(row, now));
  const total = Number(countResult.rows[0]?.count ?? 0);

  return {
    data,
    magazines,
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    facets,
  };
}

type FacetDimension = 'years' | 'months' | 'magazines' | 'languages' | 'subjects';

interface SqlPart {
  sql: string;
  args: SqlArg[];
}

type SqlArg = string | number | null;
type FacetCountValue = string | number;
type FacetCount = { value: FacetCountValue; count: number };

function buildIssueWhere(
  input: PublicIssueListInput,
  magazines: ApiMagazine[],
  exclude?: FacetDimension,
  searchIssueIds?: string[] | null,
): SqlPart {
  const clauses = [
    'i.is_published = 1',
    "i.pdf_url NOT LIKE '%.supabase.co/%'",
  ];
  const args: SqlArg[] = [];

  if (exclude !== 'years' && input.years.length > 0) addIn(clauses, args, 'i.year', input.years);
  if (exclude !== 'months' && input.months.length > 0) addIn(clauses, args, 'i.month', input.months);

  if (exclude !== 'magazines' && input.magazines.length > 0) {
    const ids = resolveMagazineIds(input.magazines, magazines);
    addIn(clauses, args, 'i.magazine_id', ids.length > 0 ? ids : [IMPOSSIBLE_ID]);
  }

  if (exclude !== 'languages' && input.languages.length > 0) addIn(clauses, args, 'm.language', input.languages);

  if (exclude !== 'subjects' && input.subjects.length > 0) {
    clauses.push(`EXISTS (
      SELECT 1 FROM json_each(i.topics_json)
      WHERE json_each.value IN (${placeholders(input.subjects.length)})
    )`);
    args.push(...input.subjects);
  }

  if (input.q) {
    addIn(clauses, args, 'i.id', searchIssueIds && searchIssueIds.length > 0 ? searchIssueIds : [IMPOSSIBLE_ID]);
  }

  return { sql: `WHERE ${clauses.join(' AND ')}`, args };
}

function addIn(clauses: string[], args: SqlArg[], column: string, values: Array<string | number>) {
  clauses.push(`${column} IN (${placeholders(values.length)})`);
  args.push(...values);
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

function buildOrderBy(input: PublicIssueListInput): string {
  const dir = input.dir === 'asc' ? 'ASC' : 'DESC';
  switch (input.sort) {
    case 'title':
      return `ORDER BY i.title ${dir}, i.year DESC, i.month DESC`;
    case 'magazine':
      return `ORDER BY m.name ${dir}, i.year DESC, i.month DESC`;
    case 'language':
      return `ORDER BY m.language ${dir}, i.year DESC, i.month DESC`;
    case 'pages':
      return `ORDER BY i.page_count ${dir}, i.year DESC, i.month DESC`;
    case 'size':
      return `ORDER BY i.file_size_bytes ${dir}, i.year DESC, i.month DESC`;
    case 'reads':
      return `ORDER BY i.read_count ${dir}, i.year DESC, i.month DESC`;
    default:
      return 'ORDER BY i.year DESC, i.month DESC';
  }
}

async function buildFacets(
  input: PublicIssueListInput,
  magazines: ApiMagazine[],
  searchIssueIds: string[] | null,
): Promise<BrowseFacets> {
  const [yearCountsRaw, monthCountsRaw, magazineCountsRaw, languageCountsRaw, subjectCountsRaw] = await Promise.all([
    fetchFacetCounts(input, magazines, 'years', searchIssueIds),
    fetchFacetCounts(input, magazines, 'months', searchIssueIds),
    fetchFacetCounts(input, magazines, 'magazines', searchIssueIds),
    fetchFacetCounts(input, magazines, 'languages', searchIssueIds),
    fetchFacetCounts(input, magazines, 'subjects', searchIssueIds),
  ]);
  const yearCounts = numberCountMap(yearCountsRaw);
  const monthCounts = numberCountMap(monthCountsRaw);
  const magazineCounts = stringCountMap(magazineCountsRaw);
  const languageCounts = stringCountMap(languageCountsRaw);
  const subjectCounts = stringCountMap(subjectCountsRaw);

  return {
    years: [...new Set([...yearCounts.keys(), ...input.years])]
      .sort((a, b) => b - a)
      .map((year) => ({ value: year, label: String(year), count: yearCounts.get(year) ?? 0 })),
    months: [...new Set([...monthCounts.keys(), ...input.months])]
      .sort((a, b) => a - b)
      .map((month) => ({ value: month, label: MONTH_NAMES[month as MonthIndex], count: monthCounts.get(month) ?? 0 })),
    magazines: magazines
      .map((magazine) => ({
        value: slugify(magazine.name),
        label: magazine.name,
        count: magazineCounts.get(magazine.id) ?? 0,
      }))
      .filter((option) => option.count > 0 || input.magazines.includes(option.value))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    languages: [...new Set([...languageCounts.keys(), ...input.languages])]
      .map((language) => ({
        value: language,
        label: LANGUAGE_NAMES[language as Language] ?? language,
        count: languageCounts.get(language) ?? 0,
      })),
    subjects: [...new Set([...subjectCounts.keys(), ...input.subjects])]
      .map((subject) => ({ value: subject, label: subject, count: subjectCounts.get(subject) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

async function fetchFacetCounts(
  input: PublicIssueListInput,
  magazines: ApiMagazine[],
  exclude: FacetDimension,
  searchIssueIds: string[] | null,
): Promise<Map<FacetCountValue, number>> {
  const where = buildIssueWhere(input, magazines, exclude, searchIssueIds);
  const result = await getDb().execute(facetCountQuery(where, exclude));

  return new Map(
    result.rows
      .map((row) => ({ value: row.value, count: Number(row.count ?? 0) }))
      .filter((row): row is FacetCount => (typeof row.value === 'string' || typeof row.value === 'number') && row.count > 0)
      .map((row) => [row.value, row.count]),
  );
}

function facetCountQuery(where: SqlPart, dimension: FacetDimension): { sql: string; args: SqlArg[] } {
  if (dimension === 'subjects') {
    return {
      sql: `
        SELECT topic.value AS value, COUNT(DISTINCT i.id) AS count
        FROM issues i
        JOIN magazines m ON m.id = i.magazine_id
        JOIN json_each(i.topics_json) topic ON true
        ${where.sql}
          AND topic.value IS NOT NULL
          AND topic.value != ''
        GROUP BY topic.value
      `,
      args: where.args,
    };
  }

  const selectByDimension: Record<Exclude<FacetDimension, 'subjects'>, string> = {
    years: 'i.year',
    months: 'i.month',
    magazines: 'i.magazine_id',
    languages: 'm.language',
  };
  const column = selectByDimension[dimension];

  return {
    sql: `
      SELECT ${column} AS value, COUNT(*) AS count
      FROM issues i
      JOIN magazines m ON m.id = i.magazine_id
      ${where.sql}
      GROUP BY ${column}
    `,
    args: where.args,
  };
}

function numberCountMap(counts: Map<FacetCountValue, number>): Map<number, number> {
  const numeric = new Map<number, number>();
  for (const [value, count] of counts) {
    const key = Number(value);
    if (Number.isFinite(key)) numeric.set(key, count);
  }
  return numeric;
}

function stringCountMap(counts: Map<FacetCountValue, number>): Map<string, number> {
  const strings = new Map<string, number>();
  for (const [value, count] of counts) {
    strings.set(String(value), count);
  }
  return strings;
}

async function queryIssueIdsMatchingSearch(rawQuery: string): Promise<string[] | null> {
  const query = rawQuery.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!query) return null;
  const pattern = `%${escapeLike(query)}%`;

  const result = await getDb().execute({
    sql: `
      SELECT DISTINCT i.id
      FROM issues i
      JOIN magazines m ON m.id = i.magazine_id
      LEFT JOIN json_each(i.topics_json) topic ON true
      WHERE i.is_published = 1
        AND i.pdf_url NOT LIKE '%.supabase.co/%'
        AND (
          lower(i.title) LIKE ?
          OR lower(coalesce(i.theme, '')) LIKE ?
          OR lower(coalesce(i.description, '')) LIKE ?
          OR lower(m.name) LIKE ?
          OR lower(coalesce(topic.value, '')) LIKE ?
        )
      LIMIT 10000
    `,
    args: [pattern, pattern, pattern, pattern, pattern],
  });

  return result.rows.map((row) => String(row.id));
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function resolveMagazineIds(values: string[], magazines: ApiMagazine[]): string[] {
  const byId = new Map(magazines.map((magazine) => [magazine.id, magazine.id]));
  const bySlug = new Map(magazines.map((magazine) => [slugify(magazine.name), magazine.id]));
  const byAcronym = new Map(magazines.map((magazine) => [acronym(magazine.name), magazine.id]));
  const ids = new Set<string>();

  for (const raw of values) {
    const value = raw.toLowerCase();
    const id = byId.get(raw) ?? bySlug.get(value) ?? byAcronym.get(value);
    if (id) ids.add(id);
    if (value === 'agnisikha') {
      const legacy = bySlug.get('agnishikha');
      if (legacy) ids.add(legacy);
    }
  }

  return [...ids];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function acronym(value: string): string {
  return value.split(/\s+/).map((word) => word[0]).join('').toLowerCase();
}
