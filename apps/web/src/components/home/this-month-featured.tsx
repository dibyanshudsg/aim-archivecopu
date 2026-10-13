'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from '@/components/magazine/archive-image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
} from 'lucide-react';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { MONTH_NAMES } from '@aim-archive/shared';
import type { Language, MonthIndex } from '@aim-archive/shared';
import { useBookmarks } from '@/lib/bookmarks-store';
import { readerPath, rememberReaderSource } from '@/lib/reader-url';
import { cn, formatFileSize } from '@/lib/utils';
const SlideReader = dynamic(() => import('./slide-reader'), { ssr: false });


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
    for (const issue of neighbours) {
      if (issue.cover_image_url) {
        const img = new window.Image();
        img.src = issue.cover_image_url;
      }
    }
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
      className="relative mx-auto mt-10 max-w-5xl sm:mt-16"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="this-month-heading"
    >
      <header className="mb-6 px-6 text-center sm:px-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flame-700">
          {eyebrowText}
        </p>
        <div className="mt-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={titleText}
              id="this-month-heading"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="font-heading mx-auto max-w-xl bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text px-1 text-2xl font-medium leading-tight tracking-normal text-transparent sm:text-3xl"
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
      <span className="mt-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
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
                'min-h-11 min-w-11 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
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
        'inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
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
  const reduceMotion = useReducedMotion();
  const { toggle, isBookmarked } = useBookmarks();
  const [previewOpen, setPreviewOpen] = useState(false);
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
      <div className={`grid items-center gap-x-8 gap-y-6 px-6 py-6 sm:px-10 sm:py-8 lg:gap-x-10 ${issue.cover_image_url ? 'md:grid-cols-[auto_minmax(0,1fr)]' : ''}`}>
        {issue.cover_image_url && (
          <div className="relative mx-auto h-72 w-48 max-w-full">
            <Image src={issue.cover_image_url} alt={issue.title} fill sizes="192px" className="rounded-md object-contain" />
          </div>
        )}

        {/* Keep the text and actions together beside the cover. */}
        <div className="min-w-0">
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
          <p className="mx-auto mt-5 line-clamp-3 max-w-prose text-center text-sm leading-relaxed text-gray-600 sm:text-base md:mx-0 md:text-left">
            {issue.description}
          </p>
        )}

        <div className="mx-auto mt-5 grid max-w-sm grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:mx-0 md:flex md:max-w-none md:flex-wrap">
          <Link
            href={readerPath(issue.id)}
            onClick={() => rememberReaderSource(issue.id, 'shelf')}
            className="col-span-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.24)] transition-all hover:from-gold-600 hover:to-flame-600 hover:shadow-[0_12px_28px_rgba(229,86,31,0.28)]"
          >
            <BookOpen className="h-4 w-4" />
            Read issue
          </Link>
          <button type="button" aria-expanded={previewOpen} aria-controls={`preview-${issue.id}`} onClick={() => setPreviewOpen((open) => !open)} className="min-h-11 rounded-xl border border-flame-200 px-4 py-2 text-sm font-semibold text-flame-800 hover:bg-flame-50">
            {previewOpen ? 'Close preview' : 'Preview here'}
          </button>
          <button
            onClick={() => toggle(issue.id)}
            aria-label={bookmarked ? 'Remove bookmark' : 'Save to bookmarks'}
            aria-pressed={bookmarked}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                bookmarked ? 'fill-red-500 text-red-500' : ''
              }`}
            />
          </button>
        </div>

        </div>

        {(sortedTopics.length > 0 || issue.page_count || issue.file_size_bytes) && (
          <div className="col-span-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-100 pt-5">
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

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
              {issue.page_count && <span>{issue.page_count} pages</span>}
              <span>{formatFileSize(issue.file_size_bytes)}</span>
            </div>
          </div>
        )}
      </div>
      <div
        id={`preview-${issue.id}`}
        aria-hidden={!previewOpen}
        inert={!previewOpen}
        className="grid"
        style={{
          gridTemplateRows: previewOpen ? '1fr' : '0fr',
          transition: reduceMotion
            ? 'none'
            : `grid-template-rows ${previewOpen ? 360 : 280}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          overflowAnchor: 'none',
        }}
      >
        <div className="min-h-0 overflow-hidden">
          {previewOpen && <SlideReader pdfUrl={issue.pdf_url} fallbackCoverUrl={issue.cover_image_url} fallbackTitle={issue.title} magazineName={issue.magazines.name} monthName={monthName} year={issue.year} language={language} />}
        </div>
      </div>
    </article>
  );
}

// ---------- Embedded PDF reader (one issue, manual page turn) ----------
