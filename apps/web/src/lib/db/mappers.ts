import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { displayableAssetUrl } from './client';
import { publicPdfRoute, publicCoverRoute, magazineCoverRoute } from '../public-asset-routes';

export interface MagazineRow {
  id: string;
  name: string;
  language: string;
  description: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueJoinedRow {
  id: string;
  magazine_id: string;
  title: string;
  theme: string | null;
  year: number;
  month: number;
  description: string | null;
  topics_json: string | null;
  pdf_url: string | null;
  epub_url: string | null;
  mobi_url: string | null;
  cover_image_url: string | null;
  page_count: number | null;
  file_size_bytes: number;
  read_count: number;
  download_count: number;
  is_published: number | boolean;
  created_at: string;
  updated_at: string;
  magazine_name: string;
  magazine_language: string;
  magazine_description: string;
  magazine_cover_image_url: string | null;
}

export function rowToMagazine(row: MagazineRow): ApiMagazine {
  return {
    id: String(row.id),
    name: String(row.name),
    language: String(row.language),
    description: row.description ?? '',
    cover_image_url: displayableAssetUrl(row.cover_image_url) ? magazineCoverRoute(String(row.id)) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function rowToIssue(row: IssueJoinedRow): ApiIssue {
  return {
    id: String(row.id),
    magazine_id: String(row.magazine_id),
    title: String(row.title),
    theme: row.theme ?? null,
    year: Number(row.year),
    month: Number(row.month),
    description: row.description ?? null,
    topics: parseTopics(row.topics_json),
    pdf_url: row.pdf_url ? publicPdfRoute(String(row.id)) : null,
    epub_url: row.epub_url ?? null,
    mobi_url: row.mobi_url ?? null,
    cover_image_url: displayableAssetUrl(row.cover_image_url) ? publicCoverRoute(String(row.id)) : null,
    page_count: row.page_count == null ? null : Number(row.page_count),
    file_size_bytes: Number(row.file_size_bytes ?? 0),
    read_count: Number(row.read_count ?? 0),
    download_count: Number(row.download_count ?? 0),
    is_published: Boolean(row.is_published),
    is_embargoed: false,
    embargo_lift_label: null,
    embargo_lift_at: null,
    server_now: new Date().toISOString(),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    magazines: {
      id: String(row.magazine_id),
      name: String(row.magazine_name),
      language: String(row.magazine_language),
      description: row.magazine_description ?? '',
      cover_image_url: displayableAssetUrl(row.magazine_cover_image_url) ? magazineCoverRoute(String(row.magazine_id)) : null,
    },
  };
}

export function parseTopics(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function issueSelectSql(): string {
  return `
    i.id,
    i.magazine_id,
    i.title,
    i.theme,
    i.year,
    i.month,
    i.description,
    i.topics_json,
    i.pdf_url,
    i.epub_url,
    i.mobi_url,
    i.cover_image_url,
    i.page_count,
    i.file_size_bytes,
    i.read_count,
    i.download_count,
    i.is_published,
    i.created_at,
    i.updated_at,
    m.name AS magazine_name,
    m.language AS magazine_language,
    m.description AS magazine_description,
    m.cover_image_url AS magazine_cover_image_url
  `;
}
