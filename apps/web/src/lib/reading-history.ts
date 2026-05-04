/**
 * Reading-history helper — reads the per-issue reader state that the reader
 * page stores in localStorage on every meaningful change (`aim-reader-state-<id>`)
 * and surfaces it to the Continue-Reading FAB.
 *
 * Each entry contains a metadata snapshot of the issue plus the user's
 * resume position, so the FAB can render instantly without a network roundtrip.
 */

const KEY_PREFIX = 'aim-reader-state-';

export interface ReadingHistoryEntry {
  issueId: string;
  page: number;
  scrollTop: number;
  scale: number;
  viewMode: 'single' | 'continuous';
  pagesPerView: 1 | 2;
  updatedAt: number;
  // Metadata snapshot
  title: string;
  theme: string | null;
  coverImageUrl: string | null;
  magazineName: string;
  month: number;
  year: number;
  numPages: number | null;
}

/** Read every saved reader state, sorted by most-recently-updated first. */
export function getReadingHistory(): ReadingHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  const entries: ReadingHistoryEntry[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Partial<ReadingHistoryEntry> & {
        page?: number;
      };
      // Recover issueId from the storage key when the snapshot pre-dates
      // the metadata fields being added.
      const issueId = parsed.issueId ?? key.slice(KEY_PREFIX.length);
      // Skip entries that don't carry enough metadata to render — they're
      // from the old schema and will be backfilled the next time the user
      // opens that issue.
      if (!parsed.title || !parsed.magazineName) continue;
      entries.push({
        issueId,
        page: parsed.page ?? 1,
        scrollTop: parsed.scrollTop ?? 0,
        scale: parsed.scale ?? 1,
        viewMode: parsed.viewMode ?? 'single',
        pagesPerView: (parsed.pagesPerView as 1 | 2) ?? 1,
        updatedAt: parsed.updatedAt ?? 0,
        title: parsed.title,
        theme: parsed.theme ?? null,
        coverImageUrl: parsed.coverImageUrl ?? null,
        magazineName: parsed.magazineName,
        month: parsed.month ?? 1,
        year: parsed.year ?? new Date().getFullYear(),
        numPages: parsed.numPages ?? null,
      });
    } catch {
      // ignore malformed entries
    }
  }
  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Top-N most recently updated entries (default 5). */
export function getRecentReads(limit = 5): ReadingHistoryEntry[] {
  return getReadingHistory().slice(0, limit);
}

/** Clear a single issue's saved state — used when the user dismisses a card. */
export function clearReadingHistoryEntry(issueId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${KEY_PREFIX}${issueId}`);
  } catch {
    /* ignore */
  }
}

/** Format a Date.now() timestamp as "2d ago", "5m ago", etc. */
export function formatRelativeTime(ts: number): string {
  if (!ts) return 'recently';
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
