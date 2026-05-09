'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import type { FullTextSearchResult } from '@/lib/api';
import { MONTH_NAMES } from '@aim-archive/shared';
import type { MonthIndex } from '@aim-archive/shared';

interface SearchResultItemProps {
  result: FullTextSearchResult;
  index: number;
}

export function SearchResultItem({ result, index }: SearchResultItemProps) {
  const monthName = MONTH_NAMES[result.month as MonthIndex];
  const snippetParts = result.snippet.split(/(<mark>|<\/mark>)/g);
  let highlighted = false;

  return (
    <div
      className="group rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-flame-200 hover:shadow-sm"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Cover thumbnail with hover-preview (replaces the old page-icon
            pill — page number now overlaid as a badge so we don't lose
            at-a-glance scanning). */}
        <ResultThumbnail
          issueId={result.issue_id}
          coverUrl={result.cover_image_url}
          title={result.issue_title}
          pageNumber={result.page_number}
        />

        <div className="min-w-0 flex-1">
          {/* Issue info */}
          <div className="flex items-center gap-2">
            <Link
              href={`/issue/${result.issue_id}`}
              className="text-sm font-semibold text-gray-900 hover:text-flame-700"
            >
              {result.issue_title}
            </Link>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {result.magazine_name}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-gray-400">
            {monthName} {result.year} — Page {result.page_number}
          </p>

          {/* Snippet with highlighted matches */}
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {snippetParts.map((part, partIndex) => {
              if (part === '<mark>') {
                highlighted = true;
                return null;
              }
              if (part === '</mark>') {
                highlighted = false;
                return null;
              }
              return highlighted ? (
                <mark key={partIndex} className="rounded-sm bg-gradient-to-r from-gold-100 to-flame-100 px-0.5 text-flame-900">
                  {part}
                </mark>
              ) : (
                <span key={partIndex}>{part}</span>
              );
            })}
          </p>
        </div>

        {/* Read action */}
        <Link
          href={`/read/${result.issue_id}?page=${result.page_number}&from=search`}
          className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-50 to-flame-50 px-3 text-xs font-medium text-flame-700 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Read
        </Link>
      </div>
    </div>
  );
}

// ---------- Cover thumbnail with portal-rendered hover preview ----------
// Mirrors the pattern from the admin Issues table's `CoverThumbnail`. Once
// we ship Browse polish + reader parity work, factor both into a shared
// component (`components/shared/cover-hover-thumbnail.tsx`) so the gold
// spine + portal-positioning logic only lives in one place.
const PREVIEW_W = 240;
const PREVIEW_H = 320;
const PREVIEW_GAP = 12;
const VIEWPORT_PAD = 12;

function ResultThumbnail({
  issueId,
  coverUrl,
  title,
  pageNumber,
}: {
  issueId: string;
  coverUrl: string | null;
  title: string;
  pageNumber: number;
}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const thumbRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePosition() {
    if (!thumbRef.current) return;
    const rect = thumbRef.current.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    // Clamp vertically so the preview never goes off-viewport.
    const minY = PREVIEW_H / 2 + VIEWPORT_PAD;
    const maxY = window.innerHeight - PREVIEW_H / 2 - VIEWPORT_PAD;
    const clampedY = Math.max(minY, Math.min(maxY, centerY));
    setPos({ x: rect.right + PREVIEW_GAP, y: clampedY });
  }

  function handleEnter() {
    if (!coverUrl) return;
    updatePosition();
    setShow(true);
  }
  function handleLeave() {
    setShow(false);
  }

  return (
    <>
      <Link
        ref={thumbRef}
        href={`/issue/${issueId}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        aria-label={`Open ${title}`}
        className="group/thumb relative flex-shrink-0"
      >
        <div className="relative h-20 w-[60px] overflow-hidden rounded-md bg-gradient-to-br from-gold-100 to-flame-100 shadow-sm ring-1 ring-flame-200/50 transition-transform group-hover/thumb:scale-[1.03]">
          {/* Gold-flame spine — visual anchor consistent with the rest of
              the archive's book treatments. */}
          <div className="absolute inset-y-0 left-0 z-10 w-1 bg-gradient-to-b from-gold-500 to-flame-500" />
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              className="object-cover"
              sizes="60px"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-1 text-center text-[9px] font-semibold text-flame-700/60">
              no
              <br />
              cover
            </div>
          )}
          {/* Page-number badge — keeps the at-a-glance scannability the
              old page-icon pill provided, without occupying its own column. */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-black/0 px-1 py-1 text-center text-[9px] font-bold leading-none tracking-wide text-white">
            P.{pageNumber}
          </div>
        </div>
      </Link>

      {mounted &&
        coverUrl &&
        createPortal(
          <AnimatePresence>
            {show && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="pointer-events-none fixed z-[1000]"
                style={{
                  left: pos.x,
                  top: pos.y - PREVIEW_H / 2,
                  width: PREVIEW_W,
                }}
              >
                <div
                  className="relative overflow-hidden rounded-xl border-2 border-flame-300 bg-white shadow-2xl"
                  style={{ height: PREVIEW_H }}
                >
                  <div className="absolute inset-y-0 left-0 z-10 w-1.5 bg-gradient-to-b from-gold-500 to-flame-500" />
                  <Image
                    src={coverUrl}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="240px"
                  />
                </div>
                <div className="mt-1 truncate rounded-md bg-white/95 px-2 py-1 text-center text-[11px] font-medium text-gray-700 shadow-sm">
                  {title}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
