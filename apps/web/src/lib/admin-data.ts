import {
  getAdminSiteSettingsFromDb,
  getAdminStatsFromDb,
  getAdminStorageDataFromDb,
  listAdminIssuesFromDb,
  listAdminIssuesPageFromDb,
  listAdminMagazinesFromDb,
} from '@/lib/db';

export interface AdminStats {
  totalMagazines: number;
  totalIssues: number;
  totalReads: number;
  totalDownloads: number;
  popularIssues: { id: string; title: string; read_count: number; download_count: number }[];
}

export interface AdminMagazine {
  id: string;
  name: string;
  language: string;
  description: string;
}

export interface AdminIssue {
  id: string;
  title: string;
  theme: string | null;
  year: number;
  month: number;
  description: string | null;
  topics: string[];
  read_count: number;
  download_count: number;
  file_size_bytes: number;
  is_published: boolean;
  magazine_id: string;
  pdf_url: string;
  cover_image_url: string | null;
  updated_at: string | null;
  page_count: number | null;
  magazines: { name: string; language: string };
}

export type AdminIssueSortField = 'title' | 'year' | 'read_count' | 'download_count' | 'file_size_bytes' | 'updated_at';
export type AdminIssueSortDir = 'asc' | 'desc';
export type AdminIssueStatusFilter = 'all' | 'published' | 'draft';

export interface AdminIssueListInput {
  page: number;
  pageSize: number;
  q: string;
  magazineId: string;
  year: string;
  status: AdminIssueStatusFilter;
  topic: string;
  sort: AdminIssueSortField;
  dir: AdminIssueSortDir;
}

export interface AdminIssueFacetTopic {
  name: string;
  count: number;
}

export interface AdminIssueListResult {
  data: AdminIssue[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    years: number[];
    topics: AdminIssueFacetTopic[];
  };
}

export interface AdminSiteSettings {
  feedback_form_url: string;
  feedback_form_edit_url: string;
}

export type LinkedField = 'pdf_url' | 'cover_image_url';

export interface LinkedIssue {
  id: string;
  title: string;
  field: LinkedField;
}

export interface R2Object {
  key: string;
  size: number;
  lastModified: string | null;
  publicUrl: string;
  linkedIssue: LinkedIssue | null;
}

export interface LegacyIssue {
  id: string;
  title: string;
  pdfOnSupabase: boolean;
  coverOnSupabase: boolean;
}

export interface AdminStorageData {
  r2: {
    objects: R2Object[];
    objectCount: number;
    totalBytes: number;
    orphanCount: number;
    linkedCount: number;
  };
  supabaseLegacy: {
    issueCount: number;
    issues: LegacyIssue[];
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  return getAdminStatsFromDb();
}

export async function listAdminMagazines(): Promise<AdminMagazine[]> {
  return listAdminMagazinesFromDb();
}

export async function listAdminIssues(): Promise<AdminIssue[]> {
  return listAdminIssuesFromDb();
}

export async function listAdminIssuesPage(input: AdminIssueListInput): Promise<AdminIssueListResult> {
  return listAdminIssuesPageFromDb(input);
}

export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
  return getAdminSiteSettingsFromDb();
}

export async function getAdminStorageData(): Promise<AdminStorageData> {
  return getAdminStorageDataFromDb();
}
