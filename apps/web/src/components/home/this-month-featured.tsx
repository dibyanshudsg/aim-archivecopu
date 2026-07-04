'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { LANGUAGE_NAMES, MONTH_NAMES } from '@aim-archive/shared';
import type { Language, MonthIndex } from '@aim-archive/shared';
import { useBookmarks } from '@/lib/bookmarks-store';
import { readerPath, rememberReaderSource } from '@/lib/reader-url';
import { cn, formatFileSize } from '@/lib/utils';

// Configure react-pdf worker (idempotent — same setup as the reader page).
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/** Reactive media-query hook — switches the embedded reader between
 *  single-page (mobile/tablet) and two-page-spread (desktop, lg+). */
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

interface ThisMonthFeaturedProps {
  magazines: ApiMagazine[];
  /** Issues whose 5-year embargo has just lifted — typically dated (today.year
   *  - 5, today.month) and the immediately previous month. Server-fetched and
   *  embargo-filtered before reaching us. */
  issues: ApiIssue[];
  /** Issue date of the "this month's release" featured edition (5 years
   *  behind the wall clock under the rolling embargo). */
  currentYear: number;
  currentMonth: number; // 1-12
  prevYear: number;
  prevMonth: number; // 1-12
}

type MagazineFilter = 'all' | string;

function inMonth(issue: ApiIssue, year: number, month: number) {
  return issue.year === year && issue.month === month;
}

/**
 * "This Month's Editions" — manual slideshow of issues from the current
 * calendar month. Shows a single issue at a time with magazine filter chips
 * and an opt-in "Show Previous Month's Editions" toggle that expands the
 * window to include last month.
 *
 * No auto-rotation. Navigation is fully manual via the control bar (or
 * keyboard ← / →). Touch swipes within the embedded reader turn pages of the
 * issue but never switch issues — that requires the explicit nav buttons.
 */
