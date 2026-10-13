'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from '@/components/magazine/archive-image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownAZ,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  LibraryBig,
  BookDashed,
  LockKeyhole,
} from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import type { ShelfIssue, ShelfYear } from '@/lib/home-shelf';
import { TtlCache } from '@/lib/ttl-cache';
import { readerPath, rememberReaderSource } from '@/lib/reader-url';
import { formatMonthYear } from '@/lib/utils';
import { configurePdfWorker } from '@/lib/pdf-worker-client';


type PdfDocLike = import('pdfjs-dist').PDFDocumentProxy;

interface AnimatedBookshelfProps {
  issues: ShelfIssue[];
  years: ShelfYear[];
}

type BookMode = 'closed' | 'open' | 'closing';
type SortMode = 'uploaded' | 'issue-date' | 'title';
type MagazineFilter = 'all' | string;

interface TurningSheet {
  oldLeftPage: number;
  fromPage: number;
  toPage: number;
  nextStart: number;
  nextRightPage: number;
}

const accents = ['#F47234', '#E5561F', '#BE4118', '#FAB689', '#F79058'];
const HOVER_INTENT_MS = 180;
const PAGE_HOLD_MS = 1500;
const TURN_DURATION_MS = 1000;
const CLOSE_DURATION_MS = 820;
const LONG_PRESS_MS = 420;
const sortOptions = [
  { id: 'uploaded', label: 'Recently added', shortLabel: 'Added', Icon: Clock },
  { id: 'issue-date', label: 'Issue Date', shortLabel: 'Date', Icon: CalendarDays },
  { id: 'title', label: 'A-Z', shortLabel: 'A-Z', Icon: ArrowDownAZ },
] satisfies Array<{ id: SortMode; label: string; shortLabel: string; Icon: typeof Clock }>;
const sortCopy = {
  uploaded: { eyebrow: 'Recently added', heading: 'Now open in the archive' },
  'issue-date': { eyebrow: 'Sorted by issue date', heading: 'Readable archive editions' },
  title: { eyebrow: 'Alphabetical view', heading: 'Open issue index' },
} satisfies Record<SortMode, { eyebrow: string; heading: string }>;

function magazineShortName(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('all india')) return 'All India Magazine';
  if (normalized.includes('agnishikha') || normalized.includes('agnisikha')) return 'Agnishikha';
  return name;
}

function fallbackTitle(issue: ShelfIssue) {
  const [firstWord] = issue.magazines.name.split(/\s+/);
  return firstWord || issue.magazines.name;
}

function canPreviewIssue(issue: ShelfIssue) {
  return !issue.is_embargoed && !!issue.pdf_url;
}

