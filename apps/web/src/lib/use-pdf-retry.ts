'use client';
import { useCallback, useRef, useState } from 'react';

/** One transport retry per document. Parent page/zoom/search state stays mounted. */
export function usePdfRetry(source: string | null) {
  const attempts = useRef({ source, count: 0 });
  const [revision, setRevision] = useState(0);
  const retry = useCallback((error: unknown) => {
    if (attempts.current.source !== source) attempts.current = { source, count: 0 };
    const status = (error as { status?: number } | null)?.status;
    if (!source || status === 404 || status === 401 || attempts.current.count >= 1) return false;
    attempts.current.count++;
    setRevision(value => value + 1);
    return true;
  }, [source]);
  return { revision, retry };
}
