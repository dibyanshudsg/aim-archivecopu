'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, X, Trash2 } from 'lucide-react';
import { formatMonthYear } from '@/lib/utils';
import { isEmbargoed } from '@/lib/embargo';
import {
  clearReadingHistoryEntry,
  formatRelativeTime,
  getRecentReads,
  type ReadingHistoryEntry,
} from '@/lib/reading-history';

const MAX_ENTRIES = 5;

export function ContinueReadingFab() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ReadingHistoryEntry[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  // Refresh the list whenever the panel opens (and once on mount, so the
  // badge counter is correct from the start). Drop locally-cached entries
  // for issues that have slid back into the 5-year embargo window — the
  // user wouldn't be able to resume them anyway.
  useEffect(() => {
    setEntries(
      getRecentReads(MAX_ENTRIES * 2).filter((e) => !isEmbargoed(e.year, e.month)).slice(0, MAX_ENTRIES),
    );
  }, [open]);

  // Listen for storage changes from other tabs as well as our own writes.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith('aim-reader-state-')) return;
      setEntries(
        getRecentReads(MAX_ENTRIES * 2).filter((x) => !isEmbargoed(x.year, x.month)).slice(0, MAX_ENTRIES),
      );
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Outside-click + Escape close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || fabRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Hide on the reader itself — would clash with the toolbar.
  if (pathname?.startsWith('/read/')) return null;
  // Also hide on admin (separate UI surface).
  if (pathname?.startsWith('/admin')) return null;

  const count = entries.length;

  function openIssue(entry: ReadingHistoryEntry) {
    setOpen(false);
    router.push(`/read/${entry.issueId}?page=${entry.page}&resume=1`);
  }

  function removeEntry(e: React.MouseEvent, issueId: string) {
    e.stopPropagation();
    clearReadingHistoryEntry(issueId);
    setEntries((prev) => prev.filter((x) => x.issueId !== issueId));
  }

  return (
    <>
      {/* FAB */}
      <motion.button
        ref={fabRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        aria-label="Continue reading"
        title="Continue reading"
        className="fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-flame-500 text-white shadow-[0_12px_30px_rgba(190,140,46,0.28)] ring-1 ring-flame-600/20 hover:from-gold-600 hover:to-flame-600"
      >
        <BookMarked className="h-6 w-6" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-flame-600 px-1 text-[11px] font-bold text-white shadow ring-2 ring-white">
            {count}
          </span>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed right-6 bottom-24 z-40 flex w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-gray-900">
                  Continue reading
                </h3>
                <p className="text-[11px] text-gray-400">
                  {count === 0
                    ? 'Nothing to resume yet'
                    : `${count} recent issue${count === 1 ? '' : 's'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {entries.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <BookMarked className="mx-auto h-8 w-8 text-gray-200" />
                <p className="mt-3 text-sm text-gray-500">
                  Open any issue and your reading position will show up here.
                </p>
              </div>
            ) : (
              <ul className="max-h-[60vh] divide-y divide-gray-50 overflow-x-hidden overflow-y-auto">
                {entries.map((entry) => (
                  <ContinueReadingCard
                    key={entry.issueId}
                    entry={entry}
                    onOpen={() => openIssue(entry)}
                    onRemove={(e) => removeEntry(e, entry.issueId)}
                  />
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ContinueReadingCard({
  entry,
  onOpen,
  onRemove,
}: {
  entry: ReadingHistoryEntry;
  onOpen: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const progressPct = entry.numPages
    ? Math.min(100, Math.max(2, (entry.page / entry.numPages) * 100))
    : 0;

  return (
    <li className="group relative">
      <motion.button
        type="button"
        onClick={onOpen}
        whileHover={{ x: 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="flex w-full items-stretch gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-flame-50"
      >
        {/* Cover */}
        <div className="relative h-20 w-[60px] shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-gold-100 to-flame-50 shadow-sm ring-1 ring-transparent transition-all duration-200 group-hover:shadow-md group-hover:ring-flame-300">
          {entry.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.coverImageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] font-medium tracking-wider text-flame-700">
              {entry.magazineName.slice(0, 4).toUpperCase()}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-flame-800">
            {entry.title}
          </p>
          <p className="truncate text-xs text-gray-500">
            {entry.magazineName} · {formatMonthYear(entry.month, entry.year)}
          </p>

          {/* Progress meter */}
          {entry.numPages && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-sky-500 transition-colors duration-200 group-hover:bg-sky-600"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          <p className="mt-1.5 text-[11px] text-gray-400 transition-colors group-hover:text-gray-600">
            Last read {formatRelativeTime(entry.updatedAt)}
            {entry.numPages
              ? ` · page ${entry.page} / ${entry.numPages}`
              : ` · page ${entry.page}`}
          </p>
        </div>
      </motion.button>

      {/* Remove button — sibling so it doesn't nest a button inside a button */}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove from history"
        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
