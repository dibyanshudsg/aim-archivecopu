'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Check, Download, Heart, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { IssueWithMagazine } from '@aim-archive/shared';
import { LANGUAGE_NAMES } from '@aim-archive/shared';
import { formatFileSize, formatMonthYear } from '@/lib/utils';
import { useBookmarks } from '@/lib/bookmarks-store';
import { shareIssue } from '@/lib/share-issue';

interface IssueCardProps {
  issue: IssueWithMagazine;
  index?: number;
}

export function IssueCard({ issue, index = 0 }: IssueCardProps) {
  const { toggle, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(issue.id);
  const [copied, setCopied] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:border-gold-300 hover:shadow-2xl"
    >
      {/* Whole-card click target → open reader */}
      <Link
        href={`/read/${issue.id}`}
        aria-label={`Read ${issue.title}`}
        className="absolute inset-0 z-0"
      />

      {/* Cover */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-gold-100 to-gold-50">
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
            <span className="text-[10px] font-medium tracking-widest text-gold-600 uppercase">
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

        {/* Cover action buttons */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
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
              copied ? 'text-green-600' : 'text-gray-500 hover:text-gold-700'
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
        {/* Topics */}
        <div className="mb-2 flex flex-wrap gap-1">
          {[...issue.topics]
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .slice(0, 2)
            .map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-medium text-gold-700"
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

        {/* Actions */}
        <div className="relative z-10 flex gap-1.5">
          <Link
            href={`/read/${issue.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold-500 py-2 text-xs font-semibold text-white transition-colors hover:bg-gold-600"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read
          </Link>
          <Link
            href={`/issue/${issue.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-gold-300 hover:bg-gold-50"
          >
            <Download className="h-3.5 w-3.5" />
            Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
