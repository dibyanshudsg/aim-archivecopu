'use client';
import { TtlCache } from '@/lib/ttl-cache';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import type { PublicNavigation } from '@/lib/navigation';
import {
  consumeBrowseReturnTarget,
  type BrowseReturnTarget,
} from '@/lib/reader-url';
import { warmIssueDetailRoute } from '@/lib/issue-detail-url';

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
    label: 'Awaiting public release',
    helper: 'Print circulation',
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
    heading: 'Awaiting Public Release',
    subtitle: 'Current circulation editions are visible for discovery and open publicly after the rolling 5-year archive window.',
    countLabel: 'restricted',
  },
  all: {
    heading: 'Browse Archive',
    subtitle: 'Browse readable editions and editions awaiting public release together.',
    countLabel: 'archive',
  },
};

interface BrowseClientProps {
  initialIssues: ApiIssue[];
  initialMagazines: ApiMagazine[];
  initialTotal: number;
  initialTotalPages: number;
  initialFacets: BrowseFacets;
  navigation: PublicNavigation;
}

export function BrowseClient(props: BrowseClientProps) {
  return <BrowseContent {...props} />;
}

function BrowseContent({
  initialIssues,
  initialMagazines,
  initialTotal,
  initialTotalPages,
  initialFacets,
  navigation,
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
  const toolbarRef = useRef<HTMLDivElement>(null);
  const currentCacheKey = useMemo(() => browseCacheKey(filters), [filters]);
  const responseCacheRef = useRef(new TtlCache<BrowseCacheEntry>(60_000, 32));
  const inFlightRequestRef = useRef(new Map<string, { promise: Promise<BrowseCacheEntry>; controller: AbortController }>());
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
  const [controlsDocked, setControlsDocked] = useState(false);
  const showScrollTopRef = useRef(false);
  const controlsDockedRef = useRef(false);
  const firstFetchRef = useRef(true);
  const detailTemplateWarmRef = useRef(false);

  const applyBrowseEntry = useCallback((entry: BrowseCacheEntry) => {
    setIssues(entry.issues);
    setTotal(entry.total);
    setTotalPages(entry.totalPages);
    setFacets(entry.facets);
  }, []);

  const loadBrowseEntry = useCallback(
    (requestFilters: BrowseFilters, key: string) => {
      const cached = responseCacheRef.current.get(key);
      if (cached) return Promise.resolve(cached);

      const inFlight = inFlightRequestRef.current.get(key);
      if (inFlight && !inFlight.controller.signal.aborted) return inFlight.promise;
      const controller = new AbortController();

      const request = fetchIssues({
        years: requestFilters.years,
        months: requestFilters.months,
        magazines: requestFilters.magazines,
        languages: requestFilters.languages,
        subjects: requestFilters.subjects,
        query: requestFilters.query,
        sort: requestFilters.sort,
        dir: requestFilters.dir,
        page: requestFilters.page,
        pageSize: PAGE_SIZE,
        availability: requestFilters.availability,
        signal: controller.signal,
      })
        .then((result) => {
          const entry = {
            issues: result.data,
            total: result.total,
            totalPages: result.totalPages,
            facets: result.facets ?? initialFacets,
          };
          if (!controller.signal.aborted) responseCacheRef.current.set(key, entry);
          return entry;
        })
        .finally(() => {
          if (inFlightRequestRef.current.get(key)?.promise === request) {
            inFlightRequestRef.current.delete(key);
          }
        });

      inFlightRequestRef.current.set(key, { promise: request, controller });
      return request;
    },
    [initialFacets],
  );

  useEffect(() => {
    const requests = inFlightRequestRef.current;
    return () => {
      for (const { controller } of requests.values()) controller.abort();
      requests.clear();
    };
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'development' ||
      loading ||
      issues.length === 0 ||
      detailTemplateWarmRef.current
    ) {
      return;
    }

    detailTemplateWarmRef.current = true;
    const warm = () => warmIssueDetailRoute(issues[0].id);
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(warm, { timeout: 3_000 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(warm, 1_200);
    return () => window.clearTimeout(timeoutId);
  }, [issues, loading]);

  const [panelOpen, setPanelOpen] = useState(true);
  const [panelReady, setPanelReady] = useState(false);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const panelScrollRestoreRef = useRef<number | null>(null);
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PANEL_STORAGE_KEY) : null;
    if (window.matchMedia('(max-width: 767px)').matches) setPanelOpen(false);
    else if (stored !== null) setPanelOpen(stored === 'true');
    setPanelReady(true);
  }, []);
  useEffect(() => {
    if (panelReady) localStorage.setItem(PANEL_STORAGE_KEY, String(panelOpen));
  }, [panelOpen, panelReady]);

  useLayoutEffect(() => {
    const scrollTop = panelScrollRestoreRef.current;
    if (scrollTop === null) return;
    window.scrollTo({ top: scrollTop, left: window.scrollX, behavior: 'auto' });
    panelScrollRestoreRef.current = null;
  }, [panelOpen]);

  const setPanelVisibility = useCallback((open: boolean) => {
    panelScrollRestoreRef.current = window.scrollY;
    setPanelOpen(open);
  }, []);

  useEffect(() => {
    if (!panelReady || !panelOpen) return;
    const dialog = filterDialogRef.current;
    if (!dialog) return;
    const mobile = window.matchMedia('(max-width: 767px)');
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    let opened = false;
    const syncDialog = () => {
      if (mobile.matches) {
        if (!dialog.open) dialog.showModal();
        document.body.style.overflow = 'hidden';
        opened = true;
      } else {
        dialog.close();
        document.body.style.overflow = previousOverflow;
      }
    };
    syncDialog();
    mobile.addEventListener('change', syncDialog);
    return () => {
      mobile.removeEventListener('change', syncDialog);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opened) requestAnimationFrame(() => {
        const target = previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : document.querySelector<HTMLElement>('[data-filter-trigger]');
        target?.focus({ preventScroll: true });
      });
    };
  }, [panelOpen, panelReady]);

  useEffect(() => {
    let frame = 0;

    const updateScrollUi = () => {
      frame = 0;
      const nextVisible = window.scrollY > 520;
      if (nextVisible !== showScrollTopRef.current) {
        showScrollTopRef.current = nextVisible;
        setShowScrollTop(nextVisible);
      }

      const toolbarBottom = toolbarRef.current?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY;
      const headerBottom =
        document.querySelector<HTMLElement>('[data-site-header]')?.getBoundingClientRect().bottom ?? 64;
      const nextDocked = toolbarBottom <= headerBottom;
      if (nextDocked !== controlsDockedRef.current) {
        controlsDockedRef.current = nextDocked;
        setControlsDocked(nextDocked);
      }
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollUi);
    };

    updateScrollUi();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
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
      applyBrowseEntry(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requests = inFlightRequestRef.current;
    setLoading(true);
    loadBrowseEntry(filters, currentCacheKey)
      .then((entry) => {
        if (!cancelled) applyBrowseEntry(entry);
      })
      .catch((error) => {
        if (!cancelled) console.error(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      requests.get(currentCacheKey)?.controller.abort();
    };
  }, [applyBrowseEntry, currentCacheKey, filters, loadBrowseEntry]);

  const prefetchAvailability = useCallback(
    (availability: AvailabilityFilter) => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '')) return;
      if (availability === filters.availability || !shouldPrefetchAvailability(filters)) return;
      const key = browseCacheKey(filters, { availability, page: 1 });
      const requestFilters = { ...filters, availability, page: 1 };
      loadBrowseEntry(requestFilters, key)
        .catch(() => {
          /* best-effort warm cache */
        });
    },
    [filters, loadBrowseEntry],
  );

  // Alternate lists are warmed on hover/focus intent, not every filter change.

  const handleAvailabilityChange = useCallback(
    (availability: AvailabilityFilter) => {
      if (availability === filters.availability) return;
      const key = browseCacheKey(filters, { availability, page: 1 });
      const cached = responseCacheRef.current.get(key);
      if (cached) applyBrowseEntry(cached);
      setAvailability(availability);
    },
    [applyBrowseEntry, filters, setAvailability],
  );

  const currentPage = Math.min(filters.page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + issues.length, total);
  const normalized = useMemo(() => issues.map(normalizeIssue), [issues]);
  const showYearSeparators = filters.sort === null;
  const gridItems = useMemo(
    () => buildYearSeparatedGridItems(normalized, showYearSeparators),
    [normalized, showYearSeparators],
  );
  const browseReturnTargetRef = useRef<BrowseReturnTarget | null>(null);
  const browseReturnReadRef = useRef(false);

  useEffect(() => {
    if (!browseReturnReadRef.current) {
      browseReturnReadRef.current = true;
      browseReturnTargetRef.current = consumeBrowseReturnTarget();
    }

    const target = browseReturnTargetRef.current;
    if (!target || loading) return;

    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (target.href !== currentHref) {
      browseReturnTargetRef.current = null;
      return;
    }

    let frame = 0;
    let attempts = 0;
    let cancelled = false;
    const restorePosition = () => {
      if (cancelled) return;
      const element = Array.from(
        document.querySelectorAll<HTMLElement>('[data-browse-issue-id]'),
      ).find(
        (candidate) =>
          candidate.dataset.browseIssueId === target.issueId &&
          candidate.getClientRects().length > 0,
      );

      // Page transitions and responsive list wrappers can briefly leave the
      // correct card mounted but without layout. Retry for up to two seconds
      // instead of consuming the return target too early.
      if (!element) {
        attempts += 1;
        if (attempts < 120) frame = window.requestAnimationFrame(restorePosition);
        return;
      }

      browseReturnTargetRef.current = null;
      frame = window.requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      });
    };
    frame = window.requestAnimationFrame(restorePosition);

    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [currentCacheKey, filters.view, issues, loading]);

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
        files: downloadable.map((i) => ({ name: i.title, url: i.pdf_url, sizeBytes: i.file_size_bytes })),
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

  const contextualControls = (
    <BrowseContextControls
      activeFilterCount={activeFilterCount}
      panelOpen={panelOpen}
      onToggleFilters={() => setPanelVisibility(!panelOpen)}
      sort={filters.sort}
      dir={filters.dir}
      onSortChange={setSortChoice}
      selectionEnabled={selectionEnabled}
      onToggleSelection={() => (selectionEnabled ? disableSelection() : enableSelection())}
      view={filters.view}
      onViewChange={setView}
    />
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        navigation={navigation}
        contextualControls={contextualControls}
        contextualControlsVisible={controlsDocked}
      />
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
              onChange={handleAvailabilityChange}
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
          className="sticky top-20 hidden h-[calc(100vh-5rem)] shrink-0 self-start overflow-hidden md:block"
          aria-hidden={!panelOpen}
          inert={!panelOpen}
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
              onClose={() => setPanelVisibility(false)}
            />
          </div>
        </motion.aside>

        {/* Native modal contains focus and makes the background inert. */}
          {panelOpen && (
            <dialog
              ref={filterDialogRef}
              aria-label="Archive filters"
              aria-modal="true"
              onCancel={(event) => { event.preventDefault(); setPanelVisibility(false); }}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setPanelVisibility(false);
              }}
              className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[85vw] border-0 p-0 shadow-xl backdrop:bg-black/40 md:hidden"
            >
              <FilterPanel
                facets={facets}
                filters={filters}
                onToggle={toggleArray}
                onClearAll={clearAll}
                hasActiveFilters={hasActiveFilters}
                onClose={() => setPanelVisibility(false)}
              />
            </dialog>
          )}

        {/* Grid area */}
        <div ref={gridTopRef} className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div ref={toolbarRef} className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {!panelOpen && (
                <button
                  type="button"
                  onClick={() => setPanelVisibility(true)}
                  data-filter-trigger
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-flame-200 bg-white px-3.5 text-sm font-medium text-flame-700 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50"
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
              <span className="min-w-0 truncate text-sm font-medium text-gray-600">
                {issueCountText}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
              <SortMenu sort={filters.sort} dir={filters.dir} onChange={setSortChoice} />
              <button
                type="button"
                onClick={() => (selectionEnabled ? disableSelection() : enableSelection())}
                className={`inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
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
            onRemoveAvailability={() => handleAvailabilityChange('read')}
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
      <Footer navigation={navigation} />
    </div>
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

function BrowseContextControls({
  activeFilterCount,
  panelOpen,
  onToggleFilters,
  sort,
  dir,
  onSortChange,
  selectionEnabled,
  onToggleSelection,
  view,
  onViewChange,
}: {
  activeFilterCount: number;
  panelOpen: boolean;
  onToggleFilters: () => void;
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  onSortChange: (sort: SortColumn | null, dir: 'asc' | 'desc') => void;
  selectionEnabled: boolean;
  onToggleSelection: () => void;
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}) {
  return (
    <div className="flex w-max shrink-0 items-center justify-between gap-0.5 min-[600px]:gap-2 sm:justify-end">
      <button
        type="button"
        onClick={onToggleFilters}
        data-filter-trigger
        aria-expanded={panelOpen}
        aria-label={panelOpen ? 'Close filters' : 'Open filters'}
        title={panelOpen ? 'Close filters' : 'Open filters'}
        className={`relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border px-2.5 text-sm font-medium transition-colors sm:px-3 ${
          panelOpen
            ? 'border-flame-300 bg-flame-50 text-flame-700'
            : 'border-flame-200 bg-white text-flame-700 hover:border-flame-300 hover:bg-flame-50'
        }`}
      >
        <Filter className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-flame-600 px-1 text-[10px] font-bold text-white sm:static sm:h-auto sm:min-w-0 sm:px-1.5 sm:py-0.5">
            {activeFilterCount > 99 ? '99+' : activeFilterCount}
          </span>
        )}
      </button>

      <SortMenu sort={sort} dir={dir} onChange={onSortChange} compact />

      <button
        type="button"
        onClick={onToggleSelection}
        className={`inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-medium transition-colors xl:px-3 ${
          selectionEnabled
            ? 'border-flame-300 bg-flame-50 text-flame-700'
            : 'border-flame-200 bg-white text-flame-700 shadow-sm hover:border-flame-300 hover:bg-flame-50'
        }`}
        aria-pressed={selectionEnabled}
        aria-label={selectionEnabled ? 'Exit selection mode' : 'Select multiple issues'}
        title={selectionEnabled ? 'Exit selection mode' : 'Select multiple issues to download'}
      >
        <CheckSquare className="h-4 w-4 shrink-0" />
        <span className="hidden xl:inline">{selectionEnabled ? 'Done' : 'Select'}</span>
      </button>

      <ViewToggle view={view} onChange={onViewChange} compact />
    </div>
  );
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
  compact = false,
}: {
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  onChange: (sort: SortColumn | null, dir: 'asc' | 'desc') => void;
  compact?: boolean;
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
        className={`inline-flex h-11 items-center gap-2 rounded-xl border border-flame-200 bg-white px-3 text-sm font-medium text-flame-700 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50 focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:px-3.5 ${
          compact ? 'min-w-11 justify-center' : ''
        }`}
      >
        <ActiveIcon className="h-4 w-4" />
        <span className={compact ? 'hidden min-[600px]:inline' : undefined}>Sort</span>
        <span className={`${compact ? 'hidden xl:inline' : 'hidden sm:inline'} max-w-28 truncate text-gray-500`}>
          {activeOption.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${compact ? 'hidden min-[600px]:block' : ''} ${
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
            className={`z-[60] overflow-hidden rounded-2xl border border-flame-100 bg-white p-1.5 shadow-[0_18px_48px_rgba(120,84,28,0.18)] ring-1 ring-white ${
              compact
                ? 'fixed top-16 right-4 left-4 sm:top-[72px] md:absolute md:top-auto md:right-0 md:left-auto md:mt-2 md:w-[min(21rem,calc(100vw-2rem))]'
                : 'absolute left-0 mt-2 w-[min(21rem,calc(100vw-2rem))] sm:right-0 sm:left-auto'
            }`}
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
                    <span className="mt-0.5 block truncate text-xs text-gray-600">
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
                <span className={`block text-[11px] font-medium sm:hidden ${active ? 'text-white' : 'text-gray-600'}`}>
                  {helper}
                </span>
              </span>
              <span className={`hidden whitespace-nowrap text-[11px] font-medium leading-none sm:block ${active ? 'text-white' : 'text-gray-600'}`}>
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
      <p className="text-lg text-gray-600">No issues match your filters</p>
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
