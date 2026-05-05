'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { LANGUAGE_NAMES, MONTH_NAMES } from '@aim-archive/shared';
import type { Language, MonthIndex } from '@aim-archive/shared';
import { useBookmarks } from '@/lib/bookmarks-store';
import { cn, formatFileSize } from '@/lib/utils';

// Configure react-pdf worker (idempotent — same setup as the reader page).
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/** Reactive media-query hook — returns true when the current viewport
 *  matches the supplied media query. Used to switch the reader between
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
  /**
   * Magazines, ordered by `created_at` ASC (AIM first, Agnishikha next, then
   * future Tamil/Marathi/Bengali editions). Used to render magazine filter chips.
   */
  magazines: ApiMagazine[];
  /**
   * Up to 3 most recent published issues per magazine, ordered newest-first
   * within each magazine. The carousel slices and filters from this set.
   */
  issues: ApiIssue[];
}

/** Auto-rotation cadence — gentle enough not to rush a reader. */
const AUTO_ROTATE_MS = 5000;
/** Swipe distance / velocity thresholds — tuned for natural touch feel. */
const SWIPE_DISTANCE_PX = 50;
const SWIPE_VELOCITY_PX_PER_S = 500;

type MagazineFilter = 'all' | string;
type MonthFilter = 'all' | string; // `${year}-${month}` like "2026-4"

function monthKey(issue: ApiIssue): string {
  return `${issue.year}-${issue.month}`;
}

/**
 * "This Month's Editions" — one-issue-at-a-time slideshow with two side-by-side
 * filter strips (Magazine + Month). Auto-rotates every 8s, pauses on hover or
 * any user interaction, with arrows + dots for manual control.
 */
