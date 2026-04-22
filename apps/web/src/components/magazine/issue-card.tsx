'use client';

import Link from 'next/link';
import { BookOpen, Download, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import type { IssueWithMagazine } from '@aim-archive/shared';
import { LANGUAGE_NAMES } from '@aim-archive/shared';
import { formatFileSize, formatMonthYear } from '@/lib/utils';
import { useBookmarks } from '@/lib/bookmarks-store';

interface IssueCardProps {
  issue: IssueWithMagazine;
  index?: number;
}

export function IssueCard({ issue, index = 0 }: IssueCardProps) {
  const { toggle, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(issue.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-gold-200 hover:shadow-md"
    >
      {/* Cover / Color band */}
      <div className="relative h-40 bg-gradient-to-br from-gold-100 to-gold-50">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <span className="text-xs font-medium tracking-widest text-gold-600 uppercase">
            {issue.magazine.name}
          </span>
          <span className="font-heading mt-1 text-2xl font-bold text-gray-900">
            {formatMonthYear(issue.month, issue.year)}
          </span>
          <span className="mt-1 text-xs text-gray-500">
            {LANGUAGE_NAMES[issue.magazine.language]}
          </span>
        </div>

        {/* Bookmark button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle(issue.id);
          }}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-white"
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${bookmarked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Topics */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {issue.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-gold-50 px-2.5 py-0.5 text-[11px] font-medium text-gold-700"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500">
          {issue.description}
        </p>

        {/* Meta */}
        <div className="mb-4 flex items-center gap-4 text-xs text-gray-400">
          {issue.pageCount && <span>{issue.pageCount} pages</span>}
          <span>{formatFileSize(issue.fileSizeBytes)}</span>
          <span>{issue.readCount.toLocaleString()} reads</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/read/${issue.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-600"
          >
            <BookOpen className="h-4 w-4" />
            Read
          </Link>
          <Link
            href={`/issue/${issue.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gold-300 hover:bg-gold-50"
          >
            <Download className="h-4 w-4" />
            Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
