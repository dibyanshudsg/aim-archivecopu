'use client';

import Image from '@/components/magazine/archive-image';
import Link from 'next/link';
import { CalendarClock, Info, LockKeyhole, Sparkles } from 'lucide-react';
import type { ApiIssue } from '@/lib/api';
import { formatMonthYear } from '@/lib/utils';

interface LatestSubscriberEditionsProps {
  issues: ApiIssue[];
}

function SubscriberEditionCard({ issue }: { issue: ApiIssue }) {
  const monthYear = formatMonthYear(issue.month, issue.year);
  const unlockLabel = issue.embargo_lift_label ? `Public access opens ${issue.embargo_lift_label}` : 'Subscribers first';
  const topics = issue.topics.slice(0, 2);

  return (
    <Link
      href={`/issue/${issue.id}`}
      className="group grid min-h-[188px] min-w-0 grid-cols-[126px_minmax(0,1fr)] overflow-hidden rounded-xl border border-flame-100 bg-white/90 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-flame-200 hover:bg-white hover:shadow-md active:border-flame-200 active:bg-flame-50/30 sm:grid-cols-[136px_minmax(0,1fr)]"
    >
      <div className="relative h-full min-h-[188px] overflow-hidden bg-gradient-to-br from-gold-50 to-flame-50">
        <div className="absolute inset-y-0 left-0 z-20 w-1 bg-gradient-to-b from-gold-500 to-flame-500" />
        {issue.cover_image_url ? (
          <Image
            src={issue.cover_image_url}
            alt={issue.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="160px"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center px-2 text-center">
            <span className="text-[10px] font-semibold text-flame-700">{issue.magazines.name}</span>
            <span className="mt-1 text-xs font-bold text-gray-900">{monthYear}</span>
          </div>
        )}
        <div className="absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-flame-700 shadow-sm ring-1 ring-flame-100">
          <LockKeyhole className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-normal text-flame-700">
          <CalendarClock className="h-3 w-3 shrink-0" />
          <span className="truncate">{monthYear}</span>
        </div>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-gray-900 group-hover:text-flame-800">
          {issue.title}
        </h3>
        {issue.theme && (
          <p className="mt-1 line-clamp-1 font-heading text-xs font-semibold uppercase leading-normal text-gold-700">
            {issue.theme}
          </p>
        )}
        {topics.length > 0 && (
          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
            {topics.map((topic) => (
              <span
                key={topic}
                className="max-w-full truncate rounded-full bg-flame-50 px-2 py-0.5 text-[10px] font-semibold text-flame-700"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-relaxed text-gray-500">
          {unlockLabel}
        </p>
        <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg border border-flame-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-flame-700 transition-colors group-hover:border-flame-300 group-hover:bg-flame-50">
          <Info className="h-3.5 w-3.5" />
          View Details
        </span>
      </div>
    </Link>
  );
}

export function LatestSubscriberEditions({ issues }: LatestSubscriberEditionsProps) {
  if (issues.length === 0) return null;

  return (
    <section className="relative mx-auto mt-16 w-full max-w-[1440px]">
      <div className="rounded-xl border border-flame-100/80 bg-white/80 p-5 shadow-sm sm:p-6">
        <div className="mb-5 grid grid-cols-1 items-center gap-3 border-b border-flame-100 pb-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold-50 to-flame-50 text-flame-600 ring-1 ring-flame-100">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-xs font-semibold uppercase text-transparent">
                  Current circulation
                </p>
                <h2 className="font-heading text-xl font-bold text-gray-900 sm:text-2xl">
                  Awaiting public release
                </h2>
              </div>
            </div>
          </div>
          <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-gold-200 bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-800 sm:justify-self-end">
            <LockKeyhole className="h-3.5 w-3.5" />
            Metadata visible now
          </div>
          <p className="w-full text-sm leading-relaxed text-gray-600 sm:col-span-2">
            Recent editions remain in print circulation. Covers, themes, and topics are listed here; public reading opens five years after publication.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {issues.map((issue) => (
            <SubscriberEditionCard key={issue.id} issue={issue} />
          ))}
        </div>
      </div>
    </section>
  );
}
