'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from '@/components/magazine/archive-image';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import { usePdfRetry } from '@/lib/use-pdf-retry';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { LANGUAGE_NAMES, type Language } from '@aim-archive/shared';
import { cn } from '@/lib/utils';
import { configurePdfWorker } from '@/lib/pdf-worker-client';
configurePdfWorker(pdfjs);
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export default function SlideReader({
  issueId,
  pdfUrl,
  fallbackCoverUrl,
  fallbackTitle,
  magazineName,
  monthName,
  year,
  language,
}: {
  issueId: string;
  pdfUrl: string;
  fallbackCoverUrl: string | null;
  fallbackTitle: string;
  magazineName: string;
  monthName: string;
  year: number;
  language: Language;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bookCardRef = useRef<HTMLDivElement>(null);
  const [baseBookWidth, setBaseBookWidth] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pdfRetry = usePdfRetry(pdfUrl);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  /** 1 = next-page motion, -1 = prev-page motion. */
  const [pageDirection, setPageDirection] = useState(1);
  /** Flips true the first time react-pdf signals page 1 has finished
   *  rendering. Removes the opaque loading cover only once the canvas
   *  underneath is ready, without a separate loading fade. */
  const [page1Rendered, setPage1Rendered] = useState(false);
  /** First-time swipe hint — shown once on mobile, then suppressed via
   *  localStorage. Dismisses on first user interaction or after 4s. */
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const reduceMotion = useReducedMotion();
  /** True at lg+ (≥1024px) — drives two-page-spread mode. */
  const isSpread = useMediaQuery('(min-width: 1024px)');
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => {
      const styles = window.getComputedStyle(scroller);
      const available = scroller.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const preferred = isSpread
        ? Math.max(480, window.innerHeight * 1.5 - 352)
        : Math.max(230, window.innerHeight * 0.75 - 176);
      setBaseBookWidth(Math.max(1, Math.round(Math.min(available, preferred))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isSpread]);
  /** Step size — turn the whole spread (2 pages) on desktop, single page on
   *  smaller viewports. */
  const step = isSpread ? 2 : 1;

  // Snap page to an odd anchor when toggling into spread mode so the spread
  // is always (page, page+1).
  useEffect(() => {
    if (isSpread && page % 2 === 0) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [isSpread, page]);

  // Stable file object so react-pdf doesn't re-fetch on every render.
  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  function goPrev() {
    setPage((p) => {
      if (p <= 1) return p;
      setPageDirection(-1);
      return Math.max(1, p - step);
    });
  }
  function goNext() {
    setPage((p) => {
      if (!numPages) {
        setPageDirection(1);
        return p + step;
      }
      if (p + step > numPages && (!isSpread || p >= numPages)) return p;
      setPageDirection(1);
      return Math.min(numPages, p + step);
    });
  }

  const canGoPrev = page > 1;
  const canGoNext = numPages ? page < numPages : true;

  const SPREAD_GAP_PX = 8;
  const widthByColumn = baseBookWidth
    ? isSpread
      ? Math.max(120, Math.floor((baseBookWidth - SPREAD_GAP_PX) / 2))
      : baseBookWidth
    : 0;
  // The archive PDFs can be as tall as 1.6 × their width. Fit the full page
  // inside the viewport-sized book card instead of clipping its top and foot.
  const baseBookHeight = baseBookWidth ? baseBookWidth * (isSpread ? 2 / 3 : 4 / 3) : 0;
  const perPageWidth = widthByColumn && baseBookHeight
    ? Math.min(widthByColumn, Math.max(120, Math.floor((baseBookHeight - 2) / 1.6)))
    : widthByColumn;

  // Render fresh PDF pixels for the chosen display size. CSS enlargement of
  // a smaller canvas makes the text soft, even on a high-density display.
  const hiDPI =
    typeof window !== 'undefined'
      ? Math.max(2, Math.min(3, window.devicePixelRatio || 1))
      : 2;

  // Grow the entire book in the page flow, and remember each issue's level.
  const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2];
  const [zoom, setZoom] = useState(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const saved = Number(window.localStorage.getItem(`aim-preview-zoom:${issueId}`));
      return ZOOM_STEPS.includes(saved) ? saved : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(`aim-preview-zoom:${issueId}`, String(zoom));
    } catch {
      // The preview still works when browser storage is unavailable.
    }
  }, [issueId, zoom]);
  function zoomIn() {
    const i = ZOOM_STEPS.indexOf(zoom);
    if (i >= 0 && i < ZOOM_STEPS.length - 1) setZoom(ZOOM_STEPS[i + 1]);
  }
  function zoomOut() {
    const i = ZOOM_STEPS.indexOf(zoom);
    if (i > 0) setZoom(ZOOM_STEPS[i - 1]);
  }
  function zoomReset() {
    setZoom(1);
  }
  const canZoomIn = zoom < ZOOM_STEPS[ZOOM_STEPS.length - 1];
  const canZoomOut = zoom > ZOOM_STEPS[0];
  const renderedPageWidth = perPageWidth ? Math.round(perPageWidth * zoom) : 0;

  // Cover the PDF until the first page of a newly selected file has rendered.
  useEffect(() => {
    setPage1Rendered(false);
  }, [pdfUrl]);

  // First-time swipe hint — gated on `localStorage` so it only ever shows
  // once per browser. Mobile/tablet only (desktop has visible side arrows).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem('aim-swipe-hint-shown')) return;
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    setShowSwipeHint(true);
    const t = setTimeout(() => {
      setShowSwipeHint(false);
      window.localStorage.setItem('aim-swipe-hint-shown', '1');
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  function dismissSwipeHint() {
    if (!showSwipeHint) return;
    setShowSwipeHint(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('aim-swipe-hint-shown', '1');
    }
  }

  // Swipe = page turn within the issue, ALWAYS. Issue switching lives on the
  // carousel's nav buttons — we never bubble swipes up from here.
  function handleSwipe(_: unknown, info: PanInfo) {
    const offset = info.offset.x;
    const distance = Math.abs(offset);
    const speed = Math.abs(info.velocity.x);
    dismissSwipeHint();
    if (distance < 30 && speed < 200) return;
    if (offset < 0) goNext();
    else goPrev();
  }

  const pageLabel = (() => {
    if (!numPages) return `${page}`;
    if (isSpread) {
      const right = page + 1 <= numPages ? page + 1 : null;
      return right ? `${page}–${right} / ${numPages}` : `${page} / ${numPages}`;
    }
    return `${page} / ${numPages}`;
  })();

  return (
    <div
      ref={containerRef}
      className="relative bg-white px-2 pt-4 pb-6 sm:px-3 sm:pt-5 sm:pb-7 lg:px-6 lg:pt-7"
    >
      {/* Book row — three flex siblings: left arrow, book card, right arrow.
          Desktop arrows live OUTSIDE the card; on mobile/tablet the arrows
          are in the page indicator pill below. */}
      <div className="relative flex items-center justify-center gap-2 sm:gap-3 lg:gap-4">
        {!loadError && (
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label={isSpread ? 'Previous spread' : 'Previous page'}
            className="absolute left-2 top-1/2 z-40 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-md transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white/70 disabled:text-gray-300 disabled:shadow-none lg:flex"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}

        <div ref={scrollerRef} className="flex w-full items-center overflow-x-auto px-1 lg:px-14" style={{ justifyContent: 'safe center' }}>
        <motion.div
          ref={bookCardRef}
          style={{ width: baseBookWidth ? Math.round(baseBookWidth * zoom) : undefined, transition: reduceMotion ? 'none' : 'width 320ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={handleSwipe}
          className="home-preview-book relative flex min-w-0 cursor-grab items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gold-50 via-flame-50/60 to-gold-50 shadow-[0_8px_28px_rgba(190,140,46,0.12)] active:cursor-grabbing"
        >
          {/* "Magazine on a table" shadow */}
          <div className="pointer-events-none absolute inset-x-1/4 bottom-3 h-3 rounded-full bg-black/10 blur-xl" />

          {loadError ? (
            <div className={cn('relative mx-auto aspect-[3/4] max-w-md', isSpread ? 'w-[48%]' : 'w-full')}>
              <CoverFallback
                coverUrl={fallbackCoverUrl}
                magazineName={magazineName}
                monthName={monthName}
                year={year}
                language={language}
                title={fallbackTitle}
              />
            </div>
          ) : renderedPageWidth === 0 ? (
            <div className="h-full w-full" aria-hidden />
          ) : (
            <Document
              key={`${pdfUrl}:${pdfRetry.revision}`}
              file={file}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={(error) => { if (!pdfRetry.retry(error)) setLoadError(true); }}
              onSourceError={(error) => { if (!pdfRetry.retry(error)) setLoadError(true); }}
              loading={
                fallbackCoverUrl ? (
                  /* Pre-rendered cover JPEG (~100 KB, neighbour-preloaded so
                     it's cache-warm on slide change) shown in the same
                     single/spread geometry as the final PDF. */
                  <PdfLoadingSpread
                    coverUrl={fallbackCoverUrl}
                    title={fallbackTitle}
                    pageWidth={renderedPageWidth}
                    isSpread={isSpread}
                  />
                ) : (
                  <PageTurnSkeleton width={renderedPageWidth} />
                )
              }
              className="flex h-full w-full items-center justify-center"
            >
                <motion.div
                  key={`${isSpread ? 'spread' : 'single'}-${page}`}
                  custom={pageDirection}
                  initial={
                    reduceMotion ? false : { x: pageDirection * 20, opacity: 0.75 }
                  }
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className={cn(
                    'flex w-full items-stretch justify-center',
                    isSpread ? 'gap-2' : 'gap-0',
                  )}
                >
                  <Page
                    pageNumber={page}
                    width={renderedPageWidth}
                    devicePixelRatio={hiDPI}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderSuccess={() => {
                      // Remove the loading cover only after
                      // page 1 has actually painted. Subsequent pages don't
                      // need the overlay (they have the page-turn skeleton
                      // built into their own loading prop).
                      if (page === 1) setPage1Rendered(true);
                    }}
                    loading={
                      page === 1 && fallbackCoverUrl ? (
                        <PdfCoverImage
                          coverUrl={fallbackCoverUrl}
                          title={fallbackTitle}
                          pageWidth={renderedPageWidth}
                          decorative={false}
                          className="object-contain"
                        />
                      ) : (
                        <PageTurnSkeleton width={renderedPageWidth} />
                      )
                    }
                    className="!h-auto overflow-hidden"
                  />
                  {isSpread && numPages && page + 1 <= numPages && (
                    <Page
                      pageNumber={page + 1}
                      width={renderedPageWidth}
                      devicePixelRatio={hiDPI}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={<PageTurnSkeleton width={renderedPageWidth} />}
                      className="!h-auto overflow-hidden"
                    />
                  )}
                </motion.div>
            </Document>
          )}

          {/* Keep the cover opaque until the canvas is painted underneath.
              The disclosure moves the section; loading must not fade it again. */}
          {!loadError && fallbackCoverUrl && page === 1 && !page1Rendered && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            >
              <PdfLoadingSpread
                coverUrl={fallbackCoverUrl}
                title={fallbackTitle}
                pageWidth={renderedPageWidth}
                isSpread={isSpread}
                decorative
              />
            </div>
          )}

          {/* First-time swipe hint — bottom-center of the book card.
              Appears once per browser on mobile/tablet, dismisses on first
              swipe or after 4 s. Pointer-events: none so it doesn't block
              the underlying drag handler. */}
          <AnimatePresence>
            {showSwipeHint && (
              <motion.div
                key="swipe-hint"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-gray-900/70 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg"
              >
                <motion.span
                  className="inline-block"
                  animate={{ x: [-4, 4, -4] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ← Swipe to turn pages →
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
        </div>

        {/* Keep zoom controls visible even when the book is wider than the card. */}
        {!loadError && (
            <div className="pointer-events-auto absolute right-2 top-2 z-40 flex items-center gap-0.5 rounded-full border border-flame-200/70 bg-white/95 p-0.5 shadow-md sm:right-3 sm:top-3">
              <button
                type="button"
                onClick={zoomOut}
                disabled={!canZoomOut}
                aria-label="Zoom out"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={zoomReset}
                aria-label={`Zoom level ${Math.round(zoom * 100)}% — click to reset to 100%`}
                className="min-w-[2.75rem] rounded-full px-1 text-[11px] font-semibold tabular-nums text-gray-600 transition-colors hover:text-flame-700"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={!canZoomIn}
                aria-label="Zoom in"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}

        {!loadError && (
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label={isSpread ? 'Next spread' : 'Next page'}
            className="absolute right-2 top-1/2 z-40 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-md transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white/70 disabled:text-gray-300 disabled:shadow-none lg:flex"
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Page indicator pill — centered below the book.
          Mobile/tablet: prev/next arrows live INSIDE the pill (since the
          side arrows are hidden < lg). Desktop: just the label. */}
      <div className="mt-5 flex min-h-[54px] justify-center lg:min-h-[34px]">
        {!loadError && numPages !== null && (
          <div className="flex items-center gap-2 rounded-full border border-flame-200/60 bg-white/80 px-2 py-1 shadow-sm">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label={isSpread ? 'Previous spread' : 'Previous page'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white/70 disabled:text-gray-300 lg:hidden"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <span className="font-heading px-3 text-base font-semibold tabular-nums text-gray-700">
              {pageLabel}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              aria-label={isSpread ? 'Next spread' : 'Next page'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white/70 disabled:text-gray-300 lg:hidden"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PdfLoadingSpread({
  coverUrl,
  title,
  pageWidth,
  isSpread,
  decorative = false,
}: {
  coverUrl: string;
  title: string;
  pageWidth: number;
  isSpread: boolean;
  decorative?: boolean;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className={cn(
          'flex h-full max-h-full items-center justify-center',
          isSpread ? 'gap-2' : 'gap-0',
        )}
      >
        <PdfCoverImage
          coverUrl={coverUrl}
          title={title}
          pageWidth={pageWidth}
          decorative={decorative}
        />
        {isSpread && <PageTurnSkeleton width={pageWidth} />}
      </div>
    </div>
  );
}

function PdfCoverImage({
  coverUrl,
  title,
  pageWidth,
  decorative,
  className,
}: {
  coverUrl: string;
  title: string;
  pageWidth: number;
  decorative: boolean;
  className?: string;
}) {
  const safeWidth = Math.max(160, pageWidth || 320);
  return (
    <Image
      src={coverUrl}
      alt={decorative ? '' : title}
      width={safeWidth}
      height={Math.round(safeWidth * 1.4)}
      sizes="(max-width: 1024px) 100vw, 50vw"
      priority
      style={{ width: safeWidth, height: Math.round(safeWidth * 1.4), maxHeight: '100%', maxWidth: '100%' }}
      className={cn('block shrink-0 object-contain', className)}
    />
  );
}

// ---------- Page-turn skeleton ----------
/** Magazine-page-shaped skeleton with shimmering text lines. Renders only as
 *  a fallback when no cover JPEG is available — the cover is the primary
 *  loading surface (visually identical to PDF page 1, so the swap is
 *  imperceptible). The shimmer keyframe is defined in globals.css. */
function PageTurnSkeleton({ width }: { width: number }) {
  const w = Math.max(160, width || 320);
  return (
    <div
      className="flex flex-col gap-2 rounded-md bg-white/40 p-6"
      style={{ width: w, minHeight: w * 1.35 }}
      aria-hidden
    >
      <div className="aim-shimmer-line h-4 w-1/2 rounded" />
      <div className="aim-shimmer-line mt-3 h-2 w-full rounded" />
      <div className="aim-shimmer-line h-2 w-11/12 rounded" />
      <div className="aim-shimmer-line h-2 w-10/12 rounded" />
      <div className="aim-shimmer-line h-2 w-full rounded" />
      <div className="aim-shimmer-line h-2 w-9/12 rounded" />
      <div className="aim-shimmer-line mt-3 h-2 w-full rounded" />
      <div className="aim-shimmer-line h-2 w-11/12 rounded" />
      <div className="aim-shimmer-line h-2 w-8/12 rounded" />
      <div className="aim-shimmer-line mt-3 h-2 w-10/12 rounded" />
      <div className="aim-shimmer-line h-2 w-full rounded" />
    </div>
  );
}

function CoverFallback({
  coverUrl,
  magazineName,
  monthName,
  year,
  language,
  title,
}: {
  coverUrl: string | null;
  magazineName: string;
  monthName: string;
  year: number;
  language: Language;
  title: string;
}) {
  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 540px"
        priority
      />
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-xs font-medium tracking-widest text-transparent uppercase">
        {magazineName}
      </span>
      <span className="font-heading mt-2 text-3xl font-bold text-gray-900">
        {monthName}
      </span>
      <span className="font-heading bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-4xl font-bold text-transparent">
        {year}
      </span>
      <span className="mt-2 text-xs text-gray-500">
        {LANGUAGE_NAMES[language]}
      </span>
    </div>
  );
}
