import { MONTH_NAMES_SHORT } from '@aim-archive/shared';
import type { MonthIndex } from '@aim-archive/shared';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES_SHORT[month as MonthIndex]} ${year}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
