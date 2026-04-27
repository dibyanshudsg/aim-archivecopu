'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { IssueCard } from '@/components/magazine/issue-card';
import { FilterPanel } from '@/components/browse/filter-panel';
import { ViewToggle } from '@/components/browse/view-toggle';
import { ActiveFilterChips } from '@/components/browse/active-filter-chips';
import { IssueListView } from '@/components/browse/issue-list-view';
import { Pagination } from '@/components/browse/pagination';
import { fetchIssues, fetchMagazines, normalizeIssue } from '@/lib/api';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import {
  applyFilters,
  useBrowseFilters,
  type SortColumn,
} from '@/lib/use-browse-filters';

const PANEL_STORAGE_KEY = 'browse:panel:open';
const PAGE_SIZE = 24;

export function BrowseClient() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <BrowseContent />
      <Footer />
    </div>
  );
}

function BrowseContent() {
  const {
    filters,
    toggleArray,
    setView,
    setSort,
    setPage,
    clearAll,
    activeFilterCount,
    hasActiveFilters,
  } = useBrowseFilters();

  const gridTopRef = useRef<HTMLDivElement>(null);

  const [magazines, setMagazines] = useState<ApiMagazine[]>([]);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const [panelOpen, setPanelOpen] = useState(true);
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PANEL_STORAGE_KEY) : null;
    if (stored !== null) setPanelOpen(stored === 'true');
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(PANEL_STORAGE_KEY, String(panelOpen));
  }, [panelOpen]);

  // Load full dataset once (small archive — facet counts done client-side).
  useEffect(() => {
    fetchMagazines().then(setMagazines).catch(console.error);
  }, []);
  useEffect(() => {
    setLoading(true);
    fetchIssues({ pageSize: 100 })
      .then((res) => setIssues(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => applyFilters(issues, filters), [issues, filters]);
  const sorted = useMemo(() => sortIssues(filtered, filters.sort, filters.dir), [filtered, filters.sort, filters.dir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, sorted.length);
  const paged = useMemo(() => sorted.slice(pageStart, pageEnd), [sorted, pageStart, pageEnd]);
  const normalized = useMemo(() => paged.map(normalizeIssue), [paged]);

  function handlePageChange(page: number) {
    setPage(page);
    if (gridTopRef.current) {
      const top = gridTopRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  return (
    <main className="relative flex-1">
      <section className="border-b border-gold-100 bg-gradient-to-b from-gold-50 to-white px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">Browse Archive</h1>
          <p className="mt-2 text-lg text-gray-600">
            Explore {issues.length} issue{issues.length !== 1 ? 's' : ''} across{' '}
            {magazines.length} magazine{magazines.length !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* Reserved space for the upcoming search bar */}
      <div className="border-b border-gray-100 bg-white px-6 py-4 lg:px-8">
        <div className="mx-auto h-10 max-w-7xl rounded-xl border border-dashed border-gray-200 bg-gray-50/50" />
      </div>

      <div className="flex">
        {/* Desktop docked panel — always mounted, animates width so the
            grid resizes smoothly alongside it. */}
        <motion.aside
          initial={false}
          animate={{ width: panelOpen ? 280 : 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 240, mass: 0.8 }}
          className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 self-start overflow-hidden md:block"
          aria-hidden={!panelOpen}
        >
          <div
            className={`absolute inset-y-0 right-0 w-[280px] border-r border-gray-100 transition-opacity duration-200 ${
              panelOpen ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <FilterPanel
              issues={issues}
              magazines={magazines}
              filters={filters}
              onToggle={toggleArray}
              onClearAll={clearAll}
              hasActiveFilters={hasActiveFilters}
              onClose={() => setPanelOpen(false)}
            />
          </div>
        </motion.aside>

        {/* Mobile drawer — overlay with backdrop */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setPanelOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
            />
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {panelOpen && (
            <motion.aside
              key="mobile-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] shadow-xl md:hidden"
            >
              <FilterPanel
                issues={issues}
                magazines={magazines}
                filters={filters}
                onToggle={toggleArray}
                onClearAll={clearAll}
                hasActiveFilters={hasActiveFilters}
                onClose={() => setPanelOpen(false)}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Grid area */}
        <div ref={gridTopRef} className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-3">
            {!panelOpen && (
              <button
                onClick={() => setPanelOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-gold-200 bg-white px-3.5 py-2 text-sm font-medium text-gold-700 shadow-sm transition-colors hover:border-gold-300 hover:bg-gold-50"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {sorted.length === 0
                  ? 'No issues'
                  : sorted.length <= PAGE_SIZE
                    ? `${sorted.length} issue${sorted.length !== 1 ? 's' : ''}`
                    : `${pageStart + 1}–${pageEnd} of ${sorted.length} issues`}
              </span>
              <ViewToggle view={filters.view} onChange={setView} />
            </div>
          </div>

          <ActiveFilterChips
            filters={filters}
            magazines={magazines}
            onRemove={toggleArray}
            onClearAll={clearAll}
          />

          {loading ? (
            <LoadingState view={filters.view} />
          ) : sorted.length === 0 ? (
            <EmptyState onClearAll={clearAll} hasActiveFilters={hasActiveFilters} />
          ) : filters.view === 'list' ? (
            <IssueListView
              issues={normalized}
              sort={filters.sort}
              dir={filters.dir}
              onSort={setSort}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {normalized.map((issue, i) => (
                <IssueCard key={issue.id} issue={issue} index={i} />
              ))}
            </div>
          )}

          {!loading && sorted.length > 0 && (
            <Pagination
              current={currentPage}
              total={totalPages}
              onChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function sortIssues(
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

function LoadingState({ view }: { view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white">
          <div className="aspect-[3/4] rounded-t-2xl bg-gray-100" />
          <div className="space-y-2 p-3.5">
            <div className="h-3 w-2/3 rounded bg-gray-100" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-1/2 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  onClearAll,
  hasActiveFilters,
}: {
  onClearAll: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="py-20 text-center">
      <p className="text-lg text-gray-400">No issues match your filters</p>
      {hasActiveFilters && (
        <button
          onClick={onClearAll}
          className="mt-4 text-sm font-medium text-gold-600 hover:text-gold-700"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

