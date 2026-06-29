'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ApiIssue } from './api';
import type { AvailabilityFilter } from './public-issues';

export type FilterDimension = 'years' | 'months' | 'magazines' | 'languages' | 'subjects';
export type SortColumn = 'title' | 'magazine' | 'language' | 'pages' | 'size' | 'reads';

export interface BrowseFilters {
  availability: AvailabilityFilter;
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

export function useBrowseFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<BrowseFilters>(() => parseFilters(searchParams));

  useEffect(() => {
    setFilters(parseFilters(searchParams));
  }, [searchParams]);

  const writeFilters = useCallback(
    (nextFilters: BrowseFilters) => {
      const next = filtersToSearchParams(nextFilters);
      const qs = next.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      const current = `${window.location.pathname}${window.location.search}`;
      if (href === current) return;
      window.history.replaceState(window.history.state, '', href);
    },
    [pathname],
  );

  const commitFilters = useCallback(
    (nextFilters: BrowseFilters) => {
      setFilters(nextFilters);
      writeFilters(nextFilters);
    },
    [writeFilters],
  );

  const toggleArray = useCallback(
    (dimension: FilterDimension, value: string | number) => {
      const current = filters[dimension] as Array<string | number>;
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      commitFilters({ ...filters, [dimension]: next, page: 1 });
    },
    [commitFilters, filters],
  );

  const setView = useCallback(
    (view: 'grid' | 'list') => {
      commitFilters({ ...filters, view });
    },
    [commitFilters, filters],
  );

  const setAvailability = useCallback(
    (availability: AvailabilityFilter) => {
      if (availability === filters.availability) return;
      commitFilters({ ...filters, availability, page: 1 });
    },
    [commitFilters, filters],
  );

  const setSort = useCallback(
    (col: SortColumn) => {
      let nextSort: SortColumn | null = col;
      let nextDir: 'asc' | 'desc' = 'desc';
      if (filters.sort === col) {
        const newDir = filters.dir === 'desc' ? 'asc' : null;
        if (newDir === 'asc') {
          nextDir = 'asc';
        } else {
          nextSort = null;
          nextDir = 'desc';
        }
      }
      commitFilters({ ...filters, sort: nextSort, dir: nextDir, page: 1 });
    },
    [commitFilters, filters],
  );

  const setQuery = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === filters.query) return;
      commitFilters({ ...filters, query: trimmed, page: 1 });
    },
    [commitFilters, filters],
  );

  const setPage = useCallback(
    (page: number) => {
      commitFilters({ ...filters, page: Math.max(1, page) });
    },
    [commitFilters, filters],
  );

  const clearAll = useCallback(() => {
    commitFilters({
      ...EMPTY_FILTERS,
      view: filters.view,
      sort: filters.sort,
      dir: filters.dir,
    });
  }, [commitFilters, filters.dir, filters.sort, filters.view]);

  const activeFilterCount =
    filters.years.length +
    filters.months.length +
    filters.magazines.length +
    filters.languages.length +
    filters.subjects.length +
    (filters.query.length > 0 ? 1 : 0) +
    (filters.availability !== 'read' ? 1 : 0);

  return {
    filters,
    toggleArray,
    setAvailability,
    setView,
    setSort,
    setQuery,
    setPage,
    clearAll,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}

const EMPTY_FILTERS: BrowseFilters = {
  availability: 'read',
  years: [],
  months: [],
  magazines: [],
  languages: [],
  subjects: [],
  query: '',
  view: 'grid',
  sort: null,
  dir: 'desc',
  page: 1,
};

function parseFilters(params: { get(name: string): string | null }): BrowseFilters {
  return {
    availability: parseAvailability(params.get('availability')),
    years: parseIntArr(params.get('year')),
    months: parseIntArr(params.get('month')),
    magazines: parseStrArr(params.get('magazine')),
    languages: parseStrArr(params.get('language')),
    subjects: parseStrArr(params.get('subject')),
    query: (params.get('q') ?? '').trim(),
    view: params.get('view') === 'list' ? 'list' : 'grid',
    sort: (params.get('sort') as SortColumn | null) ?? null,
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1),
  };
}

function filtersToSearchParams(filters: BrowseFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.availability !== 'read') params.set('availability', filters.availability);
  setArrayParam(params, 'year', filters.years);
  setArrayParam(params, 'month', filters.months);
  setArrayParam(params, 'magazine', filters.magazines);
  setArrayParam(params, 'language', filters.languages);
  setArrayParam(params, 'subject', filters.subjects);
  if (filters.query.length > 0) params.set('q', filters.query);
  if (filters.view === 'list') params.set('view', 'list');
  if (filters.sort) {
    params.set('sort', filters.sort);
    if (filters.dir === 'asc') params.set('dir', 'asc');
  }
  if (filters.page > 1) params.set('page', String(filters.page));

  return params;
}

function setArrayParam(params: URLSearchParams, key: string, values: Array<string | number>) {
  if (values.length > 0) params.set(key, values.join(','));
}

function parseAvailability(value: string | null): AvailabilityFilter {
  if (value === 'subscriber' || value === 'all') return value;
  return 'read';
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
  if (issue.theme && issue.theme.toLowerCase().includes(q)) return true;
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
  if (issue.magazine_id === value) return true;

  const slug = slugify(issue.magazines.name);
  if (slug === normalized) return true;

  // Legacy alias — pre-rename slug "agnisikha" still matches the renamed
  // "Agnishikha" magazine. Lets old shared `?magazine=agnisikha` links keep
  // working through the spelling transition.
  if (normalized === 'agnisikha' && slug === 'agnishikha') return true;

  if (acronym(issue.magazines.name) === normalized) return true;
  return false;
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
