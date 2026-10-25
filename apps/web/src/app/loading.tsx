import { Header } from '@/components/layout/header';

export function HomeLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main role="status" aria-live="polite" aria-busy="true" aria-label="Loading home page" className="flex-1 bg-gradient-to-b from-[#fffaf1] via-[#fffdf8] to-white px-4 pb-12 pt-5 sm:px-6 sm:pt-9 lg:px-8">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-2xl bg-[#fffdf9] shadow-[0_18px_48px_rgba(83,58,22,0.13)]">
          <div className="grid md:grid-cols-[minmax(280px,0.76fr)_minmax(0,1fr)]">
            <div className="flex min-h-[278px] items-center justify-center px-7 py-8 sm:min-h-[400px] md:min-h-[485px]">
              <div className="archive-skeleton-wave relative aspect-[2/3] w-[150px] bg-flame-50 shadow-[18px_23px_32px_rgba(44,32,18,0.13)] sm:w-[235px] md:w-[250px]" />
            </div>
            <div className="flex min-w-0 flex-col justify-between px-6 pb-7 pt-8 sm:px-10 sm:pb-10 sm:pt-10 lg:px-14 lg:pt-12" aria-hidden="true">
              <div className="space-y-4">
                <div className="archive-skeleton-wave relative h-9 w-4/5 rounded bg-flame-50" />
                <div className="archive-skeleton-wave relative h-4 w-1/2 rounded bg-flame-50" />
                <div className="mt-7 space-y-2">
                  <div className="archive-skeleton-wave relative h-3.5 w-full rounded bg-flame-50" />
                  <div className="archive-skeleton-wave relative h-3.5 w-11/12 rounded bg-flame-50" />
                  <div className="archive-skeleton-wave relative h-3.5 w-2/3 rounded bg-flame-50" />
                </div>
              </div>
              <div className="mt-7">
                <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_3rem] gap-2 sm:flex" aria-hidden="true">
                  <div className="archive-skeleton-wave relative h-12 rounded-lg bg-flame-100 sm:w-40" />
                  <div className="archive-skeleton-wave relative h-12 rounded-lg bg-flame-50 sm:w-36" />
                  <div className="archive-skeleton-wave relative h-12 rounded-lg bg-flame-50 sm:w-12" />
                </div>
                <div className="mt-6 flex gap-3 border-t border-[#eadfce] pt-4" aria-hidden="true">
                  <div className="archive-skeleton-wave relative h-3 w-14 rounded bg-flame-50" />
                  <div className="archive-skeleton-wave relative h-3 w-12 rounded bg-flame-50" />
                  <div className="archive-skeleton-wave relative h-3 w-20 rounded bg-flame-50" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <span className="sr-only">Loading home page…</span>
      </main>
    </div>
  );
}

export default HomeLoading;
