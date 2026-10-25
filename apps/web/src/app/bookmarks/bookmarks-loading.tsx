import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { IssueCardSkeleton } from '@/components/magazine/issue-card-skeleton';
import type { PublicNavigation } from '@/lib/navigation';

export function BookmarksLoading({ navigation }: { navigation?: PublicNavigation }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header navigation={navigation} />
      <main className="flex-1">
        <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">My Bookmarks</h1>
              <p className="mt-2 text-lg text-gray-600">Loading saved issues…</p>
              <p className="mt-2 text-sm text-gray-600">Saved in this browser; not synced across devices.</p>
            </div>
          </div>
        </section>
        <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading saved issues" className="mx-auto w-full max-w-[1504px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => <IssueCardSkeleton key={index} />)}
          </div>
        </div>
      </main>
      <Footer navigation={navigation} />
    </div>
  );
}
