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
          <thead className="border-b border-gray-100 bg-gold-50/40 text-xs font-medium tracking-wider text-gray-600 uppercase">
            <tr>
              <SortHeader col="title" label="Title" current={sort} dir={dir} onSort={onSort} />
              <SortHeader col="magazine" label="Magazine" current={sort} dir={dir} onSort={onSort} />
              <SortHeader col="language" label="Language" current={sort} dir={dir} onSort={onSort} />
              <th className="px-4 py-3 text-left">Topics</th>
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
          'inline-flex items-center gap-1 hover:text-gold-700',
          active && 'text-gold-700',
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
        'flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gold-50 hover:text-gold-700',
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

  return (
    <motion.tr
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.18, ease: 'easeOut' } }}
      transition={{ delay, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => router.push(`/read/${issue.id}`)}
      className="relative cursor-pointer transition-shadow duration-200 hover:z-10 hover:bg-gold-50/40 hover:shadow-lg"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-gold-100">
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
            <div className="text-xs text-gray-500">{formatMonthYear(issue.month, issue.year)}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-700">{issue.magazine.name}</td>
      <td className="px-4 py-3 text-gray-700">{LANGUAGE_NAMES[issue.magazine.language]}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {[...issue.topics]
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .slice(0, 3)
            .map((t) => (
              <span
                key={t}
                className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-medium text-gold-700"
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
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle(issue.id);
            }}
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gold-50 hover:text-red-500"
          >
            <Heart className={`h-4 w-4 ${bookmarked ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <ShareButton issue={issue} />
          <Link
            href={`/issue/${issue.id}`}
            onClick={(e) => e.stopPropagation()}
            aria-label="Issue details"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gold-50 hover:text-gold-700"
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

  return (
    <motion.li
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.18, ease: 'easeOut' } }}
      transition={{ delay, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="relative cursor-pointer rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow duration-200 hover:border-gold-300 hover:shadow-xl"
    >
      <Link href={`/read/${issue.id}`} className="absolute inset-0 z-0" aria-label={`Read ${issue.title}`} />
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-gold-100">
          {issue.coverImageUrl && (
            <Image src={issue.coverImageUrl} alt="" fill className="object-cover" sizes="48px" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-900">{issue.title}</div>
          <div className="text-xs text-gray-500">
            {issue.magazine.name} · {LANGUAGE_NAMES[issue.magazine.language]}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
            <span>{issue.pageCount}p</span>
            <span>{formatFileSize(issue.fileSizeBytes)}</span>
            <span>{issue.readCount.toLocaleString()} reads</span>
          </div>
        </div>
        <div className="relative z-10 flex shrink-0 items-center">
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
