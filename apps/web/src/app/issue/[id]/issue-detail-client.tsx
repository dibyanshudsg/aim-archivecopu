'use client';

import { useEffect, useState } from 'react';
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
  HardDrive,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { fetchIssue, normalizeIssue, type ApiIssue } from '@/lib/api';
import { LANGUAGE_NAMES, MONTH_NAMES } from '@aim-archive/shared';
import type { MonthIndex, Language } from '@aim-archive/shared';
import { formatFileSize } from '@/lib/utils';
import { useBookmarks } from '@/lib/bookmarks-store';
import { AccessNotice } from '@/components/magazine/access-notice';
import { ReportProblem } from '@/components/magazine/report-problem';
import { IssueCard } from '@/components/magazine/issue-card';
import type { PublicNavigation } from '@/lib/navigation';
import { configurePdfWorker } from '@/lib/pdf-worker-client';

interface IssueDetailClientProps {
  initialIssue: ApiIssue;
  navigation: PublicNavigation;
  relatedIssues: ApiIssue[];
}

const MAX_UNLOCK_TIMER_DELAY_MS = 2_147_000_000;

function scheduleIdleWork(callback: () => void, timeout = 1_500): () => void {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 500);
  return () => clearTimeout(id);
}

export function IssueDetailClient({ initialIssue, navigation, relatedIssues }: IssueDetailClientProps) {
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
    const cancelScheduledRefresh = scheduleIdleWork(() => {
      fetchIssue(issue.id, { cache: 'no-store' })
        .then((data) => {
          if (!cancelled && data) setApiIssue(data);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      cancelScheduledRefresh();
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
        configurePdfWorker(pdfjsLib);
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

    const cancelScheduledLookup = scheduleIdleWork(() => {
      void countPages();
    }, 2_000);
    return () => {
      cancelled = true;
      cancelScheduledLookup();
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
      <Header navigation={navigation} />
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

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <MetaItem icon={Calendar} label="Published" value={`${monthName} ${issue.year}`} />
                <MetaItem icon={FileText} label="Pages" value={pageCountValue} />
                <MetaItem icon={HardDrive} label="Size" value={formatFileSize(issue.fileSizeBytes)} />
              </div>

              {issue.isEmbargoed ? (
                <AccessNotice
                  liftLabel={issue.embargoLiftLabel}
                  magazineId={issue.magazine.id}
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

              {!issue.isEmbargoed && (issue.epubUrl || issue.mobiUrl) && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {[{ label: 'EPUB', url: issue.epubUrl }, { label: 'MOBI', url: issue.mobiUrl }].filter((format) => format.url).map((format) => (
                    <a key={format.label} href={format.url!} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-flame-700 hover:bg-flame-50">Download {format.label}</a>
                  ))}
                </div>
              )}
              <ReportProblem issueId={issue.id} title={issue.title} />
            </motion.div>
          </div>
          {relatedIssues.length > 0 && <section className="mt-12" aria-labelledby="related-heading">
            <h2 id="related-heading" className="font-heading mb-5 text-2xl font-semibold text-gray-900">Readable editions to explore</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">{relatedIssues.map((related, index) => <IssueCard key={related.id} issue={normalizeIssue(related)} index={index} />)}</div>
          </section>}
        </div>
      </main>
      <Footer navigation={navigation} />
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
