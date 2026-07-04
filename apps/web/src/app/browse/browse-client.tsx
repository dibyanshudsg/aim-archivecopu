'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Eye,
  Filter,
  HardDrive,
  Layers3,
  LockKeyhole,
} from 'lucide-react';
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
import { fetchIssues, normalizeIssue } from '@/lib/api';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { useBrowseFilters } from '@/lib/use-browse-filters';
import type { BrowseFilters, SortColumn } from '@/lib/use-browse-filters';
import type { AvailabilityFilter, BrowseFacets } from '@/lib/public-issues';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { downloadAsZip, type ZipDownloadProgress } from '@/lib/download-zip';
import { HeaderSearchDropdown } from '@/components/browse/header-search-dropdown';

const PANEL_STORAGE_KEY = 'browse:panel:open';
const PAGE_SIZE = 24;
const BROWSE_GRID_COLUMNS = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';
const BROWSE_GRID_FULL_SPAN = 'col-span-2 sm:col-span-3 md:col-span-3 lg:col-span-4 xl:col-span-4';

type NormalizedIssue = ReturnType<typeof normalizeIssue>;
type BrowseGridItem =
  | { type: 'year'; year: number; key: string }
  | { type: 'issue'; issue: NormalizedIssue; index: number };

interface BrowseCacheEntry {
  issues: ApiIssue[];
  total: number;
  totalPages: number;
  facets: BrowseFacets;
}

const availabilityOptions = [
  {
    id: 'read',
    label: 'Read now',
    helper: 'Public PDFs',
    Icon: BookOpen,
  },
  {
    id: 'subscriber',
    label: 'Subscriber editions',
    helper: 'Current circulation',
    Icon: LockKeyhole,
  },
  {
    id: 'all',
    label: 'All editions',
    helper: 'Mixed view',
    Icon: Layers3,
  },
] satisfies Array<{
  id: AvailabilityFilter;
  label: string;
  helper: string;
  Icon: typeof BookOpen;
}>;

