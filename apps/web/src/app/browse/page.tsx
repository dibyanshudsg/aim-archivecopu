'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { IssueCard } from '@/components/magazine/issue-card';
import { fetchIssues, fetchMagazines, normalizeIssue } from '@/lib/api';
import type { ApiMagazine, ApiIssue } from '@/lib/api';
import { LANGUAGE_NAMES } from '@aim-archive/shared';
import { cn } from '@/lib/utils';

export default function BrowsePage() {
  const [magazines, setMagazines] = useState<ApiMagazine[]>([]);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedMagazine, setSelectedMagazine] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch magazines once
  useEffect(() => {
    fetchMagazines().then(setMagazines).catch(console.error);
  }, []);

  // Fetch issues when filters change
  useEffect(() => {
    setLoading(true);
    fetchIssues({
      magazineId: selectedMagazine !== 'all' ? selectedMagazine : undefined,
      year: selectedYear !== 'all' ? selectedYear : undefined,
      language: selectedLanguage !== 'all' ? selectedLanguage : undefined,
      topic: selectedTopic !== 'all' ? selectedTopic : undefined,
      pageSize: 100,
    })
      .then((res) => {
        setIssues(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedMagazine, selectedYear, selectedLanguage, selectedTopic]);

  const normalizedIssues = useMemo(() => issues.map(normalizeIssue), [issues]);

  // Derive available years from data
  const years = useMemo(
    () => [...new Set(issues.map((i) => i.year))].sort((a, b) => b - a),
    [issues],
  );

  // Derive available topics from data
  const allTopics = useMemo(
    () => [...new Set(issues.flatMap((i) => i.topics))].sort(),
    [issues],
  );

  const hasActiveFilters =
    selectedMagazine !== 'all' ||
    selectedYear !== 'all' ||
    selectedLanguage !== 'all' ||
    selectedTopic !== 'all';

  function clearFilters() {
    setSelectedMagazine('all');
    setSelectedYear('all');
    setSelectedLanguage('all');
    setSelectedTopic('all');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b border-gold-100 bg-gradient-to-b from-gold-50 to-white px-6 py-12 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
              Browse Archive
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Explore {total} issues across {magazines.length} magazines
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <div className="hidden flex-wrap gap-3 md:flex">
              <SelectFilter
                value={selectedMagazine}
                onChange={setSelectedMagazine}
                options={[
                  { value: 'all', label: 'All Magazines' },
                  ...magazines.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
              <SelectFilter
                value={selectedYear}
                onChange={setSelectedYear}
                options={[
                  { value: 'all', label: 'All Years' },
                  ...years.map((y) => ({ value: String(y), label: String(y) })),
                ]}
              />
              <SelectFilter
                value={selectedLanguage}
                onChange={setSelectedLanguage}
                options={[
                  { value: 'all', label: 'All Languages' },
                  ...Object.entries(LANGUAGE_NAMES).map(([key, name]) => ({
                    value: key,
                    label: name,
                  })),
                ]}
              />
              {allTopics.length > 0 && (
                <SelectFilter
                  value={selectedTopic}
                  onChange={setSelectedTopic}
                  options={[
                    { value: 'all', label: 'All Topics' },
                    ...allTopics.map((t) => ({ value: t, label: t })),
                  ]}
                />
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 md:hidden"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}

            <span className="ml-auto text-sm text-gray-400">
              {total} issue{total !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Mobile filter panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 md:hidden"
            >
              <SelectFilter
                value={selectedMagazine}
                onChange={setSelectedMagazine}
                options={[
                  { value: 'all', label: 'All Magazines' },
                  ...magazines.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
              <SelectFilter
                value={selectedYear}
                onChange={setSelectedYear}
                options={[
                  { value: 'all', label: 'All Years' },
                  ...years.map((y) => ({ value: String(y), label: String(y) })),
                ]}
              />
            </motion.div>
          )}

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white">
                  <div className="h-40 rounded-t-2xl bg-gray-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-2/3 rounded bg-gray-100" />
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                    <div className="flex gap-2 pt-2">
                      <div className="h-10 flex-1 rounded-xl bg-gray-100" />
                      <div className="h-10 flex-1 rounded-xl bg-gray-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : normalizedIssues.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {normalizedIssues.map((issue, i) => (
                <IssueCard key={issue.id} issue={issue} index={i} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg text-gray-400">No issues match your filters</p>
              <button
                onClick={clearFilters}
                className="mt-4 text-sm font-medium text-gold-600 hover:text-gold-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none rounded-xl border py-2.5 pr-9 pl-4 text-sm font-medium transition-colors',
          value !== 'all'
            ? 'border-gold-300 bg-gold-50 text-gold-700'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
