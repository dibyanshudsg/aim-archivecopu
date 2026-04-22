'use client';

import Link from 'next/link';
import { FileText, BookOpen } from 'lucide-react';
import type { FullTextSearchResult } from '@/lib/api';
import { MONTH_NAMES } from '@aim-archive/shared';
import type { MonthIndex } from '@aim-archive/shared';

interface SearchResultItemProps {
  result: FullTextSearchResult;
  index: number;
}

export function SearchResultItem({ result, index }: SearchResultItemProps) {
  const monthName = MONTH_NAMES[result.month as MonthIndex];

  return (
    <div
      className="group rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-gold-200 hover:shadow-sm"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Page indicator */}
        <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gold-50 text-gold-600">
          <FileText className="h-4 w-4" />
          <span className="mt-0.5 text-[10px] font-bold">P.{result.page_number}</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Issue info */}
          <div className="flex items-center gap-2">
            <Link
              href={`/issue/${result.issue_id}`}
              className="text-sm font-semibold text-gray-900 hover:text-gold-700"
            >
              {result.issue_title}
            </Link>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {result.magazine_name}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-gray-400">
            {monthName} {result.year} — Page {result.page_number}
          </p>

          {/* Snippet with highlighted matches */}
          <p
            className="mt-2 text-sm leading-relaxed text-gray-600 [&_mark]:rounded-sm [&_mark]:bg-gold-200 [&_mark]:px-0.5 [&_mark]:text-gold-900"
            dangerouslySetInnerHTML={{ __html: result.snippet }}
          />
        </div>

        {/* Read action */}
        <Link
          href={`/read/${result.issue_id}?page=${result.page_number}`}
          className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg bg-gold-50 px-3 text-xs font-medium text-gold-700 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Read
        </Link>
      </div>
    </div>
  );
}
