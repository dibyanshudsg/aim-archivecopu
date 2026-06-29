/** Supported languages for magazine editions */
export type Language = 'english' | 'hindi' | 'tamil' | 'marathi' | 'bengali' | 'other';

/** Magazine edition (e.g., All India Magazine, Agnishikha) */
export interface Magazine {
  id: string;
  name: string;
  language: Language;
  description: string;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A single magazine issue (one month's publication) */
export interface Issue {
  id: string;
  magazineId: string;
  title: string;
  theme: string | null;
  year: number;
  month: number;
  description: string | null;
  topics: string[];
  /** Null when the issue is embargoed (see `isEmbargoed`) — the public API
   *  strips it so subscribers keep their head start on current issues. */
  pdfUrl: string | null;
  epubUrl: string | null;
  mobiUrl: string | null;
  coverImageUrl: string | null;
  pageCount: number | null;
  fileSizeBytes: number;
  readCount: number;
  downloadCount: number;
  isPublished: boolean;
  /** True while the issue is inside the 5-year rolling embargo window. UI
   *  surfaces show cover/theme/topics but never the PDF for these. */
  isEmbargoed: boolean;
  /** Human-readable month/year for when the embargo lifts (e.g.
   *  `"May 2031"`). Null once the issue is publicly available. */
  embargoLiftLabel: string | null;
  /** Exact global unlock instant. Null once the issue is publicly available. */
  embargoLiftAt: string | null;
  /** Server timestamp used by clients to schedule auto-refresh without
   *  trusting the visitor's device clock. */
  serverNow: string;
  createdAt: string;
  updatedAt: string;
}

/** Issue with its parent magazine info (for display) */
export interface IssueWithMagazine extends Issue {
  magazine: Magazine;
}

/** Search result from full-text search */
export interface SearchResult {
  issueId: string;
  issueTitle: string;
  magazineName: string;
  language: Language;
  year: number;
  month: number;
  pageNumber: number;
  snippet: string;
  relevanceScore: number;
}

/** Search filters */
export interface SearchFilters {
  query: string;
  magazineId?: string;
  language?: Language;
  yearFrom?: number;
  yearTo?: number;
  topics?: string[];
  sortBy?: 'relevance' | 'date_asc' | 'date_desc';
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** User bookmark (local or synced) */
export interface Bookmark {
  issueId: string;
  createdAt: string;
}

/** Reading history entry */
export interface ReadingHistoryEntry {
  issueId: string;
  lastPage: number;
  lastReadAt: string;
}

/** Public-facing analytics */
export interface PublicStats {
  totalIssues: number;
  totalMagazines: number;
  totalLanguages: number;
  archiveSinceYear: number;
  mostPopularIssues?: Issue[];
}

/** Admin user */
export interface Admin {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/** Analytics metric visibility */
export interface AnalyticsVisibility {
  metricName: string;
  isPublic: boolean;
}

/** API error response */
export interface ApiError {
  error: string;
  code: string;
}

/** Month names for display */
export type MonthIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
