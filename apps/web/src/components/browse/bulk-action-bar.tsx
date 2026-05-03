'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Download, X } from 'lucide-react';
import type { ApiIssue } from '@/lib/api';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { formatFileSize } from '@/lib/utils';

interface Props {
  /** The full list of issues currently visible — used to compute the total
   *  size of the selection and to power "select all". */
  issues: ApiIssue[];
  onDownload: () => void;
  /** Optional "select all visible" handler. Hidden when omitted. */
  onSelectAll?: () => void;
}

export function BulkActionBar({ issues, onDownload, onSelectAll }: Props) {
  const enabled = useBulkSelection((s) => s.enabled);
  const selectedIds = useBulkSelection((s) => s.selectedIds);
  const disable = useBulkSelection((s) => s.disable);

  const selectedCount = selectedIds.size;
  const totalBytes = issues.reduce(
    (sum, i) => (selectedIds.has(i.id) ? sum + i.file_size_bytes : sum),
    0,
  );
  const allVisibleSelected = issues.length > 0 && issues.every((i) => selectedIds.has(i.id));

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          key="bulk-bar"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          // Lift above the Continue-Reading FAB (right-6 bottom-6, h-14) on
          // narrow screens; on sm+ the bar is centered with plenty of clearance.
          className="pointer-events-none fixed inset-x-0 bottom-24 z-40 px-3 sm:bottom-4 sm:px-6"
        >
          <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-2 rounded-full border-2 border-flame-300 bg-white/95 px-3 py-2 text-gray-900 shadow-2xl backdrop-blur sm:gap-3 sm:px-4 sm:py-2.5">
            <button
              onClick={disable}
              aria-label="Cancel selection"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1">
              {selectedCount === 0 ? (
                <p className="truncate text-sm text-gray-500">Tap issues to select</p>
              ) : (
                <p className="truncate text-sm font-medium text-gray-900">
                  {selectedCount} selected
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    · {formatFileSize(totalBytes)}
                  </span>
                </p>
              )}
            </div>

            {onSelectAll && (
              <button
                onClick={onSelectAll}
                aria-label={allVisibleSelected ? 'Clear selection' : 'Select all visible'}
                title={allVisibleSelected ? 'Clear selection' : 'Select all visible'}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-gold-100 to-flame-100 px-3 py-2 text-sm font-semibold text-flame-700 ring-1 ring-flame-200 transition-all hover:from-gold-200 hover:to-flame-200 sm:px-4"
              >
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {allVisibleSelected ? 'Clear' : 'Select all'}
                </span>
              </button>
            )}

            <button
              onClick={onDownload}
              disabled={selectedCount === 0}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-gold-500 to-flame-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
              <span className="sm:hidden">ZIP</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
