'use client';

import { useMemo } from 'react';
import { BookMarked } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { IssueCard } from '@/components/magazine/issue-card';
import { useBookmarks } from '@/lib/bookmarks-store';
import { getIssueById } from '@/lib/mock-data';

export default function BookmarksPage() {
  const { bookmarkedIds, clear } = useBookmarks();

  const bookmarkedIssues = useMemo(() => {
    return bookmarkedIds
      .map(getIssueById)
      .filter(Boolean) as NonNullable<ReturnType<typeof getIssueById>>[];
  }, [bookmarkedIds]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b border-gold-100 bg-gradient-to-b from-gold-50 to-white px-6 py-12 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
                My Bookmarks
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                {bookmarkedIssues.length} saved issue{bookmarkedIssues.length !== 1 ? 's' : ''}
              </p>
            </div>
            {bookmarkedIssues.length > 0 && (
              <button
                onClick={clear}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                Clear all
              </button>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          {bookmarkedIssues.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {bookmarkedIssues.map((issue, i) => (
                <IssueCard key={issue.id} issue={issue} index={i} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <BookMarked className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-lg font-medium text-gray-400">No bookmarks yet</p>
              <p className="mt-2 text-sm text-gray-400">
                Tap the heart icon on any issue to save it here
              </p>
              <Link
                href="/browse"
                className="mt-6 inline-block rounded-xl bg-gold-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gold-600"
              >
                Browse Archive
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
