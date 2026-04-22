import type { Language, MonthIndex } from './types';

/** Human-readable month names */
export const MONTH_NAMES: Record<MonthIndex, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

/** Short month names */
export const MONTH_NAMES_SHORT: Record<MonthIndex, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec',
};

/** Human-readable language names */
export const LANGUAGE_NAMES: Record<Language, string> = {
  english: 'English',
  hindi: 'Hindi',
  tamil: 'Tamil',
  marathi: 'Marathi',
  bengali: 'Bengali',
  other: 'Other',
};

/** Supported file formats for download */
export const DOWNLOAD_FORMATS = ['pdf', 'epub', 'mobi'] as const;
export type DownloadFormat = (typeof DOWNLOAD_FORMATS)[number];

/** Pagination defaults */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Search defaults */
export const SEARCH_SNIPPET_LENGTH = 200;
export const MAX_SEARCH_RESULTS = 500;

/** File size limits */
export const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

/** Archive starting year */
export const ARCHIVE_START_YEAR = 1990;
