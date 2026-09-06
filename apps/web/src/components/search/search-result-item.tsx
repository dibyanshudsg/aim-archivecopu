'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Lock } from 'lucide-react';
import type { FullTextSearchResult } from '@/lib/api';
import { readerPath, rememberReaderSource } from '@/lib/reader-url';
import { searchReaderPath } from '@/lib/search-reader-target';

interface SearchResultItemProps {
  result: FullTextSearchResult;
  index: number;
  query: string;
}

export function SearchResultItem({ result, index, query }: SearchResultItemProps) {
  const themeTitle = result.theme?.trim();
  const heading = themeTitle || result.issue_title;
  const matchLabel = { title: 'Title match', theme: 'Theme match', topic: 'Topic match', description: 'Description match', page_text: 'Indexed text match' }[result.match_kind];
  const snippet = decodeSnippet(result.snippet.replace(/<\/?mark>/g, ''));
  const href = result.is_embargoed ? `/issue/${result.issue_id}`
    : result.page_number !== null ? searchReaderPath(result.issue_id, { page: result.page_number, query, excerpt: snippet })
    : readerPath(result.issue_id);

  return (
    <Link
      href={href}
      onClick={() => rememberReaderSource(result.issue_id, 'search')}
      aria-label={`${heading}${result.page_number !== null ? `, page ${result.page_number}` : ''}${result.is_embargoed ? ', view details' : ', open in reader'}`}
      className="group block rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-flame-200 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-500"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex flex-wrap items-start gap-3 sm:gap-4">
        {/* Cover thumbnail with hover-preview (replaces the old page-icon
            pill — page number now overlaid as a badge so we don't lose
            at-a-glance scanning). */}
        <ResultThumbnail
          coverUrl={result.cover_image_url}
          title={themeTitle ? `${themeTitle} — ${result.issue_title}` : result.issue_title}
          pageNumber={result.page_number}
          isEmbargoed={result.is_embargoed}
          embargoLiftLabel={result.embargo_lift_label}
        />

        <div className="min-w-0 flex-1">
          {/* Issue info */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="min-w-0 break-words text-sm font-semibold text-gray-900 hover:text-flame-700"
            >
              <HighlightedText text={heading} query={query} />
            </span>
          </div>

          {themeTitle && (
            <p className="mt-0.5 break-words text-xs text-gray-500">
              <HighlightedText text={result.issue_title} query={query} />
            </p>
          )}
          <p className="mt-0.5 text-xs text-gray-500">
            {matchLabel}
            {result.page_number !== null && ` — Page ${result.page_number}`}
          </p>

          {/* Snippet with highlighted matches. Embargoed issues never carry an
              OCR excerpt — only the metadata placeholder ("Theme: … · Topics: …
              · Available {Month YYYY}") so page content never leaks. */}
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            <HighlightedText text={snippet} query={query} />
          </p>
        </div>

        {/* Action — Read for public issues, View Details for embargoed ones
            (which have no PDF to open yet). */}
        {result.is_embargoed ? (
          <span
            className="flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-lg border border-flame-200 bg-flame-50/60 px-3 text-xs font-semibold text-flame-700 focus-visible:ring-2 focus-visible:ring-flame-500"
            title={result.embargo_lift_label ? `Available ${result.embargo_lift_label}` : 'Subscribers only'}
          >
            <Lock className="h-3.5 w-3.5" />
            Details
          </span>
        ) : (
          <span
            className="flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-50 to-flame-50 px-3 text-xs font-medium text-flame-700 focus-visible:ring-2 focus-visible:ring-flame-500"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read
          </span>
        )}
      </div>
    </Link>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const terms = [...new Set(query.trim().split(/\s+/u).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (terms.length === 0) return <>{text}</>;

  // Capturing split retains the original casing and safely renders plain text,
  // including Hindi and query characters that have special meaning in regexes.
  const parts = text.split(new RegExp(`(${terms.join('|')})`, 'giu'));
  return <>{parts.map((part, index) => index % 2 === 1 ? (
    <mark key={index} className="rounded-sm bg-gradient-to-r from-gold-100 to-flame-100 px-0.5 text-flame-900">
      {part}
    </mark>
  ) : part)}</>;
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
  coverUrl,
  title,
  pageNumber,
  isEmbargoed,
  embargoLiftLabel,
}: {
  coverUrl: string | null;
  title: string;
  pageNumber: number | null;
  isEmbargoed: boolean;
  embargoLiftLabel: string | null;
}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const thumbRef = useRef<HTMLSpanElement>(null);

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
      <span
        ref={thumbRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
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
          {/* Page badge: embargoed results have no meaningful page number
              (we never index their OCR for output), so swap the badge for a
              lock chip with the embargo-lift month. */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-black/0 px-1 py-1 text-center text-[9px] font-bold leading-none tracking-wide text-white">
            {isEmbargoed ? (
              <span className="inline-flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" />
                {embargoLiftLabel ?? 'Locked'}
              </span>
            ) : pageNumber !== null ? (
              <>P.{pageNumber}</>
            ) : 'Details'}
          </div>
        </div>
      </span>

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

// Decode only our escaped text entities; React still renders all text safely.
function decodeSnippet(value: string) {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
