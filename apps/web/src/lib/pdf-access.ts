import { supportedAssetBases } from './asset-url';
import { isEmbargoed } from './embargo';

export const PDF_GRANT_SECONDS = 300;
export const PDF_CACHE_CONTROL = 'private, no-store, max-age=0';
export const PDF_HEADERS = {
  'Cache-Control': PDF_CACHE_CONTROL,
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export interface PdfAccessIssue {
  id: string;
  year: number;
  month: number;
  is_published: number;
  pdf_url: string;
  title?: string;
}

export function validCatalogueId(id: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id);
}

/** Resolve only server-owned locators, before URL normalization can erase dot segments. */
export function assetKeyFromLocator(locator: string): string | null {
  try {
    const url = new URL(locator);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;
    if ([...url.searchParams].some(([key, value]) => key !== 'v' || !/^\d{1,20}$/.test(value))) return null;
    const base = supportedAssetBases().find(candidate => locator.startsWith(candidate + '/'));
    if (!base) return null;
    const raw = locator.slice(base.length + 1).split('?')[0];
    const parts = raw.split('/').map(part => decodeURIComponent(part));
    if (parts.some(part => !part || part === '.' || part === '..' || /[\\/\x00-\x1f\x7f]/.test(part) || /%[0-9a-f]{2}/i.test(part))) return null;
    const key = parts.join('/');
    return key.length <= 1024 ? key : null;
  } catch { return null; }
}

export function pdfKeyFromLocator(locator: string): string | null {
  const key = assetKeyFromLocator(locator);
  return key && /\.pdf$/i.test(key) ? key : null;
}

export function authorizePdf(issue: PdfAccessIssue | null, admin: boolean, now: Date): string | null {
  if (!issue || !Number.isInteger(issue.year) || issue.year < 1000 || issue.year > 9999 ||
      !Number.isInteger(issue.month) || issue.month < 1 || issue.month > 12 || !Number.isFinite(now.getTime())) return null;
  if (!admin && (issue.is_published !== 1 || isEmbargoed(issue.year, issue.month, now))) return null;
  return pdfKeyFromLocator(issue.pdf_url);
}

/** Single byte ranges only. Null means malformed or unsatisfiable. */
export function parsePdfRange(value: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || size <= 0) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ([first, last].some(n => n !== null && !Number.isSafeInteger(n))) return null;
  if (first === null) return last && last > 0 ? { start: Math.max(0, size - last), end: size - 1 } : null;
  if (first >= size || (last !== null && last < first)) return null;
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}
