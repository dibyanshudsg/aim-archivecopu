'use client';

import { use, useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Download,
  Eye,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  HardDrive,
  Heart,
  Info,
  Rows3,
  Share2,
  Columns2,
  RectangleVertical,
  X,
  type LucideIcon,
} from 'lucide-react';
import { fetchIssue, normalizeIssue } from '@/lib/api';
import { useBookmarks } from '@/lib/bookmarks-store';
import { formatFileSize, formatMonthYear } from '@/lib/utils';
import { shareIssue, sharePage } from '@/lib/share-issue';
import { ReaderPageScrubber } from '@/components/reader/page-scrubber';
import type { IssueWithMagazine } from '@aim-archive/shared';

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfDocLike = import('pdfjs-dist').PDFDocumentProxy;
type ReaderSource = 'issue' | 'shelf' | 'browse' | 'search' | 'bookmarks';

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toggle, isBookmarked } = useBookmarks();

  const [issue, setIssue] = useState<ReturnType<typeof normalizeIssue> | null>(null);
  const [readerSource, setReaderSource] = useState<ReaderSource>('issue');
  const [pageLoading, setPageLoading] = useState(true);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(false);
  // Cover-JPEG-as-LCP-candidate: shown over the PDF viewer area while the
  // first page is rasterizing so Lighthouse pins LCP to the cover image
  // (~200ms) instead of waiting for the canvas paint (~3-5s on cold load).
  // Flipped true once the first Page's onRenderSuccess fires.
  const [firstPageRendered, setFirstPageRendered] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single');
  const [pagesPerView, setPagesPerView] = useState<1 | 2>(1);
  // Phones (< sm) get single-page only — two-page spreads are unreadable on
  // a 360–414 px screen. We don't overwrite the user's stored preference;
  // we just override the effective value while a phone viewport is active.
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 639px)');
    const update = () => setIsPhone(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  const effectivePagesPerView: 1 | 2 = isPhone ? 1 : pagesPerView;
  // Single-page mode renders the PDF at a constant high resolution and uses
  // CSS `zoom` on the wrapper for ALL zoom (buttons, double-tap, pinch). The
  // PDF never re-renders for zoom changes — that's why pinch feels smooth
  // and there's no white-flash mid-gesture. Crisp up to ~2× display; above
  // that the user gets mild bitmap blur, acceptable for close inspection.
  const SINGLE_RENDER_SCALE = 4;
  const pinchInitRef = useRef<{
    distance: number;
    scaleAtStart: number;
    /** Screen coords of the pinch midpoint at gesture start — the anchor we
     *  want to keep stationary so the page zooms INTO where the user pinched. */
    anchorScreenX: number;
    anchorScreenY: number;
    /** Where the anchor lands in unzoomed wrapper-local coordinates. After
     *  each zoom change we re-position scroll so this point lands back on
     *  (anchorScreenX, anchorScreenY). */
    contentX: number;
    contentY: number;
  } | null>(null);
  const pinchWrapperRef = useRef<HTMLDivElement | null>(null);
  const pinchPendingScaleRef = useRef<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  // +1 when moving forward (next), -1 when moving back (prev). Drives the
  // single-page slide animation direction.
  const [navDirection, setNavDirection] = useState(1);

  // Header auto-hide on scroll (mobile/tablet only — < md). The header wrap
  // animates `height: auto → 0` so the PDF area expands when the header hides.
  const [headerHidden, setHeaderHidden] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(60);
  const headerWrapRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);

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

  // Render the canvas at the display's actual pixel density so text and vector
  // content stay crisp without oversampling. (Embedded raster images can still
  // get blurry past their own source resolution — that's a limit of the file.)
  const [renderDpr, setRenderDpr] = useState(2);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setRenderDpr(window.devicePixelRatio || 1);
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
    const params = new URLSearchParams(window.location.search);
    const p = params.get('page');
    const n = p ? parseInt(p, 10) : NaN;
    if (Number.isFinite(n) && n >= 1) setCurrentPage(n);

    const from = params.get('from');
    if (from === 'shelf' || from === 'browse' || from === 'search' || from === 'bookmarks') {
      setReaderSource(from);
    }
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
  // Phone default zoom is 70% — full 100% renders too large for a 360–414 px
  // screen on first open. Any saved per-issue scale always wins over the
  // phone default, so the user's preference for an issue is sticky.
  useEffect(() => {
    if (!issue || typeof window === 'undefined') return;
    setInitialScrollDone(false); // gate saving + initial-scroll until restoration runs

    const isPhonePx = window.matchMedia('(max-width: 639px)').matches;
    let savedScale: number | undefined;
    let savedPage: number | undefined;
    try {
      const raw = window.localStorage.getItem(`aim-reader-state-${issue.id}`);
      if (raw) {
        const saved = JSON.parse(raw) as { page?: number; scale?: number };
        if (typeof saved.scale === 'number' && saved.scale > 0) savedScale = saved.scale;
        if (typeof saved.page === 'number' && saved.page >= 1) savedPage = saved.page;
      }
    } catch {
      /* malformed state — ignore */
    }

    if (savedScale != null) {
      setScale(savedScale);
    } else if (isPhonePx) {
      setScale(0.7);
    }

    const urlPage = new URLSearchParams(window.location.search).get('page');
    if (!urlPage && savedPage != null) setCurrentPage(savedPage);
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

  // Track currentPage in a ref so the render queue can read the latest value
  // without re-creating the IntersectionObserver on every page change.
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Pages currently within the mount window (set by IntersectionObserver).
  // Tracked separately from `mountedPages` so the render queue can stagger
  // mounts instead of slamming pdf.js with N concurrent rasterization jobs.
  const intersectingRef = useRef<Set<number>>(new Set());
  const drainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Render queue: mount one intersecting page at a time, prioritized by
  // distance to currentPage, so the closest page renders first and the
  // pdf.js worker isn't fighting parallel rasterization jobs.
  const drainQueue = useCallback(() => {
    drainTimerRef.current = null;
    setMountedPages((prev) => {
      const intersecting = intersectingRef.current;
      let bestIdx = -1;
      let bestDist = Infinity;
      const target = currentPageRef.current - 1;
      for (const idx of intersecting) {
        if (prev.has(idx)) continue;
        const dist = Math.abs(idx - target);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      }
      if (bestIdx === -1) return prev;
      const next = new Set(prev);
      next.add(bestIdx);
      // Anything still pending? Queue the next mount.
      for (const idx of intersecting) {
        if (!next.has(idx)) {
          if (!drainTimerRef.current) {
            drainTimerRef.current = setTimeout(drainQueue, 60);
          }
          break;
        }
      }
      return next;
    });
  }, []);

  // Continuous-mode mount window: track which pages are within ~1 viewport
  // of the visible area. Real <Page>s mount via the render queue (above);
  // pages that leave the window unmount immediately so memory stays bounded.
  useEffect(() => {
    if (viewMode !== 'continuous' || numPages === 0) return;
    const root = scrollContainerRef.current;
    if (!root) return;

    const intersecting = intersectingRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const toUnmount: number[] = [];
        let needsDrain = false;
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.pageIdx);
          if (entry.isIntersecting) {
            if (!intersecting.has(idx)) {
              intersecting.add(idx);
              needsDrain = true;
            }
          } else {
            intersecting.delete(idx);
            toUnmount.push(idx);
          }
        }
        if (toUnmount.length) {
          setMountedPages((prev) => {
            const next = new Set(prev);
            let changed = false;
            for (const idx of toUnmount) {
              if (next.delete(idx)) changed = true;
            }
            return changed ? next : prev;
          });
        }
        if (needsDrain && !drainTimerRef.current) {
          drainTimerRef.current = setTimeout(drainQueue, 0);
        }
      },
      { root, rootMargin: '100% 0px 100% 0px', threshold: 0 },
    );

    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => {
      observer.disconnect();
      intersecting.clear();
      if (drainTimerRef.current) {
        clearTimeout(drainTimerRef.current);
        drainTimerRef.current = null;
      }
    };
  }, [viewMode, numPages, drainQueue]);

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
        saved.pagesPerView === effectivePagesPerView &&
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
  }, [viewMode, effectivePagesPerView, scrollToPage]);

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
        pagesPerView: effectivePagesPerView,
        updatedAt: Date.now(),
        // Snapshot of issue metadata so the Continue-Reading FAB can render
        // entries instantly without a network roundtrip.
        issueId: issue.id,
        title: issue.title,
        theme: issue.theme ?? null,
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
    effectivePagesPerView,
    scrollProgress,
    initialScrollDone,
  ]);

  // Auto-hide the toolbar on scroll-down past a threshold; reveal on scroll-up
  // or near the top. Mobile/tablet only — desktop (md+) keeps the toolbar
  // pinned. We listen on the inner scroll container, not window, because the
  // PDF area is the actual scroller.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sc = scrollContainerRef.current;
    if (!sc) return;
    const SHOW_AT = 40;
    const DELTA = 4;

    const onScroll = () => {
      // On desktop, force the header visible and skip the hide logic.
      if (window.innerWidth >= 768) {
        setHeaderHidden(false);
        lastScrollTopRef.current = sc.scrollTop;
        return;
      }
      const st = sc.scrollTop;
      const last = lastScrollTopRef.current;
      if (st < SHOW_AT) {
        setHeaderHidden(false);
      } else if (st > last + DELTA) {
        setHeaderHidden(true);
      } else if (st < last - DELTA) {
        setHeaderHidden(false);
      }
      lastScrollTopRef.current = st;
    };

    sc.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => {
      if (window.innerWidth >= 768) setHeaderHidden(false);
    };
    window.addEventListener('resize', onResize);
    return () => {
      sc.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Measure the live toolbar height — used to anchor floating UI (the resume
  // toast) to the bottom of the live header (mobile two-row vs desktop
  // single row, plus collapse during auto-hide).
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !headerWrapRef.current) return;
    const update = () => {
      if (!headerWrapRef.current) return;
      setHeaderHeight(headerWrapRef.current.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(headerWrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Pinch-to-zoom on touch. Single-page mode only — the PDF renders at a
  // constant 2× resolution and the wrapper's CSS `transform: scale(scale/2)`
  // controls display size. During pinch we update the wrapper's DOM transform
  // directly (instant, no re-render). On touchend we commit the new scale
  // to React state — the wrapper re-renders with the same transform and the
  // PDF stays at constant render scale, so there's no flash.
  useEffect(() => {
    const sc = scrollContainerRef.current;
    if (!sc) return;
    const distance = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Always block native viewport pinch — we handle it ourselves
        // (single-page) or ignore it (continuous, where +/- works).
        e.preventDefault();
        if (viewMode !== 'single') return;
        const wrapper = pinchWrapperRef.current;
        if (!wrapper) return;

        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        // Map pinch midpoint into unzoomed wrapper-local coords. We keep this
        // point stationary on screen as zoom changes — that's what gives the
        // illusion of zooming INTO the spot the user pinched.
        const wrapperRect = wrapper.getBoundingClientRect();
        const currentZoom = scale / SINGLE_RENDER_SCALE;
        const contentX = (cx - wrapperRect.left) / currentZoom;
        const contentY = (cy - wrapperRect.top) / currentZoom;

        pinchInitRef.current = {
          distance: distance(e.touches),
          scaleAtStart: scale,
          anchorScreenX: cx,
          anchorScreenY: cy,
          contentX,
          contentY,
        };
        pinchPendingScaleRef.current = scale;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (
        e.touches.length === 2 &&
        pinchInitRef.current &&
        pinchWrapperRef.current
      ) {
        e.preventDefault();
        const ratio = distance(e.touches) / pinchInitRef.current.distance;
        const next = Math.min(
          4,
          Math.max(0.5, pinchInitRef.current.scaleAtStart * ratio),
        );
        pinchPendingScaleRef.current = next;
        const newZoom = next / SINGLE_RENDER_SCALE;

        const sc = scrollContainerRef.current;
        const wrapper = pinchWrapperRef.current;
        if (!sc || !wrapper) return;

        // 1) Apply the new zoom — layout-aware (`zoom`), so scroll bounds and
        //    visible size both update.
        wrapper.style.zoom = String(newZoom);
        // 2) Force layout + read where the anchor content point ended up on
        //    screen after the new zoom.
        const wrapperRect = wrapper.getBoundingClientRect();
        const anchorAfterX =
          wrapperRect.left + pinchInitRef.current.contentX * newZoom;
        const anchorAfterY =
          wrapperRect.top + pinchInitRef.current.contentY * newZoom;
        // 3) Scroll the container so the anchor lands back on the original
        //    pinch screen position — page zooms INTO the pinch point.
        sc.scrollLeft += anchorAfterX - pinchInitRef.current.anchorScreenX;
        sc.scrollTop += anchorAfterY - pinchInitRef.current.anchorScreenY;
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (pinchInitRef.current && e.touches.length < 2) {
        const finalScale =
          pinchPendingScaleRef.current ?? pinchInitRef.current.scaleAtStart;
        pinchInitRef.current = null;
        pinchPendingScaleRef.current = null;
        // Commit. React re-renders the wrapper with the same transform value
        // (`scale / SINGLE_RENDER_SCALE`); the PDF Page is unchanged. No flash.
        setScale(finalScale);
      }
    };

    sc.addEventListener('touchstart', onTouchStart, { passive: false });
    sc.addEventListener('touchmove', onTouchMove, { passive: false });
    sc.addEventListener('touchend', onTouchEnd);
    sc.addEventListener('touchcancel', onTouchEnd);
    return () => {
      sc.removeEventListener('touchstart', onTouchStart);
      sc.removeEventListener('touchmove', onTouchMove);
      sc.removeEventListener('touchend', onTouchEnd);
      sc.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [scale, viewMode]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 4));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  /** Double-tap toggle: zoom in to 1.8× from default, back to default at zoom. */
  const toggleZoom = () => {
    setScale((s) => (s > 1.4 ? (isPhone ? 0.7 : 1) : 1.8));
  };

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
      <main aria-label="Loading reader" className="flex h-screen items-center justify-center bg-gray-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-flame-100 border-t-flame-500" />
      </main>
    );
  }

  if (!issue) {
    return (
      <main className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-gray-900">Issue not found</h1>
          <Link href="/browse" className="mt-4 inline-block bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-transparent">
            Back to Browse
          </Link>
        </div>
      </main>
    );
  }

  const bookmarked = isBookmarked(issue.id);
  const backTargets: Record<ReaderSource, { href: string; label: string; aria: string }> = {
    issue: { href: `/issue/${issue.id}`, label: 'Issue', aria: 'Back to issue details' },
    shelf: { href: '/', label: 'Home', aria: 'Back to home' },
    browse: { href: '/browse', label: 'Browse', aria: 'Back to browse' },
    search: { href: '/search', label: 'Search', aria: 'Back to search' },
    bookmarks: { href: '/bookmarks', label: 'Saved', aria: 'Back to bookmarks' },
  };
  const backTarget = backTargets[readerSource];

  return (
    <main
      aria-label={`Reading ${issue.title}`}
      className="flex h-screen flex-col bg-gray-100"
    >
      {/* Toolbar wrap — animates height for auto-hide on mobile/tablet. The
          progress bar lives inside so it slides off with the toolbar; while
          hidden, page progress is communicated via the floating scrubber. */}
      <motion.div
        ref={headerWrapRef}
        initial={false}
        animate={{ height: headerHidden ? 0 : 'auto', opacity: headerHidden ? 0 : 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 shrink-0 overflow-hidden bg-white"
      >
        <header className="bg-white shadow-sm">
          {/* Row 1: identity + actions. On md+ the page-controls cluster is
              absolute-centred over this row; on phone/tablet it moves to row 2. */}
          <div className="relative flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
            {/* Left: back + cover + title */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link
                href={backTarget.href}
                className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-gray-500 transition-colors hover:bg-flame-50 hover:text-flame-700"
                aria-label={backTarget.aria}
                title={backTarget.aria}
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden text-xs font-semibold lg:inline">{backTarget.label}</span>
              </Link>
              {issue.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={issue.coverImageUrl}
                  alt=""
                  className="h-10 w-[30px] shrink-0 rounded-sm object-cover shadow-sm"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {issue.magazine?.name}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {formatMonthYear(issue.month, issue.year)}
                </p>
              </div>
            </div>

            {/* Desktop center cluster — absolute centred over row 1. Hidden on
                phone/tablet (those see the same controls in row 2 below). */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 md:flex md:items-center md:justify-center">
              <div className="pointer-events-auto flex items-center gap-1">
                <PageControls
                  currentPage={currentPage}
                  numPages={numPages}
                  pagesPerView={effectivePagesPerView}
                  viewMode={viewMode}
                  goToPage={goToPage}
                  setViewMode={setViewMode}
                  setPagesPerView={setPagesPerView}
                  showPagesPerViewToggle={!isPhone}
                />
              </div>
            </div>

            {/* Right cluster: actions. Zoom + fullscreen + info live here on
                desktop; on phone/tablet zoom moves to row 2 and fullscreen/info
                are hidden (they're not useful on touch devices). */}
            <div className="flex shrink-0 items-center gap-1">
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
                onClick={() => setInfoDrawerOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-flame-50 hover:text-flame-700"
                aria-label="Issue information"
                title="Issue information"
              >
                <Info className="h-4 w-4" />
              </button>

              {/* Desktop-only: zoom + fullscreen + info */}
              <div className="hidden md:flex md:items-center md:gap-1">
                <div className="mx-1 h-5 w-px bg-gray-200" />
                <ZoomControls scale={scale} zoomIn={zoomIn} zoomOut={zoomOut} />
                <button
                  onClick={toggleFullscreen}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
                  aria-label="Toggle fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2 (phone/tablet only): page controls + zoom. Horizontally
              scrollable if it overflows on very narrow screens. */}
          <div className="flex items-center justify-center gap-1 overflow-x-auto border-t border-gray-100 px-2 py-1.5 md:hidden">
            <PageControls
              currentPage={currentPage}
              numPages={numPages}
              pagesPerView={effectivePagesPerView}
              viewMode={viewMode}
              goToPage={goToPage}
              setViewMode={setViewMode}
              setPagesPerView={setPagesPerView}
              showPagesPerViewToggle={!isPhone}
            />
            <div className="mx-1 h-5 w-px shrink-0 bg-gray-200" />
            <ZoomControls scale={scale} zoomIn={zoomIn} zoomOut={zoomOut} />
          </div>
        </header>

        {/* Reading progress — sits inside the auto-hide wrap so it slides
            off with the toolbar (page progress while hidden lives on the
            floating scrubber on the right). */}
        <div className="h-1 w-full bg-sky-100 shadow-sm">
          <div
            className="h-full bg-sky-500 will-change-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </motion.div>

      {/* Continue-where-you-left-off toast — anchored to the live header
          bottom (mobile two-row vs desktop one-row). Hides with the toolbar. */}
      <AnimatePresence>
        {resumeOffer && !headerHidden && (
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ top: headerHeight + 8 }}
            className="pointer-events-none absolute right-0 left-0 z-20 flex justify-center"
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

      <IssueInfoDrawer
        issue={issue}
        currentPage={currentPage}
        numPages={numPages}
        open={infoDrawerOpen}
        bookmarked={bookmarked}
        onBookmark={() => toggle(issue.id)}
        onClose={() => setInfoDrawerOpen(false)}
      />

      {/* PDF Viewer */}
      <div ref={scrollContainerRef} className="relative flex-1 overflow-auto">
        {/* Cover-JPEG LCP placeholder. Sits over the PDF area on first paint
            so Lighthouse can pin LCP to a fast-loading raster image instead
            of waiting for the PDF canvas. Fades out once the first Page has
            rendered. priority + fetchPriority="high" so the browser preloads
            it ahead of the PDF bytes. */}
        {issue.coverImageUrl && !firstPageRendered && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center p-4 transition-opacity duration-300 sm:p-8"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={issue.coverImageUrl}
              alt=""
              fetchPriority="high"
              className="h-full max-h-full w-auto rounded-md object-contain shadow-xl"
            />
          </div>
        )}
        <div
          className={`flex min-h-full p-4 sm:p-8 ${
            viewMode === 'single'
              ? '[align-items:safe_center] [justify-content:safe_center]'
              : 'flex-col gap-4 [align-items:safe_center]'
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
                className="mt-4 inline-block bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-sm text-transparent"
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
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-flame-100 border-t-flame-500" />
                  <p className="text-sm text-gray-500">Loading document...</p>
                </div>
              }
              className={viewMode === 'continuous' ? 'flex flex-col gap-4 [align-items:safe_center]' : undefined}
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
                    // Swipe-to-turn on phones at default zoom. Disabled when
                    // zoomed in (scale > 1) so two-finger pinch + pan still
                    // works against the scroll container.
                    drag={isPhone && scale <= 1 ? 'x' : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.4}
                    onDragEnd={(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
                      const OFFSET = 60;
                      const VELOCITY = 500;
                      const wantsNext =
                        info.offset.x < -OFFSET || info.velocity.x < -VELOCITY;
                      const wantsPrev =
                        info.offset.x > OFFSET || info.velocity.x > VELOCITY;
                      if (wantsNext && currentPage < numPages) {
                        goToPage(currentPage + effectivePagesPerView);
                      } else if (wantsPrev && currentPage > 1) {
                        goToPage(currentPage - effectivePagesPerView);
                      }
                    }}
                  >
                    <div
                      ref={pinchWrapperRef}
                      onDoubleClick={toggleZoom}
                      style={{
                        // CSS `zoom` is layout-aware (unlike transform), so
                        // the scroll container only overflows when the page
                        // is actually visually larger than the viewport.
                        zoom: scale / SINGLE_RENDER_SCALE,
                      }}
                      className="flex items-start gap-3"
                    >
                    <Page
                      pageNumber={currentPage}
                      scale={SINGLE_RENDER_SCALE}
                      devicePixelRatio={renderDpr}
                      className="shadow-xl"
                      onRenderSuccess={() => setFirstPageRendered(true)}
                      loading={
                        <div className="flex h-[800px] w-[600px] items-center justify-center rounded-lg bg-white">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-flame-100 border-t-flame-500" />
                        </div>
                      }
                    />
                    {effectivePagesPerView === 2 && currentPage + 1 <= numPages && (
                      <Page
                        pageNumber={currentPage + 1}
                        scale={SINGLE_RENDER_SCALE}
                        devicePixelRatio={renderDpr}
                        className="shadow-xl"
                        loading={
                          <div className="flex h-[800px] w-[600px] items-center justify-center rounded-lg bg-white">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-flame-100 border-t-flame-500" />
                          </div>
                        }
                      />
                    )}
                    </div>
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
                            onRenderSuccess={() => setFirstPageRendered(true)}
                            loading={
                              <div
                                className="flex items-center justify-center rounded-lg bg-white"
                                style={{ width: `${placeholderW}px`, height: `${placeholderH}px` }}
                              >
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-flame-100 border-t-flame-500" />
                              </div>
                            }
                          />
                        ) : (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-flame-100 border-t-flame-300 opacity-60" />
                        )}
                      </div>
                    );
                  };

                  if (effectivePagesPerView === 1) {
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

      {/* Floating page scrubber — phone/tablet, continuous mode only.
          Slides in from the right while scrolling/dragging; auto-hides 1.5s
          after the last interaction. Drag the pill to scrub the document. */}
      <ReaderPageScrubber
        scrollContainerRef={scrollContainerRef}
        currentPage={currentPage}
        numPages={numPages}
        enabled={viewMode === 'continuous'}
        onJumpToPage={goToPage}
      />
    </main>
  );
}

function PageControls({
  currentPage,
  numPages,
  pagesPerView,
  viewMode,
  goToPage,
  setViewMode,
  setPagesPerView,
  showPagesPerViewToggle = true,
}: {
  currentPage: number;
  numPages: number;
  pagesPerView: 1 | 2;
  viewMode: 'single' | 'continuous';
  goToPage: (page: number) => void;
  setViewMode: React.Dispatch<React.SetStateAction<'single' | 'continuous'>>;
  setPagesPerView: React.Dispatch<React.SetStateAction<1 | 2>>;
  /** Phones force single-page; hide the toggle so users can't fight it. */
  showPagesPerViewToggle?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => goToPage(currentPage - pagesPerView)}
        disabled={currentPage <= 1}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex shrink-0 items-center gap-1.5 px-1">
        <input
          type="number"
          min={1}
          max={numPages}
          value={currentPage}
          onChange={(e) => goToPage(Number(e.target.value))}
          aria-label={`Page number, of ${numPages || 'unknown'}`}
          className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm text-gray-900 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span aria-hidden="true" className="text-sm text-gray-500">/ {numPages || '—'}</span>
      </div>

      <button
        onClick={() => goToPage(currentPage + pagesPerView)}
        disabled={currentPage >= numPages}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
        aria-label="Next page"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <button
        onClick={() => setViewMode((m) => (m === 'single' ? 'continuous' : 'single'))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
        aria-label={
          viewMode === 'single' ? 'Switch to continuous scroll' : 'Switch to single page'
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

      {showPagesPerViewToggle && (
        <button
          onClick={() => setPagesPerView((p) => (p === 1 ? 2 : 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
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
      )}
    </div>
  );
}

function ZoomControls({
  scale,
  zoomIn,
  zoomOut,
}: {
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <button
        onClick={zoomOut}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
        aria-label="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <span className="w-10 text-center text-xs text-gray-500 sm:w-12">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={zoomIn}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
        aria-label="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
    </div>
  );
}

function IssueInfoDrawer({
  issue,
  currentPage,
  numPages,
  open,
  bookmarked,
  onBookmark,
  onClose,
}: {
  issue: IssueWithMagazine;
  currentPage: number;
  numPages: number;
  open: boolean;
  bookmarked: boolean;
  onBookmark: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pages = numPages || issue.pageCount || 0;
  const progressPct = pages ? Math.min(100, Math.max(2, (currentPage / pages) * 100)) : 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close issue information"
            className="fixed inset-0 z-30 cursor-default bg-gray-950/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="reader-info-title"
            className="fixed inset-x-0 bottom-0 z-40 max-h-[86vh] overflow-hidden rounded-t-2xl border border-flame-100 bg-white shadow-2xl md:inset-y-3 md:right-3 md:left-auto md:flex md:w-[380px] md:max-w-[calc(100vw-1.5rem)] md:flex-col md:rounded-2xl"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-flame-100 px-4 py-3">
              <div>
                <p className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-[11px] font-semibold uppercase tracking-wide text-transparent">
                  Issue information
                </p>
                <h2 id="reader-info-title" className="font-heading text-lg font-bold text-gray-900">
                  {issue.magazine.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-flame-50 hover:text-flame-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4">
              <div className="flex gap-4">
                <div className="relative h-36 w-[108px] shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-gold-100 to-flame-50 shadow-sm">
                  <div className="absolute inset-y-0 left-0 z-10 w-1.5 bg-gradient-to-b from-gold-500 to-flame-500" />
                  {issue.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={issue.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-xs font-semibold text-flame-700">
                      {issue.magazine.name}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-4 text-base font-semibold leading-snug text-gray-900">
                    {issue.title}
                  </h3>
                  {issue.theme && (
                    <div className="mt-1.5 flex items-start gap-1.5">
                      <span aria-hidden className="mt-2 h-3.5 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-gold-500 to-flame-500" />
                      <p className="font-heading line-clamp-2 bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 pt-0.5 text-sm font-bold leading-normal text-transparent">
                        {issue.theme}
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {formatMonthYear(issue.month, issue.year)}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-500 to-flame-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    Page {currentPage}
                    {pages ? ` / ${pages}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <ReaderMeta icon={CalendarDays} label="Published" value={formatMonthYear(issue.month, issue.year)} />
                <ReaderMeta icon={FileText} label="Pages" value={pages ? String(pages) : '-'} />
                <ReaderMeta icon={HardDrive} label="Size" value={formatFileSize(issue.fileSizeBytes)} />
                <ReaderMeta icon={Eye} label="Reads" value={issue.readCount.toLocaleString()} />
              </div>

              {issue.topics.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...issue.topics]
                      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                      .map((topic) => (
                        <Link
                          key={topic}
                          href={`/browse?subject=${encodeURIComponent(topic)}`}
                          onClick={onClose}
                          className="rounded-full bg-gradient-to-r from-gold-50 to-flame-50 px-2.5 py-1 text-xs font-medium text-flame-700 transition-colors hover:from-gold-100 hover:to-flame-100"
                        >
                          {topic}
                        </Link>
                      ))}
                  </div>
                </div>
              )}

              {issue.description && (
                <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-600">{issue.description}</p>
                </div>
              )}

              <div className="mt-5 grid gap-2">
                <Link
                  href={`/issue/${issue.id}`}
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
                >
                  <Info className="h-4 w-4" />
                  Full details
                </Link>
                <a
                  href={`/api/issues/${issue.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onBookmark}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      bookmarked
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-gray-200 text-gray-700 hover:border-flame-300 hover:bg-flame-50'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${bookmarked ? 'fill-red-500' : ''}`} />
                    {bookmarked ? 'Saved' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await shareIssue(issue);
                      if (result === 'copied') {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      copied
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-700 hover:border-flame-300 hover:bg-flame-50'
                    }`}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Share'}
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ReaderMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
        <Icon className="h-3.5 w-3.5 text-flame-500" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-gray-900">{value}</p>
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
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-flame-500 px-1 text-[9px] font-bold leading-none text-white">
            {pageNumber > 999 ? '∞' : pageNumber}
          </span>
        </>
      )}
    </button>
  );
}
