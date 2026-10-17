'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from '@/components/magazine/archive-image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
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
  /** Newest readable issue month and its previous month, filtered by the server. */
  issues: ApiIssue[];
  /** Issue date of the newest readable edition. */
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
 * Homepage issue feature. Shows one readable issue at a time with magazine
 * filters and an opt-in previous-month selector.
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
  const [magazineFilter, setMagazineFilter] = useState<MagazineFilter>(() =>
    magazines.find((magazine) =>
      magazine.name.toLowerCase().includes('all india') &&
      issues.some((issue) =>
        issue.magazine_id === magazine.id && inMonth(issue, currentYear, currentMonth),
      ),
    )?.id ?? 'all',
  );
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

  // Give the page a useful first action when the catalogue has no readable issue.
  if (currentMonthIssues.length === 0 && prevMonthIssues.length === 0)
    return (
      <section className="mx-auto w-full max-w-[1440px] px-2 py-16 text-center sm:py-24">
        <h1 className="font-heading text-3xl leading-tight text-gray-900 sm:text-5xl">Explore the public archive</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-700">Readable editions will appear here as the archive grows.</p>
        <Link href="/browse" className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-flame-600 px-5 py-2.5 font-semibold text-white hover:bg-flame-700">Browse archive</Link>
      </section>
    );

  const safeIndex =
    visibleIssues.length > 0
      ? Math.min(currentIndex, visibleIssues.length - 1)
      : 0;
  const currentIssue = visibleIssues[safeIndex];


  const showMagazineFilter = magazines.length > 1;
  const hasPrevContent = prevMonthIssues.length > 0;

  return (
    <section
      className="relative mx-auto w-full max-w-[1440px]"
      aria-label="Newest readable issue"
    >


      {/* Slideshow + control bar */}
      <div
        ref={containerRef}
        className="relative"
        role="region"
        aria-roledescription="carousel"
        aria-label="Latest readable editions"
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
              <AnimatePresence mode="wait" custom={direction} initial={false}>
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
      {/* Toolbar — magazine chips + previous-month toggle. Hidden when there's
          nothing meaningful to filter. */}
      {(showMagazineFilter || hasPrevContent) && (
        <div
          className="mt-5 flex flex-col items-center gap-3 px-6 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-3 sm:px-0"
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
    </section>
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
    ...[...magazines].sort((a, b) => {
      const rank = (name: string) => name.toLowerCase().includes('all india') ? 0 : name.toLowerCase().includes('agnishikha') ? 1 : 2;
      return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
    }).map((m) => ({
      value: m.id,
      label: m.name,
      disabled: !available.has(m.id),
    })),
    { value: 'all', label: 'All' },
  ];
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
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
  const articleRef = useRef<HTMLElement>(null);
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const hasOpenedPreview = useRef(false);
  const bookmarked = isBookmarked(issue.id);

  function changePreview(open: boolean) {
    if (open) hasOpenedPreview.current = true;
    setPreviewOpen(open);
    requestAnimationFrame(() => articleRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
  }

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
    <article ref={articleRef} className="scroll-mt-20 overflow-hidden rounded-2xl bg-[#fffdf9] shadow-[0_18px_48px_rgba(83,58,22,0.13)]">
      <AnimatePresence mode="wait" initial={false}>
      {!previewOpen ? <motion.div key="issue" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }} transition={{ duration: 0.24 }} onAnimationComplete={() => { if (hasOpenedPreview.current && !previewOpen) previewButtonRef.current?.focus(); }} className="grid md:grid-cols-[minmax(280px,0.76fr)_minmax(0,1fr)]">
        <button type="button" onClick={() => changePreview(true)} aria-label={`Preview ${issue.title}`} className="feature-cover-stage relative flex min-h-[278px] items-center justify-center overflow-hidden px-7 py-8 text-left sm:min-h-[400px] sm:px-10 sm:py-10 md:min-h-[485px]">
          <span className="feature-ember left-[18%] top-[25%]" aria-hidden="true" />
          <span className="feature-ember right-[15%] top-[22%]" aria-hidden="true" />
          <span className="feature-ember left-[13%] bottom-[26%]" aria-hidden="true" />
          <span className="feature-ember right-[12%] bottom-[20%]" aria-hidden="true" />
          {issue.cover_image_url ? (
            <div className="feature-magazine relative aspect-[2/3] w-[150px] shrink-0 sm:w-[235px] md:w-[250px]">
              <Image src={issue.cover_image_url} alt={issue.title} fill priority sizes="(max-width: 640px) 150px, 250px" className="object-contain" />
            </div>
          ) : (
            <div className="feature-magazine flex aspect-[2/3] w-[150px] items-center justify-center bg-white px-5 text-center font-heading text-xl leading-snug text-gray-800 sm:w-[235px]">
              {issue.title}
            </div>
          )}
        </button>

        <div className="flex min-w-0 flex-col justify-between px-6 pb-7 pt-8 sm:px-10 sm:pb-10 sm:pt-10 lg:px-14 lg:pt-12">
          <div>
            <h1 className="font-heading break-words text-[clamp(1.8rem,2.5vw,2.65rem)] leading-[1.12] tracking-[-0.025em] text-[#28231c]">
              {issue.theme || issue.title}
            </h1>
            <p className="mt-4 text-sm font-semibold text-[#925526] sm:text-base">
              {eyebrow}
            </p>
            {issue.description && (
              <p className="mt-5 line-clamp-4 max-w-[62ch] text-sm leading-[1.8] text-gray-700 sm:text-base">
                {issue.description}
              </p>
            )}
          </div>

          <div className="mt-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={readerPath(issue.id)}
                onClick={() => rememberReaderSource(issue.id, 'shelf')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-flame-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_9px_19px_rgba(145,69,25,0.18)] transition-colors hover:bg-flame-700 sm:text-base"
              >
                <BookOpen className="h-5 w-5" />
                Read issue
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button ref={previewButtonRef} type="button" onClick={() => changePreview(true)} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-[#70451e] transition-colors hover:bg-gold-50">
                Preview pages
              </button>
              <button
                type="button"
                onClick={() => toggle(issue.id)}
                aria-label={bookmarked ? 'Remove bookmark' : 'Save to bookmarks'}
                aria-pressed={bookmarked}
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-gold-300 bg-white text-[#70451e] transition-colors hover:bg-gold-50"
              >
                <Heart className={`h-5 w-5 ${bookmarked ? 'fill-flame-600 text-flame-600' : ''}`} />
              </button>
            </div>
            {(sortedTopics.length > 0 || issue.page_count) && (
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#eadfce] pt-4 text-xs text-gray-700">
                {issue.page_count ? <span>{issue.page_count} pages</span> : null}
                {issue.file_size_bytes ? <span>{formatFileSize(issue.file_size_bytes)}</span> : null}
                {sortedTopics.length > 0 && <span className="hidden h-1 w-1 rounded-full bg-gold-500 sm:block" aria-hidden="true" />}
                {sortedTopics.map((topic) => <span key={topic}>{topic}</span>)}
              </div>
            )}
          </div>
        </div>
      </motion.div> : <motion.div key="preview" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }} transition={{ duration: 0.24 }} onAnimationComplete={() => { if (previewOpen) backButtonRef.current?.focus(); }}>
        <div className="flex items-center gap-2 border-b border-[#eadfce] px-4 py-3 sm:gap-4 sm:px-8">
          <button ref={backButtonRef} type="button" onClick={() => changePreview(false)} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gold-50 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button type="button" onClick={() => changePreview(false)} aria-label={`Show details for ${issue.title}`} className="inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-xl border border-gold-200 bg-white px-2.5 py-2 text-left shadow-[0_4px_12px_rgba(83,58,22,0.09)] transition-colors hover:border-gold-300 hover:bg-gold-50">
            <span className="relative h-10 w-8 shrink-0 overflow-hidden rounded-md bg-gold-50">
              {issue.cover_image_url ? <Image src={issue.cover_image_url} alt="" fill sizes="32px" className="object-cover" /> : null}
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-sm font-semibold text-gray-900">{issue.magazines.name}</strong>
              <span className="block text-xs text-gray-600">{monthName} {issue.year}</span>
            </span>
          </button>
        </div>
        <div id={`preview-${issue.id}`}>
          <SlideReader issueId={issue.id} pdfUrl={issue.pdf_url} fallbackCoverUrl={issue.cover_image_url} fallbackTitle={issue.title} magazineName={issue.magazines.name} monthName={monthName} year={issue.year} language={language} />
        </div>
      </motion.div>}
      </AnimatePresence>
    </article>
  );
}

// ---------- Embedded PDF reader (one issue, manual page turn) ----------
