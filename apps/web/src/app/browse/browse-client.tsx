'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Filter } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { IssueCard } from '@/components/magazine/issue-card';
import { FilterPanel } from '@/components/browse/filter-panel';
import { ViewToggle } from '@/components/browse/view-toggle';
import { ActiveFilterChips } from '@/components/browse/active-filter-chips';
import { IssueListView } from '@/components/browse/issue-list-view';
import { Pagination } from '@/components/browse/pagination';
import { BulkActionBar } from '@/components/browse/bulk-action-bar';
import { BulkDownloadModal } from '@/components/browse/bulk-download-modal';
import { fetchIssues, fetchMagazines, normalizeIssue } from '@/lib/api';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { useBrowseFilters } from '@/lib/use-browse-filters';
import type { BrowseFacets } from '@/lib/public-issues';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { downloadAsZip, type ZipDownloadProgress } from '@/lib/download-zip';
import { HeaderSearchDropdown } from '@/components/browse/header-search-dropdown';

const PANEL_STORAGE_KEY = 'browse:panel:open';
const PAGE_SIZE = 24;

interface BrowseClientProps {
  initialIssues: ApiIssue[];
  initialMagazines: ApiMagazine[];
  initialTotal: number;
  initialTotalPages: number;
  initialFacets: BrowseFacets;
}

export function BrowseClient(props: BrowseClientProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <BrowseContent {...props} />
      <Footer />
    </div>
  );
}

