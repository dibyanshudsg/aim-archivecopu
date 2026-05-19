import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createAdminClient } from '@/lib/supabase-server';
import {
  getR2Client,
  isR2Url,
  isSupabaseStorageUrl,
  r2Bucket,
  r2PublicUrl,
  storageKeyFromUrl,
} from '@/lib/r2-client';
import { readSiteSettings } from '@/lib/site-settings';

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

interface IssueUrlRow {
  id: string;
  title: string;
  pdf_url: string | null;
  cover_image_url: string | null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createAdminClient();

  const [magazines, issues] = await Promise.all([
    supabase.from('magazines').select('id', { count: 'exact', head: true }),
    supabase.from('issues').select('id, read_count, download_count'),
  ]);

  if (magazines.error) throw new Error(magazines.error.message);
  if (issues.error) throw new Error(issues.error.message);

  const issueData = issues.data ?? [];
  const reads = issueData.reduce((sum, issue) => sum + (issue.read_count || 0), 0);
  const downloads = issueData.reduce((sum, issue) => sum + (issue.download_count || 0), 0);

  const { data: popular, error: popularError } = await supabase
    .from('issues')
    .select('id, title, read_count, download_count')
    .order('read_count', { ascending: false })
    .limit(5);

  if (popularError) throw new Error(popularError.message);

  return {
    totalMagazines: magazines.count || 0,
    totalIssues: issueData.length,
    totalReads: reads,
    totalDownloads: downloads,
    popularIssues: popular ?? [],
  };
}

export async function listAdminMagazines(): Promise<AdminMagazine[]> {
  const { data, error } = await createAdminClient().from('magazines').select('*').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminMagazine[];
}

export async function listAdminIssues(): Promise<AdminIssue[]> {
  const { data, error } = await createAdminClient()
    .from('issues')
    .select('*, magazines(name, language)')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminIssue[];
}

export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
  return readSiteSettings(createAdminClient());
}

export async function getAdminStorageData(): Promise<AdminStorageData> {
  const r2Objects: Array<Omit<R2Object, 'linkedIssue'>> = [];
  let token: string | undefined;

  do {
    const response = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (!object.Key) continue;
      r2Objects.push({
        key: object.Key,
        size: object.Size ?? 0,
        lastModified: object.LastModified ? object.LastModified.toISOString() : null,
        publicUrl: r2PublicUrl(object.Key),
      });
    }

    token = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (token);

  const { data, error } = await createAdminClient()
    .from('issues')
    .select('id, title, pdf_url, cover_image_url')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw new Error(error.message);

  const issues = (data ?? []) as IssueUrlRow[];
  const keyToIssue = new Map<string, LinkedIssue>();

  for (const issue of issues) {
    for (const field of ['pdf_url', 'cover_image_url'] as const) {
      const url = issue[field];
      if (!url || !isR2Url(url)) continue;
      const key = storageKeyFromUrl(url);
      if (key) keyToIssue.set(key, { id: issue.id, title: issue.title, field });
    }
  }

  const enrichedObjects = r2Objects.map((object) => ({
    ...object,
    linkedIssue: keyToIssue.get(object.key) ?? null,
  }));

  const legacyIssues = issues
    .map((issue) => {
      const pdfOnSupabase = !!issue.pdf_url && isSupabaseStorageUrl(issue.pdf_url);
      const coverOnSupabase = !!issue.cover_image_url && isSupabaseStorageUrl(issue.cover_image_url);
      return { id: issue.id, title: issue.title, pdfOnSupabase, coverOnSupabase };
    })
    .filter((issue) => issue.pdfOnSupabase || issue.coverOnSupabase);

  return {
    r2: {
      objects: enrichedObjects,
      objectCount: enrichedObjects.length,
      totalBytes: enrichedObjects.reduce((sum, object) => sum + object.size, 0),
      orphanCount: enrichedObjects.filter((object) => !object.linkedIssue).length,
      linkedCount: enrichedObjects.filter((object) => object.linkedIssue).length,
    },
    supabaseLegacy: {
      issueCount: legacyIssues.length,
      issues: legacyIssues,
    },
  };
}