function IssueBook({
  issue,
  index,
  mode,
  onIntentOpen,
  onLeave,
}: {
  issue: ShelfIssue;
  index: number;
  mode: BookMode;
  onIntentOpen: (id: string, immediate?: boolean) => void;
  onLeave: (id: string) => void;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const accent = accents[index % accents.length];
  const monthYear = formatMonthYear(issue.month, issue.year);
  const canPreview = canPreviewIssue(issue);
  const [spreadStart, setSpreadStart] = useState(1);
  const [numPages, setNumPages] = useState(issue.page_count ?? 0);
  const [turning, setTurning] = useState<TurningSheet | null>(null);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const pageTurnDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageTurnFinishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const pdfDocRef = useRef<PdfDocLike | null>(null);
  const pdfLoadStartedRef = useRef(false);
  const renderTasksRef = useRef(new Set<import('pdfjs-dist').RenderTask>());
  const pageImagesRef = useRef<Record<number, string>>({});
  const pageRenderPromisesRef = useRef<Partial<Record<number, Promise<boolean>>>>({});
  const expanded = canPreview && mode === 'open';

  function clearPageTurnTimers() {
    if (pageTurnDelayRef.current) clearTimeout(pageTurnDelayRef.current);
    if (pageTurnFinishRef.current) clearTimeout(pageTurnFinishRef.current);
    pageTurnDelayRef.current = null;
    pageTurnFinishRef.current = null;
  }

  function navigateToTarget() {
    if (canPreview) {
      rememberReaderSource(issue.id, 'shelf');
      router.push(readerPath(issue.id));
    } else {
      router.push(`/issue/${issue.id}`);
    }
  }

  useEffect(() => {
    pageImagesRef.current = pageImages;
  }, [pageImages]);

  useEffect(() => {
    if (!expanded || pdfDocRef.current || pdfLoadStartedRef.current) return;
    if (!issue.pdf_url) {
      setPdfError(true);
      return;
    }

    pdfLoadStartedRef.current = true;
    setPdfLoading(true);
    setPdfError(false);

    let disposed = false;
    let task: import('pdfjs-dist').PDFDocumentLoadingTask | undefined;
    import('react-pdf').then(({ pdfjs }) => {
      if (disposed) return;
      configurePdfWorker(pdfjs);
      task = pdfjs.getDocument(issue.pdf_url!);
      return task.promise;
    }).then((pdf) => {
        if (!pdf || disposed) return;
        pdfDocRef.current = pdf as PdfDocLike;
        setNumPages(pdf.numPages);
        setPdfReady(true);
      })
      .catch(() => {
        if (!disposed) setPdfError(true);
      })
      .finally(() => {
        if (!disposed) setPdfLoading(false);
      });
    const tasks = renderTasksRef.current;
    return () => {
      disposed = true;
      for (const render of tasks) render.cancel();
      tasks.clear();
      pdfDocRef.current = null;
      pdfLoadStartedRef.current = false;
      pageRenderPromisesRef.current = {};
      pageImagesRef.current = {};
      setPageImages({});
      setPdfReady(false);
      void task?.destroy().catch(() => {});
    };
  }, [expanded, issue.pdf_url]);

  const ensurePageImage = useCallback(
    async (pageNumber: number): Promise<boolean> => {
      const totalPages = numPages || issue.page_count || 0;
      if (pageNumber < 1 || (totalPages > 0 && pageNumber > totalPages)) return true;
      if (pageImagesRef.current[pageNumber]) return true;
      if (pageRenderPromisesRef.current[pageNumber]) {
        return pageRenderPromisesRef.current[pageNumber];
      }

      const pdfDoc = pdfDocRef.current;
      if (!pdfDoc) return false;

      const renderPromise = (async () => {
        const page = await pdfDoc.getPage(pageNumber);
        if (pdfDocRef.current !== pdfDoc) return false;
        const baseViewport = page.getViewport({ scale: 1 });
        const longSide = Math.max(baseViewport.width, baseViewport.height);
        const scale = Math.min(1.8, Math.max(1, 1000 / longSide));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) return false;

        const render = page.render({ canvasContext: context, viewport });
        renderTasksRef.current.add(render);
        try { await render.promise; }
        finally { renderTasksRef.current.delete(render); }
        if (pdfDocRef.current !== pdfDoc) { canvas.width = canvas.height = 0; return false; }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        pageImagesRef.current = { ...pageImagesRef.current, [pageNumber]: dataUrl };
        // Retain at most three nearby spreads, even during long previews.
        const keys = Object.keys(pageImagesRef.current).map(Number)
          .sort((a, b) => Math.abs(a - pageNumber) - Math.abs(b - pageNumber));
        for (const key of keys.slice(6)) delete pageImagesRef.current[key];
        setPageImages({ ...pageImagesRef.current });
        canvas.width = canvas.height = 0;
        page.cleanup();
        return true;
      })();

      pageRenderPromisesRef.current[pageNumber] = renderPromise;

      try {
        return await renderPromise;
      } catch {
        // Keep the skeleton in place; the full reader remains the reliable path.
        return false;
      } finally {
        if (pageRenderPromisesRef.current[pageNumber] === renderPromise) delete pageRenderPromisesRef.current[pageNumber];
      }
    },
    [issue.page_count, numPages],
  );

  useEffect(() => {
    if (!expanded || !pdfReady || !pdfDocRef.current) return;

    const pages = new Set<number>([spreadStart, spreadStart + 1]);
    if (turning) {
      pages.add(turning.oldLeftPage);
      pages.add(turning.fromPage);
      pages.add(turning.toPage);
      pages.add(turning.nextRightPage);
    }

    pages.forEach((pageNumber) => {
      void ensurePageImage(pageNumber);
    });
  }, [ensurePageImage, expanded, pdfReady, spreadStart, turning]);

  useEffect(() => {
    if (mode !== 'open') {
      clearPageTurnTimers();
      setSpreadStart(1);
      setTurning(null);
    }
  }, [mode]);

  useEffect(() => {
    if (reduceMotion || mode !== 'open' || turning || !pdfReady) return;
    const totalPages = numPages || issue.page_count || 0;
    if (totalPages <= 2) return;
    let cancelled = false;

    pageTurnDelayRef.current = setTimeout(() => {
      void (async () => {
        const rightPage = Math.min(spreadStart + 1, totalPages);
        const nextStart = spreadStart + 2 <= totalPages ? spreadStart + 2 : 1;
        const nextRightPage = nextStart + 1;
        if (nextStart === spreadStart) return;

        const ready = await Promise.all([
          ensurePageImage(spreadStart),
          ensurePageImage(rightPage),
          ensurePageImage(nextStart),
          ensurePageImage(nextRightPage),
        ]);
        if (cancelled || ready.some((ok) => !ok)) return;

        setTurning({
          oldLeftPage: spreadStart,
          fromPage: rightPage,
          toPage: nextStart,
          nextStart,
          nextRightPage,
        });

        pageTurnFinishRef.current = setTimeout(() => {
          setSpreadStart(nextStart);
          setTurning(null);
        }, TURN_DURATION_MS);
      })();
    }, PAGE_HOLD_MS);

    return () => {
      cancelled = true;
      if (pageTurnDelayRef.current) clearTimeout(pageTurnDelayRef.current);
      pageTurnDelayRef.current = null;
    };
  }, [ensurePageImage, issue.page_count, mode, numPages, pdfReady, reduceMotion, spreadStart, turning]);

  useEffect(() => {
    return () => {
      clearPageTurnTimers();
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  return (
    <motion.div
      layout
      className={`group relative shrink-0 cursor-pointer ${expanded ? 'z-40 w-[300px] sm:w-[390px] lg:w-[460px]' : 'z-10 w-[152px] sm:w-[178px] lg:w-[176px]'}`}
      initial={false}
      animate={{ y: expanded ? -22 : 0, opacity: 1 }}
      transition={{
        layout: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.45, delay: expanded ? 0 : 0.2 + index * 0.06 },
      }}
      onMouseEnter={() => {
        if (canPreview) onIntentOpen(issue.id);
      }}
      onMouseLeave={() => onLeave(issue.id)}
      onPointerDown={(event: React.PointerEvent) => {
        if (!canPreview) return;
        if (event.pointerType === 'mouse') return;
        suppressClickRef.current = false;
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
          suppressClickRef.current = true;
          onIntentOpen(issue.id, true);
        }, LONG_PRESS_MS);
      }}
      onPointerUp={(event: React.PointerEvent) => {
        if (!canPreview) return;
        if (event.pointerType === 'mouse') return;
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        if (suppressClickRef.current) onLeave(issue.id);
      }}
      onPointerCancel={(event: React.PointerEvent) => {
        if (!canPreview) return;
        if (event.pointerType === 'mouse') return;
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        onLeave(issue.id);
      }}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        navigateToTarget();
      }}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigateToTarget();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={canPreview ? `Read ${issue.title}` : `View details for ${issue.title}`}
    >
      {expanded ? (
        <InFlowBookPreview
          issue={issue}
          accent={accent}
          monthYear={monthYear}
          spreadStart={spreadStart}
          numPages={numPages}
          turning={turning}
          closing={false}
          pageImages={pageImages}
          pdfLoading={pdfLoading}
          pdfError={pdfError}
        />
      ) : (
        <ClosedIssueCover issue={issue} accent={accent} monthYear={monthYear} />
      )}

      <div className="absolute -bottom-1 left-3 right-3 h-2 rounded-full bg-black/[0.08]" />
    </motion.div>
  );
}

