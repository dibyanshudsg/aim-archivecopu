'use client';

import { useState } from 'react';
import Image from '@/components/magazine/archive-image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Check, Download, Heart, Lock, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { IssueWithMagazine } from '@aim-archive/shared';
import { LANGUAGE_NAMES } from '@aim-archive/shared';
import { formatFileSize, formatMonthYear, cn } from '@/lib/utils';
import { useBookmarks } from '@/lib/bookmarks-store';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { shareIssue } from '@/lib/share-issue';
import { readerPath, rememberReaderSource, warmReaderRoute } from '@/lib/reader-url';
import { issueDetailPath, warmIssueDetailRoute } from '@/lib/issue-detail-url';

interface IssueCardProps {
  issue: IssueWithMagazine;
  index?: number;
  source?: 'browse' | 'bookmarks';
}

export function IssueCard({ issue, index = 0, source = 'browse' }: IssueCardProps) {
  const router = useRouter();
  const toggle = useBookmarks((state) => state.toggle);
  const bookmarked = useBookmarks((state) => state.bookmarkedIds.includes(issue.id));
  const [copied, setCopied] = useState(false);
  // Embargoed issues route to the detail page (where the "Available {Month}"
  // message lives) instead of the reader, which can't load their PDF.
  const readHref = issue.isEmbargoed
    ? issueDetailPath(issue.id)
    : readerPath(issue.id);
  const detailHref = issueDetailPath(issue.id);

  // Bulk selection — when enabled, the card becomes a toggle target instead
  // of a Link, and a checkbox overlay surfaces selection state.
  const selectionEnabled = useBulkSelection((s) => s.enabled);
  const isSelected = useBulkSelection((s) => s.selectedIds.has(issue.id));
  const toggleSelection = useBulkSelection((s) => s.toggle);

  // Cards above the fold get LCP priority on their cover image. 6 covers
  // first row across all breakpoints (2/3/3/4/4/5). Only matters on first
  // paint of /browse + /bookmarks; below-the-fold cards use lazy loading.
  const isAboveFold = index < 2;
  const prepareDetails = () => {
    if (selectionEnabled) return;
    router.prefetch(detailHref);
    warmIssueDetailRoute(issue.id);
  };
  const preparePrimaryRoute = () => {
    if (selectionEnabled) return;
    if (issue.isEmbargoed) {
      prepareDetails();
      return;
    }
    router.prefetch(readHref);
    warmReaderRoute(issue.id);
  };

  return (
    <motion.div
      data-browse-issue-id={source === 'browse' ? issue.id : undefined}
      // No opacity gate on the card — opacity:0 → 1 transitions block LCP
      // measurement on the first row (the LCP element on /browse). Slide-up
      // alone preserves the entrance polish without delaying paint.
      initial={{ y: 20 }}
      animate={{ y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
      onPointerEnter={preparePrimaryRoute}
      onFocusCapture={preparePrimaryRoute}
      onClick={selectionEnabled ? () => toggleSelection(issue.id) : undefined}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow duration-200 hover:shadow-2xl',
        isSelected
          ? 'border-flame-500 ring-2 ring-flame-500'
          : issue.isEmbargoed
            ? 'border-gold-200 bg-gradient-to-b from-white to-gold-50/35 hover:border-flame-300'
            : 'border-gray-100 hover:border-flame-300',
      )}
    >
      {/* Whole-card click target → open reader. Disabled in selection mode
          so taps toggle selection via the wrapper's onClick instead. */}
      {!selectionEnabled && (
        <Link
          href={readHref}
          onClick={() => {
            if (!issue.isEmbargoed) rememberReaderSource(issue.id, source);
          }}
          aria-label={`Read ${issue.title}`}
          className="absolute inset-0 z-0"
        />
      )}

      {/* Selection checkbox overlay */}
      {selectionEnabled && (
        <div className="pointer-events-none absolute top-3 left-3 z-20">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md border-2 shadow-sm transition-colors',
              isSelected
                ? 'border-flame-500 bg-flame-500 text-white'
                : 'border-white bg-white/80 text-transparent',
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Cover */}
      <div className="pointer-events-none relative aspect-[3/4] bg-gradient-to-br from-gold-100 to-flame-50">
        <div className="absolute inset-y-0 left-0 z-10 w-1.5 bg-gradient-to-b from-gold-500 to-flame-500 shadow-[2px_0_10px_rgba(0,0,0,0.18)]" />
        {issue.coverImageUrl ? (
          <Image
            src={issue.coverImageUrl}
            alt={issue.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 17vw"
            priority={isAboveFold}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
            <span className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-[10px] font-medium tracking-widest text-transparent uppercase">
              {issue.magazine.name}
            </span>
            <span className="font-heading mt-1 text-lg font-bold text-gray-900">
              {formatMonthYear(issue.month, issue.year)}
            </span>
            <span className="mt-1 text-[10px] text-gray-500">
              {LANGUAGE_NAMES[issue.magazine.language]}
            </span>
          </div>
        )}

        <div className="absolute top-2 right-0 bottom-2 z-10 w-[3px] rounded-r-sm bg-gradient-to-l from-black/[0.14] to-transparent" />
        <div className="absolute inset-x-4 bottom-0 z-10 h-2 rounded-full bg-black/[0.08]" />

        {/* Embargo lock badge — bottom-left of the cover. Same surface as the
            theme accent so it reads as "this issue is protected, here's
            when it opens". */}
        {issue.isEmbargoed && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-gray-900/80 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
            <Lock className="h-2.5 w-2.5" />
            <span>{issue.embargoLiftLabel ?? 'Subscribers'}</span>
          </div>
        )}
        {issue.isEmbargoed && !selectionEnabled && (
          <div className="absolute top-3 left-3 z-10 rounded-full border border-gold-200 bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-normal text-gold-800 shadow-sm">
            Subscribers first
          </div>
        )}

        {/* Cover action buttons — hidden in selection mode so taps don't
            trigger share/bookmark instead of toggling selection. */}
        <div
          className={cn(
            'absolute top-3 right-3 z-10 flex items-center gap-1.5',
            selectionEnabled ? 'pointer-events-none opacity-0' : 'pointer-events-auto',
          )}
        >
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const result = await shareIssue(issue);
              if (result === 'copied') {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/95 transition-colors hover:bg-white ${
              copied ? 'text-green-600' : 'text-gray-500 hover:text-flame-700'
            }`}
            aria-label="Share issue"
            title={copied ? 'Link copied' : 'Share'}
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(issue.id);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 transition-colors hover:bg-white"
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${bookmarked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3.5">
        <div className="mb-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-flame-800">
            {issue.theme || issue.title}
          </h3>
          {issue.theme && (
            <div className="mt-1">
              <p className="line-clamp-2 text-xs leading-relaxed text-gray-600">
                {issue.title}
              </p>
            </div>
          )}
          <p className="mt-1 text-[11px] font-medium text-gray-500">
            {formatMonthYear(issue.month, issue.year)}
          </p>
        </div>

        {/* Topics */}
        <div className="mb-2 flex flex-wrap gap-1">
          {[...issue.topics]
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .slice(0, 2)
            .map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-gradient-to-r from-gold-50 to-flame-50 px-2 py-0.5 text-[10px] font-medium text-flame-700"
              >
                {topic}
              </span>
            ))}
        </div>

        {/* Description */}
        <p className="mb-3 line-clamp-2 flex-1 text-xs leading-relaxed text-gray-500">
          {issue.description}
        </p>

        {/* Meta */}
        <div className="mb-3 flex items-center gap-2 text-[11px] text-gray-600">
          {issue.pageCount && <span>{issue.pageCount}p</span>}
          <span>{formatFileSize(issue.fileSizeBytes)}</span>
        </div>

        {/* Actions — hidden in selection mode (the whole card is a selection
            target there; surfacing nav buttons would be confusing). */}
        <div
          className={cn(
            'relative z-10 flex gap-1.5',
            selectionEnabled && 'pointer-events-none opacity-0',
          )}
        >
          {issue.isEmbargoed ? (
            // Embargoed: route to details only. The date chip on the cover
            // carries the availability promise; this button is the action.
            <Link
              href={detailHref}
              onPointerEnter={prepareDetails}
              onPointerDown={prepareDetails}
              onFocus={prepareDetails}
              className="relative z-20 flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-flame-200 bg-flame-50/60 py-2 text-xs font-semibold text-flame-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
            >
              <Lock className="h-3.5 w-3.5" />
              View Details
            </Link>
          ) : (
            <>
              <Link
                href={readHref}
                onClick={() => rememberReaderSource(issue.id, source)}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-500 to-flame-500 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Read
              </Link>
              <Link
                href={detailHref}
                onPointerEnter={prepareDetails}
                onPointerDown={prepareDetails}
                onFocus={prepareDetails}
                className="relative z-20 flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
              >
                <Download className="h-3.5 w-3.5" />
                Details
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
