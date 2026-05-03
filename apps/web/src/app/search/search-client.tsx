'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X, SlidersHorizontal } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { IssueCard } from '@/components/magazine/issue-card';
import { SearchResultItem } from '@/components/search/search-result-item';
import { searchIssues, normalizeIssue } from '@/lib/api';
import type { ApiMagazine, SearchResponse, FullTextSearchResult, ApiIssue } from '@/lib/api';

const POPULAR_TOPICS = [
  'Surrender', 'Karma Yoga', 'The Psychic Being', 'Education',
  'Divine Grace', 'Aspiration', 'Transformation', 'Consciousness',
  'Meditation', 'Faith',
];

interface SearchClientProps {
  initialMagazines: ApiMagazine[];
}

export function SearchClient({ initialMagazines }: SearchClientProps) {
  const [query, setQuery] = useState('');
  const [magazines] = useState<ApiMagazine[]>(initialMagazines);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [magazineFilter, setMagazineFilter] = useState('all');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResponse(null);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      searchIssues({
        query,
        magazineId: magazineFilter !== 'all' ? magazineFilter : undefined,
        yearFrom: yearFrom || undefined,
        yearTo: yearTo || undefined,
      })
        .then(setResponse)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, magazineFilter, yearFrom, yearTo]);

  const hasSearched = query.trim().length > 0;
  const isFullText = response?.type === 'fulltext';
  const total = response?.total ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-6 py-12 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-heading text-center text-3xl font-bold text-gray-900 sm:text-4xl">
              Search the Archive
            </h1>
            <p className="mt-2 text-center text-gray-600">
              Full-text search across every page of every issue
            </p>

            <div className="relative mt-8">
              <SearchIcon className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, topic, or any word in any issue..."
                className="w-full rounded-2xl border border-gray-200 bg-white py-4 pr-12 pl-12 text-base text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {showAdvanced ? 'Hide filters' : 'Show filters'}
              </button>

              {hasSearched && (
                <span className="text-sm text-gray-400">
                  {loading ? 'Searching...' : `${total} result${total !== 1 ? 's' : ''}`}
                  {isFullText && !loading && (
                    <span className="ml-1 bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-transparent">(full-text)</span>
                  )}
                </span>
              )}
            </div>

            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-gray-100 bg-white p-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Magazine</label>
                  <select
                    value={magazineFilter}
                    onChange={(e) => setMagazineFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
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
                    onChange={(e) => setYearFrom(e.target.value)}
                    placeholder="1990"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Year To</label>
                  <input
                    type="number"
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                    placeholder="2026"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </motion.div>
            )}

            {!hasSearched && (
              <div className="mt-8">
                <p className="text-sm font-medium text-gray-500">Popular topics</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {POPULAR_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setQuery(topic)}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700"
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
          ) : hasSearched && total === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-gray-400">No results for &ldquo;{query}&rdquo;</p>
              <p className="mt-2 text-sm text-gray-400">Try a different keyword or browse by topic</p>
            </div>
          ) : isFullText ? (
            /* Full-text search results — page-level with snippets */
            <div className="space-y-3">
              {(response.data as FullTextSearchResult[]).map((result, i) => (
                <SearchResultItem key={`${result.issue_id}-${result.page_number}`} result={result} index={i} />
              ))}
            </div>
          ) : response?.type === 'fallback' ? (
            /* Fallback: issue-level results as cards */
            <div>
              <p className="mb-4 text-sm text-gray-400">
                Showing title/topic matches. Full-text results will appear once issues are indexed.
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(response.data as ApiIssue[]).map((issue, i) => (
                  <IssueCard key={issue.id} issue={normalizeIssue(issue)} index={i} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
