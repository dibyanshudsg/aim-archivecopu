'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Search as SearchIcon, X, SlidersHorizontal } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SearchResultItem } from '@/components/search/search-result-item';
import { fetchMagazines, searchIssues } from '@/lib/api';
import type { ApiMagazine, SearchResponse } from '@/lib/api';
import type { PublicNavigation } from '@/lib/navigation';

interface SearchClientProps {
  navigation: PublicNavigation;
}

export function SearchClient({ navigation }: SearchClientProps) {
  const reduceMotion = useReducedMotion();
  const url = useSearchParams();
  const query = url.get('q') ?? '';
  const magazineFilter = url.get('magazine_id') ?? 'all';
  const yearFrom = url.get('year_from') ?? '';
  const yearTo = url.get('year_to') ?? '';
  const availability = url.get('availability') === 'all' ? 'all' : url.get('availability') === 'subscriber' ? 'subscriber' : 'read';
  const update = (key: string, value: string, push = false) => {
    const params = new URLSearchParams(window.location.search);
    if (value && !(key === 'magazine_id' && value === 'all')) params.set(key, value);
    else params.delete(key);
    window.history[push ? 'pushState' : 'replaceState'](null, '', `/search${params.size ? `?${params}` : ''}`);
  };
  const setQuery = (value: string) => update('q', value);
  const [magazines, setMagazines] = useState<ApiMagazine[]>([]);
  const [magazinesLoading, setMagazinesLoading] = useState(true);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [topics, setTopics] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(yearFrom || yearTo || magazineFilter !== 'all'));

  useEffect(() => {
    const controller = new AbortController();
    fetchMagazines(controller.signal)
      .then(setMagazines)
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.error(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMagazinesLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setResponse(null);
    setError(null);
    if (!query.trim()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      searchIssues({
        query,
        magazineId: magazineFilter !== 'all' ? magazineFilter : undefined,
        yearFrom: yearFrom || undefined,
        yearTo: yearTo || undefined,
        availability,
      }, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setResponse(data); })
        .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Search could not load. Please try again.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, magazineFilter, yearFrom, yearTo, availability, retry]);

  useEffect(() => {
    const controller = new AbortController();
    setTopics([]);
    const params = new URLSearchParams({ suggestions: '1', availability });
    if (magazineFilter !== 'all') params.set('magazine_id', magazineFilter);
    if (yearFrom) params.set('year_from', yearFrom);
    if (yearTo) params.set('year_to', yearTo);
    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then((res) => res.ok ? res.json() : { topics: [] })
      .then((data) => { if (!controller.signal.aborted) setTopics(data.topics ?? []); })
      .catch(() => {});
    return () => controller.abort();
  }, [availability, magazineFilter, yearFrom, yearTo]);

  const hasSearched = query.trim().length > 0;
  const total = response?.total ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Header navigation={navigation} />
      <main className="flex-1">
        <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-6 py-12 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-heading text-center text-3xl font-bold text-gray-900 sm:text-4xl">
              Search the Archive
            </h1>
            <p className="mt-2 text-center text-gray-600">
              Search titles, themes, topics, and indexed page text. Page-text coverage is still growing.
            </p>

            <div className="relative mt-8">
              <SearchIcon className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Search the archive"
                maxLength={500}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a title, theme, topic, or phrase…"
                className="w-full rounded-2xl border border-gray-200 bg-white py-4 pr-14 pl-12 text-base text-gray-900 shadow-sm transition-colors placeholder:text-gray-500 focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 hover:bg-flame-50"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <fieldset className="mt-5 flex flex-wrap gap-2">
              <legend className="mb-2 text-sm font-semibold text-gray-700">Availability</legend>
              {[['read', 'Read now'], ['all', 'All editions'], ['subscriber', 'Awaiting public release']].map(([value, label]) => (
                <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${availability === value ? 'border-flame-400 bg-flame-50 text-flame-800' : 'border-gray-200 bg-white text-gray-700'}`}>
                  <input type="radio" name="availability" value={value} checked={availability === value} onChange={() => update('availability', value, true)} className="accent-orange-700" />
                  {label}
                </label>
              ))}
            </fieldset>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
                className="flex min-h-11 items-center gap-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {showAdvanced ? 'Hide filters' : 'Show filters'}
              </button>

              {hasSearched && (
                <span role="status" className="text-sm text-gray-600">
                  {loading ? 'Searching…' : error ? 'Search unavailable' : response ? `${total} match${total !== 1 ? 'es' : ''} shown` : ''}
                </span>
              )}
            </div>

            {showAdvanced && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                className="mt-4 grid gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:grid-cols-3"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Magazine</label>
                  <select
                    value={magazineFilter}
                    onChange={(e) => update('magazine_id', e.target.value, true)}
                    aria-label="Magazine"
                    disabled={magazinesLoading}
                    className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2 text-base"
                  >
                    <option value="all">{magazinesLoading ? 'Loading magazines…' : 'All'}</option>
                    {magazines.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Year From</label>
                  <input
                    type="number"
                    value={yearFrom}
                    onChange={(e) => update('year_from', e.target.value)}
                    aria-label="Year from"
                    min={1950}
                    max={2100}
                    placeholder="1990"
                    className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2 text-base"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Year To</label>
                  <input
                    type="number"
                    value={yearTo}
                    onChange={(e) => update('year_to', e.target.value)}
                    aria-label="Year to"
                    min={1950}
                    max={2100}
                    placeholder="2026"
                    className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2 text-base"
                  />
                </div>
              </motion.div>
            )}

            {!hasSearched && topics.length > 0 && (
              <div className="mt-8">
                <p className="text-sm font-medium text-gray-600">Topics in this collection</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => update('q', topic, true)}
                      className="min-h-11 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 rounded bg-gray-100" />
                      <div className="h-3 w-32 rounded bg-gray-100" />
                      <div className="h-3 w-full rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
              <p>{error}</p>
              <button onClick={() => setRetry((value) => value + 1)} className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold">Try again</button>
            </div>
          ) : hasSearched && response && total === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-gray-700">No matches for &ldquo;{query}&rdquo; in this selection.</p>
              <p className="mt-2 text-sm text-gray-600">Try another phrase or change the filters. Not all editions have searchable page text yet.</p>
              {availability === 'read' && <button onClick={() => update('availability', 'all', true)} className="mt-4 rounded-lg border border-flame-300 px-4 py-3 text-sm font-semibold text-flame-800">Include editions awaiting public release</button>}
              <Link href="/browse?availability=read" className="mt-4 block text-sm font-semibold text-flame-800 underline">Browse readable editions</Link>
            </div>
          ) : response ? (
            <div className="space-y-3">
              {response.limited && <p className="text-sm text-gray-600">More matches may be available. Narrow your query or filters to refine the results.</p>}
              {response.data.map((result, i) => (
                <SearchResultItem key={`${result.issue_id}-${result.page_number}`} result={result} index={i} query={query} />
              ))}
            </div>
          ) : null}
        </div>
      </main>
      <Footer navigation={navigation} />
    </div>
  );
}
