'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, FileArchive, X } from 'lucide-react';
import type { ZipDownloadProgress } from '@/lib/download-zip';

interface Props {
  open: boolean;
  progress: ZipDownloadProgress | null;
  onCancel: () => void;
  onClose: () => void;
}

export function BulkDownloadModal({ open, progress, onCancel, onClose }: Props) {
  // Treat fetching as 70% of perceived progress and zipping as the last 30%,
  // so the bar sweeps smoothly across both phases instead of jumping.
  const overallPct = (() => {
    if (!progress) return 0;
    const fetchPct = progress.total > 0 ? (progress.fetched / progress.total) * 100 : 0;
    if (progress.phase === 'fetching') return fetchPct * 0.7;
    if (progress.phase === 'zipping') return 70 + progress.zipPercent * 0.3;
    if (progress.phase === 'done') return 100;
    return 0;
  })();

  const isDone = progress?.phase === 'done';
  const isError = progress?.phase === 'error';
  const isWorking = !isDone && !isError;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bulk-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={isWorking ? undefined : onClose}
          />
          <motion.div
            key="bulk-modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isError
                        ? 'bg-red-50'
                        : isDone
                          ? 'bg-green-50'
                          : 'bg-gradient-to-br from-gold-50 to-flame-50'
                    }`}
                  >
                    {isError ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : isDone ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <FileArchive className="h-5 w-5 text-flame-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-bold text-gray-900">
                      {isError
                        ? 'Download failed'
                        : isDone
                          ? 'Download ready'
                          : 'Preparing your archive'}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {progress
                        ? subtitleFor(progress)
                        : 'Starting…'}
                    </p>
                  </div>
                </div>
                {(isDone || isError) && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  initial={false}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`h-full ${
                    isError
                      ? 'bg-red-400'
                      : 'bg-gradient-to-r from-gold-500 to-flame-500'
                  }`}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span className="truncate">{progress ? phaseLabel(progress) : '—'}</span>
                <span className="tabular-nums">{Math.round(overallPct)}%</span>
              </div>

              {progress && progress.skipped.length > 0 && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Skipped {progress.skipped.length} file
                  {progress.skipped.length === 1 ? '' : 's'} that couldn&apos;t be fetched.
                </p>
              )}

              {isWorking && (
                <button
                  onClick={onCancel}
                  className="mt-5 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function subtitleFor(p: ZipDownloadProgress): string {
  if (p.phase === 'error') return p.errorMessage ?? 'Something went wrong.';
  if (p.phase === 'done') return 'Saved to your Downloads.';
  return `${p.fetched} of ${p.total} fetched`;
}

function phaseLabel(p: ZipDownloadProgress): string {
  if (p.phase === 'fetching') return 'Fetching files…';
  if (p.phase === 'zipping') return `Building ZIP… ${p.zipPercent}%`;
  if (p.phase === 'done') return 'Saved to your Downloads';
  return p.errorMessage ?? 'Error';
}
