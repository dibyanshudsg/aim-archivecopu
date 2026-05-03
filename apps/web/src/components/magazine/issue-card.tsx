'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Check, Download, Heart, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { IssueWithMagazine } from '@aim-archive/shared';
import { LANGUAGE_NAMES } from '@aim-archive/shared';
import { formatFileSize, formatMonthYear, cn } from '@/lib/utils';
import { useBookmarks } from '@/lib/bookmarks-store';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { shareIssue } from '@/lib/share-issue';

interface IssueCardProps {
  issue: IssueWithMagazine;
  index?: number;
  source?: 'browse' | 'bookmarks';
}

export function IssueCard({ issue, index = 0, source = 'browse' }: IssueCardProps) {
  const { toggle, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(issue.id);
  const [copied, setCopied] = useState(false);
  const readHref = `/read/${issue.id}?from=${source}`;

  // Bulk selection — when enabled, the card becomes a toggle target instead
  // of a Link, and a checkbox overlay surfaces selection state.
  const selectionEnabled = useBulkSelection((s) => s.enabled);
  const isSelected = useBulkSelection((s) => s.selectedIds.has(issue.id));
  const toggleSelection = useBulkSelection((s) => s.toggle);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
      onClick={selectionEnabled ? () => toggleSelection(issue.id) : undefined}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow duration-200 hover:shadow-2xl',
        isSelected
          ? 'border-flame-500 ring-2 ring-flame-500'
          : 'border-gray-100 hover:border-flame-300',
      )}
    >
      {/* Whole-card click target → open reader. Disabled in selection mode
          so taps toggle selection via the wrapper's onClick instead. */}
      {!selectionEnabled && (
        <Link
          href={readHref}
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
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-white ${
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
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-white"
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${bookmarked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3.5">
        <div className="mb-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-flame-800">
            {issue.title}
          </h3>
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
        <div className="mb-3 flex items-center gap-2 text-[11px] text-gray-400">
          {issue.pageCount && <span>{issue.pageCount}p</span>}
          <span>{formatFileSize(issue.fileSizeBytes)}</span>
          <span>{issue.readCount.toLocaleString()} reads</span>
        </div>

        {/* Actions — hidden in selection mode (the whole card is a selection
            target there; surfacing nav buttons would be confusing). */}
        <div
          className={cn(
            'relative z-10 flex gap-1.5',
            selectionEnabled && 'pointer-events-none opacity-0',
          )}
        >
          <Link
            href={readHref}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-500 to-flame-500 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read
          </Link>
          <Link
            href={`/issue/${issue.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
          >
            <Download className="h-3.5 w-3.5" />
            Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
