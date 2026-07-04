'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookMarked, CheckSquare, Download } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { IssueCard } from '@/components/magazine/issue-card';
import { ActiveFilterChips } from '@/components/browse/active-filter-chips';
import { BulkActionBar } from '@/components/browse/bulk-action-bar';
import { BulkDownloadModal } from '@/components/browse/bulk-download-modal';
import { HeaderSearchDropdown } from '@/components/browse/header-search-dropdown';
import { useBookmarks } from '@/lib/bookmarks-store';
import { normalizeIssue, type ApiIssue, type ApiMagazine } from '@/lib/api';
import { applyFilters, sortIssues, useBrowseFilters } from '@/lib/use-browse-filters';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { downloadAsZip, type ZipDownloadProgress } from '@/lib/download-zip';

interface BookmarksClientProps {
  allIssues: ApiIssue[];
  allMagazines: ApiMagazine[];
}

export function BookmarksClient({ allIssues, allMagazines }: BookmarksClientProps) {
  const { bookmarkedIds, clear } = useBookmarks();
  const { filters, toggleArray, setQuery, clearAll, hasActiveFilters } = useBrowseFilters();

  // Index for O(1) lookup. Issue order in `bookmarkedIds` reflects when each
  // was saved, so we preserve that order in the rendered list (most recent
  // first if the store inserts at the head).
  const byId = useMemo(() => {
    const map = new Map<string, ApiIssue>();
    for (const i of allIssues) map.set(i.id, i);
    return map;
  }, [allIssues]);

  const bookmarkedIssues = useMemo(() => {
    const out: ApiIssue[] = [];
    for (const id of bookmarkedIds) {
      const issue = byId.get(id);
      if (issue) out.push(issue);
    }
    return out;
  }, [bookmarkedIds, byId]);

  const filtered = useMemo(
    () => applyFilters(bookmarkedIssues, filters),
    [bookmarkedIssues, filters],
  );
  const sorted = useMemo(
    () => sortIssues(filtered, filters.sort, filters.dir),
    [filtered, filters.sort, filters.dir],
  );
  const normalized = useMemo(() => sorted.map(normalizeIssue), [sorted]);

  const totalBookmarks = bookmarkedIssues.length;
  const isFiltered = totalBookmarks > 0 && totalBookmarks !== sorted.length;

  // Bulk selection / download state. Identical pattern to Browse — different
  // dataset (bookmarked subset) and a "Download all" shortcut on this page.
  const selectionEnabled = useBulkSelection((s) => s.enabled);
  const selectedIds = useBulkSelection((s) => s.selectedIds);
  const enableSelection = useBulkSelection((s) => s.enable);
  const disableSelection = useBulkSelection((s) => s.disable);
  const selectAll = useBulkSelection((s) => s.selectAll);
  useEffect(() => disableSelection, [disableSelection]);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [progress, setProgress] = useState<ZipDownloadProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSelectAllVisible = () => {
    const visibleIds = sorted.map((i) => i.id);
    const everySelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    if (everySelected) selectAll([]);
    else selectAll(visibleIds);
  };

  /** Run a ZIP build for an arbitrary subset of issues — shared between the
   *  bulk-bar Download button and the page-level "Download all" shortcut.
   *  Embargoed issues are skipped silently (they have no `pdf_url`); the
   *  modal lists them as skipped so the user knows what didn't make it in. */
  const runDownload = async (picked: ApiIssue[]) => {
    if (picked.length === 0) return;
    const downloadable = picked.filter((i): i is ApiIssue & { pdf_url: string } => !!i.pdf_url);
    const preSkipped = picked.filter((i) => !i.pdf_url).map((i) => i.title);

    if (downloadable.length === 0) {
      setProgress({
        phase: 'error',
        fetched: 0,
        total: picked.length,
        zipPercent: 0,
        skipped: preSkipped,
        errorMessage:
          preSkipped.length > 0
            ? 'All selected bookmarks are subscriber-only until their embargo lifts.'
            : 'No files could be downloaded.',
      });
      setDownloadOpen(true);
      return;
    }

    abortRef.current = new AbortController();
    setProgress({
      phase: 'fetching',
      fetched: 0,
      total: downloadable.length,
      zipPercent: 0,
      skipped: preSkipped,
    });
    setDownloadOpen(true);
    try {
      await downloadAsZip({
        files: downloadable.map((i) => ({ name: i.title, url: i.pdf_url })),
        zipName: `AIM Archive — ${downloadable.length} bookmark${downloadable.length === 1 ? '' : 's'}`,
        onProgress: (p) => setProgress({ ...p, skipped: [...preSkipped, ...p.skipped] }),
        signal: abortRef.current.signal,
      });
    } catch (err) {
      setProgress({
        phase: 'error',
        fetched: 0,
        total: downloadable.length,
        zipPercent: 0,
        skipped: preSkipped,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleDownloadSelected = () =>
    runDownload(sorted.filter((i) => selectedIds.has(i.id)));
  const handleDownloadAll = () => runDownload(bookmarkedIssues);

  const closeDownloadModal = () => {
    setDownloadOpen(false);
    setProgress(null);
    disableSelection();
  };
  const cancelDownload = () => abortRef.current?.abort();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <HeaderSearchDropdown />
      <main className="flex-1">
        <section className="border-b border-flame-100 bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-6 py-12 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
                My Bookmarks
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                {isFiltered
                  ? `${sorted.length} of ${totalBookmarks} saved issue${totalBookmarks !== 1 ? 's' : ''}`
                  : `${totalBookmarks} saved issue${totalBookmarks !== 1 ? 's' : ''}`}
              </p>
            </div>
            {totalBookmarks > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAll}
                  className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] sm:inline-flex"
                  title={`Download all ${totalBookmarks} bookmarks as a ZIP`}
                >
                  <Download className="h-4 w-4" />
                  Download all
                </button>
                <button
                  onClick={() => (selectionEnabled ? disableSelection() : enableSelection())}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    selectionEnabled
                      ? 'border-flame-300 bg-flame-50 text-flame-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-flame-200 hover:bg-flame-50/50 hover:text-flame-700'
                  }`}
                  aria-pressed={selectionEnabled}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">{selectionEnabled ? 'Done' : 'Select'}</span>
                </button>
                <button
                  onClick={clear}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:px-4"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          {totalBookmarks === 0 ? (
            <div className="py-20 text-center">
              <BookMarked className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-lg font-medium text-gray-400">No bookmarks yet</p>
              <p className="mt-2 text-sm text-gray-400">
                Tap the heart icon on any issue to save it here
              </p>
              <Link
                href="/browse"
                className="mt-6 inline-block rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
              >
                Browse Archive
              </Link>
            </div>
          ) : (
            <>
              <ActiveFilterChips
                filters={filters}
                magazines={allMagazines}
                onRemove={toggleArray}
                onRemoveQuery={() => setQuery('')}
                onClearAll={clearAll}
              />

              {sorted.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-lg text-gray-400">
                    No bookmarks match your filters
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="mt-4 bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-sm font-medium text-transparent"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                  {normalized.map((issue, i) => (
                    <IssueCard key={issue.id} issue={issue} index={i} source="bookmarks" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

      <BulkActionBar
        issues={sorted}
        onDownload={handleDownloadSelected}
        onSelectAll={handleSelectAllVisible}
      />
      <BulkDownloadModal
        open={downloadOpen}
        progress={progress}
        onCancel={cancelDownload}
        onClose={closeDownloadModal}
      />
    </div>
  );
}
