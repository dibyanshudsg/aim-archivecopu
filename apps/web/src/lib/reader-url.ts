export type ReaderSource = 'issue' | 'shelf' | 'browse' | 'search' | 'bookmarks';

const READER_SOURCE_PREFIX = 'aim-reader-source-';
const READER_RESUME_PREFIX = 'aim-reader-resume-';
const BROWSE_RETURN_KEY = 'aim-browse-return-target';
const BROWSE_RETURN_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const warmedReaderRoutes = new Set<string>();

export type BrowseReturnTarget = {
  issueId: string;
  href: string;
  createdAt: number;
};

export function readerPath(issueId: string, page?: number | null) {
  const pageNumber = typeof page === 'number' && Number.isFinite(page) ? Math.floor(page) : null;
  return pageNumber && pageNumber > 1 ? `/read/${issueId}?page=${pageNumber}` : `/read/${issueId}`;
}

/**
 * Next's production router prefetch handles normal deployments. In local dev,
 * an intent-triggered fetch also compiles the dynamic Reader route before the
 * click finishes, without running its client analytics effect.
 */
export function warmReaderRoute(issueId: string) {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;
  const href = readerPath(issueId);
  if (warmedReaderRoutes.has(href)) return;
  warmedReaderRoutes.add(href);
  fetch(href, { cache: 'force-cache' }).catch(() => warmedReaderRoutes.delete(href));
}

export function isReaderSource(value: string | null): value is ReaderSource {
  return value === 'issue' || value === 'shelf' || value === 'browse' || value === 'search' || value === 'bookmarks';
}

export function rememberReaderSource(issueId: string, source: ReaderSource) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${READER_SOURCE_PREFIX}${issueId}`, source);
    if (source === 'browse') {
      window.sessionStorage.setItem(
        BROWSE_RETURN_KEY,
        JSON.stringify({
          issueId,
          href: `${window.location.pathname}${window.location.search}${window.location.hash}`,
          createdAt: Date.now(),
        } satisfies BrowseReturnTarget),
      );
    } else {
      window.sessionStorage.removeItem(BROWSE_RETURN_KEY);
    }
  } catch {
    /* private-mode or quota failure - source falls back to issue details */
  }
}

function readBrowseReturnTarget(): BrowseReturnTarget | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(BROWSE_RETURN_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<BrowseReturnTarget>;
    const valid =
      typeof value.issueId === 'string' &&
      typeof value.href === 'string' &&
      value.href.startsWith('/browse') &&
      typeof value.createdAt === 'number' &&
      Date.now() - value.createdAt <= BROWSE_RETURN_MAX_AGE_MS;
    if (!valid) {
      window.sessionStorage.removeItem(BROWSE_RETURN_KEY);
      return null;
    }
    return value as BrowseReturnTarget;
  } catch {
    return null;
  }
}

export function getBrowseReturnHref(issueId: string): string | null {
  const target = readBrowseReturnTarget();
  return target?.issueId === issueId ? target.href : null;
}

export function consumeBrowseReturnTarget(): BrowseReturnTarget | null {
  const target = readBrowseReturnTarget();
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(BROWSE_RETURN_KEY);
    } catch {
      /* non-critical */
    }
  }
  return target;
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