function BrowseContent({
  initialIssues,
  initialMagazines,
  initialTotal,
  initialTotalPages,
  initialFacets,
}: BrowseClientProps) {
  const {
    filters,
    toggleArray,
    setView,
    setSort,
    setQuery,
    setPage,
    clearAll,
    activeFilterCount,
    hasActiveFilters,
  } = useBrowseFilters();

  const gridTopRef = useRef<HTMLDivElement>(null);

  // Seeded from the server render — first paint shows real cards, no skeleton.
  const [magazines, setMagazines] = useState<ApiMagazine[]>(initialMagazines);
  const [issues, setIssues] = useState<ApiIssue[]>(initialIssues);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [facets, setFacets] = useState(initialFacets);
  const [loading, setLoading] = useState(false);
  const firstFetchRef = useRef(true);

  const [panelOpen, setPanelOpen] = useState(true);
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PANEL_STORAGE_KEY) : null;
    if (stored !== null) setPanelOpen(stored === 'true');
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(PANEL_STORAGE_KEY, String(panelOpen));
  }, [panelOpen]);

  // The server component seeds first paint for the current URL. Later URL
  // changes fetch a real paginated slice instead of filtering a 100-row cache.
  useEffect(() => {
    if (firstFetchRef.current) {
      firstFetchRef.current = false;
      return;
    }

    setLoading(true);
    Promise.all([
      fetchMagazines(),
      fetchIssues({
        years: filters.years,
        months: filters.months,
        magazines: filters.magazines,
        languages: filters.languages,
        subjects: filters.subjects,
        query: filters.query,
        sort: filters.sort,
        dir: filters.dir,
        page: filters.page,
        pageSize: PAGE_SIZE,
      }),
    ])
      .then(([m, i]) => {
        setMagazines(m);
        setIssues(i.data);
        setTotal(i.total);
        setTotalPages(i.totalPages);
        if (i.facets) setFacets(i.facets);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  const currentPage = Math.min(filters.page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + issues.length, total);
  const normalized = useMemo(() => issues.map(normalizeIssue), [issues]);

  function handlePageChange(page: number) {
    setPage(page);
    if (gridTopRef.current) {
      const top = gridTopRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // Bulk selection / download state. Selection mode is reset whenever this
  // page unmounts so navigating away always lands cleanly.
  const selectionEnabled = useBulkSelection((s) => s.enabled);
  const selectedIds = useBulkSelection((s) => s.selectedIds);
  const enableSelection = useBulkSelection((s) => s.enable);
  const disableSelection = useBulkSelection((s) => s.disable);
  const selectAll = useBulkSelection((s) => s.selectAll);
  useEffect(() => disableSelection, [disableSelection]);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [progress, setProgress] = useState<ZipDownloadProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSelectAllVisible = () => {
    const visibleIds = issues.map((i) => i.id);
    const everySelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    if (everySelected) selectAll([]);
    else selectAll(visibleIds);
  };

  const handleDownload = async () => {
    const picked = issues.filter((i) => selectedIds.has(i.id));
    if (picked.length === 0) return;
    abortRef.current = new AbortController();
    setProgress({
      phase: 'fetching',
      fetched: 0,
      total: picked.length,
      zipPercent: 0,
      skipped: [],
    });
    setDownloadOpen(true);
    try {
      await downloadAsZip({
        files: picked.map((i) => ({ name: i.title, url: i.pdf_url })),
        zipName: `AIM Archive — ${picked.length} issue${picked.length === 1 ? '' : 's'}`,
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });
    } catch (err) {
      setProgress({
        phase: 'error',
        fetched: 0,
        total: picked.length,
        zipPercent: 0,
        skipped: [],
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const closeDownloadModal = () => {
    setDownloadOpen(false);
    setProgress(null);
    // Drop the selection — typical flow is one batch and out.
    disableSelection();
  };

  const cancelDownload = () => {
    abortRef.current?.abort();
  };

  return (
    <main className="relative flex-1">
      <HeaderSearchDropdown />

      <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">Browse Archive</h1>
          <p className="mt-2 text-lg text-gray-600">
            Explore {total} issue{total !== 1 ? 's' : ''} across{' '}
            {magazines.length} magazine{magazines.length !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

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
              facets={facets}
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
                facets={facets}
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
                className="inline-flex items-center gap-2 rounded-xl border border-flame-200 bg-white px-3.5 py-2 text-sm font-medium text-flame-700 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-gradient-to-r from-gold-500 to-flame-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden text-sm text-gray-400 sm:inline">
                {total === 0
                  ? 'No issues'
                  : total <= PAGE_SIZE
                    ? `${total} issue${total !== 1 ? 's' : ''}`
                    : `${pageStart + 1}-${pageEnd} of ${total} issues`}
              </span>
              <button
                onClick={() => (selectionEnabled ? disableSelection() : enableSelection())}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  selectionEnabled
                    ? 'border-flame-300 bg-flame-50 text-flame-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-flame-200 hover:bg-flame-50/50 hover:text-flame-700'
                }`}
                aria-pressed={selectionEnabled}
                title={selectionEnabled ? 'Exit selection mode' : 'Select multiple issues to download'}
              >
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{selectionEnabled ? 'Done' : 'Select'}</span>
              </button>
              <ViewToggle view={filters.view} onChange={setView} />
            </div>
          </div>

          <ActiveFilterChips
            filters={filters}
            magazines={magazines}
            onRemove={toggleArray}
            onRemoveQuery={() => setQuery('')}
            onClearAll={clearAll}
          />

          {loading ? (
            <LoadingState view={filters.view} />
          ) : total === 0 ? (
            <EmptyState onClearAll={clearAll} hasActiveFilters={hasActiveFilters} />
          ) : filters.view === 'list' ? (
            <IssueListView
              issues={normalized}
              sort={filters.sort}
              dir={filters.dir}
              onSort={setSort}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
              {normalized.map((issue, i) => (
                <IssueCard key={issue.id} issue={issue} index={i} />
              ))}
            </div>
          )}

          {!loading && total > 0 && (
            <Pagination
              current={currentPage}
              total={totalPages}
              onChange={handlePageChange}
            />
          )}
        </div>
      </div>

      <BulkActionBar
        issues={issues}
        onDownload={handleDownload}
        onSelectAll={handleSelectAllVisible}
      />
      <BulkDownloadModal
        open={downloadOpen}
        progress={progress}
        onCancel={cancelDownload}
        onClose={closeDownloadModal}
      />
    </main>
  );
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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
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
          className="mt-4 bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-sm font-medium text-transparent"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
