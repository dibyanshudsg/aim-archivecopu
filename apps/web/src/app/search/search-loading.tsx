import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SearchResultSkeleton } from '@/components/search/search-result-skeleton';
import type { PublicNavigation } from '@/lib/navigation';

export function SearchLoading({ navigation }: { navigation?: PublicNavigation }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header navigation={navigation} />
      <main className="flex-1">
        <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <h1 className="font-heading text-center text-3xl font-bold text-gray-900 sm:text-4xl">Search the Archive</h1>
            <p className="mt-2 text-center text-gray-600">Search titles, themes, topics, and indexed page text. Page-text coverage is still growing.</p>

            <div className="relative mt-8" aria-hidden="true">
              <SearchIcon className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <div className="w-full rounded-2xl border border-gray-200 bg-white py-4 pr-14 pl-12 text-base text-gray-500 shadow-sm">Search a title, theme, topic, or phrase…</div>
            </div>

            <div className="mt-5" aria-hidden="true">
              <p className="mb-2 text-sm font-semibold text-gray-700">Availability</p>
              <div className="flex flex-wrap gap-2">
                {['Read now', 'All editions', 'Awaiting public release'].map((label, index) => (
                  <span key={label} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm ${index === 0 ? 'border-flame-400 bg-flame-50 text-flame-800' : 'border-gray-200 bg-white text-gray-700'}`}>
                    <span className={`h-[13px] w-[13px] rounded-full border ${index === 0 ? 'border-flame-700 bg-flame-700 ring-[3px] ring-inset ring-white' : 'border-gray-400'}`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex min-h-11 items-center text-sm text-gray-600" aria-hidden="true">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />Show filters
            </div>
          </div>
        </section>

        <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading search results" className="mx-auto w-full max-w-[1504px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-3 xl:grid-cols-2" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => <SearchResultSkeleton key={index} />)}
          </div>
          <span className="sr-only">Loading search results…</span>
        </div>
      </main>
      <Footer navigation={navigation} />
    </div>
  );
}
