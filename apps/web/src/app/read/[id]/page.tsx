'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Heart,
  Info,
  Rows3,
  Share2,
  Columns2,
  RectangleVertical,
  X,
} from 'lucide-react';
import { fetchIssue, normalizeIssue } from '@/lib/api';
import { useBookmarks } from '@/lib/bookmarks-store';
import { formatMonthYear } from '@/lib/utils';
import { shareIssue, sharePage } from '@/lib/share-issue';
import type { IssueWithMagazine } from '@aim-archive/shared';

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfDocLike = import('pdfjs-dist').PDFDocumentProxy;

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toggle, isBookmarked } = useBookmarks();

  const [issue, setIssue] = useState<ReturnType<typeof normalizeIssue> | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single');
  const [pagesPerView, setPagesPerView] = useState<1 | 2>(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  // +1 when moving forward (next), -1 when moving back (prev). Drives the
  // single-page slide animation direction.
  const [navDirection, setNavDirection] = useState(1);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isProgrammaticScroll = useRef(false);
  const programmaticScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounces continuous-mode programmatic scrolls so rapid prev/next clicks
  // coalesce into a single scroll instead of cancelling each other and
  // mounting an avalanche of pages.
  const navDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Per-issue resume state — guards initial scroll restoration so the user
  // lands on the saved scrollTop instead of being snapped to the page slot.
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // "Continue where you left off" toast: present when we have a saved scroll
  // position the user can click to resume. Cleared on click or after a timer.
  const [resumeOffer, setResumeOffer] = useState<{ scrollTop: number; page: number } | null>(null);

  // Render the canvas at a higher pixel density than the screen so text and
  // vector content stay crisp at any zoom. (Embedded raster images can still
  // get blurry past their own source resolution — that's a limit of the file.)
  const [renderDpr, setRenderDpr] = useState(2);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setRenderDpr(Math.max(2, window.devicePixelRatio || 1));
  }, []);

  // Continuous-mode virtualization: only mount <Page> for pages near the
  // viewport. Off-screen slots are placeholder divs sized to the same
  // aspect ratio so layout / scroll positions stay stable.
  const [pageAspect, setPageAspect] = useState<{ w: number; h: number } | null>(null);
  const [mountedPages, setMountedPages] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    fetchIssue(id)
      .then((data) => setIssue(data ? normalizeIssue(data) : null))
      .finally(() => setPageLoading(false));
  }, [id]);

  // Read ?page= from URL once on mount (avoids useSearchParams Suspense).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search).get('page');
    const n = p ? parseInt(p, 10) : NaN;
    if (Number.isFinite(n) && n >= 1) setCurrentPage(n);
  }, []);

  // Restore global view-mode preferences once on mount. We set `hydrated` at
  // the end so the matching write effects below don't fire with the default
  // state and overwrite the saved values before this read flushes.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('aim-reader-view-mode');
    if (saved === 'single' || saved === 'continuous') setViewMode(saved);
    const savedPpv = window.localStorage.getItem('aim-reader-pages-per-view');
    if (savedPpv === '1' || savedPpv === '2') setPagesPerView(Number(savedPpv) as 1 | 2);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem('aim-reader-view-mode', viewMode);
  }, [viewMode, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem('aim-reader-pages-per-view', String(pagesPerView));
  }, [pagesPerView, hydrated]);

  // Per-issue resume: restore last-known scale + page (page only when no
  // ?page= is in the URL — shared deep links should always win). Scroll
  // position is restored later, after the PDF document loads (see below).
  useEffect(() => {
    if (!issue || typeof window === 'undefined') return;
    setInitialScrollDone(false); // gate saving + initial-scroll until restoration runs
    try {
      const raw = window.localStorage.getItem(`aim-reader-state-${issue.id}`);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        page?: number;
        scale?: number;
      };
      if (typeof saved.scale === 'number' && saved.scale > 0) setScale(saved.scale);
      const urlPage = new URLSearchParams(window.location.search).get('page');
      if (!urlPage && typeof saved.page === 'number' && saved.page >= 1) {
        setCurrentPage(saved.page);
      }
    } catch {
      /* malformed state — ignore */
    }
  }, [issue?.id]);

  // Hold a reference to the underlying pdfjs document so we can render any
  // requested page to an image on demand (used by the share-page button).
  const pdfDocRef = useRef<PdfDocLike | null>(null);

  const onDocumentLoadSuccess = useCallback(
    async (pdf: PdfDocLike) => {
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      try {
        const first = await pdf.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        setPageAspect({ w: vp.width, h: vp.height });
      } catch {
        // Non-fatal — falls back to a default placeholder size.
      }
    },
    [],
  );

  /** Render a specific page of the loaded PDF to a PNG blob at ~2400px on the
   *  long side. PNG is lossless, so text stays as crisp as the PDF itself. */
  const renderPageToBlob = useCallback(async (pageNumber: number): Promise<Blob | null> => {
    const doc = pdfDocRef.current;
    if (!doc) return null;
    try {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const longSide = Math.max(base.width, base.height);
      const scale = Math.max(2, 2400 / longSide);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      await page.render({ canvasContext: ctx, viewport }).promise;
      return await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    } catch {
      return null;
    }
  }, []);

  // Keep the URL bar in sync with the current page so share targets that
  // pick up the browser URL get a page-specific deep link, and right-click
  // → copy URL gives the current page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (currentPage > 1) params.set('page', String(currentPage));
    else params.delete('page');
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? '?' + qs : ''}${window.location.hash}`;
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(null, '', next);
    }
  }, [currentPage]);

  const scrollToPage = useCallback((page: number) => {
    // Pre-mount destination + immediate neighbours so the user lands on a
    // real <Page>, not a placeholder. The IntersectionObserver will mount
    // surrounding pages a beat later.
    setMountedPages((prev) => {
      const next = new Set(prev);
      for (let p = Math.max(1, page - 1); p <= page + 1; p++) {
        next.add(p - 1);
      }
      return next;
    });

    const el = pageRefs.current[page - 1];
    if (!el) return;
    isProgrammaticScroll.current = true;
    if (programmaticScrollTimer.current) clearTimeout(programmaticScrollTimer.current);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    programmaticScrollTimer.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 800);
  }, []);

  const goToPage = (page: number) => {
    if (page < 1 || page > numPages) return;
    setNavDirection(page > currentPage ? 1 : page < currentPage ? -1 : navDirection);
    setCurrentPage(page);
    if (viewMode === 'continuous') {
      // Coalesce rapid clicks: latest target wins. 110 ms is below typical
      // click-perception threshold for a single press, but plenty long
      // enough to absorb a button-mash burst into one smooth scroll.
      if (navDebounceTimer.current) clearTimeout(navDebounceTimer.current);
      navDebounceTimer.current = setTimeout(() => {
        scrollToPage(page);
        navDebounceTimer.current = null;
      }, 110);
    }
  };

  // Tidy up the debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (navDebounceTimer.current) clearTimeout(navDebounceTimer.current);
    };
  }, []);

  // Continuous mode: track current page via a scroll listener that picks the
  // page whose vertical center is closest to the viewport center. This is
  // deterministic and immune to the IntersectionObserver timing edge cases
  // (initial-fire ordering, threshold gaps, batched updates) that were
  // causing the page indicator to stick or flash.
  useEffect(() => {
    if (viewMode !== 'continuous' || numPages === 0) return;
    const root = scrollContainerRef.current;
    if (!root) return;

    let raf = 0;

    const compute = () => {
      if (isProgrammaticScroll.current) return;

      const containerRect = root.getBoundingClientRect();
      const target = containerRect.top + containerRect.height / 2;

      let bestIdx = -1;
      let bestDist = Infinity;

      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        // Skip slots fully above; stop when we've passed the viewport (slots
        // are in document order, so anything farther down is also below).
        if (r.bottom < containerRect.top) continue;
        if (r.top > containerRect.bottom) break;
        const center = r.top + r.height / 2;
        const dist = Math.abs(center - target);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) setCurrentPage(bestIdx + 1);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    // First measurement after layout has settled.
    raf = requestAnimationFrame(compute);
    root.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [viewMode, numPages]);

  // Continuous-mode mount window: render real <Page>s only for slots within
  // ~2 viewports of the visible area. Everything else stays as a placeholder.
  // This is what fixes scroll lag without compromising rendered DPR.
  useEffect(() => {
    if (viewMode !== 'continuous' || numPages === 0) return;
    const root = scrollContainerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setMountedPages((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const entry of entries) {
            const idx = Number((entry.target as HTMLElement).dataset.pageIdx);
            if (entry.isIntersecting) {
              if (!next.has(idx)) {
                next.add(idx);
                changed = true;
              }
            } else if (next.has(idx)) {
              next.delete(idx);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { root, rootMargin: '200% 0px 200% 0px', threshold: 0 },
    );

    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [viewMode, numPages]);

  // When leaving continuous mode, reset the mount window so memory is freed
  // and re-entering starts fresh.
  useEffect(() => {
    if (viewMode === 'single') setMountedPages(new Set([currentPage - 1]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Reading-progress bar: 1:1 with the scroll container in continuous mode,
  // and falls back to page-fraction in single-page mode.
  useEffect(() => {
    if (viewMode !== 'continuous') return;
    const root = scrollContainerRef.current;
    if (!root) return;

    const update = () => {
      const max = root.scrollHeight - root.clientHeight;
      if (max <= 0) {
        setScrollProgress(0);
        return;
      }
      setScrollProgress(Math.min(1, Math.max(0, root.scrollTop / max)));
    };

    update();
    root.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(root);
    return () => {
      root.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [viewMode, numPages]);

  const progressPct =
    viewMode === 'continuous'
      ? scrollProgress * 100
      : numPages > 0
        ? (currentPage / numPages) * 100
        : 0;

  // First-time scroll after the PDF loads: scroll to the saved page (already
  // restored into currentPage by the per-issue effect above) and, if there's
  // a saved scrollTop *and* the layout matches, surface a "Continue where
  // you left off" toast the user can click to fine-tune to the exact pixel.
  // We don't auto-scroll to scrollTop because doing so was racing with the
  // scroll listener and snapping users to the top.
  useEffect(() => {
    if (!issue || numPages === 0 || initialScrollDone) return;
    if (viewMode !== 'continuous') {
      setInitialScrollDone(true);
      return;
    }
    const t = setTimeout(() => {
      // ?resume=1 means the user came in from the Continue-Reading FAB and
      // explicitly chose to resume. Skip the toast and jump straight to the
      // saved scroll position.
      const resumeNow =
        new URLSearchParams(window.location.search).get('resume') === '1';

      let saved:
        | {
            scrollTop?: number;
            page?: number;
            viewMode?: string;
            pagesPerView?: number;
          }
        | null = null;
      try {
        const raw = window.localStorage.getItem(`aim-reader-state-${issue.id}`);
        if (raw) saved = JSON.parse(raw);
      } catch {
        /* malformed state — ignore */
      }

      const canResumeExact =
        !!saved &&
        saved.viewMode === viewMode &&
        saved.pagesPerView === pagesPerView &&
        typeof saved.scrollTop === 'number' &&
        saved.scrollTop > 0;

      if (resumeNow && canResumeExact && scrollContainerRef.current) {
        // Direct, no-toast resume. Use isProgrammaticScroll so the page tracker
        // doesn't fight the jump while it settles.
        isProgrammaticScroll.current = true;
        scrollContainerRef.current.scrollTo({ top: saved!.scrollTop! });
        if (programmaticScrollTimer.current)
          clearTimeout(programmaticScrollTimer.current);
        programmaticScrollTimer.current = setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 300);
        // Strip ?resume=1 so a refresh won't keep auto-scrolling.
        const params = new URLSearchParams(window.location.search);
        params.delete('resume');
        const qs = params.toString();
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
        );
      } else {
        scrollToPage(currentPage);
        if (canResumeExact) {
          setResumeOffer({
            scrollTop: saved!.scrollTop!,
            page: saved!.page ?? currentPage,
          });
        }
      }
      setInitialScrollDone(true);
    }, 200);
    return () => clearTimeout(t);
    // currentPage intentionally excluded — initial restore reads it at fire time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.id, numPages, viewMode, initialScrollDone]);

  // Subsequent re-scrolls: when the user toggles view mode or pages-per-view,
  // jump back to whatever page they were on so they don't get lost in the new
  // layout. Note `initialScrollDone` is *not* a dependency — including it
  // would fire this effect at the moment of initial restore and (if the
  // scroll listener has just transiently reset currentPage to 1) snap the
  // user to the top.
  useEffect(() => {
    if (!initialScrollDone || viewMode !== 'continuous' || numPages === 0) return;
    const t = setTimeout(() => scrollToPage(currentPage), 120);
    return () => clearTimeout(t);
    // currentPage + initialScrollDone intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, pagesPerView, scrollToPage]);

  // Auto-dismiss the resume toast after 12 s of inactivity.
  useEffect(() => {
    if (!resumeOffer) return;
    const t = setTimeout(() => setResumeOffer(null), 12_000);
    return () => clearTimeout(t);
  }, [resumeOffer]);

  // Debounced per-issue save: page, scale, scrollTop, viewMode, pagesPerView.
  // Held back until the initial restore has run so we don't overwrite the
  // saved state with a half-initialized snapshot.
  useEffect(() => {
    if (!issue || !initialScrollDone || typeof window === 'undefined') return;
    if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
    saveStateTimerRef.current = setTimeout(() => {
      const state = {
        page: currentPage,
        scale,
        scrollTop: scrollContainerRef.current?.scrollTop ?? 0,
        viewMode,
        pagesPerView,
        updatedAt: Date.now(),
        // Snapshot of issue metadata so the Continue-Reading FAB can render
        // entries instantly without a network roundtrip.
        issueId: issue.id,
        title: issue.title,
        coverImageUrl: issue.coverImageUrl ?? null,
        magazineName: issue.magazine?.name ?? '',
        month: issue.month,
        year: issue.year,
        numPages: numPages || null,
      };
      try {
        window.localStorage.setItem(`aim-reader-state-${issue.id}`, JSON.stringify(state));
      } catch {
        /* quota or private-mode — silently ignore */
      }
    }, 250);
    return () => {
      if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
    };
  }, [
    issue?.id,
    currentPage,
    scale,
    viewMode,
    pagesPerView,
    scrollProgress,
    initialScrollDone,
  ]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-gray-900">Issue not found</h1>
          <Link href="/browse" className="mt-4 inline-block text-gold-600 hover:text-gold-700">
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const bookmarked = isBookmarked(issue.id);

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Reader Toolbar */}
      <header className="relative z-10 flex items-center justify-between bg-white px-4 py-2.5 shadow-sm">
        {/* Left: back + cover + title */}
        <div className="flex items-center gap-3">
          <Link
            href={`/issue/${issue.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {issue.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={issue.coverImageUrl}
              alt=""
              className="hidden h-10 w-[30px] rounded-sm object-cover shadow-sm sm:block"
            />
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{issue.magazine?.name}</p>
            <p className="text-xs text-gray-500">{formatMonthYear(issue.month, issue.year)}</p>
          </div>
        </div>

        {/* Center (absolute): page nav + view toggle, dead-centred above the
            page regardless of left/right cluster widths */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - pagesPerView)}
              disabled={currentPage <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <input
                type="number"
                min={1}
                max={numPages}
                value={currentPage}
                onChange={(e) => goToPage(Number(e.target.value))}
                className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm text-gray-900 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-sm text-gray-400">/ {numPages || '—'}</span>
            </div>

            <button
              onClick={() => goToPage(currentPage + pagesPerView)}
              disabled={currentPage >= numPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <button
              onClick={() => setViewMode((m) => (m === 'single' ? 'continuous' : 'single'))}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
              aria-label={
                viewMode === 'single'
                  ? 'Switch to continuous scroll'
                  : 'Switch to single page'
              }
              title={
                viewMode === 'single'
                  ? 'Single page · click for continuous scroll'
                  : 'Continuous scroll · click for single page'
              }
            >
              {viewMode === 'single' ? (
                <Rows3 className="h-4 w-4" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={() => setPagesPerView((p) => (p === 1 ? 2 : 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
              aria-label={
                pagesPerView === 1 ? 'Show two pages side-by-side' : 'Show one page at a time'
              }
              title={
                pagesPerView === 1
                  ? 'One page · click for two-page spread'
                  : 'Two-page spread · click for one page'
              }
            >
              {pagesPerView === 1 ? (
                <Columns2 className="h-4 w-4" />
              ) : (
                <RectangleVertical className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Right: zoom + actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs text-gray-500">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="mx-1 h-5 w-px bg-gray-200" />

          <button
            onClick={() => toggle(issue.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Bookmark"
          >
            <Heart
              className={`h-4 w-4 ${bookmarked ? 'fill-red-500 text-red-500' : ''}`}
            />
          </button>

          <ShareIssueButton issue={issue} />
          <SharePageButton
            issue={issue}
            pageNumber={currentPage}
            renderPage={renderPageToBlob}
          />

          <button
            onClick={toggleFullscreen}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 sm:flex"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>

          <Link
            href={`/issue/${issue.id}`}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 sm:flex"
            aria-label="Issue details"
          >
            <Info className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Reading progress (replaces the toolbar's bottom border) */}
      <div className="z-10 h-1 w-full bg-sky-100 shadow-sm">
        <div
          className="h-full bg-sky-500 will-change-[width]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Continue-where-you-left-off toast */}
      <AnimatePresence>
        {resumeOffer && (
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-none absolute top-[68px] right-0 left-0 z-20 flex justify-center"
          >
            <div className="pointer-events-auto flex items-stretch overflow-hidden rounded-full bg-sky-500 shadow-lg ring-1 ring-sky-600/30">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => {
                  if (!scrollContainerRef.current) return;
                  isProgrammaticScroll.current = true;
                  scrollContainerRef.current.scrollTo({
                    top: resumeOffer.scrollTop,
                    behavior: 'smooth',
                  });
                  if (programmaticScrollTimer.current)
                    clearTimeout(programmaticScrollTimer.current);
                  programmaticScrollTimer.current = setTimeout(() => {
                    isProgrammaticScroll.current = false;
                  }, 800);
                  setResumeOffer(null);
                }}
                className="cursor-pointer px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 active:bg-sky-700"
              >
                Continue where you left off · page {resumeOffer.page} →
              </motion.button>
              <button
                type="button"
                onClick={() => setResumeOffer(null)}
                aria-label="Dismiss"
                className="flex w-9 cursor-pointer items-center justify-center border-l border-sky-600/30 text-white/75 transition-colors hover:bg-sky-600 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Viewer */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        <div
          className={`flex min-h-full p-4 sm:p-8 ${
            viewMode === 'single'
              ? 'items-start justify-center'
              : 'flex-col items-center gap-4'
          }`}
        >
          {error ? (
            <div className="mt-20 text-center">
              <p className="text-lg font-medium text-gray-600">
                Unable to load PDF
              </p>
              <p className="mt-2 text-sm text-gray-400">
                This is a demo — PDF loading requires a real file.
              </p>
              <Link
                href={`/issue/${issue.id}`}
                className="mt-4 inline-block text-sm text-gold-600 hover:text-gold-700"
              >
                View issue details instead
              </Link>
            </div>
          ) : (
            <Document
              file={issue.pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setError(true)}
              loading={
                <div className="mt-20 flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
                  <p className="text-sm text-gray-500">Loading document...</p>
                </div>
              }
              className={viewMode === 'continuous' ? 'flex flex-col items-center gap-4' : undefined}
            >
              {viewMode === 'single' ? (
                <AnimatePresence mode="wait" initial={false} custom={navDirection}>
                  <motion.div
                    key={currentPage}
                    custom={navDirection}
                    variants={{
                      enter: (dir: number) => ({ x: dir * 220, opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit: (dir: number) => ({ x: -dir * 220, opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
                      opacity: { duration: 0.18 },
                    }}
                    className="flex items-start gap-3"
                  >
                    <Page
                      pageNumber={currentPage}
                      scale={scale}
                      devicePixelRatio={renderDpr}
                      className="shadow-xl"
                      loading={
                        <div className="flex h-[800px] w-[600px] items-center justify-center rounded-lg bg-white">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
                        </div>
                      }
                    />
                    {pagesPerView === 2 && currentPage + 1 <= numPages && (
                      <Page
                        pageNumber={currentPage + 1}
                        scale={scale}
                        devicePixelRatio={renderDpr}
                        className="shadow-xl"
                        loading={
                          <div className="flex h-[800px] w-[600px] items-center justify-center rounded-lg bg-white">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
                          </div>
                        }
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                (() => {
                  const placeholderW = (pageAspect?.w ?? 600) * scale;
                  const placeholderH = (pageAspect?.h ?? 800) * scale;

                  const renderSlot = (i: number) => {
                    const isMounted = mountedPages.has(i);
                    return (
                      <div
                        key={i}
                        ref={(el) => {
                          pageRefs.current[i] = el;
                        }}
                        data-page-idx={i}
                        style={
                          isMounted
                            ? undefined
                            : { width: `${placeholderW}px`, height: `${placeholderH}px` }
                        }
                        className={
                          isMounted
                            ? undefined
                            : 'flex items-center justify-center rounded-sm bg-white shadow-xl'
                        }
                      >
                        {isMounted ? (
                          <Page
                            pageNumber={i + 1}
                            scale={scale}
                            devicePixelRatio={renderDpr}
                            className="shadow-xl"
                            loading={
                              <div
                                className="flex items-center justify-center rounded-lg bg-white"
                                style={{ width: `${placeholderW}px`, height: `${placeholderH}px` }}
                              >
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
                              </div>
                            }
                          />
                        ) : (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-100 border-t-gold-300 opacity-60" />
                        )}
                      </div>
                    );
                  };

                  if (pagesPerView === 1) {
                    return Array.from({ length: numPages }, (_, i) => renderSlot(i));
                  }

                  // 2-page rows: each row is a flex container of two slots,
                  // but the slots themselves keep their own refs / data-page-idx
                  // so the page-tracker and virtualization observers still work
                  // on a per-page basis.
                  const rows: React.ReactNode[] = [];
                  for (let r = 0; r < numPages; r += 2) {
                    rows.push(
                      <div key={`row-${r}`} className="flex items-start gap-3">
                        {renderSlot(r)}
                        {r + 1 < numPages ? renderSlot(r + 1) : null}
                      </div>,
                    );
                  }
                  return rows;
                })()
              )}
            </Document>
          )}
        </div>
      </div>

    </div>
  );
}

function ShareIssueButton({ issue }: { issue: IssueWithMagazine }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        const result = await shareIssue(issue);
        if (result === 'copied') {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
      aria-label="Share issue"
      title={copied ? 'Link copied' : 'Share issue'}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        copied ? 'text-green-600' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}

function SharePageButton({
  issue,
  pageNumber,
  renderPage,
}: {
  issue: IssueWithMagazine;
  pageNumber: number;
  renderPage: (n: number) => Promise<Blob | null>;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        const blob = await renderPage(pageNumber);
        const result = await sharePage(issue, pageNumber, blob);
        setBusy(false);
        if (result === 'copied') {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
      aria-label={`Share page ${pageNumber}`}
      title={copied ? 'Link copied' : `Share this page (${pageNumber})`}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        copied ? 'text-green-600' : 'text-gray-600 hover:bg-gray-100'
      } ${busy ? 'opacity-60' : ''}`}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold-500 px-1 text-[9px] font-bold leading-none text-white">
            {pageNumber > 999 ? '∞' : pageNumber}
          </span>
        </>
      )}
    </button>
  );
}