export function ThisMonthFeatured({
  magazines,
  issues,
  currentYear,
  currentMonth,
  prevYear,
  prevMonth,
}: ThisMonthFeaturedProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // ---------- Filter state ----------
  const [magazineFilter, setMagazineFilter] = useState<MagazineFilter>('all');
  const [showPrevious, setShowPrevious] = useState(false);

  // Pre-bucket the source issues by month — stable references keep the
  // downstream memos cheap on re-render.
  const currentMonthIssues = useMemo(
    () => issues.filter((i) => inMonth(i, currentYear, currentMonth)),
    [issues, currentYear, currentMonth],
  );
  const prevMonthIssues = useMemo(
    () => issues.filter((i) => inMonth(i, prevYear, prevMonth)),
    [issues, prevYear, prevMonth],
  );

  // The set of issues feeding the current view, before the magazine filter is
  // applied. Used both to compute `visibleIssues` and to disable magazine
  // chips that have no representation in the current month set.
  const monthSet = useMemo(
    () =>
      showPrevious
        ? [...currentMonthIssues, ...prevMonthIssues]
        : currentMonthIssues,
    [showPrevious, currentMonthIssues, prevMonthIssues],
  );

  const visibleIssues = useMemo(
    () =>
      monthSet.filter((i) =>
        magazineFilter === 'all' ? true : i.magazine_id === magazineFilter,
      ),
    [monthSet, magazineFilter],
  );

  /** Magazines that have at least one issue in the current view (regardless
   *  of the magazine filter). Drives the disabled state of magazine chips. */
  const magazinesInView = useMemo(
    () => new Set(monthSet.map((i) => i.magazine_id)),
    [monthSet],
  );

  // If the toggle change leaves the active magazine filter pointing at a
  // magazine with no issues in the new view, fall back to "All". Prevents
  // a "stuck on disabled chip" empty state.
  useEffect(() => {
    if (magazineFilter !== 'all' && !magazinesInView.has(magazineFilter)) {
      setMagazineFilter('all');
    }
  }, [magazineFilter, magazinesInView]);

  // ---------- Slideshow state ----------
  const [currentIndex, setCurrentIndex] = useState(0);
  /** 1 = forward slide animation, -1 = backward. */
  const [direction, setDirection] = useState(1);

  // Reset to the first slide whenever the visible set changes (new filter or
  // new month-window selection).
  useEffect(() => {
    setCurrentIndex(0);
    setDirection(1);
  }, [magazineFilter, showPrevious]);

  // Defensive clamp — if the visible set shrinks to fewer items than the
  // current index, snap back to start.
  useEffect(() => {
    if (currentIndex >= visibleIssues.length) setCurrentIndex(0);
  }, [visibleIssues.length, currentIndex]);

  function goPrev() {
    if (visibleIssues.length <= 1) return;
    setDirection(-1);
    setCurrentIndex(
      (idx) => (idx - 1 + visibleIssues.length) % visibleIssues.length,
    );
  }
  function goNext() {
    if (visibleIssues.length <= 1) return;
    setDirection(1);
    setCurrentIndex((idx) => (idx + 1) % visibleIssues.length);
  }
  function jumpTo(idx: number) {
    if (idx === currentIndex) return;
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  }

  // Keyboard navigation — only when focus is inside the carousel section.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIssues.length]);

  // Preload neighbour issues' cover JPEGs and PDFs into the browser cache so
  // slide changes don't flash white. Cover JPEGs are ~100 KB and warm
  // Next/Image's cache; the PDF fetch primes HTTP cache so react-pdf hits the
  // cache when it remounts on the next slide. Skipped on slow / save-data
  // connections.
  useEffect(() => {
    if (visibleIssues.length <= 1) return;
    const nextIdx = (currentIndex + 1) % visibleIssues.length;
    const prevIdx =
      (currentIndex - 1 + visibleIssues.length) % visibleIssues.length;
    const neighbours = [visibleIssues[nextIdx], visibleIssues[prevIdx]].filter(
      (issue, i, arr) => arr.findIndex((j) => j.id === issue.id) === i,
    );
    const conn = (
      navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    const slowConn =
      !!conn &&
      (conn.saveData === true ||
        /(2g|slow-2g)/i.test(conn.effectiveType ?? ''));

    const controllers: AbortController[] = [];
    for (const issue of neighbours) {
      if (issue.cover_image_url) {
        const img = new window.Image();
        img.src = issue.cover_image_url;
      }
      // Embargoed issues never reach this carousel (the server fetch filters
      // them upstream), but guard at runtime so a stale type assumption can't
      // throw on `fetch(null)`.
      if (!slowConn && issue.pdf_url) {
        const ctrl = new AbortController();
        controllers.push(ctrl);
        fetch(issue.pdf_url, { signal: ctrl.signal, cache: 'force-cache' }).catch(
          () => {
            /* prefetch best-effort — surface no error */
          },
        );
      }
    }
    return () => controllers.forEach((c) => c.abort());
  }, [currentIndex, visibleIssues]);

  // Bail if there's literally nothing to show across both windows. The
  // section is hidden entirely rather than rendering an empty card on the
  // homepage.
  if (currentMonthIssues.length === 0 && prevMonthIssues.length === 0)
    return null;

  const safeIndex =
    visibleIssues.length > 0
      ? Math.min(currentIndex, visibleIssues.length - 1)
      : 0;
  const currentIssue = visibleIssues[safeIndex];

  // Title doesn't change with the toggle — the eyebrow carries the dates.
  const titleText = 'Five Years Ago This Month';
  const eyebrowText = showPrevious
    ? `${MONTH_NAMES[currentMonth as MonthIndex]} ${currentYear} · ${MONTH_NAMES[prevMonth as MonthIndex]} ${prevYear}`
    : `${MONTH_NAMES[currentMonth as MonthIndex]} ${currentYear} · NEWLY PUBLIC`;

  const showMagazineFilter = magazines.length > 1;
  const hasPrevContent = prevMonthIssues.length > 0;

  return (
    <motion.section
      className="relative -mx-6 mt-16 max-w-5xl sm:mx-auto"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="this-month-heading"
    >
      <header className="mb-6 px-6 text-center sm:px-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flame-700">
          {eyebrowText}
        </p>
        {/* Title smoothly cross-fades between the "current" and
            "current + previous" variants when the toggle changes. */}
        <div className="relative mt-2 min-h-[2.25rem] sm:min-h-[2.75rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={titleText}
              id="this-month-heading"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="font-heading absolute inset-x-0 bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 text-2xl font-medium tracking-wide text-transparent sm:text-3xl"
            >
              {titleText}
            </motion.h2>
          </AnimatePresence>
        </div>
        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Editions whose embargo just lifted — now open to the public archive.
        </p>
        <p className="font-heading mt-1 text-sm text-gray-500 sm:text-base">
          An offering at Thy Lotus Feet.
        </p>
      </header>

      {/* Toolbar — magazine chips + previous-month toggle. Hidden when there's
          nothing meaningful to filter. */}
      {(showMagazineFilter || hasPrevContent) && (
        <div
          className="mb-6 flex flex-col items-center gap-3 px-6 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-3 sm:px-0"
          role="toolbar"
          aria-label="Filter editions"
        >
          {showMagazineFilter && (
            <MagazineFilterStrip
              magazines={magazines}
              value={magazineFilter}
              available={magazinesInView}
              onChange={setMagazineFilter}
            />
          )}
          {hasPrevContent && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <PreviousMonthToggle
                active={showPrevious}
                onToggle={() => setShowPrevious((v) => !v)}
              />
              {/* When the toggle is on, gently point users at /browse for
                  anything older than the previous month — the homepage
                  carousel intentionally caps at two months. */}
              <AnimatePresence initial={false}>
                {showPrevious && <BrowseOlderHint />}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Slideshow + control bar */}
      <div
        ref={containerRef}
        className="relative"
        role="region"
        aria-roledescription="carousel"
        aria-label="This month's editions"
      >
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {currentIssue
            ? `Showing edition ${safeIndex + 1} of ${visibleIssues.length}: ${currentIssue.title}`
            : ''}
        </div>

        {visibleIssues.length === 0 ? (
          <EmptyState
            magazineFilterActive={magazineFilter !== 'all'}
            showPrevious={showPrevious}
            hasPrevContent={hasPrevContent}
            onClearMagazine={() => setMagazineFilter('all')}
            onShowPrevious={() => setShowPrevious(true)}
          />
        ) : (
          <>
            <div
              className="relative overflow-hidden rounded-2xl"
              aria-roledescription="slide"
              aria-label={`${safeIndex + 1} of ${visibleIssues.length}`}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentIssue!.id}
                  custom={direction}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: direction * 32 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: -direction * 32 }
                  }
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="touch-pan-y"
                >
                  <FeaturedSlide issue={currentIssue!} />
                </motion.div>
              </AnimatePresence>
            </div>

            <CarouselControls
              issues={visibleIssues}
              currentIndex={safeIndex}
              goPrev={goPrev}
              goNext={goNext}
              jumpTo={jumpTo}
            />
          </>
        )}
      </div>
    </motion.section>
  );
}

