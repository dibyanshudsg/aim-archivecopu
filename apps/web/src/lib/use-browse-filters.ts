'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ApiIssue } from './api';

export type FilterDimension = 'years' | 'months' | 'magazines' | 'languages' | 'subjects';
export type SortColumn = 'title' | 'magazine' | 'language' | 'pages' | 'size' | 'reads';

export interface BrowseFilters {
  years: number[];
  months: number[];
  magazines: string[];
  languages: string[];
  subjects: string[];
  query: string;
  view: 'grid' | 'list';
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  page: number;
}

const ARRAY_KEYS: Record<FilterDimension, string> = {
  years: 'year',
  months: 'month',
  magazines: 'magazine',
  languages: 'language',
  subjects: 'subject',
};

export function useBrowseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<BrowseFilters>(
    () => ({
      years: parseIntArr(searchParams.get('year')),
      months: parseIntArr(searchParams.get('month')),
      magazines: parseStrArr(searchParams.get('magazine')),
      languages: parseStrArr(searchParams.get('language')),
      subjects: parseStrArr(searchParams.get('subject')),
      query: (searchParams.get('q') ?? '').trim(),
      view: searchParams.get('view') === 'list' ? 'list' : 'grid',
      sort: (searchParams.get('sort') as SortColumn | null) ?? null,
      dir: searchParams.get('dir') === 'asc' ? 'asc' : 'desc',
      page: Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1),
    }),
    [searchParams],
  );

  const writeParams = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const toggleArray = useCallback(
    (dimension: FilterDimension, value: string | number) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = filters[dimension] as Array<string | number>;
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const key = ARRAY_KEYS[dimension];
      if (next.length === 0) params.delete(key);
      else params.set(key, next.join(','));
      params.delete('page'); // reset to page 1 when filters change
      writeParams(params);
    },
    [filters, searchParams, writeParams],
  );

  const setView = useCallback(
    (view: 'grid' | 'list') => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === 'grid') params.delete('view');
      else params.set('view', 'list');
      writeParams(params);
    },
    [searchParams, writeParams],
  );

  const setSort = useCallback(
    (col: SortColumn) => {
      const params = new URLSearchParams(searchParams.toString());
      if (filters.sort === col) {
        const newDir = filters.dir === 'desc' ? 'asc' : null;
        if (newDir === 'asc') {
          params.set('sort', col);
          params.set('dir', 'asc');
        } else {
          params.delete('sort');
          params.delete('dir');
        }
      } else {
        params.set('sort', col);
        params.delete('dir');
      }
      params.delete('page'); // sort change resets to page 1
      writeParams(params);
    },
    [filters.sort, filters.dir, searchParams, writeParams],
  );

  const setQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed.length === 0) params.delete('q');
      else params.set('q', trimmed);
      params.delete('page');
      writeParams(params);
    },
    [searchParams, writeParams],
  );

  const setPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) params.delete('page');
      else params.set('page', String(page));
      writeParams(params);
    },
    [searchParams, writeParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.view === 'list') params.set('view', 'list');
    if (filters.sort) {
      params.set('sort', filters.sort);
      if (filters.dir === 'asc') params.set('dir', 'asc');
    }
    writeParams(params);
  }, [filters.view, filters.sort, filters.dir, writeParams]);

  const activeFilterCount =
    filters.years.length +
    filters.months.length +
    filters.magazines.length +
    filters.languages.length +
    filters.subjects.length +
    (filters.query.length > 0 ? 1 : 0);

  return {
    filters,
    toggleArray,
    setView,
    setSort,
    setQuery,
    setPage,
    clearAll,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}

function parseIntArr(v: string | null): number[] {
  if (!v) return [];
  return v
    .split(',')
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

function parseStrArr(v: string | null): string[] {
  if (!v) return [];
  return v.split(',').filter(Boolean);
}

/**
 * Apply the current filter state to a list of issues.
 * `exclude` — when computing facet counts for a section, pass that section's
 * dimension so its own selection doesn't shrink its options.
 */
export function applyFilters(
  issues: ApiIssue[],
  filters: BrowseFilters,
  exclude?: FilterDimension,
): ApiIssue[] {
  const q = filters.query.toLowerCase();
  return issues.filter((issue) => {
    if (
      exclude !== 'years' &&
      filters.years.length > 0 &&
      !filters.years.includes(issue.year)
    )
      return false;
    if (
      exclude !== 'months' &&
      filters.months.length > 0 &&
      !filters.months.includes(issue.month)
    )
      return false;
    if (
      exclude !== 'magazines' &&
      filters.magazines.length > 0 &&
      !filters.magazines.some((value) => matchesMagazineFilter(issue, value))
    )
      return false;
    if (
      exclude !== 'languages' &&
      filters.languages.length > 0 &&
      !filters.languages.includes(issue.magazines.language)
    )
      return false;
    if (
      exclude !== 'subjects' &&
      filters.subjects.length > 0 &&
      !filters.subjects.some((s) => issue.topics.includes(s))
    )
      return false;
    if (q.length > 0 && !matchesQuery(issue, q)) return false;
    return true;
  });
}

function matchesQuery(issue: ApiIssue, q: string): boolean {
  if (issue.title.toLowerCase().includes(q)) return true;
  if (issue.magazines.name.toLowerCase().includes(q)) return true;
  if (issue.description && issue.description.toLowerCase().includes(q)) return true;
  for (const t of issue.topics) if (t.toLowerCase().includes(q)) return true;
  return false;
}

export function sortIssues(
  issues: ApiIssue[],
  sort: SortColumn | null,
  dir: 'asc' | 'desc',
): ApiIssue[] {
  if (!sort) {
    return [...issues].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }
  const mult = dir === 'asc' ? 1 : -1;
  return [...issues].sort((a, b) => {
    let av: string | number = '';
    let bv: string | number = '';
    switch (sort) {
      case 'title':
        av = a.title;
        bv = b.title;
        break;
      case 'magazine':
        av = a.magazines.name;
        bv = b.magazines.name;
        break;
      case 'language':
        av = a.magazines.language;
        bv = b.magazines.language;
        break;
      case 'pages':
        av = a.page_count ?? 0;
        bv = b.page_count ?? 0;
        break;
      case 'size':
        av = a.file_size_bytes;
        bv = b.file_size_bytes;
        break;
      case 'reads':
        av = a.read_count;
        bv = b.read_count;
        break;
    }
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * mult;
    return ((av as number) - (bv as number)) * mult;
  });
}

function matchesMagazineFilter(issue: ApiIssue, value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    issue.magazine_id === value ||
    slugify(issue.magazines.name) === normalized ||
    acronym(issue.magazines.name) === normalized
  );
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
