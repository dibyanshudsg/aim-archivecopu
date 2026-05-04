'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Heart } from 'lucide-react';
import type { ApiIssue } from '@/lib/api';
import { LANGUAGE_NAMES, MONTH_NAMES } from '@aim-archive/shared';
import type { Language, MonthIndex } from '@aim-archive/shared';
import { useBookmarks } from '@/lib/bookmarks-store';

interface ThisMonthFeaturedProps {
  /**
   * One issue per magazine — the most recent published issue for each.
   * Already ordered (AIM first, Agnishikha next, then others by `created_at` of
   * the magazine row) by the server-side fetch in `app/page.tsx`.
   */
  featured: ApiIssue[];
}

/**
 * "This Month's Editions" — featured cards, one per magazine, showing each
 * publication's most recent issue. Sits between the homepage hero CTA and the
 * animated bookshelf. Auto-determined for now (Phase 1) — admin override can
 * be layered on later via a `featured_issue_id` column on `magazines`.
 */
export function ThisMonthFeatured({ featured }: ThisMonthFeaturedProps) {
  if (featured.length === 0) return null;

  // Header month/year derives from the most recent issue in the set, not from
  // `Date.now()` — so if Hemlata Di hasn't uploaded May yet, the heading
  // gracefully reads "April 2026" until she does.
  const headlineIssue = [...featured].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  })[0];
  const monthName = MONTH_NAMES[headlineIssue.month as MonthIndex];
  const headerLabel = `${monthName} ${headlineIssue.year}`;

  return (
    <motion.section
      className="relative mx-auto mt-16 max-w-6xl"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="this-month-heading"
    >
      <header className="mb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flame-700">
          This Month&apos;s Editions — {headerLabel}
        </p>
        <h2
          id="this-month-heading"
          className="font-heading mt-2 bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 text-2xl font-medium tracking-wide text-transparent sm:text-3xl"
        >
          The latest editions, an offering at Thy Lotus Feet.
        </h2>
      </header>

      <div
        className={
          featured.length === 1
            ? 'mx-auto max-w-2xl'
            : 'grid gap-6 lg:grid-cols-2'
        }
      >
        {featured.map((issue, i) => (
          <FeaturedCard key={issue.id} issue={issue} index={i} />
        ))}
      </div>
    </motion.section>
  );
}

function FeaturedCard({ issue, index }: { issue: ApiIssue; index: number }) {
  const { toggle, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(issue.id);

  const monthName = MONTH_NAMES[issue.month as MonthIndex];
  const language = (issue.magazines.language as Language) ?? 'english';
  const eyebrow = `${issue.magazines.name} — ${monthName} ${issue.year}`;
  const sortedTopics = [...issue.topics]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .slice(0, 3);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group relative overflow-hidden rounded-2xl border border-flame-200/60 bg-white shadow-[0_8px_28px_rgba(190,140,46,0.10)] transition-shadow duration-300 hover:shadow-[0_18px_40px_rgba(229,86,31,0.16)]"
    >
      {/* Whole-card click target → reader. Buttons inside stop propagation
          so they remain individually clickable. */}
      <Link
        href={`/read/${issue.id}?from=home`}
        aria-label={`Read ${issue.title}`}
        className="absolute inset-0 z-0"
      />

      <div className="relative z-10 flex h-full flex-col sm:flex-row">
        {/* Cover */}
        <div className="relative w-full shrink-0 overflow-hidden bg-gradient-to-br from-gold-100 to-flame-50 sm:h-full sm:w-[44%]">
          <div className="absolute inset-y-0 left-0 z-10 w-1.5 bg-gradient-to-b from-gold-500 to-flame-500 shadow-[2px_0_10px_rgba(0,0,0,0.18)]" />
          <div className="relative aspect-[3/4] sm:aspect-auto sm:h-full sm:min-h-[360px]">
            {issue.cover_image_url ? (
              <Image
                src={issue.cover_image_url}
                alt={issue.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 44vw, 380px"
                priority={index === 0}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-xs font-medium tracking-widest text-transparent uppercase">
                  {issue.magazines.name}
                </span>
                <span className="font-heading mt-2 text-3xl font-bold text-gray-900">
                  {monthName}
                </span>
                <span className="font-heading bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-4xl font-bold text-transparent">
                  {issue.year}
                </span>
                <span className="mt-2 text-xs text-gray-500">
                  {LANGUAGE_NAMES[language]}
                </span>
              </div>
            )}
          </div>
          <div className="absolute inset-x-3 bottom-0 z-10 h-2 rounded-full bg-black/[0.08]" />
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <p className="bg-gradient-to-r from-gold-700 to-flame-600 bg-clip-text text-[11px] font-semibold uppercase tracking-[0.14em] text-transparent">
            {eyebrow}
          </p>

          {issue.theme ? (
            <div className="mt-3 flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-2 h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-gold-500 to-flame-500"
              />
              <h3 className="font-heading bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 pt-1 text-2xl font-medium leading-snug text-transparent sm:text-[28px]">
                {issue.theme}
              </h3>
            </div>
          ) : (
            <h3 className="font-heading mt-3 text-2xl font-medium leading-snug text-gray-900 sm:text-[28px]">
              {issue.title}
            </h3>
          )}

          {issue.description && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600">
              {issue.description}
            </p>
          )}

          {sortedTopics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {sortedTopics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-gradient-to-r from-gold-50 to-flame-50 px-2.5 py-1 text-[11px] font-medium text-flame-700"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center gap-2 pt-5">
            <Link
              href={`/read/${issue.id}?from=home`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="relative z-20 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.24)] transition-all hover:from-gold-600 hover:to-flame-600 hover:shadow-[0_12px_28px_rgba(229,86,31,0.28)]"
            >
              <BookOpen className="h-4 w-4" />
              Read Now
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(issue.id);
              }}
              aria-label={bookmarked ? 'Remove bookmark' : 'Save to bookmarks'}
              className="relative z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700"
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  bookmarked ? 'fill-red-500 text-red-500' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