// ---------- Magazine filter strip ----------
function MagazineFilterStrip({
  magazines,
  value,
  available,
  onChange,
}: {
  magazines: ApiMagazine[];
  value: MagazineFilter;
  /** Magazines that have ≥1 issue in the currently-visible month set. */
  available: Set<string>;
  onChange: (next: MagazineFilter) => void;
}) {
  const options: {
    value: MagazineFilter;
    label: string;
    disabled?: boolean;
  }[] = [
    { value: 'all', label: 'All' },
    ...magazines.map((m) => ({
      value: m.id,
      label: m.name,
      disabled: !available.has(m.id),
    })),
  ];
  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <span className="mt-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Magazine
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          const disabled = !!opt.disabled;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              title={disabled ? 'No editions in the current view' : undefined}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                active
                  ? 'bg-gradient-to-r from-gold-500 to-flame-500 text-white shadow-[0_4px_14px_rgba(190,140,46,0.22)]'
                  : disabled
                    ? 'border border-gray-100 bg-gray-50 text-gray-300 line-through decoration-gray-200'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Previous-month toggle ----------
function PreviousMonthToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
        active
          ? 'border border-flame-300 bg-flame-50 text-flame-700 shadow-sm'
          : 'border border-gray-200 bg-white text-gray-600 hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex h-3.5 w-6 items-center rounded-full p-0.5 transition-colors',
          active ? 'bg-gradient-to-r from-gold-500 to-flame-500' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full bg-white shadow transition-transform',
            active ? 'translate-x-2.5' : 'translate-x-0',
          )}
        />
      </span>
      {active
        ? "Hide Previous Month's Editions"
        : "Show Previous Month's Editions"}
    </button>
  );
}

/** Notification-style hint that appears beside the toggle when the user has
 *  expanded to two months — guiding them to /browse for anything older. The
 *  homepage carousel intentionally caps at the current + previous month. */
