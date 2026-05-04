'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Heart, Info, Share2 } from 'lucide-react';
import type { IssueWithMagazine } from '@aim-archive/shared';
import { LANGUAGE_NAMES } from '@aim-archive/shared';
import { useBookmarks } from '@/lib/bookmarks-store';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { formatFileSize, formatMonthYear } from '@/lib/utils';
import type { SortColumn } from '@/lib/use-browse-filters';
import { cn } from '@/lib/utils';
import { shareIssue } from '@/lib/share-issue';

interface Props {
  issues: IssueWithMagazine[];
  sort: SortColumn | null;
  dir: 'asc' | 'desc';
  onSort: (col: SortColumn) => void;
}

export function IssueListView({ issues, sort, dir, onSort }: Props) {
  return (
    <>
      <div className="hidden rounded-2xl border border-gray-100 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gradient-to-r from-gold-50/50 to-flame-50/50 text-xs font-medium tracking-wider text-gray-600 uppercase">
            <tr>
              <SortHeader col="title" label="Title" current={sort} dir={dir} onSort={onSort} />
              <SortHeader col="language" label="Language" current={sort} dir={dir} onSort={onSort} />
              <th className="px-4 py-3 text-left">Topic Tags</th>
              <SortHeader col="pages" label="Pages" current={sort} dir={dir} onSort={onSort} align="right" />
              <SortHeader col="size" label="Size" current={sort} dir={dir} onSort={onSort} align="right" />
              <SortHeader col="reads" label="Reads" current={sort} dir={dir} onSort={onSort} align="right" />
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {issues.map((issue, i) => (
              <DesktopRow key={issue.id} issue={issue} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {issues.map((issue, i) => (
          <MobileRow key={issue.id} issue={issue} index={i} />
        ))}
      </ul>
    </>
  );
}

function SortHeader({
  col,
  label,
  current,
  dir,
  onSort,
  align = 'left',
}: {
  col: SortColumn;
  label: string;
  current: SortColumn | null;
  dir: 'asc' | 'desc';
  onSort: (c: SortColumn) => void;
  align?: 'left' | 'right';
}) {
  const active = current === col;
  return (
    <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => onSort(col)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-flame-700',
          active && 'text-flame-700',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        {active ? (
          dir === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-gray-300" />
        )}
      </button>
    </th>
  );
}

function ShareButton({ issue, className }: { issue: IssueWithMagazine; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
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
      aria-label="Share issue"
      title={copied ? 'Link copied' : 'Share'}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-flame-50 hover:text-flame-700',
        copied && 'bg-green-50 text-green-600 hover:bg-green-50 hover:text-green-700',
        className,
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}


function DesktopRow({ issue, index }: { issue: IssueWithMagazine; index: number }) {
  const router = useRouter();
  const { toggle, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(issue.id);
  const delay = Math.min(index * 0.035, 0.4);

  const selectionEnabled = useBulkSelection((s) => s.enabled);
  const isSelected = useBulkSelection((s) => s.selectedIds.has(issue.id));
  const toggleSelection = useBulkSelection((s) => s.toggle);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.18, ease: 'easeOut' } }}
      transition={{ delay, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      onClick={() =>
        selectionEnabled
          ? toggleSelection(issue.id)
          : router.push(`/read/${issue.id}?from=browse`)
      }
      className={cn(
        'relative cursor-pointer transition-shadow duration-200 hover:z-10 hover:shadow-lg',
        isSelected ? 'bg-flame-50/60' : 'hover:bg-flame-50/40',
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {selectionEnabled && (
            <div
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                isSelected
                  ? 'border-flame-500 bg-flame-500 text-white'
                  : 'border-gray-300 bg-white text-transparent',
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </div>
          )}
          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-gradient-to-br from-gold-100 to-flame-100">
            <div className="absolute inset-y-0 left-0 z-10 w-1 bg-gradient-to-b from-gold-500 to-flame-500" />
            {issue.coverImageUrl && (
              <Image
                src={issue.coverImageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="36px"
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-900">{issue.title}</div>
            {issue.theme && (
              <div className="font-heading truncate bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 pt-0.5 text-[13px] font-bold leading-normal text-transparent">
                {issue.theme}
              </div>
            )}
            <div className="text-xs text-gray-500">{formatMonthYear(issue.month, issue.year)}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-700">{LANGUAGE_NAMES[issue.magazine.language]}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {[...issue.topics]
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .slice(0, 3)
            .map((t) => (
              <span
                key={t}
                className="rounded-full bg-gradient-to-r from-gold-50 to-flame-50 px-2 py-0.5 text-[10px] font-medium text-flame-700"
              >
                {t}
              </span>
            ))}
          {issue.topics.length > 3 && (
            <span className="text-[10px] text-gray-400">+{issue.topics.length - 3}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{issue.pageCount ?? '—'}</td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
        {formatFileSize(issue.fileSizeBytes)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
        {issue.readCount.toLocaleString()}
      </td>
      <td className="px-3 py-3">
        <div
          className={cn(
            'flex items-center justify-end gap-1',
            selectionEnabled && 'pointer-events-none opacity-0',
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle(issue.id);
            }}
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-flame-50 hover:text-red-500"
          >
            <Heart className={`h-4 w-4 ${bookmarked ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <ShareButton issue={issue} />
          <Link
            href={`/issue/${issue.id}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            aria-label="Issue details"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-flame-50 hover:text-flame-700"
          >
            <Info className="h-4 w-4" />
          </Link>
        </div>
      </td>
    </motion.tr>
  );
}

function MobileRow({ issue, index }: { issue: IssueWithMagazine; index: number }) {
  const { toggle, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(issue.id);
  const delay = Math.min(index * 0.035, 0.4);

  const selectionEnabled = useBulkSelection((s) => s.enabled);
  const isSelected = useBulkSelection((s) => s.selectedIds.has(issue.id));
  const toggleSelection = useBulkSelection((s) => s.toggle);

  return (
    <motion.li
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.18, ease: 'easeOut' } }}
      transition={{ delay, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      onClick={selectionEnabled ? () => toggleSelection(issue.id) : undefined}
      className={cn(
        'relative cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-xl',
        isSelected
          ? 'border-flame-500 ring-2 ring-flame-500'
          : 'border-gray-100 hover:border-flame-300',
      )}
    >
      {!selectionEnabled && (
        <Link
          href={`/read/${issue.id}?from=browse`}
          className="absolute inset-0 z-0"
          aria-label={`Read ${issue.title}`}
        />
      )}
      {selectionEnabled && (
        <div className="pointer-events-none absolute top-2 right-2 z-10">
          <div
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors',
              isSelected
                ? 'border-flame-500 bg-flame-500 text-white'
                : 'border-gray-300 bg-white text-transparent',
            )}
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-gradient-to-br from-gold-100 to-flame-100">
          <div className="absolute inset-y-0 left-0 z-10 w-1 bg-gradient-to-b from-gold-500 to-flame-500" />
          {issue.coverImageUrl && (
            <Image src={issue.coverImageUrl} alt="" fill className="object-cover" sizes="48px" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-900">{issue.title}</div>
          {issue.theme && (
            <div className="font-heading truncate bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 pt-0.5 text-[12px] font-bold leading-normal text-transparent">
              {issue.theme}
            </div>
          )}
          <div className="text-xs text-gray-500">
            {issue.magazine.name} · {LANGUAGE_NAMES[issue.magazine.language]}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
            <span>{issue.pageCount}p</span>
            <span>{formatFileSize(issue.fileSizeBytes)}</span>
            <span>{issue.readCount.toLocaleString()} reads</span>
          </div>
        </div>
        <div
          className={cn(
            'relative z-10 flex shrink-0 items-center',
            selectionEnabled && 'pointer-events-none opacity-0',
          )}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(issue.id);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-red-500"
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <Heart className={`h-4 w-4 ${bookmarked ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <ShareButton issue={issue} />
        </div>
      </div>
    </motion.li>
  );
}
