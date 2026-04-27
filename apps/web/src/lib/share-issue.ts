import { MONTH_NAMES, type MonthIndex } from '@aim-archive/shared';
import type { IssueWithMagazine } from '@aim-archive/shared';

export type ShareResult = 'shared' | 'copied' | 'failed';

/**
 * Share an issue via the OS share sheet (mobile/Chrome/Edge/Safari) — including
 * the cover thumbnail when supported — or fall back to copying the link to
 * clipboard on platforms without Web Share.
 */
export async function shareIssue(issue: IssueWithMagazine): Promise<ShareResult> {
  if (typeof window === 'undefined') return 'failed';

  const url = `${window.location.origin}/issue/${issue.id}`;
  const monthYear = `${MONTH_NAMES[issue.month as MonthIndex]} ${issue.year}`;
  const title = `${issue.magazine.name} — ${monthYear}`;
  const text = buildShareText(issue, monthYear, url);

  // 1. Try to share with the cover thumbnail attached.
  if (issue.coverImageUrl && navigator.share && navigator.canShare) {
    try {
      const response = await fetch(issue.coverImageUrl);
      if (response.ok) {
        const blob = await response.blob();
        const ext = blob.type === 'image/png' ? 'png' : 'jpg';
        const filename = `${slug(title)}.${ext}`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        const dataWithFile = { title, text, files: [file] };
        if (navigator.canShare(dataWithFile)) {
          await navigator.share(dataWithFile);
          return 'shared';
        }
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'failed';
      // Fall through to share without the file.
    }
  }

  // 2. Share without the file (text only — URL is embedded inside).
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'failed';
    }
  }

  // 3. Clipboard fallback (Firefox, older browsers, restricted contexts).
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

function buildShareText(issue: IssueWithMagazine, monthYear: string, url: string): string {
  const base = `Discover the ${monthYear} issue of ${issue.magazine.name}, from the Sri Aurobindo Society's digital archive`;
  const description =
    issue.topics.length === 0
      ? `${base}.`
      : `${base} — featuring writings on ${joinWithAnd(issue.topics)}.`;
  return `${description} 🌻\n\n🌐 Link: ${url}`;
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