export function ThisMonthFeatured({ magazines, issues }: ThisMonthFeaturedProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // ---------- Filter state ----------
  const [magazineFilter, setMagazineFilter] = useState<MagazineFilter>('all');
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all');

  // Sorted issue set (newest first across all magazines) — stable reference
  // for filter derivation.
  const sortedIssues = useMemo(
    () =>
      [...issues].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }),
    [issues],
  );

  // Distinct months present, newest first — feed the month filter chips.
  const monthOptions = useMemo(() => {
    const seen = new Map<string, { year: number; month: number }>();
    for (const issue of sortedIssues) {
      const key = monthKey(issue);
      if (!seen.has(key)) seen.set(key, { year: issue.year, month: issue.month });
    }
    return [...seen.entries()].map(([key, { year, month }]) => ({
      key,
      year,
      month,
      label: `${MONTH_NAMES[month as MonthIndex]} ${year}`,
    }));
  }, [sortedIssues]);

  // Apply both filters.
  const filtered = useMemo(() => {
    return sortedIssues.filter((issue) => {
      if (magazineFilter !== 'all' && issue.magazine_id !== magazineFilter)
        return false;
      if (monthFilter !== 'all' && monthKey(issue) !== monthFilter) return false;
      return true;
    });
  }, [sortedIssues, magazineFilter, monthFilter]);

  // ---------- Carousel state ----------
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // `direction` drives slide-in animation direction (1 = forward, -1 = back).
  const [direction, setDirection] = useState(1);

  // Reset to first slide whenever the filter set changes.
  useEffect(() => {
    setCurrentIndex(0);
    setDirection(1);
  }, [magazineFilter, monthFilter]);

  // Clamp current index if the filtered set shrinks.
  useEffect(() => {
    if (currentIndex >= filtered.length) setCurrentIndex(0);
  }, [filtered.length, currentIndex]);

  // Auto-rotation — re-arm whenever the slide changes, pause on hover, when
  // there's only one slide to show, or when the user prefers reduced motion.
  useEffect(() => {
    if (isPaused || filtered.length <= 1 || prefersReducedMotion) return;
    const timer = setTimeout(() => {
      setDirection(1);
      setCurrentIndex((idx) => (idx + 1) % filtered.length);
    }, AUTO_ROTATE_MS);
    return () => clearTimeout(timer);
  }, [isPaused, filtered.length, currentIndex, prefersReducedMotion]);

  // Keyboard navigation — ←/→ when the carousel section has focus anywhere
  // inside it. We don't hijack the keys globally; only when the user is
  // already engaged with the section.
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
  }, [filtered.length]);

  function goPrev() {
    if (filtered.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((idx) => (idx - 1 + filtered.length) % filtered.length);
  }

  function goNext() {
    if (filtered.length <= 1) return;
    setDirection(1);
    setCurrentIndex((idx) => (idx + 1) % filtered.length);
  }

  function jumpTo(idx: number) {
    if (idx === currentIndex) return;
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  }

  // Hide a filter strip when it has only one real option (so we don't show
  // "All" + "AIM" when AIM is the only magazine, etc.).
  const showMagazineFilter = magazines.length > 1;
  const showMonthFilter = monthOptions.length > 1;

  // Issue-switch callback handed down to SlideReader. The reader inspects
  // swipe magnitude and decides: light swipe = page turn within the issue;
  // hard swipe (or page-boundary swipe) = bubble up here to switch issues.
  function handleIssueSlide(d: 1 | -1) {
    if (d === 1) goNext();
    else goPrev();
  }

  // ---------- Render ----------
  if (sortedIssues.length === 0) return null;

  /* Clamp inline. The effect on line 134-137 also clamps currentIndex when
     `filtered` shrinks, but effects run AFTER render — so the very first
     render after a filter narrows the set would otherwise read past the end
     of the array and crash. */
  const safeIndex = filtered.length > 0
    ? Math.min(currentIndex, filtered.length - 1)
    : 0;
  const currentIssue = filtered[safeIndex];

  return (
    <motion.section
      className="relative -mx-6 mt-16 max-w-5xl sm:mx-auto"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="this-month-heading"
    >
      <header className="mb-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flame-700">
          This Month&apos;s Editions
        </p>
        <h2
          id="this-month-heading"
          className="font-heading mt-2 bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 text-2xl font-medium tracking-wide text-transparent sm:text-3xl"
        >
          The latest editions, an offering at Thy Lotus Feet.
        </h2>
      </header>

      {/* Filter strips — side by side on md+, stacked on mobile.
          Hidden when there's nothing meaningful to filter (only 1 magazine
          or only 1 month present). */}
      {(showMagazineFilter || showMonthFilter) && (
        <div
          className="mb-6 flex flex-col items-center gap-3 md:flex-row md:items-start md:justify-center md:gap-6"
          role="toolbar"
          aria-label="Filter editions by magazine and month"
        >
          {showMagazineFilter && (
            <FilterStrip
              label="Magazine"
              options={[
                { value: 'all', label: 'All' },
                ...magazines.map((m) => ({ value: m.id, label: m.name })),
              ]}
              value={magazineFilter}
              onChange={setMagazineFilter}
            />
          )}
          {showMonthFilter && (
            <FilterStrip
              label="Month"
              options={[
                { value: 'all', label: 'All' },
                ...monthOptions.map((m) => ({ value: m.key, label: m.label })),
              ]}
              value={monthFilter}
              onChange={setMonthFilter}
            />
          )}
        </div>
      )}

      {/* Slideshow */}
      <div
        ref={containerRef}
        className="relative"
        role="region"
        aria-roledescription="carousel"
        aria-label="This month's editions slideshow"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        {/* Live region announces slide changes for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {filtered.length > 0 &&
            `Showing edition ${safeIndex + 1} of ${filtered.length}: ${
              filtered[safeIndex]?.title
            }`}
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            onClear={() => {
              setMagazineFilter('all');
              setMonthFilter('all');
            }}
          />
        ) : (
          <>
            {/* Top-of-section carousel controls — gives the slideshow's
                "you can navigate" affordance immediate visibility, before
                the user has scrolled past the slide. */}
            <CarouselControls
              issues={filtered}
              currentIndex={safeIndex}
              goPrev={goPrev}
              goNext={goNext}
              jumpTo={jumpTo}
              className="mb-5"
            />

            <div
              className="relative overflow-hidden rounded-2xl"
              aria-roledescription="slide"
              aria-label={`${safeIndex + 1} of ${filtered.length}`}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentIssue.id}
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
                  <FeaturedSlide
                    issue={currentIssue}
                    onReadingChange={setIsPaused}
                    onIssueSlide={
                      filtered.length > 1 ? handleIssueSlide : undefined
                    }
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <CarouselControls
              issues={filtered}
              currentIndex={safeIndex}
              goPrev={goPrev}
              goNext={goNext}
              jumpTo={jumpTo}
              className="mt-5"
            />
          </>
        )}
      </div>
    </motion.section>
  );
}

