'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Heart,
  Info,
} from 'lucide-react';
import { fetchIssue, normalizeIssue } from '@/lib/api';
import { useBookmarks } from '@/lib/bookmarks-store';
import { formatMonthYear } from '@/lib/utils';

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toggle, isBookmarked } = useBookmarks();

  const [issue, setIssue] = useState<ReturnType<typeof normalizeIssue> | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchIssue(id)
      .then((data) => setIssue(data ? normalizeIssue(data) : null))
      .finally(() => setPageLoading(false));
  }, [id]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
  }, []);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) setCurrentPage(page);
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-gray-900">Issue not found</h1>
          <Link href="/browse" className="mt-4 inline-block text-gold-600 hover:text-gold-700">
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const bookmarked = isBookmarked(issue.id);

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Reader Toolbar */}
      <header className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        {/* Left: back + title */}
        <div className="flex items-center gap-3">
          <Link
            href={`/issue/${issue.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{issue.magazine?.name}</p>
            <p className="text-xs text-gray-500">{formatMonthYear(issue.month, issue.year)}</p>
          </div>
        </div>

        {/* Center: page controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1.5 px-2">
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => goToPage(Number(e.target.value))}
              className="w-12 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm text-gray-900"
            />
            <span className="text-sm text-gray-400">/ {numPages || '—'}</span>
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Right: zoom + actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs text-gray-500">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="mx-1 h-5 w-px bg-gray-200" />

          <button
            onClick={() => toggle(issue.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Bookmark"
          >
            <Heart
              className={`h-4 w-4 ${bookmarked ? 'fill-red-500 text-red-500' : ''}`}
            />
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 sm:flex"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>

          <Link
            href={`/issue/${issue.id}`}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 sm:flex"
            aria-label="Issue details"
          >
            <Info className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full items-start justify-center p-4 sm:p-8">
          {error ? (
            <div className="mt-20 text-center">
              <p className="text-lg font-medium text-gray-600">
                Unable to load PDF
              </p>
              <p className="mt-2 text-sm text-gray-400">
                This is a demo — PDF loading requires a real file.
              </p>
              <Link
                href={`/issue/${issue.id}`}
                className="mt-4 inline-block text-sm text-gold-600 hover:text-gold-700"
              >
                View issue details instead
              </Link>
            </div>
          ) : (
            <Document
              file={issue.pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setError(true)}
              loading={
                <div className="mt-20 flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
                  <p className="text-sm text-gray-500">Loading document...</p>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                className="shadow-xl"
                loading={
                  <div className="flex h-[800px] w-[600px] items-center justify-center rounded-lg bg-white">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
                  </div>
                }
              />
            </Document>
          )}
        </div>
      </div>

      {/* Bottom page scrubber (mobile-friendly) */}
      {numPages > 0 && (
        <div className="border-t border-gray-200 bg-white px-4 py-2">
          <input
            type="range"
            min={1}
            max={numPages}
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="w-full accent-gold-500"
          />
        </div>
      )}
    </div>
  );
}