function BrowseOlderHint() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href="/browse"
        className="group inline-flex items-center gap-2 rounded-full border border-flame-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-600 shadow-sm transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700"
      >
        <span aria-hidden className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-flame-500" />
        </span>
        <span>For older editions, browse the archive</span>
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

// ---------- Single unified control bar (below the slide) ----------
function CarouselControls({
  issues,
  currentIndex,
  goPrev,
  goNext,
  jumpTo,
}: {
  issues: ApiIssue[];
  currentIndex: number;
  goPrev: () => void;
  goNext: () => void;
  jumpTo: (i: number) => void;
}) {
  if (issues.length <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-3 px-6 sm:gap-4 sm:px-0">
      <button
        type="button"
        onClick={goPrev}
        aria-label="Previous edition"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-sm transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <div className="flex items-center gap-1">
        {issues.map((issue, i) => (
          <button
            key={issue.id}
            type="button"
            onClick={() => jumpTo(i)}
            aria-label={`Go to edition ${i + 1} of ${issues.length}`}
            aria-current={i === currentIndex}
            className="flex h-9 w-9 items-center justify-center"
          >
            <span
              className={cn(
                'h-2 rounded-full transition-all',
                i === currentIndex
                  ? 'w-9 bg-gradient-to-r from-gold-500 to-flame-500'
                  : 'w-2 bg-flame-200 hover:bg-flame-300',
              )}
            />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={goNext}
        aria-label="Next edition"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-sm transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <span className="ml-1 hidden text-xs font-semibold tabular-nums text-gray-600 sm:inline">
        {currentIndex + 1} / {issues.length}
      </span>
    </div>
  );
}

// ---------- Empty state ----------
function EmptyState({
  magazineFilterActive,
  showPrevious,
  hasPrevContent,
  onClearMagazine,
  onShowPrevious,
}: {
  magazineFilterActive: boolean;
  showPrevious: boolean;
  hasPrevContent: boolean;
  onClearMagazine: () => void;
  onShowPrevious: () => void;
}) {
  if (magazineFilterActive) {
    return (
      <EmptyCard
        title="No editions for this magazine in the current view."
        ctaLabel="Show all magazines"
        onCta={onClearMagazine}
      />
    );
  }
  if (!showPrevious && hasPrevContent) {
    return (
      <EmptyCard
        title="Nothing newly released this month."
        subtitle="Previous month's releases are still available."
        ctaLabel="Show Previous Month's Editions"
        onCta={onShowPrevious}
      />
    );
  }
  return (
    <EmptyCard title="No editions newly released in this window yet — check back next month." />
  );
}

function EmptyCard({
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="mx-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-flame-200 bg-gradient-to-br from-gold-50/40 to-flame-50/40 px-6 py-16 text-center sm:mx-0">
      <p className="font-heading text-lg text-gray-600">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-4 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

// ---------- Single slide (rich, focused — with embedded reader) ----------
function FeaturedSlide({ issue }: { issue: ApiIssue }) {
  const { toggle, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(issue.id);

  const monthName = MONTH_NAMES[issue.month as MonthIndex];
  const language = (issue.magazines.language as Language) ?? 'english';
  const eyebrow = `${issue.magazines.name} — ${monthName} ${issue.year}`;
  const sortedTopics = [...issue.topics]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .slice(0, 3);

  // Embargoed issues never reach the carousel (server fetch filters them),
  // but if a `pdf_url` ever lands null here we'd hand react-pdf a broken
  // input — so the carousel just won't render the slide.
  if (!issue.pdf_url) return null;

  return (
    <article className="relative overflow-hidden border-y border-flame-200/60 bg-white shadow-[0_10px_36px_rgba(190,140,46,0.12)] sm:rounded-2xl sm:border">
      {/* Embedded PDF reader on top — single page on mobile/tablet, two-page
          spread on desktop (lg+). */}
      <SlideReader
        pdfUrl={issue.pdf_url}
        fallbackCoverUrl={issue.cover_image_url}
        fallbackTitle={issue.title}
        magazineName={issue.magazines.name}
        monthName={monthName}
        year={issue.year}
        language={language}
      />

      {/* Info section below the book */}
      <div className="px-6 py-6 sm:px-10 sm:py-8">
        <div className="min-w-0">
          <p className="bg-gradient-to-r from-gold-700 to-flame-600 bg-clip-text text-[11px] font-semibold uppercase tracking-[0.14em] text-transparent">
            {eyebrow}
          </p>

          {issue.theme ? (
            <div className="mt-2 flex items-start gap-3">
              <span
                aria-hidden
                className="mt-2 h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-gold-500 to-flame-500"
              />
              <h3 className="font-heading bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 pt-1 text-2xl font-semibold leading-snug text-transparent sm:text-3xl">
                {issue.theme}
              </h3>
            </div>
          ) : (
            <h3 className="font-heading mt-2 text-2xl font-semibold leading-snug text-gray-900 sm:text-3xl">
              {issue.title}
            </h3>
          )}
        </div>

        {issue.description && (
          <p className="mx-auto mt-5 line-clamp-3 max-w-prose text-center text-sm leading-relaxed text-gray-600 sm:text-base">
            {issue.description}
          </p>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          <Link
            href={readerPath(issue.id)}
            onClick={() => rememberReaderSource(issue.id, 'shelf')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.24)] transition-all hover:from-gold-600 hover:to-flame-600 hover:shadow-[0_12px_28px_rgba(229,86,31,0.28)]"
          >
            <BookOpen className="h-4 w-4" />
            Open Full Reader
          </Link>
          <button
            onClick={() => toggle(issue.id)}
            aria-label={bookmarked ? 'Remove bookmark' : 'Save to bookmarks'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                bookmarked ? 'fill-red-500 text-red-500' : ''
              }`}
            />
          </button>
        </div>

        {(sortedTopics.length > 0 || issue.page_count || issue.file_size_bytes) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-100 pt-5">
            {sortedTopics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {sortedTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-gradient-to-r from-gold-50 to-flame-50 px-2.5 py-1 text-[11px] font-medium text-flame-700"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : (
              <span />
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
              {issue.page_count && <span>{issue.page_count} pages</span>}
              <span>{formatFileSize(issue.file_size_bytes)}</span>
              <span>{issue.read_count.toLocaleString()} reads</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ---------- Embedded PDF reader (one issue, manual page turn) ----------
function SlideReader({
  pdfUrl,
  fallbackCoverUrl,
  fallbackTitle,
  magazineName,
  monthName,
  year,
  language,
}: {
  pdfUrl: string;
  fallbackCoverUrl: string | null;
  fallbackTitle: string;
  magazineName: string;
  monthName: string;
  year: number;
  language: Language;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookCardRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  /** 1 = next-page motion, -1 = prev-page motion. */
  const [pageDirection, setPageDirection] = useState(1);
  /** Flips true the first time react-pdf signals page 1 has finished
   *  rendering. Drives the cover→canvas cross-fade — the cover overlay
   *  (rendered on top of the canvas) fades to opacity 0 once this is true,
   *  revealing the now-painted PDF page underneath without a frame of
   *  white space. */
  const [page1Rendered, setPage1Rendered] = useState(false);
  /** First-time swipe hint — shown once on mobile, then suppressed via
   *  localStorage. Dismisses on first user interaction or after 4s. */
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const reduceMotion = useReducedMotion();
  /** True at lg+ (≥1024px) — drives two-page-spread mode. */
  const isSpread = useMediaQuery('(min-width: 1024px)');
  /** Step size — turn the whole spread (2 pages) on desktop, single page on
   *  smaller viewports. */
  const step = isSpread ? 2 : 1;

  // Measure the BOOK CARD (not the outer reader) so the PDF renders at the
  // exact display width of the book — accounting for the space taken by the
  // outside arrow buttons and their gaps.
  useLayoutEffect(() => {
    if (bookCardRef.current) {
      const w = bookCardRef.current.clientWidth;
      if (w > 0) setWidth(Math.round(w));
    }
  }, []);

  useEffect(() => {
    if (!bookCardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) {
        const next = Math.round(w);
        setWidth((current) => (current === next ? current : next));
      }
    });
    ro.observe(bookCardRef.current);
    return () => ro.disconnect();
  }, []);

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
  const measuredWidth = width ?? 0;
  const perPageWidth = measuredWidth
    ? isSpread
      ? Math.max(120, Math.floor((measuredWidth - SPREAD_GAP_PX) / 2))
      : measuredWidth
    : 0;

  // Force the PDF canvas to render at minimum 2× the CSS resolution so text
  // stays crisp on Retina, 4K, and browser-zoomed displays.
  const hiDPI =
    typeof window !== 'undefined'
      ? Math.max(2, window.devicePixelRatio || 1)
      : 2;

  // ---------- Zoom (in-place reader zoom) ----------
  const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2];
  const [zoom, setZoom] = useState(1);
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

  // Reset zoom whenever the slide changes (new issue) so the next reader
  // doesn't inherit the previous user's zoom level. Same trigger resets the
  // cover-overlay cross-fade so it covers the new issue's page-1 render.
  useEffect(() => {
    setZoom(1);
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
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        {!loadError && (
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label={isSpread ? 'Previous spread' : 'Previous page'}
            className="z-20 hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-md transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white/70 disabled:text-gray-300 disabled:shadow-none lg:flex"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}

        <motion.div
          ref={bookCardRef}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={handleSwipe}
          className={cn(
            'relative flex aspect-[3/4] min-w-0 flex-1 cursor-grab items-center justify-center rounded-xl bg-gradient-to-br from-gold-50 via-flame-50/60 to-gold-50 shadow-[0_8px_28px_rgba(190,140,46,0.12)] active:cursor-grabbing lg:aspect-[3/2]',
            // Allow scrolling within the book card when the user has zoomed
            // beyond the natural fit.
            zoom > 1 ? 'overflow-auto' : 'overflow-hidden',
          )}
        >
          {/* "Magazine on a table" shadow */}
          <div className="pointer-events-none absolute inset-x-1/4 bottom-3 h-3 rounded-full bg-black/10 blur-xl" />

          {loadError ? (
            <div className="relative mx-auto aspect-[3/4] max-w-md">
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
              file={file}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={() => setLoadError(true)}
              onSourceError={() => setLoadError(true)}
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
              <AnimatePresence mode="wait" custom={pageDirection} initial={false}>
                <motion.div
                  key={`${isSpread ? 'spread' : 'single'}-${page}`}
                  custom={pageDirection}
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { x: pageDirection * 80, opacity: 0, scale: 0.97 }
                  }
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { x: -pageDirection * 80, opacity: 0, scale: 0.97 }
                  }
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
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
                      // Trigger the cover→canvas cross-fade only after
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
                      width={perPageWidth}
                      devicePixelRatio={hiDPI}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={<PageTurnSkeleton width={renderedPageWidth} />}
                      className="!h-auto overflow-hidden"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </Document>
          )}

          {/* Cover→canvas cross-fade overlay. Renders the same cover JPEG
              as Page 1's `loading` prop, but as an absolutely-positioned
              layer that fades out once react-pdf signals page 1 has painted
              its canvas underneath. Without this, the swap from cover-image
              to canvas was a hard DOM replace — perceptible blink. With
              it, the canvas is already drawn under the overlay by the time
              the fade starts, so the user sees one continuous image. */}
          {!loadError && fallbackCoverUrl && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              initial={{ opacity: 1 }}
              animate={{
                opacity: page === 1 && !page1Rendered ? 1 : 0,
              }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <PdfLoadingSpread
                coverUrl={fallbackCoverUrl}
                title={fallbackTitle}
                pageWidth={renderedPageWidth}
                isSpread={isSpread}
                decorative
              />
            </motion.div>
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

          {/* Floating zoom pill — top-right corner of the book card. Always
              visible. Compact: in / level / out. Top-right placement keeps
              it clear of horizontal page-turn swipes (which start from the
              middle vertically). */}
          {!loadError && (
            <div className="pointer-events-auto absolute right-2 top-2 z-30 flex items-center gap-0.5 rounded-full border border-flame-200/70 bg-white/95 p-0.5 shadow-md sm:right-3 sm:top-3">
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
        </motion.div>

        {!loadError && (
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label={isSpread ? 'Next spread' : 'Next page'}
            className="z-20 hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-md transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white/70 disabled:text-gray-300 disabled:shadow-none lg:flex"
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Page indicator pill — centered below the book.
          Mobile/tablet: prev/next arrows live INSIDE the pill (since the
          side arrows are hidden < lg). Desktop: just the label. */}
      {!loadError && numPages !== null && (
        <div className="mt-5 flex justify-center">
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
        </div>
      )}
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
          'flex max-h-full items-center justify-center',
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
      className={cn('h-auto max-h-full w-auto object-contain', className)}
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
