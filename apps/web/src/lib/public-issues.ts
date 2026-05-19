import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { createPublicClient } from '@/lib/supabase-server';
import type { SortColumn } from '@/lib/use-browse-filters';
import { LANGUAGE_NAMES, MONTH_NAMES, type Language, type MonthIndex } from '@aim-archive/shared';

export interface BrowseFacetOption<T extends string | number> {
  value: T;
  label: string;
  count: number;
}

export interface BrowseFacets {
  years: BrowseFacetOption<number>[];
  months: BrowseFacetOption<number>[];
  magazines: BrowseFacetOption<string>[];
  languages: BrowseFacetOption<string>[];
  subjects: BrowseFacetOption<string>[];
}

export interface PublicIssueListInput {
  years: number[];
  months: number[];
  magazines: string[];
  languages: string[];
  subjects: string[];
  q: string;
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface PublicIssueListResult {
  data: ApiIssue[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: BrowseFacets;
}

type FacetDimension = 'years' | 'months' | 'magazines' | 'languages' | 'subjects';

interface FacetIssue {
  id: string;
  magazine_id: string;
  topics: string[];
  year: number;
  month: number;
  magazines: {
    language: string;
  };
}

interface SearchableIssue {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  topics: string[] | null;
  magazines: {
    name: string;
  } | null;
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 24;
const FACET_ROW_LIMIT = 5000;
const SEARCH_ROW_LIMIT = 10000;
const IMPOSSIBLE_UUID = '00000000-0000-0000-0000-000000000000';

export function parsePublicIssueListInput(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): PublicIssueListInput {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const pageSize = clamp(toInt(get('page_size')) ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  return {
    years: parseIntList(get('year')),
    months: parseIntList(get('month')).filter((m) => m >= 1 && m <= 12),
    magazines: parseStringList(get('magazine') ?? get('magazine_id')),
    languages: parseStringList(get('language')),
    subjects: parseStringList(get('subject') ?? get('topic')),
    q: (get('q') ?? '').trim().slice(0, 500),
    sort: parseSort(get('sort')),
    dir: get('dir') === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, toInt(get('page')) ?? 1),
    pageSize,
  };
}

export async function listPublicIssues(input: PublicIssueListInput): Promise<PublicIssueListResult> {
  const supabase = createPublicClient();
  const { data: magazineRows } = await supabase.from('magazines').select('*').order('name');
  const magazines = (magazineRows ?? []) as ApiMagazine[];
  const searchIssueIds = await queryIssueIdsMatchingSearch(input.q);

  let query = supabase
    .from('issues')
    .select('*, magazines!inner(id, name, language, description, cover_image_url)', { count: 'exact' })
    .eq('is_published', true);

  query = applyIssueFilters(query, input, magazines, undefined, searchIssueIds);
  query = applyIssueSort(query, input);

  const from = (input.page - 1) * input.pageSize;
  const { data, error, count } = await query.range(from, from + input.pageSize - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const facets = await buildFacets(input, magazines, searchIssueIds);

  return {
    data: (data ?? []) as ApiIssue[],
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    facets,
  };
}

type FilterableQuery = {
  in: (column: string, values: unknown[]) => FilterableQuery;
  eq: (column: string, value: unknown) => FilterableQuery;
  overlaps: (column: string, values: unknown[]) => FilterableQuery;
  or: (filters: string) => FilterableQuery;
};

type SortableQuery = {
  order: (column: string, options?: { ascending?: boolean; referencedTable?: string }) => SortableQuery;
};

function applyIssueFilters<Query>(
  query: Query,
  input: PublicIssueListInput,
  magazines: ApiMagazine[],
  exclude?: FacetDimension,
  searchIssueIds?: string[] | null,
): Query {
  let next = query as unknown as FilterableQuery;

  if (exclude !== 'years' && input.years.length > 0) next = next.in('year', input.years);
  if (exclude !== 'months' && input.months.length > 0) next = next.in('month', input.months);

  if (exclude !== 'magazines' && input.magazines.length > 0) {
    const ids = resolveMagazineIds(input.magazines, magazines);
    next = ids.length > 0 ? next.in('magazine_id', ids) : next.eq('magazine_id', IMPOSSIBLE_UUID);
  }

  if (exclude !== 'languages' && input.languages.length > 0) {
    next = next.in('magazines.language', input.languages);
  }

  if (exclude !== 'subjects' && input.subjects.length > 0) {
    next = next.overlaps('topics', input.subjects);
  }

  if (input.q) {
    if (!searchIssueIds || searchIssueIds.length === 0) next = next.eq('id', IMPOSSIBLE_UUID);
    else next = next.in('id', searchIssueIds);
  }

  return next as unknown as Query;
}

function applyIssueSort<Query>(query: Query, input: PublicIssueListInput): Query {
  let next = query as unknown as SortableQuery;
  const ascending = input.dir === 'asc';

  switch (input.sort) {
    case 'title':
      next = next.order('title', { ascending });
      break;
    case 'magazine':
      next = next.order('name', { ascending, referencedTable: 'magazines' });
      break;
    case 'language':
      next = next.order('language', { ascending, referencedTable: 'magazines' });
      break;
    case 'pages':
      next = next.order('page_count', { ascending });
      break;
    case 'size':
      next = next.order('file_size_bytes', { ascending });
      break;
    case 'reads':
      next = next.order('read_count', { ascending });
      break;
    default:
      next = next.order('year', { ascending: false }).order('month', { ascending: false });
      break;
  }

  if (input.sort) next = next.order('year', { ascending: false }).order('month', { ascending: false });
  return next as unknown as Query;
}

async function buildFacets(
  input: PublicIssueListInput,
  magazines: ApiMagazine[],
  searchIssueIds: string[] | null,
): Promise<BrowseFacets> {
  const [yearRows, monthRows, magazineFacetRows, languageRows, subjectRows] = await Promise.all([
    fetchFacetRows(input, magazines, 'years', searchIssueIds),
    fetchFacetRows(input, magazines, 'months', searchIssueIds),
    fetchFacetRows(input, magazines, 'magazines', searchIssueIds),
    fetchFacetRows(input, magazines, 'languages', searchIssueIds),
    fetchFacetRows(input, magazines, 'subjects', searchIssueIds),
  ]);

  const yearCounts = countBy(yearRows, (i) => i.year);
  const monthCounts = countBy(monthRows, (i) => i.month);
  const magazineCounts = countBy(magazineFacetRows, (i) => i.magazine_id);
  const languageCounts = countBy(languageRows, (i) => i.magazines.language);
  const subjectCounts = new Map<string, number>();
  for (const issue of subjectRows) {
    for (const topic of issue.topics ?? []) subjectCounts.set(topic, (subjectCounts.get(topic) ?? 0) + 1);
  }

  const yearValues = new Set([...yearCounts.keys(), ...input.years]);
  const monthValues = new Set([...monthCounts.keys(), ...input.months]);
  const subjectValues = new Set([...subjectCounts.keys(), ...input.subjects]);

  return {
    years: [...yearValues]
      .sort((a, b) => b - a)
      .map((year) => ({ value: year, label: String(year), count: yearCounts.get(year) ?? 0 })),
    months: [...monthValues]
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
    languages: [...languageCounts.keys()]
      .concat(input.languages.filter((language) => !languageCounts.has(language)))
      .map((language) => ({
        value: language,
        label: LANGUAGE_NAMES[language as Language] ?? language,
        count: languageCounts.get(language) ?? 0,
      })),
    subjects: [...subjectValues]
      .map((subject) => ({ value: subject, label: subject, count: subjectCounts.get(subject) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

async function fetchFacetRows(
  input: PublicIssueListInput,
  magazines: ApiMagazine[],
  exclude: FacetDimension,
  searchIssueIds: string[] | null,
): Promise<FacetIssue[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from('issues')
    .select('id, magazine_id, title, theme, description, topics, year, month, magazines!inner(id, name, language, description, cover_image_url)')
    .eq('is_published', true);

  query = applyIssueFilters(query, input, magazines, exclude, searchIssueIds);
  const { data, error } = await query.limit(FACET_ROW_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FacetIssue[];
}

function parseStringList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function parseIntList(value: string | undefined): number[] {
  return parseStringList(value)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 1950 && n <= 2100);
}

function parseSort(value: string | undefined): SortColumn | null {
  if (value === 'title' || value === 'magazine' || value === 'language' || value === 'pages' || value === 'size' || value === 'reads') {
    return value;
  }
  return null;
}

function toInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveMagazineIds(values: string[], magazines: ApiMagazine[]): string[] {
  const byId = new Map(magazines.map((m) => [m.id, m.id]));
  const bySlug = new Map(magazines.map((m) => [slugify(m.name), m.id]));
  const byAcronym = new Map(magazines.map((m) => [acronym(m.name), m.id]));
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

async function queryIssueIdsMatchingSearch(rawQuery: string): Promise<string[] | null> {
  const query = normalizeSearch(rawQuery);
  if (!query) return null;

  const { data, error } = await createPublicClient()
    .from('issues')
    .select('id, title, theme, description, topics, magazines!inner(name)')
    .eq('is_published', true)
    .limit(SEARCH_ROW_LIMIT);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as SearchableIssue[])
    .filter((issue) => matchesSearchIssue(issue, query))
    .map((issue) => issue.id);
}

function matchesSearchIssue(issue: SearchableIssue, query: string): boolean {
  if (issue.title.toLowerCase().includes(query)) return true;
  if (issue.theme?.toLowerCase().includes(query)) return true;
  if (issue.magazines?.name.toLowerCase().includes(query)) return true;
  if (issue.description?.toLowerCase().includes(query)) return true;
  return (issue.topics ?? []).some((topic) => topic.toLowerCase().includes(query));
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function countBy<T, K extends string | number>(rows: T[], select: (row: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const row of rows) {
    const key = select(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function acronym(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toLowerCase();
}