// ---------- Filter strip ----------
function FilterStrip<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <span className="mt-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                active
                  ? 'bg-gradient-to-r from-gold-500 to-flame-500 text-white shadow-[0_4px_14px_rgba(190,140,46,0.22)]'
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

// ---------- Carousel controls (prev / dots / next / counter) ----------
// Used twice — above the slide for discoverability, below for in-flow access.
// Hides itself when there's only one slide (nothing to navigate).
function CarouselControls({
  issues,
  currentIndex,
  goPrev,
  goNext,
  jumpTo,
  className,
}: {
  issues: ApiIssue[];
  currentIndex: number;
  goPrev: () => void;
  goNext: () => void;
  jumpTo: (index: number) => void;
  className?: string;
}) {
  if (issues.length <= 1) return null;

  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      <button
        type="button"
        onClick={goPrev}
        aria-label="Previous edition"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-sm transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <div className="flex items-center gap-2">
        {issues.map((issue, i) => (
          <button
            key={issue.id}
            type="button"
            onClick={() => jumpTo(i)}
            aria-label={`Go to slide ${i + 1} of ${issues.length}`}
            aria-current={i === currentIndex}
            className={cn(
              'h-2 rounded-full transition-all',
              i === currentIndex
                ? 'w-9 bg-gradient-to-r from-gold-500 to-flame-500'
                : 'w-2 bg-flame-200 hover:bg-flame-300',
            )}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={goNext}
        aria-label="Next edition"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 bg-white text-flame-600 shadow-sm transition-all hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <span className="ml-1 hidden text-xs font-semibold tabular-nums text-gray-600 sm:inline">
        {currentIndex + 1} of {issues.length}
      </span>
    </div>
  );
}

// ---------- Empty state ----------
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-flame-200 bg-gradient-to-br from-gold-50/40 to-flame-50/40 px-6 py-16 text-center">
      <p className="font-heading text-lg text-gray-600">
        No editions match these filters yet.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
      >
        Clear filters
      </button>
    </div>
  );
}

