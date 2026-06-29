'use client';

import { useEffect, useMemo, useState } from 'react';
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
  CalendarClock,
  Eye,
  Globe2,
  HardDrive,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { fetchIssue, normalizeIssue, type ApiIssue } from '@/lib/api';
import { LANGUAGE_NAMES, MONTH_NAMES } from '@aim-archive/shared';
import type { MonthIndex, Language } from '@aim-archive/shared';
import { formatFileSize } from '@/lib/utils';
import { useBookmarks } from '@/lib/bookmarks-store';
import { EMBARGO_TIME_ZONE, EMBARGO_TIME_ZONE_LABEL } from '@/lib/embargo';

interface IssueDetailClientProps {
  initialIssue: ApiIssue;
}

const MAX_UNLOCK_TIMER_DELAY_MS = 2_147_000_000;

export function IssueDetailClient({ initialIssue }: IssueDetailClientProps) {
  const { toggle, isBookmarked } = useBookmarks();
  const [apiIssue, setApiIssue] = useState(initialIssue);
  const [unlockRefreshing, setUnlockRefreshing] = useState(false);
  const issue = normalizeIssue(apiIssue);
  const [derivedPageCount, setDerivedPageCount] = useState<number | null>(issue.pageCount ?? null);
  const [pageCountLookupFailed, setPageCountLookupFailed] = useState(false);

  useEffect(() => {
    setApiIssue(initialIssue);
  }, [initialIssue]);

  // This refresh corrects stale ISR HTML and also bumps read_count for issues
  // that are already public. The API itself refuses to count embargoed reads.
  useEffect(() => {
    let cancelled = false;
    fetchIssue(issue.id, { cache: 'no-store' })
      .then((data) => {
        if (!cancelled && data) setApiIssue(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [issue.id]);

  useEffect(() => {
    if (!issue.isEmbargoed || !issue.embargoLiftAt) return;

    const liftAtMs = Date.parse(issue.embargoLiftAt);
    const serverNowMs = Date.parse(issue.serverNow);
    if (!Number.isFinite(liftAtMs) || !Number.isFinite(serverNowMs)) return;

    let cancelled = false;
    let timeout: number | null = null;
    const receivedAt = performance.now();

    async function refreshUnlockedIssue() {
      setUnlockRefreshing(true);
      try {
        const data = await fetchIssue(issue.id, { cache: 'no-store' });
        if (!cancelled && data) setApiIssue(data);
      } finally {
        if (!cancelled) setUnlockRefreshing(false);
      }
    }

    function schedule() {
      const elapsedSinceServerResponse = performance.now() - receivedAt;
      const remaining = liftAtMs - serverNowMs - elapsedSinceServerResponse;
      const delay = Math.min(Math.max(remaining, 0), MAX_UNLOCK_TIMER_DELAY_MS);

      timeout = window.setTimeout(() => {
        if (cancelled) return;
        if (remaining > MAX_UNLOCK_TIMER_DELAY_MS) {
          schedule();
          return;
        }
        void refreshUnlockedIssue();
      }, delay);
    }

    schedule();
    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [issue.embargoLiftAt, issue.id, issue.isEmbargoed, issue.serverNow]);

  useEffect(() => {
    if (issue.pageCount) {
      setDerivedPageCount(issue.pageCount);
      setPageCountLookupFailed(false);
      return;
    }
    if (!issue.pdfUrl || issue.isEmbargoed) {
      setDerivedPageCount(null);
      return;
    }

    const pdfUrl = issue.pdfUrl;
    let cancelled = false;
    setDerivedPageCount(null);
    setPageCountLookupFailed(false);

    async function countPages() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
        const doc = await pdfjsLib.getDocument(pdfUrl).promise;
        try {
          if (!cancelled) setDerivedPageCount(doc.numPages);
        } finally {
          doc.destroy();
        }
      } catch {
        if (!cancelled) setPageCountLookupFailed(true);
      }
    }

    countPages();
    return () => {
      cancelled = true;
    };
  }, [issue.isEmbargoed, issue.pageCount, issue.pdfUrl]);

  const bookmarked = isBookmarked(issue.id);
  const monthName = MONTH_NAMES[issue.month as MonthIndex];
  const pageCountValue = derivedPageCount
    ? String(derivedPageCount)
    : issue.pdfUrl && !issue.isEmbargoed && !pageCountLookupFailed
      ? 'Loading'
      : '—';

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="border-b border-gray-100 px-6 py-3 lg:px-8">
          <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm text-gray-500">
            <Link href="/browse" className="flex items-center gap-1 hover:text-flame-600">
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
              <div className="sticky top-24 overflow-hidden rounded-2xl border border-flame-100 bg-gradient-to-br from-gold-50 to-flame-50 shadow-sm">
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
                    <span className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-xs font-medium tracking-widest text-transparent uppercase">
                      {issue.magazine.name}
                    </span>
                    <span className="font-heading mt-2 text-4xl font-bold text-gray-900">
                      {monthName}
                    </span>
                    <span className="font-heading bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-5xl font-bold text-transparent">
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

              {issue.theme && (
                <div className="mt-3 flex items-start gap-2.5">
                  <span aria-hidden className="mt-1.5 h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-gold-500 to-flame-500" />
                  <p className="font-heading bg-gradient-to-r from-gold-600 to-flame-600 bg-clip-text pr-1 text-xl font-semibold leading-tight text-transparent sm:text-2xl">
                    {issue.theme}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {[...issue.topics]
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                  .map((topic) => (
                    <Link
                      key={topic}
                      href={`/browse?subject=${encodeURIComponent(topic)}`}
                      className="rounded-full bg-gradient-to-r from-gold-50 to-flame-50 px-3 py-1 text-sm font-medium text-flame-700 transition-colors hover:from-gold-100 hover:to-flame-100"
                    >
                      {topic}
                    </Link>
                  ))}
              </div>

              {issue.description && (
                <p className="mt-6 whitespace-pre-wrap text-justify leading-relaxed text-gray-600">
                  {issue.description}
                </p>
              )}

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetaItem icon={Calendar} label="Published" value={`${monthName} ${issue.year}`} />
                <MetaItem icon={FileText} label="Pages" value={pageCountValue} />
                <MetaItem icon={HardDrive} label="Size" value={formatFileSize(issue.fileSizeBytes)} />
                <MetaItem icon={Eye} label="Reads" value={issue.readCount.toLocaleString()} />
              </div>

              {issue.isEmbargoed ? (
                <EmbargoNotice
                  liftLabel={issue.embargoLiftLabel}
                  liftAt={issue.embargoLiftAt}
                  refreshing={unlockRefreshing}
                />
              ) : (
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/read/${issue.id}`}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-8 py-3 text-base font-semibold text-white shadow-[0_12px_30px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 hover:shadow-[0_16px_36px_rgba(229,86,31,0.24)]"
                  >
                    <BookOpen className="h-5 w-5" />
                    Read Online
                  </Link>

                  <a
                    href={`/api/issues/${issue.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:border-flame-300 hover:bg-flame-50"
                  >
                    <Download className="h-5 w-5" />
                    PDF
                  </a>

                  <button
                    onClick={() => toggle(issue.id)}
                    className={`flex items-center gap-2 rounded-xl border px-6 py-3 text-base font-semibold transition-colors ${
                      bookmarked
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-gray-200 text-gray-700 hover:border-flame-300 hover:bg-flame-50'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${bookmarked ? 'fill-red-500' : ''}`} />
                    {bookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                </div>
              )}

              {issue.isEmbargoed && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => toggle(issue.id)}
                    className={`flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition-colors ${
                      bookmarked
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-gray-200 text-gray-700 hover:border-flame-300 hover:bg-flame-50'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${bookmarked ? 'fill-red-500' : ''}`} />
                    {bookmarked ? 'Bookmarked' : 'Bookmark for later'}
                  </button>
                </div>
              )}

              {!issue.isEmbargoed && (
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
              )}
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
      <Icon className="h-4 w-4 text-flame-500" />
      <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function EmbargoNotice({
  liftLabel,
  liftAt,
  refreshing,
}: {
  liftLabel: string | null;
  liftAt: string | null;
  refreshing: boolean;
}) {
  const indiaUnlockLabel = useMemo(() => formatUnlockInstant(liftAt, EMBARGO_TIME_ZONE, 'en-IN'), [liftAt]);
  const localUnlockLabel = useMemo(() => formatUnlockInstant(liftAt), [liftAt]);

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-flame-200 bg-gradient-to-br from-gold-50/80 to-flame-50/80 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-flame-600 shadow-sm ring-1 ring-flame-200">
          <Lock className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-semibold text-gray-900">
            {liftLabel ? `Available ${liftLabel}` : 'Available to subscribers'}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
            This edition is reserved for our print subscribers while it&apos;s still in active
            circulation. The archive opens it to everyone on a rolling 5-year window — the cover,
            theme, and topics stay visible here so you can find it again when it goes public.
          </p>

          {liftAt && (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <UnlockMeta
                  icon={CalendarClock}
                  label="Archive unlock"
                  value={indiaUnlockLabel ?? `${liftLabel} at 12:00 AM ${EMBARGO_TIME_ZONE_LABEL}`}
                />
                <UnlockMeta
                  icon={Globe2}
                  label="Your local time"
                  value={localUnlockLabel ?? 'At the same global moment'}
                />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-flame-100 bg-white/75 px-3 py-2 text-xs font-semibold text-flame-700 shadow-sm">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>
                  {refreshing
                    ? 'Unlocking reading access...'
                    : 'This page will switch to reading access when the release time arrives.'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UnlockMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-flame-100 bg-white/70 p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-normal text-flame-700">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold leading-snug text-gray-900">{value}</p>
    </div>
  );
}

function formatUnlockInstant(value: string | null, timeZone?: string, locale?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function FormatBadge({ format, available }: { format: string; available: boolean }) {
  return (
    <span
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        available ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700' : 'bg-gray-100 text-gray-400'
      }`}
    >
      {format}
    </span>
  );
}
