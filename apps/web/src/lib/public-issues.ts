import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { listPublicIssues as listTursoPublicIssues } from '@/lib/db';
import type { SortColumn } from '@/lib/use-browse-filters';

export type AvailabilityFilter = 'read' | 'subscriber' | 'all';

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
  availability: AvailabilityFilter;
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
  magazines: ApiMagazine[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: BrowseFacets;
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 24;

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
    availability: parseAvailability(get('availability')),
    years: parseIntList(get('year'), 1950, 2100),
    months: parseIntList(get('month'), 1, 12),
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
  return listTursoPublicIssues(input);
}

function parseAvailability(value: string | undefined): AvailabilityFilter {
  if (value === 'subscriber' || value === 'all') return value;
  return 'read';
}

function parseStringList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function parseIntList(value: string | undefined, min: number, max: number): number[] {
  return parseStringList(value)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= min && n <= max);
}

function parseSort(value: string | undefined): SortColumn | null {
  if (
    value === 'date' ||
    value === 'title' ||
    value === 'magazine' ||
    value === 'language' ||
    value === 'pages' ||
    value === 'size' ||
    value === 'reads'
  ) {
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