function ClosedIssueCover({
  issue,
  accent,
  monthYear,
}: {
  issue: ShelfIssue;
  accent: string;
  monthYear: string;
}) {
  const locked = issue.is_embargoed;

  return (
    <motion.div
      className={`relative mx-auto aspect-[5/7] w-[152px] overflow-hidden rounded-r-md rounded-l-sm bg-gradient-to-br from-gold-50 to-flame-50 shadow-lg ring-1 ring-black/5 transition-shadow duration-300 group-hover:shadow-2xl sm:w-[178px] lg:w-[176px] ${
        locked ? 'ring-gold-200/80' : ''
      }`}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <BookSpine accent={accent} />

      {issue.cover_image_url ? (
        <Image
          src={issue.cover_image_url}
          alt={issue.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 140px, (max-width: 1024px) 165px, 150px"
        />
      ) : (
        <CoverFallback issue={issue} monthYear={monthYear} />
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-gray-950/80 via-gray-950/45 to-transparent px-3 pt-10 pb-3 text-left">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{issue.title}</p>
        <p className="mt-1 text-[10px] font-medium text-white/75">{monthYear}</p>
      </div>

      {locked && (
        <div className="absolute top-10 left-2 z-30 flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full bg-gray-950/82 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
          <LockKeyhole className="h-2.5 w-2.5" />
          <span className="truncate">{issue.embargo_lift_label ?? 'Subscribers'}</span>
        </div>
      )}

      {locked && (
        <div className="absolute top-2 left-2 z-20 rounded-full border border-gold-200 bg-white/90 px-2 py-1 text-[9px] font-bold uppercase tracking-normal text-gold-800 shadow-sm">
          Subscribers first
        </div>
      )}

      <div className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-flame-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        {locked ? <LockKeyhole className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
      </div>

      <div className="absolute top-2 right-0 bottom-2 z-10 w-[3px] rounded-r-sm bg-gradient-to-l from-black/[0.12] to-transparent" />
    </motion.div>
  );
}

function InFlowBookPreview({
  issue,
  accent,
  monthYear,
  spreadStart,
  numPages,
  turning,
  closing,
  pageImages,
  pdfLoading,
  pdfError,
}: {
  issue: ShelfIssue;
  accent: string;
  monthYear: string;
  spreadStart: number;
  numPages: number;
  turning: TurningSheet | null;
  closing: boolean;
  pageImages: Record<number, string>;
  pdfLoading: boolean;
  pdfError: boolean;
}) {
  const visibleLeftPage = turning ? turning.toPage : spreadStart;
  const visibleRightPage = turning ? turning.nextRightPage : spreadStart + 1;
  const totalPages = numPages || issue.page_count || 0;
  const displayLeft = totalPages > 0 ? Math.min(visibleLeftPage, totalPages) : visibleLeftPage;
  const displayRight = totalPages > 0 ? Math.min(visibleRightPage, totalPages) : visibleRightPage;

  return (
    <motion.div
      className="relative h-[226px] w-full sm:h-[270px] lg:h-[310px]"
      style={{ perspective: 1500 }}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute -inset-x-4 bottom-0 h-10 rounded-full bg-black/10 blur-2xl" />

      <motion.div
        className="absolute inset-x-1 top-1 bottom-2 rounded-[10px] bg-gradient-to-br from-gold-100/80 via-white to-flame-50 shadow-[0_28px_70px_rgba(110,72,33,0.22)] ring-1 ring-flame-100/80"
        initial={{ rotateX: 3 }}
        animate={{ rotateX: closing ? 2 : 0 }}
        transition={{ duration: 0.45 }}
      />

      <div className="absolute inset-x-4 top-5 bottom-6">
        <div className="relative flex h-full w-full overflow-visible rounded-md">
          <BookPage side="left">
            <PdfPreviewPage
              pageNumber={visibleLeftPage}
              pageImage={pageImages[visibleLeftPage]}
              numPages={numPages}
              loading={pdfLoading}
              error={pdfError}
            />
          </BookPage>
          <BookPage side="right">
            <PdfPreviewPage
              pageNumber={visibleRightPage}
              pageImage={pageImages[visibleRightPage]}
              numPages={numPages}
              loading={pdfLoading}
              error={pdfError}
            />
          </BookPage>

          <AnimatePresence>
            {turning && !closing && (
              <OldLeftPageCover
                key={`old-left-${turning.oldLeftPage}`}
                pageNumber={turning.oldLeftPage}
                pageImage={pageImages[turning.oldLeftPage]}
                numPages={numPages}
                loading={pdfLoading}
                error={pdfError}
              />
            )}
          </AnimatePresence>

          <div className="pointer-events-none absolute top-1 bottom-1 left-1/2 z-20 w-4 -translate-x-1/2 bg-gradient-to-r from-black/[0.06] via-transparent to-black/[0.06] opacity-45" />
          <div className="pointer-events-none absolute top-3 bottom-3 left-1/2 z-30 w-px -translate-x-1/2 bg-flame-800/10" />

          {turning && !closing && (
            <TurningPage
              key={`${turning.fromPage}-${turning.toPage}`}
              turning={turning}
              pageImages={pageImages}
              numPages={numPages}
              loading={pdfLoading}
              error={pdfError}
            />
          )}
        </div>
      </div>

      <CoverFlap
        issue={issue}
        accent={accent}
        monthYear={monthYear}
        closing={closing}
      />

      <div className="pointer-events-none absolute top-3 right-3 z-50 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-flame-700 shadow-sm ring-1 ring-flame-100">
        <BookOpen className="h-3 w-3" />
        <span>
          {totalPages > 0 ? `${displayLeft}-${displayRight} / ${totalPages}` : 'Preview'}
        </span>
      </div>
    </motion.div>
  );
}

function CoverFlap({
  issue,
  accent,
  monthYear,
  closing,
}: {
  issue: ShelfIssue;
  accent: string;
  monthYear: string;
  closing: boolean;
}) {
  return (
    <motion.div
      className="absolute top-5 right-4 bottom-6 z-40 w-[calc(50%-16px)] origin-left overflow-hidden rounded-r-md bg-gradient-to-br from-gold-50 to-flame-50 shadow-2xl"
      style={{
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
      }}
      initial={{ rotateY: 0, opacity: 1 }}
      animate={closing ? { rotateY: 0, opacity: 1 } : { rotateY: -178, opacity: 0 }}
      exit={{ rotateY: 0, opacity: 0 }}
      transition={{ duration: closing ? 0.72 : 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {issue.cover_image_url ? (
        <Image src={issue.cover_image_url} alt="" fill className="object-cover" sizes="240px" />
      ) : (
        <CoverFallback issue={issue} monthYear={monthYear} />
      )}
      <BookSpine accent={accent} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/70 to-transparent px-3 pt-12 pb-3">
        <p className="line-clamp-2 text-xs font-semibold text-white">{issue.title}</p>
      </div>
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/12 to-transparent" />
    </motion.div>
  );
}

function TurningPage({
  turning,
  pageImages,
  numPages,
  loading,
  error,
}: {
  turning: TurningSheet;
  pageImages: Record<number, string>;
  numPages: number;
  loading: boolean;
  error: boolean;
}) {
  const faceStyle = {
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
  };
  const foldTransition = {
    duration: TURN_DURATION_MS / 1000,
    ease: [0.16, 1, 0.3, 1] as const,
  };

  return (
    <motion.div
      className="absolute top-0 right-0 bottom-0 z-40 w-1/2 origin-left"
      style={{
        transformStyle: 'preserve-3d',
        transformOrigin: 'left center',
        transformPerspective: 1500,
        willChange: 'transform',
      }}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: -180 }}
      transition={foldTransition}
    >
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-r-md bg-[#fffdf8] p-2 pl-3 shadow-[inset_0_0_20px_rgba(110,72,33,0.08)]"
        style={faceStyle}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-sm bg-white shadow-sm">
          <PdfPreviewPage
            pageNumber={turning.fromPage}
            pageImage={pageImages[turning.fromPage]}
            numPages={numPages}
            loading={loading}
            error={error}
          />
        </div>
        <PageFoldLighting side="front" />
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-l-md bg-[#fffdf8] p-2 pr-3 shadow-[inset_0_0_20px_rgba(110,72,33,0.08)]"
        style={{
          ...faceStyle,
          transform: 'rotateY(180deg)',
        }}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-black/10 to-transparent" />
        <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-sm bg-white shadow-sm">
          <PdfPreviewPage
            pageNumber={turning.toPage}
            pageImage={pageImages[turning.toPage]}
            numPages={numPages}
            loading={loading}
            error={error}
          />
        </div>
      </div>

      <motion.div
        className="pointer-events-none absolute top-0 right-0 bottom-0 z-50 w-12 rounded-r-md bg-gradient-to-l from-white/55 via-white/18 to-transparent"
        style={{
          transformOrigin: 'right center',
          willChange: 'opacity',
        }}
        initial={{ opacity: 0.42 }}
        animate={{ opacity: 0 }}
        transition={foldTransition}
      />
      <motion.div
        className="pointer-events-none absolute top-0 bottom-0 left-0 z-50 w-10 bg-gradient-to-r from-black/24 via-black/8 to-transparent"
        initial={{ opacity: 0.2 }}
        animate={{ opacity: 0 }}
        transition={foldTransition}
      />
    </motion.div>
  );
}

function PageFoldLighting({ side }: { side: 'front' | 'back' }) {
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-y-0 ${
          side === 'front' ? 'left-0' : 'right-0'
        } w-4 ${
          side === 'front'
            ? 'bg-gradient-to-r from-black/[0.06] to-transparent'
            : 'bg-gradient-to-l from-black/[0.06] to-transparent'
        }`}
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-1/3 opacity-60"
        style={{
          [side === 'front' ? 'right' : 'left']: 0,
          background:
            side === 'front'
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), rgba(0,0,0,0.12))'
              : 'linear-gradient(270deg, transparent, rgba(255,255,255,0.28), rgba(244,114,52,0.14))',
        }}
      />
    </>
  );
}

function OldLeftPageCover({
  pageNumber,
  pageImage,
  numPages,
  loading,
  error,
}: {
  pageNumber: number;
  pageImage?: string;
  numPages: number;
  loading: boolean;
  error: boolean;
}) {
  return (
    <motion.div
      className="absolute top-0 bottom-0 left-0 z-[35] flex w-1/2 items-center justify-center overflow-hidden rounded-l-md bg-[#fffdf8] p-2 pr-3"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.18,
        delay: TURN_DURATION_MS / 1000 * 0.42,
        ease: 'easeOut',
      }}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/[0.04] to-transparent" />
      <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-sm bg-white">
        <PdfPreviewPage
          pageNumber={pageNumber}
          pageImage={pageImage}
          numPages={numPages}
          loading={loading}
          error={error}
        />
      </div>
    </motion.div>
  );
}

function BookPage({ side, children }: { side: 'left' | 'right'; children: ReactNode }) {
  return (
    <div
      className={`relative flex h-full w-1/2 items-center justify-center overflow-hidden bg-[#fffdf8] p-2 shadow-[inset_0_0_20px_rgba(110,72,33,0.08)] ${
        side === 'left' ? 'rounded-l-md pr-3' : 'rounded-r-md pl-3'
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 ${side === 'left' ? 'right-0' : 'left-0'} w-7 ${
          side === 'left'
            ? 'bg-gradient-to-l from-black/[0.06] to-transparent'
            : 'bg-gradient-to-r from-black/[0.06] to-transparent'
        }`}
      />
      <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-sm bg-white shadow-sm">
        {children}
      </div>
    </div>
  );
}

function PdfPreviewPage({
  pageNumber,
  pageImage,
  numPages,
  loading,
  error,
}: {
  pageNumber: number;
  pageImage?: string;
  numPages: number;
  loading: boolean;
  error: boolean;
}) {
  if (numPages > 0 && pageNumber > numPages) {
    return <div className="h-full w-full rounded-sm bg-gradient-to-br from-white to-flame-50" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm bg-white">
      {pageImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- PDF pages are locally rendered data URLs.
        <img
          src={pageImage}
          alt={`Page ${pageNumber}`}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      ) : error ? (
        <BookLoading label="Preview unavailable" />
      ) : loading ? (
        <PageSkeleton />
      ) : (
        <PageSkeleton />
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="h-full min-h-[160px] w-full animate-pulse rounded-sm bg-gradient-to-br from-gold-50 to-flame-50/70" />
  );
}

function BookLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[180px] w-full items-center justify-center text-xs font-medium text-flame-700">
      {label}
    </div>
  );
}

function CoverFallback({ issue, monthYear }: { issue: ShelfIssue; monthYear: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gold-50 to-flame-50 px-3 text-center">
      <span className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-xs font-semibold text-transparent">{fallbackTitle(issue)}</span>
      <span className="font-heading mt-2 text-lg font-bold text-gray-900">{monthYear}</span>
    </div>
  );
}

function BookSpine({ accent }: { accent: string }) {
  return (
    <div
      className="absolute top-0 left-0 z-20 h-full w-[6px]"
      style={{
        background: `linear-gradient(180deg, ${accent}CC, ${accent})`,
      }}
    />
  );
}

function Shelf() {
  return (
    <div className="relative">
      <div className="h-[8px] rounded-sm bg-gradient-to-b from-amber-700/20 to-amber-800/25" />
      <div className="h-[4px] rounded-b-sm bg-gradient-to-b from-amber-800/20 to-amber-900/10" />
      <div className="h-[8px] bg-gradient-to-b from-black/[0.04] to-transparent" />
    </div>
  );
}

function IssueRow({ issues, offset = 0 }: { issues: ShelfIssue[]; offset?: number }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const closingIdRef = useRef<string | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const hoverIntentRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHoverIntent() {
    if (hoverIntentRef.current) clearTimeout(hoverIntentRef.current);
    hoverIntentRef.current = null;
  }

  function openNow(id: string) {
    if (closingIdRef.current === id) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      setClosingId(null);
      closingIdRef.current = null;
    }

    setActiveId(id);
    activeIdRef.current = id;
  }

  function beginClose(id: string) {
    clearHoverIntent();
    if (closingIdRef.current === id) return;

    setActiveId(null);
    activeIdRef.current = null;
    setClosingId(id);
    closingIdRef.current = id;

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      if (closingIdRef.current === id) {
        setClosingId(null);
        closingIdRef.current = null;
      }
    }, CLOSE_DURATION_MS);
  }

  function intentOpen(id: string, immediate = false) {
    const issue = issues.find((item) => item.id === id);
    if (!issue || !canPreviewIssue(issue)) return;

    hoveredIdRef.current = id;
    clearHoverIntent();

    const active = activeIdRef.current;
    const closing = closingIdRef.current;

    if (active === id) return;
    if (closing === id) {
      openNow(id);
      return;
    }

    if (active && active !== id) {
      beginClose(active);
      openNow(id);
      return;
    }

    if (closing) {
      openNow(id);
      return;
    }

    hoverIntentRef.current = setTimeout(() => {
      if (hoveredIdRef.current === id && !activeIdRef.current && !closingIdRef.current) {
        openNow(id);
      }
    }, immediate ? 0 : HOVER_INTENT_MS);
  }

  function leaveBook(id: string) {
    if (hoveredIdRef.current === id) hoveredIdRef.current = null;
    clearHoverIntent();

    if (activeIdRef.current === id) beginClose(id);
  }

  useEffect(() => {
    return () => {
      clearHoverIntent();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (issues.length === 0) return null;

  return (
    <>
      <div className="flex min-h-[230px] items-end justify-center gap-3 px-1 pb-1 sm:min-h-[284px] sm:gap-4 lg:min-h-[334px]">
        {issues.map((issue, index) => {
          const previewable = canPreviewIssue(issue);
          const mode: BookMode =
            previewable && activeId === issue.id
              ? 'open'
              : previewable && closingId === issue.id
                ? 'closing'
                : 'closed';

          return (
            <IssueBook
              key={issue.id}
              issue={issue}
              index={index + offset}
              mode={mode}
              onIntentOpen={intentOpen}
              onLeave={leaveBook}
            />
          );
        })}
      </div>
      <Shelf />
    </>
  );
}

function EmptyShelf() {
  return (
    <div className="space-y-5" aria-label="Empty issue shelf">
      <div className="flex min-h-[230px] items-end justify-center gap-3 px-1 pb-1 sm:min-h-[284px] sm:gap-4 lg:min-h-[334px]">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="relative aspect-[5/7] w-[152px] overflow-hidden rounded-r-md rounded-l-sm border-2 border-dashed border-flame-200/80 bg-flame-50/30 sm:w-[178px] lg:w-[176px]"
          />
        ))}
      </div>
      <Shelf />
    </div>
  );
}

function useIssuesPerRow() {
  const [perRow, setPerRow] = useState(4);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width >= 1024) setPerRow(4);
      else if (width >= 640) setPerRow(3);
      else setPerRow(2);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return perRow;
}

function buildYearRange(minYear: number, maxYear: number): number[] {
  const years: number[] = [];
  for (let year = minYear; year <= maxYear; year += 1) years.push(year);
  return years;
}

function YearNavigator({
  selectedYear,
  minYear,
  maxYear,
  readableCount,
  lockedCount,
  totalCount,
  onChange,
}: {
  selectedYear: number;
  minYear: number;
  maxYear: number;
  readableCount: number;
  lockedCount: number;
  totalCount: number;
  onChange: (year: number) => void;
}) {
  const hasOnlyLocked = totalCount > 0 && lockedCount > 0 && readableCount === 0;
  const hasMixedAccess = lockedCount > 0 && readableCount > 0;
  const statusLabel =
    totalCount === 0
      ? 'No editions on this shelf yet'
      : hasOnlyLocked
        ? 'Subscriber editions'
        : hasMixedAccess
          ? 'Mixed access year'
          : 'Public archive';
  const countLabel =
    totalCount === 0
      ? 'Choose another year'
      : hasOnlyLocked
        ? `${lockedCount} cover${lockedCount === 1 ? '' : 's'} visible`
        : `${readableCount} readable issue${readableCount === 1 ? '' : 's'}`;

  return (
    <div className="mb-8 flex flex-col items-center gap-3">
      <div className="flex w-full max-w-md items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onChange(selectedYear - 1)}
          disabled={selectedYear <= minYear}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-flame-100 bg-white text-flame-700 shadow-sm transition-colors hover:border-flame-200 hover:bg-flame-50 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white"
          aria-label="Previous year"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 rounded-2xl border border-flame-100 bg-white/95 px-2 py-3 text-center shadow-[0_12px_34px_rgba(120,84,28,0.10)] ring-1 ring-white sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-normal text-flame-600">
            Selected year
          </p>
          <div className="mt-1 flex items-center justify-center gap-3">
            <span className="font-heading text-4xl font-bold leading-none text-gray-950 sm:text-5xl">
              {selectedYear}
            </span>
            {hasOnlyLocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2.5 py-1 text-[11px] font-semibold text-gold-800 ring-1 ring-gold-200">
                <LockKeyhole className="h-3 w-3" />
                Covers only
              </span>
            )}
          </div>
          <p className="mt-2 text-xs font-semibold text-gray-700">{statusLabel}</p>
          <p className="mt-0.5 text-xs text-gray-500">{countLabel}</p>
        </div>

        <button
          type="button"
          onClick={() => onChange(selectedYear + 1)}
          disabled={selectedYear >= maxYear}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-flame-100 bg-white text-flame-700 shadow-sm transition-colors hover:border-flame-200 hover:bg-flame-50 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white"
          aria-label="Next year"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-1" aria-label="Choose archive year">
        {buildYearRange(minYear, maxYear).map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onChange(year)}
            aria-pressed={selectedYear === year}
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${selectedYear === year ? 'bg-flame-100 text-flame-900' : 'text-gray-600 hover:bg-flame-50'}`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AnimatedBookshelf({ issues: suppliedIssues, years }: AnimatedBookshelfProps) {
  const reduceMotion = useReducedMotion();
  const [issues, setIssues] = useState(suppliedIssues);
  const yearCache = useRef(new TtlCache<ShelfIssue[]>(60_000, 12));
  const [yearLoading, setYearLoading] = useState(false);
  const [yearError, setYearError] = useState(false);
  const [yearRetry, setYearRetry] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('uploaded');
  const [magazineFilter, setMagazineFilter] = useState<MagazineFilter>('all');
  const issuesPerRow = useIssuesPerRow();
  const activeCopy = sortCopy[sortMode];
  const currentYear = new Date().getFullYear();
  const issueYears = useMemo(
    () => years.map((entry) => entry.year),
    [years],
  );
  const minYear = issueYears[0] ?? currentYear;
  const maxYear = issueYears[issueYears.length - 1] ?? currentYear;
  const defaultYear = useMemo(() => {
    const readableYears = issues
      .filter(canPreviewIssue)
      .map((issue) => issue.year)
      .sort((a, b) => b - a);
    if (readableYears[0]) return readableYears[0];
    return issueYears[issueYears.length - 1] ?? currentYear;
  }, [currentYear, issueYears, issues]);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  useEffect(() => {
    if (suppliedIssues[0]) yearCache.current.set(String(suppliedIssues[0].year), suppliedIssues);
  }, [suppliedIssues]);

  useEffect(() => {
    const cached = yearCache.current.get(String(selectedYear));
    if (cached) { setIssues(cached); setYearLoading(false); setYearError(false); return; }
    const controller = new AbortController();
    setYearLoading(true); setYearError(false);
    fetch(`/api/issues/shelf?year=${selectedYear}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Shelf unavailable'); return response.json() as Promise<ShelfIssue[]>; })
      .then(data => { if (!controller.signal.aborted) { yearCache.current.set(String(selectedYear), data); setIssues(data); } })
      .catch(() => { if (!controller.signal.aborted) setYearError(true); })
      .finally(() => { if (!controller.signal.aborted) setYearLoading(false); });
    return () => controller.abort();
  }, [selectedYear, yearRetry]);

  useEffect(() => {
    if (selectedYear < minYear || selectedYear > maxYear) {
      setSelectedYear(defaultYear);
    }
  }, [defaultYear, maxYear, minYear, selectedYear]);

  const magazineOptions = useMemo(() => {
    const byId = new Map<string, string>();
    suppliedIssues.forEach((issue) => {
      byId.set(issue.magazines.id, issue.magazines.name);
    });

    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name, label: magazineShortName(name) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [suppliedIssues]);
  const yearIssues = useMemo(
    () => issues.filter((issue) => issue.year === selectedYear),
    [issues, selectedYear],
  );
  const filteredIssues = useMemo(() => {
    if (magazineFilter === 'all') return yearIssues;
    return yearIssues.filter((issue) => issue.magazines.id === magazineFilter);
  }, [magazineFilter, yearIssues]);
  const visibleIssues = useMemo(() => {
    const sorted = [...filteredIssues].sort((a, b) => {
      if (sortMode === 'issue-date') {
        return b.month - a.month || b.title.localeCompare(a.title);
      }

      if (sortMode === 'title') {
        return a.title.localeCompare(b.title);
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.month - a.month;
    });

    return sorted.slice(0, 12);
  }, [filteredIssues, sortMode]);
  const issueRows = useMemo(() => {
    const chunks: ShelfIssue[][] = [];
    for (let i = 0; i < visibleIssues.length; i += issuesPerRow) {
      chunks.push(visibleIssues.slice(i, i + issuesPerRow));
    }
    return chunks;
  }, [visibleIssues, issuesPerRow]);
  const activeMagazineName =
    magazineFilter === 'all'
      ? 'all magazines'
      : magazineOptions.find((option) => option.id === magazineFilter)?.name || 'selected magazine';
  const readableCount = yearIssues.filter(canPreviewIssue).length;
  const lockedCount = yearIssues.filter((issue) => issue.is_embargoed).length;
  const statusLine =
    yearLoading ? `Loading editions for ${selectedYear}…` : yearError ? 'Editions could not be loaded.' : yearIssues.length === 0
      ? `No editions found for ${selectedYear}`
      : filteredIssues.length === 0
        ? `No ${activeMagazineName} editions found for ${selectedYear}`
        : `Showing ${visibleIssues.length} of ${filteredIssues.length} ${activeMagazineName} edition${filteredIssues.length === 1 ? '' : 's'} for ${selectedYear}`;
  const browseBaseHref =
    lockedCount > 0 && readableCount === 0
      ? `/browse?availability=subscriber&year=${selectedYear}`
      : `/browse?availability=read&year=${selectedYear}`;
  const browseHref = magazineFilter === 'all' ? browseBaseHref : `${browseBaseHref}&magazine=${encodeURIComponent(magazineFilter)}`;

  return (
    <MotionConfig reducedMotion="user">
    <div className="mx-auto w-full max-w-5xl">
      <motion.div
        className="relative"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="rounded-xl border border-flame-100/80 bg-gradient-to-b from-white to-flame-50/40 p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-flame-100 pb-4">
            <div className="w-full text-left sm:w-auto">
              <p className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-xs font-semibold uppercase text-transparent">{activeCopy.eyebrow}</p>
              <h2 className="font-heading text-2xl font-bold text-gray-900">{activeCopy.heading}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <LibraryBig className="h-3.5 w-3.5 text-flame-500" />
                {statusLine}
              </p>
              {yearError && <button type="button" onClick={() => setYearRetry(value => value + 1)} className="min-h-11 px-3 text-sm font-semibold text-flame-800">Try again</button>}
            </div>
            <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-1">
              {magazineOptions.length > 1 && (
                <div className="inline-flex max-w-full rounded-full border border-flame-100 bg-white/95 p-1 shadow-[0_8px_24px_rgba(120,84,28,0.08)] ring-1 ring-white">
                  <button
                    type="button"
                    aria-pressed={magazineFilter === 'all'}
                    onClick={() => setMagazineFilter('all')}
                    className={`relative isolate min-h-11 min-w-11 rounded-full px-3 text-xs font-semibold transition-colors ${
                      magazineFilter === 'all'
                        ? 'text-white'
                        : 'text-gray-600 hover:bg-flame-50/80 hover:text-flame-800'
                    }`}
                  >
                    {magazineFilter === 'all' && (
                      <motion.span
                        layoutId="bookshelf-magazine-active"
                        className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-gold-500 to-flame-500 shadow-[0_6px_14px_rgba(190,140,46,0.24)]"
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 34 }}
                      />
                    )}
                    All
                  </button>
                  {magazineOptions.map((option) => {
                    const active = magazineFilter === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={active}
                        title={option.name}
                        onClick={() => setMagazineFilter(option.id)}
                        className={`relative isolate min-h-11 min-w-11 rounded-full px-3 text-xs font-semibold transition-colors ${
                          active
                            ? 'text-white'
                            : 'text-gray-600 hover:bg-flame-50/80 hover:text-flame-800'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="bookshelf-magazine-active"
                            className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-gold-500 to-flame-500 shadow-[0_6px_14px_rgba(190,140,46,0.24)]"
                            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 34 }}
                          />
                        )}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div
                className="inline-flex max-w-full rounded-full border border-flame-100 bg-white/95 p-1 shadow-[0_10px_30px_rgba(120,84,28,0.10)] ring-1 ring-white"
                aria-label="Sort readable archive issues"
              >
                {sortOptions.map(({ id, label, shortLabel, Icon }) => {
                  const active = sortMode === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSortMode(id)}
                      className={`relative isolate flex min-h-11 min-w-11 items-center gap-1.5 overflow-hidden rounded-full px-3 text-xs font-semibold transition-colors sm:px-3.5 ${
                        active
                          ? 'text-white'
                          : 'text-gray-600 hover:bg-flame-50/80 hover:text-flame-800'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="bookshelf-sort-active"
                          className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-gold-500 to-flame-500 shadow-[0_6px_16px_rgba(190,140,46,0.28)]"
                          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 34 }}
                        />
                      )}
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-white' : 'text-flame-700/75'}`} />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Link
              href={browseHref}
              className="mx-auto inline-flex min-h-11 items-center justify-center rounded-lg border border-flame-200 bg-white px-4 py-2 text-sm font-semibold text-flame-700 transition-colors hover:border-flame-300 hover:bg-flame-50 sm:mx-0"
            >
              Browse all
            </Link>
          </div>

          <YearNavigator
            selectedYear={selectedYear}
            minYear={minYear}
            maxYear={maxYear}
            readableCount={readableCount}
            lockedCount={lockedCount}
            totalCount={yearIssues.length}
            onChange={setSelectedYear}
          />

          {visibleIssues.length > 0 ? (
            <div className="space-y-5">
              {issueRows.map((rowIssues, rowIndex) => (
                <IssueRow
                  key={`${selectedYear}-${rowIndex}`}
                  issues={rowIssues}
                  offset={rowIndex * issuesPerRow}
                />
              ))}
            </div>
          ) : (
            <div className="text-center">
              <EmptyShelf />
              <div className="mt-5 flex flex-col items-center gap-1.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-50 to-flame-50 text-flame-600 ring-1 ring-flame-100">
                  <BookDashed className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-gray-700">
                  {yearIssues.length === 0
                    ? `No editions found for ${selectedYear}.`
                    : 'No issues match this shelf filter yet.'}
                </p>
                <p className="max-w-md text-xs text-gray-500">
                  {yearIssues.length === 0
                    ? 'Use the year buttons to move to a year with available covers.'
                    : 'Try a different magazine or clear the filter to see everything available.'}
                </p>
              </div>
              {yearIssues.length > 0 && filteredIssues.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setMagazineFilter('all')}
                  className="mt-4 rounded-lg border border-flame-200 bg-white px-5 py-2.5 text-sm font-semibold text-flame-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
                >
                  Show all magazines
                </button>
              ) : (
                <Link
                  href="/browse"
                  className="mt-4 inline-block rounded-lg border border-flame-200 bg-white px-5 py-2.5 text-sm font-semibold text-flame-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
                >
                  Browse the archive
                </Link>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
    </MotionConfig>
  );
}
