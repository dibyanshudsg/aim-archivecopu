export type ReaderSource = 'issue' | 'shelf' | 'browse' | 'search' | 'bookmarks';

const READER_SOURCE_PREFIX = 'aim-reader-source-';
const READER_RESUME_PREFIX = 'aim-reader-resume-';

export function readerPath(issueId: string, page?: number | null) {
  const pageNumber = typeof page === 'number' && Number.isFinite(page) ? Math.floor(page) : null;
  return pageNumber && pageNumber > 1 ? `/read/${issueId}?page=${pageNumber}` : `/read/${issueId}`;
}

export function isReaderSource(value: string | null): value is ReaderSource {
  return value === 'issue' || value === 'shelf' || value === 'browse' || value === 'search' || value === 'bookmarks';
}

export function rememberReaderSource(issueId: string, source: ReaderSource) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${READER_SOURCE_PREFIX}${issueId}`, source);
  } catch {
    /* private-mode or quota failure - source falls back to issue details */
  }
}

export function consumeReaderSource(issueId: string): ReaderSource | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${READER_SOURCE_PREFIX}${issueId}`;
    const source = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    return isReaderSource(source) ? source : null;
  } catch {
    return null;
  }
}

export function rememberDirectResume(issueId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${READER_RESUME_PREFIX}${issueId}`, '1');
  } catch {
    /* non-critical */
  }
}

export function consumeDirectResume(issueId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = `${READER_RESUME_PREFIX}${issueId}`;
    const resume = window.sessionStorage.getItem(key) === '1';
    window.sessionStorage.removeItem(key);
    return resume;
  } catch {
    return false;
  }
}