const availabilityCopy: Record<AvailabilityFilter, { heading: string; subtitle: string; countLabel: string }> = {
  read: {
    heading: 'Browse Archive',
    subtitle: 'Explore public archive editions available to read online.',
    countLabel: 'readable',
  },
  subscriber: {
    heading: 'Subscriber Editions',
    subtitle: 'Current circulation editions are visible for discovery and open publicly after the rolling 5-year archive window.',
    countLabel: 'subscriber',
  },
  all: {
    heading: 'Browse Archive',
    subtitle: 'Browse readable archive editions and current subscriber editions together.',
    countLabel: 'archive',
  },
};

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
    setSortChoice,
    setQuery,
    setPage,
    setAvailability,
    clearAll,
    activeFilterCount,
    hasActiveFilters,
  } = useBrowseFilters();

  const gridTopRef = useRef<HTMLDivElement>(null);
  const currentCacheKey = useMemo(() => browseCacheKey(filters), [filters]);
  const responseCacheRef = useRef(new Map<string, BrowseCacheEntry>());
  const inFlightPrefetchRef = useRef(new Set<string>());
  const cacheSeededRef = useRef(false);
  if (!cacheSeededRef.current) {
    responseCacheRef.current.set(currentCacheKey, {
      issues: initialIssues,
      total: initialTotal,
      totalPages: initialTotalPages,
      facets: initialFacets,
    });
    cacheSeededRef.current = true;
  }

  // Seeded from the server render — first paint shows real cards, no skeleton.
  const [magazines] = useState<ApiMagazine[]>(initialMagazines);
  const [issues, setIssues] = useState<ApiIssue[]>(initialIssues);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [facets, setFacets] = useState(initialFacets);
  const [loading, setLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const showScrollTopRef = useRef(false);
  const firstFetchRef = useRef(true);

  const [panelOpen, setPanelOpen] = useState(true);
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PANEL_STORAGE_KEY) : null;
    if (stored !== null) setPanelOpen(stored === 'true');
    else if (window.matchMedia('(max-width: 767px)').matches) setPanelOpen(false);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(PANEL_STORAGE_KEY, String(panelOpen));
  }, [panelOpen]);

  useEffect(() => {
    let frame = 0;

    const updateScrollTopVisibility = () => {
      frame = 0;
      const nextVisible = window.scrollY > 520;
      if (nextVisible === showScrollTopRef.current) return;
      showScrollTopRef.current = nextVisible;
      setShowScrollTop(nextVisible);
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollTopVisibility);
    };

    updateScrollTopVisibility();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // The server component seeds first paint for the current URL. Later URL
  // changes fetch a real paginated slice instead of filtering a 100-row cache.
  useEffect(() => {
    if (firstFetchRef.current) {
      firstFetchRef.current = false;
      return;
    }

    const cached = responseCacheRef.current.get(currentCacheKey);
    if (cached) {
      setIssues(cached.issues);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
      setFacets(cached.facets);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
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
        availability: filters.availability,
        signal: controller.signal,
      })
      .then((result) => {
        const entry = {
          issues: result.data,
          total: result.total,
          totalPages: result.totalPages,
          facets: result.facets ?? initialFacets,
        };
        responseCacheRef.current.set(currentCacheKey, entry);
        setIssues(entry.issues);
        setTotal(entry.total);
        setTotalPages(entry.totalPages);
        setFacets(entry.facets);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [currentCacheKey, filters, initialFacets]);

  const prefetchAvailability = useCallback(
    (availability: AvailabilityFilter) => {
      if (availability === filters.availability || !shouldPrefetchAvailability(filters)) return;
      const key = browseCacheKey(filters, { availability, page: 1 });
      if (responseCacheRef.current.has(key) || inFlightPrefetchRef.current.has(key)) return;

      inFlightPrefetchRef.current.add(key);
      fetchIssues({
        years: filters.years,
        months: filters.months,
        magazines: filters.magazines,
        languages: filters.languages,
        subjects: filters.subjects,
        query: filters.query,
        sort: filters.sort,
        dir: filters.dir,
        page: 1,
        pageSize: PAGE_SIZE,
        availability,
      })
        .then((result) => {
          responseCacheRef.current.set(key, {
            issues: result.data,
            total: result.total,
            totalPages: result.totalPages,
            facets: result.facets ?? initialFacets,
          });
        })
        .catch(() => {
          /* best-effort warm cache */
        })
        .finally(() => {
          inFlightPrefetchRef.current.delete(key);
        });
    },
    [filters, initialFacets],
  );

  useEffect(() => {
    if (!shouldPrefetchAvailability(filters)) return;
    const timeout = window.setTimeout(() => {
      availabilityOptions.forEach((option) => prefetchAvailability(option.id));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [filters, prefetchAvailability]);

  const currentPage = Math.min(filters.page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + issues.length, total);
  const normalized = useMemo(() => issues.map(normalizeIssue), [issues]);
  const showYearSeparators = filters.sort === null;
  const gridItems = useMemo(
    () => buildYearSeparatedGridItems(normalized, showYearSeparators),
    [normalized, showYearSeparators],
  );
  const copy = availabilityCopy[filters.availability];
  const issueCountText =
    total === 0
      ? `No ${copy.countLabel} issues`
      : total <= PAGE_SIZE
        ? `${total} ${copy.countLabel} issue${total !== 1 ? 's' : ''}`
        : `${pageStart + 1}-${pageEnd} of ${total} ${copy.countLabel} issues`;

  function handlePageChange(page: number) {
    setPage(page);
    if (gridTopRef.current) {
      const top = gridTopRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Embargoed picks have no `pdf_url` to fetch — surface them as pre-skipped
    // entries in the modal so the user can see exactly which issues didn't
    // make it into the ZIP.
    const downloadable = picked.filter((i): i is ApiIssue & { pdf_url: string } => !!i.pdf_url);
    const preSkipped = picked.filter((i) => !i.pdf_url).map((i) => i.title);

    if (downloadable.length === 0) {
      setProgress({
        phase: 'error',
        fetched: 0,
        total: picked.length,
        zipPercent: 0,
        skipped: preSkipped,
        errorMessage:
          preSkipped.length > 0
            ? 'All selected issues are subscriber-only until their embargo lifts.'
            : 'No files could be downloaded.',
      });
      setDownloadOpen(true);
      return;
    }

    abortRef.current = new AbortController();
    setProgress({
      phase: 'fetching',
      fetched: 0,
      total: downloadable.length,
      zipPercent: 0,
      skipped: preSkipped,
    });
    setDownloadOpen(true);
    try {
      await downloadAsZip({
        files: downloadable.map((i) => ({ name: i.title, url: i.pdf_url })),
        zipName: `AIM Archive — ${downloadable.length} issue${downloadable.length === 1 ? '' : 's'}`,
        onProgress: (p) => setProgress({ ...p, skipped: [...preSkipped, ...p.skipped] }),
        signal: abortRef.current.signal,
      });
    } catch (err) {
      setProgress({
        phase: 'error',
        fetched: 0,
        total: downloadable.length,
        zipPercent: 0,
        skipped: preSkipped,
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

      <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-6 py-8 lg:px-8 lg:py-9">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">{copy.heading}</h1>
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-600 sm:text-lg">{copy.subtitle}</p>
            </div>
            <AvailabilityTabs
              value={filters.availability}
              onChange={setAvailability}
              onPrefetch={prefetchAvailability}
            />
          </div>
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
              onAvailabilityChange={setAvailability}
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
                onAvailabilityChange={setAvailability}
                onClearAll={clearAll}
                hasActiveFilters={hasActiveFilters}
                onClose={() => setPanelOpen(false)}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Grid area */}
        <div ref={gridTopRef} className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
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
              <span className="min-w-0 truncate text-sm font-medium text-gray-400">
                {issueCountText}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
              <SortMenu sort={filters.sort} dir={filters.dir} onChange={setSortChoice} />
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
            onRemoveAvailability={() => setAvailability('read')}
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
            <div className={`grid ${BROWSE_GRID_COLUMNS} gap-4`}>
              {gridItems.map((item) => (
                item.type === 'year' ? (
                  <YearSeparator key={item.key} year={item.year} />
                ) : (
                  <IssueCard key={item.issue.id} issue={item.issue} index={item.index} />
                )
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
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
            onClick={handleScrollToTop}
            aria-label="Scroll to top"
            title="Scroll to top"
            className="fixed right-6 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-flame-500 text-white shadow-[0_12px_30px_rgba(190,140,46,0.28)] ring-1 ring-flame-600/20 transition-colors hover:from-gold-600 hover:to-flame-600 focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <ArrowUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}

function buildYearSeparatedGridItems(issues: NormalizedIssue[], showSeparators: boolean): BrowseGridItem[] {
  const items: BrowseGridItem[] = [];
  let previousYear: number | null = null;

  issues.forEach((issue, index) => {
    if (showSeparators && issue.year !== previousYear) {
      items.push({ type: 'year', year: issue.year, key: `year-${issue.year}-${index}` });
      previousYear = issue.year;
    }

    items.push({ type: 'issue', issue, index });
  });

  return items;
}

function YearSeparator({ year }: { year: number }) {
  return (
    <div className={`${BROWSE_GRID_FULL_SPAN} py-2 sm:py-3`} aria-label={`Issues from ${year}`}>
      <div className="flex items-center gap-4">
        <span className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-transparent via-gold-300 to-flame-300 shadow-[0_1px_0_rgba(255,255,255,0.9)]" />
        <span className="relative inline-flex h-8 min-w-20 items-center justify-center rounded-full border border-flame-100 bg-white px-4 text-sm font-semibold tracking-wide text-flame-800 shadow-[0_8px_24px_rgba(120,84,28,0.08)] ring-1 ring-white">
          <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent" />
          {year}
        </span>
        <span className="h-[2px] flex-1 rounded-full bg-gradient-to-l from-transparent via-gold-300 to-flame-300 shadow-[0_1px_0_rgba(255,255,255,0.9)]" />
      </div>
    </div>
  );
}

type SortOption = {
  id: string;
  label: string;
  helper: string;
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  Icon: typeof Calendar;
};

const sortOptions: SortOption[] = [
  {
    id: 'newest',
    label: 'Newest first',
    helper: 'Latest public issue date',
    sort: null,
    dir: 'desc',
    Icon: Calendar,
  },
  {
    id: 'oldest',
    label: 'Oldest first',
    helper: 'Start from earlier archives',
    sort: 'date',
    dir: 'asc',
    Icon: Calendar,
  },
  {
    id: 'reads',
    label: 'Most read',
    helper: 'Popular with readers',
    sort: 'reads',
    dir: 'desc',
    Icon: Eye,
  },
  {
    id: 'title',
    label: 'Theme A-Z',
    helper: 'Visible theme, then issue title',
    sort: 'title',
    dir: 'asc',
    Icon: BookOpen,
  },
  {
    id: 'magazine',
    label: 'Magazine A-Z',
    helper: 'Group by publication name',
    sort: 'magazine',
    dir: 'asc',
    Icon: Layers3,
  },
  {
    id: 'size',
    label: 'Smallest file',
    helper: 'Lighter downloads first',
    sort: 'size',
    dir: 'asc',
    Icon: HardDrive,
  },
];

function SortMenu({
  sort,
  dir,
  onChange,
}: {
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  onChange: (sort: SortColumn | null, dir: 'asc' | 'desc') => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeOption =
    sortOptions.find((option) => option.sort === sort && option.dir === dir) ??
    sortOptions[0];
  const ActiveIcon = activeOption.Icon;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-flame-200 bg-white px-3.5 py-2 text-sm font-medium text-flame-700 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50 focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <ActiveIcon className="h-4 w-4" />
        <span>Sort</span>
        <span className="hidden max-w-28 truncate text-gray-500 sm:inline">
          {activeOption.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-flame-600' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="browse-sort-menu"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 z-30 mt-2 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-flame-100 bg-white p-1.5 shadow-[0_18px_48px_rgba(120,84,28,0.18)] ring-1 ring-white sm:right-0 sm:left-auto"
            role="menu"
          >
            {sortOptions.map((option) => {
              const active = option.id === activeOption.id;
              const Icon = option.Icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(option.sort, option.dir);
                    setOpen(false);
                  }}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'text-flame-800'
                      : 'text-gray-600 hover:bg-flame-50/80 hover:text-flame-800'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="browse-sort-active"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-gold-50 to-flame-50"
                      transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                    />
                  )}
                  <span
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active ? 'bg-white text-flame-700 shadow-sm' : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-400">
                      {option.helper}
                    </span>
                  </span>
                  <span
                    className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      active ? 'bg-flame-500 text-white' : 'text-transparent'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AvailabilityTabs({
  value,
  onChange,
  onPrefetch,
}: {
  value: AvailabilityFilter;
  onChange: (availability: AvailabilityFilter) => void;
  onPrefetch: (availability: AvailabilityFilter) => void;
}) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-flame-100 bg-white/90 p-1.5 shadow-[0_12px_34px_rgba(120,84,28,0.10)] ring-1 ring-white sm:w-[492px] sm:shrink-0">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {availabilityOptions.map(({ id, label, helper, Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onPointerEnter={() => onPrefetch(id)}
              onFocus={() => onPrefetch(id)}
              onClick={() => onChange(id)}
              aria-pressed={active}
              className={`relative isolate flex h-[52px] min-w-0 items-center justify-start gap-2 overflow-hidden rounded-xl px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:h-[58px] sm:flex-col sm:justify-center sm:gap-0.5 sm:px-2 sm:text-center ${
                active
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-flame-50/80 hover:text-flame-800'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="browse-availability-active"
                  className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 shadow-[0_10px_24px_rgba(190,140,46,0.24)]"
                  transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                />
              )}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-auto sm:w-auto sm:rounded-none ${
                  active ? 'bg-white/15 text-white sm:bg-transparent' : 'bg-flame-50 text-flame-700/75 sm:bg-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 sm:flex-none">
                <span className="block truncate text-sm font-semibold leading-snug sm:inline sm:whitespace-nowrap sm:text-[13px]">
                  {label}
                </span>
                <span className={`block text-[11px] font-medium sm:hidden ${active ? 'text-white/80' : 'text-gray-400'}`}>
                  {helper}
                </span>
              </span>
              <span className={`hidden whitespace-nowrap text-[11px] font-medium leading-none sm:block ${active ? 'text-white/80' : 'text-gray-400'}`}>
                {helper}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function browseCacheKey(
  filters: BrowseFilters,
  overrides: Partial<Pick<BrowseFilters, 'availability' | 'page'>> = {},
) {
  return JSON.stringify({
    availability: overrides.availability ?? filters.availability,
    years: filters.years,
    months: filters.months,
    magazines: filters.magazines,
    languages: filters.languages,
    subjects: filters.subjects,
    query: filters.query,
    sort: filters.sort,
    dir: filters.dir,
    page: overrides.page ?? filters.page,
  });
}

function shouldPrefetchAvailability(filters: BrowseFilters) {
  return (
    filters.page === 1 &&
    filters.query.length === 0 &&
    !filters.sort &&
    filters.years.length === 0 &&
    filters.months.length === 0 &&
    filters.magazines.length === 0 &&
    filters.languages.length === 0 &&
    filters.subjects.length === 0
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
    <div className={`grid ${BROWSE_GRID_COLUMNS} gap-4`}>
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