// ---------- Single slide (rich, focused — with embedded reader) ----------
function FeaturedSlide({
  issue,
  onReadingChange,
  onIssueSlide,
}: {
  issue: ApiIssue;
  /** Called with `true` when the user is actively reading (page > 1) so the
   *  carousel can pause auto-rotation. */
  onReadingChange: (reading: boolean) => void;
  /** Called when a hard swipe on the reader should switch issues — `1` for
   *  next issue, `-1` for previous. Undefined when there's only one issue. */
  onIssueSlide?: (direction: 1 | -1) => void;
}) {
  const { toggle, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(issue.id);

  const monthName = MONTH_NAMES[issue.month as MonthIndex];
  const language = (issue.magazines.language as Language) ?? 'english';
  const eyebrow = `${issue.magazines.name} — ${monthName} ${issue.year}`;
  const sortedTopics = [...issue.topics]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .slice(0, 3);

  return (
    <article className="relative overflow-hidden border-y border-flame-200/60 bg-white shadow-[0_10px_36px_rgba(190,140,46,0.12)] sm:rounded-2xl sm:border">
      {/* Book on top — full width, single page on mobile/tablet,
          two-page spread on desktop (lg+) */}
      <SlideReader
        pdfUrl={issue.pdf_url}
        fallbackCoverUrl={issue.cover_image_url}
        fallbackTitle={issue.title}
        magazineName={issue.magazines.name}
        monthName={monthName}
        year={issue.year}
        language={language}
        onReadingChange={onReadingChange}
        onIssueSlide={onIssueSlide}
      />

      {/* Info section below the book */}
      <div className="px-6 py-6 sm:px-10 sm:py-8">
        {/* Eyebrow + theme — full width, left-aligned */}
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

        {/* Description — centered, prose-width for readability and clamped to
            keep slide heights consistent across issues with varying description
            lengths (the carousel transition feels jittery otherwise). */}
        {issue.description && (
          <p className="mx-auto mt-5 line-clamp-3 max-w-prose text-center text-sm leading-relaxed text-gray-600 sm:text-base">
            {issue.description}
          </p>
        )}

        {/* Centered actions — Open Full Reader + bookmark heart, sitting in
            the visual middle of the info area as the primary call-to-action. */}
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link
            href={`/read/${issue.id}?from=shelf`}
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

        {/* Bottom row: topic chips on the left, meta on the right */}
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

// ---------- Embedded PDF reader (one page at a time, prev/next) ----------
function SlideReader({
  pdfUrl,
  fallbackCoverUrl,
  fallbackTitle,
  magazineName,
  monthName,
  year,
  language,
  onReadingChange,
  onIssueSlide,
}: {
  pdfUrl: string;
  fallbackCoverUrl: string | null;
  fallbackTitle: string;
  magazineName: string;
  monthName: string;
  year: number;
  language: Language;
  onReadingChange: (reading: boolean) => void;
  /** Hard swipe handler — bubbles up to the carousel for issue switching.
   *  Undefined when there's only one issue (no carousel to advance). */
  onIssueSlide?: (direction: 1 | -1) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookCardRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [width, setWidth] = useState(420);
  /** 1 = next-page motion, -1 = prev-page motion. Drives the slide direction
   *  on each page transition. */
  const [pageDirection, setPageDirection] = useState(1);
  const reduceMotion = useReducedMotion();
  /** True at lg+ breakpoint (≥1024px). Drives two-page-spread mode. Mobile
   *  and tablet stay single-page for thumb-friendly reading. */
  const isSpread = useMediaQuery('(min-width: 1024px)');

  /** Step size — turn the whole spread (2 pages) on desktop, single page on
   *  smaller viewports. */
  const step = isSpread ? 2 : 1;

  // Notify the carousel when reading state changes (any advance from the
  // first view = actively reading).
  useEffect(() => {
    onReadingChange(page > 1);
  }, [page, onReadingChange]);

  // Reset reading state when this slide unmounts.
  useEffect(() => {
    return () => onReadingChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Measure the BOOK CARD (not the outer reader) so the PDF renders at the
  // exact display width of the book — accounting for the space taken by the
  // outside arrow buttons and their gaps. Otherwise the canvas was rendering
  // at a wider-than-actual width and getting clipped/blurry.
  useLayoutEffect(() => {
    if (bookCardRef.current) {
      const w = bookCardRef.current.clientWidth;
      if (w > 0) setWidth(w);
    }
  }, []);

  // Then keep width in sync with viewport changes (orientation, window resize).
  useEffect(() => {
    if (!bookCardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.round(w));
    });
    ro.observe(bookCardRef.current);
    return () => ro.disconnect();
  }, []);

  // When toggling between single and spread mode, snap `page` to a valid
  // anchor — in spread mode `page` represents the LEFT page of the spread
  // and must be odd (so the spread is always (page, page+1)).
  useEffect(() => {
    if (isSpread && page % 2 === 0) {
      // Snap to the odd left page so the spread is well-formed.
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
      // In spread mode, allow advancing to the last spread (which may show a
      // single trailing page if the total is odd).
      if (p + step > numPages && (!isSpread || p >= numPages)) return p;
      setPageDirection(1);
      return Math.min(numPages, p + step);
    });
  }

  const canGoPrev = page > 1;
  const canGoNext = numPages ? page < numPages : true;

  // Width allocated to each PDF page. In spread mode we split the container
  // (minus a small inter-page gap) between two pages; in single mode each
  // page gets the full container width.
  const SPREAD_GAP_PX = 8;
  const perPageWidth = isSpread
    ? Math.max(120, Math.floor((width - SPREAD_GAP_PX) / 2))
    : width;

  // High-DPI render scale — force the PDF canvas to render at minimum 2× the
  // CSS resolution so text and image content stay crisp on Retina, 4K, and
  // browser-zoomed displays. Magazine PDFs are rasterised pages, so anything
  // less than 2× looks blurry on modern screens.
  const hiDPI =
    typeof window !== 'undefined' ? Math.max(2, window.devicePixelRatio || 1) : 2;

  // ---------- Zoom (in-place reader zoom for closer reading) ----------
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
  const renderedPageWidth = Math.round(perPageWidth * zoom);

  // Reset zoom whenever the slide changes (new issue) so the next reader
  // doesn't inherit the previous user's zoom level.
  useEffect(() => {
    setZoom(1);
  }, [pdfUrl]);


  // ---------- Swipe handling — soft = page turn, hard = issue switch ----------
  // Threshold tuning — calibrated so casual page-turning drags don't
  // accidentally jump to a different issue.
  // - A casual drag (< 250 px AND < 1200 px/s) inside the page turns the page.
  // - To switch issues the user must commit: drag at least 250 px with
  //   reasonable pace, OR flick decisively (>= 1200 px/s).
  // - At a page boundary (e.g., page 1 trying to go back, last page trying
  //   to advance), even a soft swipe is treated as an issue switch — the
  //   user clearly wants to leave the issue in that direction.
  const SOFT_DISTANCE_PX = 30;
  const HARD_DISTANCE_PX = 250;
  const HARD_VELOCITY_PX = 1200;
  /** Minimum speed required when distance hits HARD_DISTANCE_PX, so a slow
   *  drift doesn't accidentally cross the line. */
  const HARD_DISTANCE_MIN_SPEED = 400;

  function handleSwipe(_: unknown, info: PanInfo) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const distance = Math.abs(offset);
    const speed = Math.abs(velocity);

    // Ignore tiny accidental drags / clicks.
    if (distance < SOFT_DISTANCE_PX && speed < 200) return;

    const direction: 1 | -1 = offset < 0 ? 1 : -1;
    const isHard =
      (distance >= HARD_DISTANCE_PX && speed >= HARD_DISTANCE_MIN_SPEED) ||
      speed >= HARD_VELOCITY_PX;
    const wantsForward = direction === 1;
    const atPageBoundary = wantsForward ? !canGoNext : !canGoPrev;

    if ((isHard || atPageBoundary) && onIssueSlide) {
      onIssueSlide(direction);
      return;
    }

    // Soft swipe within the issue → page turn.
    if (wantsForward) goNext();
    else goPrev();
  }

  // Page indicator label — adapts to spread vs single mode and trailing
  // partial spread (odd page count).
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
      {/* Zoom toolbar — sits above the book row. Lets the reader zoom into a
          page for closer inspection without leaving the homepage. */}
      {!loadError && (
        <div className="mb-3 flex items-center justify-end gap-1 px-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={!canZoomOut}
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={zoomReset}
            aria-label={`Zoom level ${Math.round(zoom * 100)}% — click to reset to 100%`}
            className="min-w-[3.25rem] rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium tabular-nums text-gray-600 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={!canZoomIn}
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Book row — three flex siblings: left arrow, book card, right arrow.
          The cream/flame "magazine resting on a table" backdrop now lives only
          on the book card itself, so the arrows sit on the article's white
          background, visibly outside the book.
          Page-turn arrows are desktop-only (`hidden lg:flex`) — on mobile and
          tablet the book takes full width and users swipe / use the carousel
          arrows to navigate. */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        {/* Left arrow — outside the book on the left, desktop (lg+) only.
            On phone and tablet, arrows live in the page indicator pill below. */}
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

        {/* Book area — the actual PDF spread / page, in its own cream-flame
            rounded card with a soft shadow. */}
        <motion.div
          ref={bookCardRef}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={handleSwipe}
          className={cn(
            'relative flex aspect-[3/4] min-w-0 flex-1 cursor-grab items-center justify-center rounded-xl bg-gradient-to-br from-gold-50 via-flame-50/60 to-gold-50 shadow-[0_8px_28px_rgba(190,140,46,0.12)] active:cursor-grabbing lg:aspect-[3/2]',
            // Allow scrolling within the book card when the user has zoomed
            // beyond the natural fit. At 100% the pages fit perfectly so we
            // keep overflow-hidden for clean rounded corners.
            zoom > 1 ? 'overflow-auto' : 'overflow-hidden',
          )}
        >
          {/* Subtle shadow under the spread — the "open magazine on a table" feel */}
          <div className="pointer-events-none absolute inset-x-1/4 bottom-3 h-3 rounded-full bg-black/10 blur-xl" />
        {loadError ? (
          /* Network/CORS error — fall back to cover image (single image). */
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
        ) : (
          <Document
            file={file}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={() => setLoadError(true)}
            onSourceError={() => setLoadError(true)}
            loading={
              fallbackCoverUrl && renderedPageWidth > 0 ? (
                /* Show the pre-rendered cover JPEG (cached, ~100 KB) instead
                   of a spinner while the full PDF (~25 MB) is being fetched.
                   The cover is page 1 of the magazine, so when react-pdf
                   eventually renders the canvas, the visual is identical and
                   the swap feels seamless. Explicit width/height (vs. fill)
                   so Next.js doesn't warn when the parent's height isn't yet
                   resolved on first paint. */
                <div className="flex h-full w-full items-center justify-center">
                  <Image
                    src={fallbackCoverUrl}
                    alt={fallbackTitle}
                    width={renderedPageWidth}
                    height={Math.round(renderedPageWidth * 1.4)}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    className="h-auto max-h-full w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-flame-500/70" />
                </div>
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
                  loading={
                    page === 1 && fallbackCoverUrl && renderedPageWidth > 0 ? (
                      <Image
                        src={fallbackCoverUrl}
                        alt={fallbackTitle}
                        width={renderedPageWidth}
                        height={Math.round(renderedPageWidth * 1.4)}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        priority
                        className="object-contain"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: renderedPageWidth,
                          height: renderedPageWidth * 1.4,
                        }}
                      >
                        <Loader2 className="h-7 w-7 animate-spin text-flame-500/60" />
                      </div>
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
                    loading={
                      <div
                        className="flex items-center justify-center"
                        style={{ width: renderedPageWidth, height: renderedPageWidth * 1.4 }}
                      >
                        <Loader2 className="h-7 w-7 animate-spin text-flame-500/60" />
                      </div>
                    }
                    className="!h-auto overflow-hidden"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </Document>
        )}
        </motion.div>

        {/* Right arrow — outside the book on the right, desktop (lg+) only.
            On phone and tablet, arrows live in the page indicator pill below. */}
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
          On phone and tablet the pill includes the prev/next arrow buttons
          (since the side arrows are hidden at < lg). On desktop (lg+) only
          the page label is shown — the navigation lives on the book's edges. */}
      {!loadError && numPages !== null && (
        <div className="mt-5 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-flame-200/60 bg-white/80 px-2 py-1 shadow-sm backdrop-blur">
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
