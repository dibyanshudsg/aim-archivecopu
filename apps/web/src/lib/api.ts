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
  pdf_url: string;
  epub_url: string | null;
  mobi_url: string | null;
  cover_image_url: string | null;
  page_count: number | null;
  file_size_bytes: number;
  read_count: number;
  download_count: number;
  is_published: boolean;
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
  page?: number;
  pageSize?: number;
}): Promise<PaginatedIssues> {
  const searchParams = new URLSearchParams();
  if (params?.magazineId) searchParams.set('magazine_id', params.magazineId);
  if (params?.year) searchParams.set('year', params.year);
  if (params?.month) searchParams.set('month', params.month);
  if (params?.language) searchParams.set('language', params.language);
  if (params?.topic) searchParams.set('topic', params.topic);
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
  snippet: string;
  rank: number;
  cover_image_url: string | null;
  pdf_url: string;
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
