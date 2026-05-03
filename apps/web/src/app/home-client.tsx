'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookMarked, BookOpen, Search, Download, Globe } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AnimatedBookshelf } from '@/components/home/animated-bookshelf';
import { Flame } from '@/components/home/flame';
import type { ApiIssue } from '@/lib/api';
import {
  formatRelativeTime,
  getRecentReads,
  type ReadingHistoryEntry,
} from '@/lib/reading-history';
import { formatMonthYear } from '@/lib/utils';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
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

const features = [
  {
    icon: BookOpen,
    title: 'Read Online',
    description: 'Browse and read any issue directly in your browser with our smooth PDF viewer.',
  },
  {
    icon: Search,
    title: 'Search Everything',
    description:
      'Full-text search across every issue ever published. Find exactly what you need.',
  },
  {
    icon: Download,
    title: 'Download & Offline',
    description: 'Download issues in PDF, EPUB, or MOBI. Read offline anytime, anywhere.',
  },
  {
    icon: Globe,
    title: 'Multiple Languages',
    description:
      'Archives in English, Hindi, Tamil, Marathi, Bengali and more - all in one place.',
  },
];

interface HomeClientProps {
  recentIssues: ApiIssue[];
}

function ContinueReadingShelf() {
  const [entries, setEntries] = useState<ReadingHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(getRecentReads(3));
  }, []);

  if (entries.length === 0) return null;

  return (
    <motion.div
      className="relative mx-auto mt-10 max-w-5xl"
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
                href={`/read/${entry.issueId}?page=${entry.page}&resume=1&from=shelf`}
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

export function HomeClient({ recentIssues }: HomeClientProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-6 py-24 sm:py-32 lg:px-8">
          <motion.div
            className="relative mx-auto max-w-5xl text-center"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
              <Flame />
            </motion.div>

            <motion.div variants={fadeInUp} className="mb-8">
              <span className="inline-block rounded-full bg-gradient-to-r from-gold-100 to-flame-100 px-4 py-1.5 text-sm font-medium text-flame-800">
                Sri Aurobindo Society
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-heading text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl"
            >
              An Archive of Eternal Flame
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-6 text-lg leading-relaxed text-gray-600 sm:text-xl"
            >
              Decades of spiritual wisdom from{' '}
              <span className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text font-medium text-transparent">Sri Aurobindo</span> and{' '}
              <span className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text font-medium text-transparent">The Mother</span>, preserved and
              accessible to all. Explore the complete archive of All India Magazine, Agnisikha, and
              more.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/browse"
                className="rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-8 py-3.5 text-base font-semibold text-white shadow-[0_12px_30px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 hover:shadow-[0_16px_36px_rgba(229,86,31,0.24)]"
              >
                Browse Archive
              </Link>
              <Link
                href="/search"
                className="rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all hover:border-flame-300 hover:bg-flame-50"
              >
                Search Issues
              </Link>
            </motion.div>
          </motion.div>

          {/* Dynamic Bookshelf */}
          <motion.div
            className="relative mx-auto mt-16 max-w-5xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <AnimatedBookshelf issues={recentIssues} />
          </motion.div>

          <ContinueReadingShelf />

          {/* Archive Stats */}
          <motion.div
            className="relative mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-8 border-t border-flame-100 pt-10 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            {[
              { label: 'Issues Archived', value: '850+' },
              { label: 'Years of Wisdom', value: '35+' },
              { label: 'Languages', value: '6' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-20 lg:px-8">
          <motion.div
            className="mx-auto max-w-5xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center">
              <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
                Everything you need
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                A complete platform to explore, read, and preserve spiritual literature.
              </p>
            </motion.div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2">
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={fadeInUp}
                  className="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-flame-200 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-50 to-flame-50 text-flame-600 transition-colors group-hover:from-gold-100 group-hover:to-flame-100">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 leading-relaxed text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-b from-white to-flame-50 px-6 py-20 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
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
              Dive into the treasury of spiritual knowledge. Every issue, every article, always free.
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

      <Footer />
    </div>
  );
}
