import { Header } from '@/components/layout/header';
import type { PublicNavigation } from '@/lib/navigation';
import { BookOpen, Calendar, CheckSquare, ChevronDown, Filter, Layers3, LayoutGrid, List, LockKeyhole } from 'lucide-react';

const loadingAvailability = [
  { label: 'Read now', helper: 'Public PDFs', Icon: BookOpen },
  { label: 'Awaiting public release', helper: 'Print circulation', Icon: LockKeyhole },
  { label: 'All editions', helper: 'Mixed view', Icon: Layers3 },
];

export function BrowseLoading({ navigation }: { navigation?: PublicNavigation }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header navigation={navigation} />

      <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-6 py-8 lg:px-8 lg:py-9">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">Browse Archive</h1>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-600 sm:text-lg">Explore public archive editions available to read online.</p>
          </div>
          <div className="hidden w-full max-w-xl rounded-2xl border border-flame-100 bg-white/90 p-1.5 shadow-[0_12px_34px_rgba(120,84,28,0.10)] md:block md:w-[492px] md:shrink-0" aria-hidden="true">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
              {loadingAvailability.map(({ label, helper, Icon }, index) => (
                <div key={label} className={`relative isolate flex h-[52px] min-w-0 items-center justify-start gap-2 overflow-hidden rounded-xl px-3 text-left sm:h-[58px] sm:flex-col sm:justify-center sm:gap-0.5 sm:px-2 sm:text-center ${index === 0 ? 'text-white' : 'text-gray-600'}`}>
                  {index === 0 && <span className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 shadow-[0_10px_24px_rgba(190,140,46,0.24)]" />}
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-auto sm:w-auto sm:rounded-none ${index === 0 ? 'bg-white/15 text-white sm:bg-transparent' : 'bg-flame-50 text-flame-700/75 sm:bg-transparent'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 sm:flex-none">
                    <span className="block truncate text-sm font-semibold leading-snug sm:inline sm:whitespace-nowrap sm:text-[13px]">{label}</span>
                    <span className="block text-[11px] font-medium sm:hidden">{helper}</span>
                  </span>
                  <span className="hidden whitespace-nowrap text-[11px] font-medium leading-none sm:block">{helper}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 pt-4 md:hidden" aria-hidden="true">
        <div className="flex min-h-12 items-center gap-3 rounded-xl border border-flame-200 bg-white px-3 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-flame-50 text-flame-700"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-800">Read now</span><span className="block text-xs text-gray-600">Public PDFs</span></span><ChevronDown className="h-4 w-4 text-flame-700" /></div>
      </div>

      <main role="status" aria-live="polite" aria-label="Loading archive editions" aria-busy="true" className="w-full flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" aria-hidden="true">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-flame-200 bg-white px-3.5 text-sm font-medium text-flame-700 shadow-sm"><Filter className="h-4 w-4" />Filters</span>
            <span className="text-sm font-medium text-gray-600">Loading editions…</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-flame-200 bg-white px-3 text-sm font-medium text-flame-700 shadow-sm sm:px-3.5"><Calendar className="h-4 w-4" /><span>Sort</span><span className="hidden max-w-28 truncate text-gray-500 sm:inline">Newest first</span><ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /></span>
            <span className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600"><CheckSquare className="h-4 w-4" /><span className="hidden sm:inline">Select</span></span>
            <span className="inline-flex shrink-0 items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
              <span className="flex h-11 w-11 items-center justify-center text-gray-500"><List className="h-4 w-4" /></span>
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700"><LayoutGrid className="h-4 w-4" /></span>
            </span>
          </div>
        </div>
        <div className="mb-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-gold-200" />
          <span className="rounded-full border border-flame-100 px-4 py-1 text-xs font-semibold text-flame-700">Archive editions</span>
          <span className="h-px flex-1 bg-gold-200" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="archive-skeleton-wave relative aspect-[3/4] bg-flame-50" />
              <div className="space-y-2 p-3.5">
                <div className="archive-skeleton-wave relative h-3.5 w-3/4 rounded bg-flame-50" />
                <div className="archive-skeleton-wave relative h-3 w-full rounded bg-flame-50" />
                <div className="archive-skeleton-wave relative h-3 w-1/2 rounded bg-flame-50" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function Loading() {
  return <BrowseLoading />;
}
