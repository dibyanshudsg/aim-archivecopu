// Use relative URLs so API calls always hit the same origin (no CORS issues)
const BASE_URL = '';

export interface ApiIssue {
  id: string;
  magazine_id: string;
  title: string;
  theme: string | null;
  year: number;
  month: number;
  description: string | null;
  topics: string[];
  /** Null for embargoed issues — the public API strips it so subscribers keep
   *  their head start on current issues. See `is_embargoed`. */
  pdf_url: string | null;
  epub_url: string | null;
  mobi_url: string | null;
  cover_image_url: string | null;
  page_count: number | null;
  file_size_bytes: number;
  read_count: number;
  download_count: number;
  is_published: boolean;
  /** True while the issue is inside the 5-year rolling embargo window. */
  is_embargoed: boolean;
  /** Human-readable month/year for when the embargo lifts (e.g. `"May 2031"`).
   *  Null once the issue is publicly available. */
  embargo_lift_label: string | null;
  created_at: string;
  updated_at: string;
  magazines: {
    id: string;
    name: string;
    language: string;
    description: string;
    cover_image_url: string | null;
  };
}

export interface ApiMagazine {
  id: string;
  name: string;
  language: string;
  description: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedIssues {
  data: ApiIssue[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets?: {
    years: { value: number; label: string; count: number }[];
    months: { value: number; label: string; count: number }[];
    magazines: { value: string; label: string; count: number }[];
    languages: { value: string; label: string; count: number }[];
    subjects: { value: string; label: string; count: number }[];
  };
}

export async function fetchMagazines(): Promise<ApiMagazine[]> {
  const res = await fetch(`${BASE_URL}/api/magazines`);
  if (!res.ok) throw new Error('Failed to fetch magazines');
  return res.json();
}

export async function fetchIssues(params?: {
  magazineId?: string;
  year?: string;
  month?: string;
  language?: string;
  topic?: string;
  years?: number[];
  months?: number[];
  magazines?: string[];
  languages?: string[];
  subjects?: string[];
  query?: string;
  sort?: string | null;
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  availability?: 'read' | 'subscriber' | 'all';
}): Promise<PaginatedIssues> {
  const searchParams = new URLSearchParams();
  if (params?.availability && params.availability !== 'read') {
    searchParams.set('availability', params.availability);
  }
  if (params?.magazineId) searchParams.set('magazine_id', params.magazineId);
  if (params?.year) searchParams.set('year', params.year);
  if (params?.month) searchParams.set('month', params.month);
  if (params?.language) searchParams.set('language', params.language);
  if (params?.topic) searchParams.set('topic', params.topic);
  if (params?.years?.length) searchParams.set('year', params.years.join(','));
  if (params?.months?.length) searchParams.set('month', params.months.join(','));
  if (params?.magazines?.length) searchParams.set('magazine', params.magazines.join(','));
  if (params?.languages?.length) searchParams.set('language', params.languages.join(','));
  if (params?.subjects?.length) searchParams.set('subject', params.subjects.join(','));
  if (params?.query) searchParams.set('q', params.query);
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.dir === 'asc') searchParams.set('dir', 'asc');
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('page_size', String(params.pageSize));

  const res = await fetch(`${BASE_URL}/api/issues?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch issues');
  return res.json();
}

export async function fetchIssue(id: string): Promise<ApiIssue | null> {
  const res = await fetch(`${BASE_URL}/api/issues/${id}`);
  if (!res.ok) return null;
  return res.json();
}

/** Full-text search result (page-level match with snippet) */
export interface FullTextSearchResult {
  issue_id: string;
  issue_title: string;
  magazine_name: string;
  magazine_language: string;
  year: number;
  month: number;
  page_number: number;
  /** For embargoed issues this is a synthesized "Available {Month YYYY}"
   *  placeholder — never an OCR excerpt, so embargoed content doesn't leak
   *  through search. */
  snippet: string;
  rank: number;
  cover_image_url: string | null;
  /** Null when the issue is embargoed — the snippet replaces the read affordance. */
  pdf_url: string | null;
  is_embargoed: boolean;
  embargo_lift_label: string | null;
}

export interface SearchResponse {
  data: FullTextSearchResult[] | ApiIssue[];
  total: number;
  type: 'fulltext' | 'fallback' | 'none';
}

export async function searchIssues(params: {
  query: string;
  magazineId?: string;
  yearFrom?: string;
  yearTo?: string;
}): Promise<SearchResponse> {
  const searchParams = new URLSearchParams({ q: params.query });
  if (params.magazineId) searchParams.set('magazine_id', params.magazineId);
  if (params.yearFrom) searchParams.set('year_from', params.yearFrom);
  if (params.yearTo) searchParams.set('year_to', params.yearTo);

  const res = await fetch(`${BASE_URL}/api/search?${searchParams}`);
  if (!res.ok) throw new Error('Failed to search');
  return res.json();
}

/** Normalize API issue to a common shape for components */
export function normalizeIssue(issue: ApiIssue) {
  return {
    id: issue.id,
    magazineId: issue.magazine_id,
    title: issue.title,
    theme: issue.theme ?? null,
    year: issue.year,
    month: issue.month,
    description: issue.description,
    topics: issue.topics,
    pdfUrl: issue.pdf_url,
    epubUrl: issue.epub_url,
    mobiUrl: issue.mobi_url,
    coverImageUrl: issue.cover_image_url,
    pageCount: issue.page_count,
    fileSizeBytes: issue.file_size_bytes,
    readCount: issue.read_count,
    downloadCount: issue.download_count,
    isPublished: issue.is_published,
    isEmbargoed: issue.is_embargoed,
    embargoLiftLabel: issue.embargo_lift_label,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    magazine: {
      id: issue.magazines.id,
      name: issue.magazines.name,
      language: issue.magazines.language as 'english' | 'hindi' | 'tamil' | 'marathi' | 'bengali' | 'other',
      description: issue.magazines.description,
      coverImageUrl: issue.magazines.cover_image_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    },
  };
}
