'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookMarked } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AnimatedBookshelf } from '@/components/home/animated-bookshelf';
import { LatestSubscriberEditions } from '@/components/home/latest-subscriber-editions';
import { Flame } from '@/components/home/flame';

import { ThisMonthFeatured } from '@/components/home/this-month-featured';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import type { ShelfIssue, ShelfYear } from '@/lib/home-shelf';
import { isEmbargoed } from '@/lib/embargo';
import {
  formatRelativeTime,
  getRecentReads,
  type ReadingHistoryEntry,
} from '@/lib/reading-history';
import { readerPath, rememberDirectResume, rememberReaderSource } from '@/lib/reader-url';
import { formatMonthYear } from '@/lib/utils';
import type { PublicNavigation } from '@/lib/navigation';

// Slide-up entrance — no opacity gate. Opacity transitions block LCP measurement
// (the element isn't "contentful" while opacity:0), so we keep the element fully
// visible from first paint and animate position only. Saves ~1s of LCP delay
// on /, since the hero subtitle is the LCP element.
const fadeInUp = {
  hidden: { y: 20 },
  visible: {
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};


interface HomeClientProps {
  recentIssues: ShelfIssue[];
  shelfYears: ShelfYear[];
  latestSubscriberEditions: ApiIssue[];
  carouselMagazines: ApiMagazine[];
  carouselIssues: ApiIssue[];
  carouselCurrentYear: number;
  carouselCurrentMonth: number;
  carouselPrevYear: number;
  carouselPrevMonth: number;
  navigation: PublicNavigation;
  collection: { listed: number; readable: number; languages: string[] };
}

function ContinueReadingShelf() {
  const [entries, setEntries] = useState<ReadingHistoryEntry[]>([]);

  useEffect(() => {
    // Drop locally-saved entries for issues that fell back into the 5-year
    // embargo window — resuming them would just bounce the user off the
    // reader's locked-state screen.
    setEntries(getRecentReads(6).filter((e) => !isEmbargoed(e.year, e.month)).slice(0, 3));
  }, []);

  if (entries.length === 0) return null;

  return (
    <motion.div
      className="relative mx-auto mt-10 w-full max-w-[1440px]"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rounded-xl border border-flame-100 bg-white/85 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold-50 to-flame-50 text-flame-600">
              <BookMarked className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold text-gray-900">Continue reading</h2>
              <p className="text-xs text-gray-500">Pick up from your last saved page</p>
            </div>
          </div>
          <Link
            href="/bookmarks"
            className="rounded-lg border border-flame-200 bg-white px-3 py-2 text-xs font-semibold text-flame-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
          >
            Saved
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {entries.map((entry) => {
            const progressPct = entry.numPages
              ? Math.min(100, Math.max(3, (entry.page / entry.numPages) * 100))
              : 0;

            return (
              <Link
                key={entry.issueId}
                href={readerPath(entry.issueId, entry.page)}
                onClick={() => {
                  rememberReaderSource(entry.issueId, 'shelf');
                  rememberDirectResume(entry.issueId);
                }}
                className="group flex min-w-0 items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 text-left transition-all hover:border-flame-200 hover:bg-flame-50/40 hover:shadow-sm active:border-flame-200 active:bg-flame-50/40 active:shadow-sm"
              >
                <div className="relative h-20 w-[60px] shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-gold-100 to-flame-50 shadow-sm">
                  <div className="absolute inset-y-0 left-0 z-10 w-1 bg-gradient-to-b from-gold-500 to-flame-500" />
                  {entry.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-semibold text-flame-700">
                      {entry.magazineName}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-flame-800 group-active:text-flame-800">
                    {entry.title}
                  </p>
                  {entry.theme && (
                    <div className="mt-0.5 flex items-start gap-1.5">
                      <span aria-hidden className="mt-1.5 h-2.5 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-gold-500 to-flame-500" />
                      <p className="font-heading truncate bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 pt-0.5 text-[12px] font-bold leading-normal text-transparent">
                        {entry.theme}
                      </p>
                    </div>
                  )}
                  <p className="truncate text-xs text-gray-500">
                    {formatMonthYear(entry.month, entry.year)}
                  </p>
                  {entry.numPages && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold-500 to-flame-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    Page {entry.page}
                    {entry.numPages ? ` / ${entry.numPages}` : ''} - {formatRelativeTime(entry.updatedAt)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export function HomeClient({
  recentIssues,
  shelfYears,
  latestSubscriberEditions,
  carouselMagazines,
  carouselIssues,
  carouselCurrentYear,
  carouselCurrentMonth,
  carouselPrevYear,
  carouselPrevMonth,
  navigation,
  collection,
}: HomeClientProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header navigation={navigation} />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-[#fffaf1] via-[#fffdf8] to-white px-4 pb-12 pt-5 sm:px-6 sm:pb-20 sm:pt-9 lg:px-8">
          <ThisMonthFeatured
            magazines={carouselMagazines}
            issues={carouselIssues}
            currentYear={carouselCurrentYear}
            currentMonth={carouselCurrentMonth}
            prevYear={carouselPrevYear}
            prevMonth={carouselPrevMonth}
          />

          <section className="mx-auto mt-12 w-full max-w-[1440px] border-y border-gold-200/70 px-4 py-10 sm:mt-16 sm:px-6 lg:px-10" aria-labelledby="archive-intro-title">
            <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center gap-4 sm:w-fit sm:flex-row sm:gap-7">
              <div className="flex shrink-0 justify-center sm:-translate-x-5" aria-hidden="true">
                <Flame className="scale-[0.8] sm:scale-[0.9]" />
              </div>
              <div className="min-w-0 text-left">
                <h2 id="archive-intro-title" className="font-cursive text-5xl leading-tight text-flame-700 sm:text-[4rem] lg:text-[4.25rem]">
                  An Archive of Eternal Flame
                </h2>
                <p className="mt-2 text-base leading-relaxed text-gray-700 sm:text-lg">
                  Writings of Sri Aurobindo and The Mother, preserved for discovery and reading.
                </p>
                <p className="mt-2 text-base leading-relaxed text-gray-700 sm:text-lg">
                  Editions become freely readable after five years.
                </p>
              </div>
            </div>
          </section>


          {/* Dynamic Bookshelf */}
          <motion.div
            className="relative mx-auto mt-16 w-full max-w-[1440px]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <AnimatedBookshelf issues={recentIssues} years={shelfYears} />
          </motion.div>

          <ContinueReadingShelf />
          <LatestSubscriberEditions issues={latestSubscriberEditions} />

          {/* Archive Stats */}
          <motion.div
            className="relative mx-auto mt-16 grid w-full max-w-[1440px] grid-cols-3 gap-4 border-t border-flame-100 pt-10 text-center sm:gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            {[
              { label: 'Publicly listed editions', value: collection.listed.toLocaleString() },
              { label: 'Readable now', value: collection.readable.toLocaleString() },
              { label: 'Awaiting public release', value: (collection.listed - collection.readable).toLocaleString() },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
          <p className="mx-auto mt-5 w-full max-w-[1440px] text-center text-sm leading-relaxed text-gray-600">
            {collection.languages.length ? `Languages in the listed collection: ${collection.languages.join(', ')}.` : 'No editions are listed yet.'}
            {' '}Counts describe the online catalogue, including restricted editions, not the complete print collection.
          </p>
        </section>


        {/* CTA Section */}
        <section className="bg-gradient-to-b from-white to-flame-50 px-6 py-20 lg:px-8">
          <motion.div
            className="mx-auto max-w-5xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl"
            >
              Begin your exploration
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-gray-600">
              Explore the public archive. Editions become freely readable five years after publication.
            </motion.p>
            <motion.div variants={fadeInUp} className="mt-8">
              <Link
                href="/browse"
                className="inline-block rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-10 py-4 text-base font-semibold text-white shadow-[0_12px_30px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 hover:shadow-[0_16px_36px_rgba(229,86,31,0.24)]"
              >
                Explore the Archive
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer navigation={navigation} />
    </div>
  );
}
