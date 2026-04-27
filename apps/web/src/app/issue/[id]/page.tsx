'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Download,
  Heart,
  ArrowLeft,
  FileText,
  Calendar,
  Eye,
  HardDrive,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { fetchIssue, normalizeIssue } from '@/lib/api';
import { LANGUAGE_NAMES, MONTH_NAMES } from '@aim-archive/shared';
import type { MonthIndex, Language } from '@aim-archive/shared';
import { formatFileSize } from '@/lib/utils';
import { useBookmarks } from '@/lib/bookmarks-store';

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toggle, isBookmarked } = useBookmarks();
  const [issue, setIssue] = useState<ReturnType<typeof normalizeIssue> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssue(id)
      .then((data) => setIssue(data ? normalizeIssue(data) : null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
        </main>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold text-gray-900">Issue not found</h1>
            <Link href="/browse" className="mt-4 inline-block text-gold-600 hover:text-gold-700">
              Back to Browse
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const bookmarked = isBookmarked(issue.id);
  const monthName = MONTH_NAMES[issue.month as MonthIndex];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="border-b border-gray-100 px-6 py-3 lg:px-8">
          <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm text-gray-500">
            <Link href="/browse" className="flex items-center gap-1 hover:text-gold-600">
              <ArrowLeft className="h-3.5 w-3.5" />
              Browse
            </Link>
            <span>/</span>
            <span className="text-gray-900">{issue.title}</span>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-24 overflow-hidden rounded-2xl border border-gold-100 bg-gradient-to-br from-gold-50 to-gold-100/50 shadow-sm">
                {issue.coverImageUrl ? (
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={issue.coverImageUrl}
                      alt={issue.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-8 py-16">
                    <span className="text-xs font-medium tracking-widest text-gold-600 uppercase">
                      {issue.magazine.name}
                    </span>
                    <span className="font-heading mt-2 text-4xl font-bold text-gray-900">
                      {monthName}
                    </span>
                    <span className="font-heading text-5xl font-bold text-gold-500">
                      {issue.year}
                    </span>
                    <span className="mt-2 text-sm text-gray-500">
                      {LANGUAGE_NAMES[issue.magazine.language as Language]}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="lg:col-span-2"
            >
              <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
                {issue.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {[...issue.topics]
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                  .map((topic) => (
                    <Link
                      key={topic}
                      href={`/browse?subject=${encodeURIComponent(topic)}`}
                      className="rounded-full bg-gold-50 px-3 py-1 text-sm font-medium text-gold-700 transition-colors hover:bg-gold-100"
                    >
                      {topic}
                    </Link>
                  ))}
              </div>

              <p className="mt-6 leading-relaxed text-gray-600">{issue.description}</p>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetaItem icon={Calendar} label="Published" value={`${monthName} ${issue.year}`} />
                <MetaItem icon={FileText} label="Pages" value={issue.pageCount ? String(issue.pageCount) : '—'} />
                <MetaItem icon={HardDrive} label="Size" value={formatFileSize(issue.fileSizeBytes)} />
                <MetaItem icon={Eye} label="Reads" value={issue.readCount.toLocaleString()} />
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/read/${issue.id}`}
                  className="flex items-center gap-2 rounded-xl bg-gold-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-gold-500/20 transition-all hover:bg-gold-600"
                >
                  <BookOpen className="h-5 w-5" />
                  Read Online
                </Link>

                <a
                  href={issue.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:border-gold-300 hover:bg-gold-50"
                >
                  <Download className="h-5 w-5" />
                  PDF
                </a>

                <button
                  onClick={() => toggle(issue.id)}
                  className={`flex items-center gap-2 rounded-xl border px-6 py-3 text-base font-semibold transition-colors ${
                    bookmarked
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-gray-200 text-gray-700 hover:border-gold-300 hover:bg-gold-50'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${bookmarked ? 'fill-red-500' : ''}`} />
                  {bookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
              </div>

              <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <h3 className="text-sm font-semibold text-gray-900">Available Formats</h3>
                <div className="mt-3 flex gap-3">
                  <FormatBadge format="PDF" available />
                  <FormatBadge format="EPUB" available={!!issue.epubUrl} />
                  <FormatBadge format="MOBI" available={!!issue.mobiUrl} />
                </div>
                {!issue.epubUrl && (
                  <p className="mt-2 text-xs text-gray-400">EPUB and MOBI formats coming soon</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <Icon className="h-4 w-4 text-gold-500" />
      <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function FormatBadge({ format, available }: { format: string; available: boolean }) {
  return (
    <span
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        available ? 'bg-gold-100 text-gold-700' : 'bg-gray-100 text-gray-400'
      }`}
    >
      {format}
    </span>
  );
}
