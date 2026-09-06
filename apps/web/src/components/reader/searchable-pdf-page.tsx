'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Page } from 'react-pdf';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import { type SearchLine, type SearchReaderTarget } from '@/lib/search-reader-target';

type Props = ComponentProps<typeof Page> & {
  searchTarget: SearchReaderTarget | null;
  onSearchStatus: (status: string) => void;
  onSearchLocated: (element: HTMLElement) => void;
};

export function SearchablePdfPage({ searchTarget, onSearchStatus, onSearchLocated, onLoadSuccess, onRenderSuccess, ...props }: Props) {
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [rendered, setRendered] = useState(false);
  const [lines, setLines] = useState<SearchLine[]>([]);
  const markerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(onSearchStatus);
  const locatedRef = useRef(onSearchLocated);
  statusRef.current = onSearchStatus;
  locatedRef.current = onSearchLocated;
  const target = searchTarget?.page === props.pageNumber ? searchTarget : null;

  useEffect(() => {
    setLines([]);
    if (!page || !target || page.pageNumber !== target.page) return;
    const controller = new AbortController();
    statusRef.current('Finding the matching passage…');
    const timeout = window.setTimeout(() => {
      controller.abort();
      statusRef.current('The matching page is open. The exact line could not be located.');
    }, 60000);
    import('@/lib/locate-pdf-search')
      .then(({ locatePdfSearch }) => locatePdfSearch(page, target, controller.signal, () => {
        if (!controller.signal.aborted) statusRef.current('Finding the passage on this scanned page…');
      }))
      .then((matches) => {
        if (controller.signal.aborted) return;
        setLines(matches);
        statusRef.current(matches.length ? `Matching passage highlighted on page ${target.page}.` : 'The matching page is open. The exact line could not be located.');
      })
      .catch(() => {
        if (!controller.signal.aborted) statusRef.current('The matching page is open. The exact line could not be located.');
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [page, target]);

  useEffect(() => {
    if (!rendered || lines.length === 0 || !target) return;
    // Let page-entry motion and the initial page restoration settle first.
    const timer = window.setTimeout(() => {
      if (markerRef.current) locatedRef.current(markerRef.current);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [rendered, lines, target]);

  return (
    <Page
      {...props}
      onLoadSuccess={(loaded) => { setPage(loaded); onLoadSuccess?.(loaded); }}
      onRenderSuccess={(loaded) => { setRendered(true); onRenderSuccess?.(loaded); }}
    >
      {target && rendered && lines.map((line, index) => (
        <div
          key={index}
          ref={index === 0 ? markerRef : undefined}
          data-search-highlight="true"
          aria-hidden="true"
          className="reader-search-highlight pointer-events-none absolute z-10 rounded-sm border border-amber-600/60 bg-amber-300/35"
          style={{ left: `${line.left * 100}%`, top: `${line.top * 100}%`, width: `${line.width * 100}%`, height: `${line.height * 100}%` }}
        />
      ))}
    </Page>
  );
}
