export const indexingStatusLabels: Record<string, string> = {
  missing: 'Needs indexing',
  queued: 'Queued',
  processing: 'Indexing',
  failed: 'Failed',
  review: 'Indexed — page text needs review',
  indexed: 'Indexed',
  unverified: 'Indexed — verification needed',
  unavailable: 'PDF unavailable',
  excluded: 'Outside indexing scope',
};
export type IndexingFilters = {
  q?: string;
  status?: string;
  magazine?: string;
  year?: string;
  publication?: string;
  page?: number;
};
export type CoverageIssue = {
  id: string;
  title: string;
  theme: string | null;
  magazine_id: string;
  magazine_name: string;
  language: string;
  year: number;
  month: number;
  is_published: number;
  cover_image_url: string | null;
  pdf_url: string;
  status: string;
  indexed_pages: number;
  total_pages: number | null;
  blank_pages: number[];
  review_pages: number[];
  indexed_at: string | null;
  evidence: string | null;
  completed_pages: number;
  attempts: number;
  error: string | null;
  stage: string | null;
  available_at: number;
  verified: boolean;
  source_hash: string | null;
};
export type PageReview = {
  id: string;
  page_number: number;
  pdf_url: string;
  source_hash: string;
  decision: 'transcribe' | 'exclude';
  content: string;
  note: string;
  reviewed_by: string;
  reviewed_at: string;
};
export type DispatchState = {
  configured: boolean;
  active: boolean;
  status: string;
  message: string;
  pending: number;
};
export type IndexingRun = {
  id: string;
  issue_id: string;
  title: string;
  theme: string | null;
  trigger: string;
  status: string;
  stage: string;
  attempts: number;
  completed_pages: number;
  total_pages: number | null;
  indexed_pages: number;
  review_pages: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};
export type IndexingCatalogue = {
  issues: CoverageIssue[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
  eligible: number;
  workerOnline: boolean;
  lastHeartbeat: number | null;
  schedule?: { lastCheckedAt: number; lastResult: string } | null;
  magazines: { id: string; name: string }[];
  years: number[];
};
