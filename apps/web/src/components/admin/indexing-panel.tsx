'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export function IndexingPanel() {
  const [summary, setSummary] = useState('View coverage, missing editions, and indexing activity.');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/indexing/catalogue?status=attention', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        if (!controller.signal.aborted)
          setSummary(
            (d.counts.missing || 0) +
              ' need indexing · ' +
              (d.counts.failed || 0) +
              ' failed · ' +
              (d.counts.review || 0) +
              ' need page review',
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <section
      aria-label="Search indexing"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <div>
        <h2 className="font-semibold text-gray-900">Search indexing</h2>
        <p className="mt-1 text-sm text-gray-600">{summary}</p>
      </div>
      <Link
        href="/admin/indexing"
        className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-flame-50 focus-visible:outline-2 focus-visible:outline-flame-600"
      >
        Open Search Indexing
      </Link>
    </section>
  );
}
