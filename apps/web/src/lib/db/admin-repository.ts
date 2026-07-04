import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import type {
  AdminIssue,
  AdminIssueListInput,
  AdminIssueListResult,
  AdminIssueSortField,
  AdminMagazine,
  AdminStats,
  AdminStorageData,
} from '@/lib/admin-data';
import {
  getR2Client,
  isR2Url,
  r2Bucket,
  r2PublicUrl,
  storageKeyFromUrl,
} from '@/lib/r2-client';
import { readSiteSettingsFromDb } from './site-settings-repository';
import { createId, displayableAssetUrl, getDb, nowIso } from './client';
import { AsyncTtlCache } from './cache';
import { parseTopics } from './mappers';

interface IssueUrlRow {
  id: string;
  title: string;
  pdf_url: string | null;
  cover_image_url: string | null;
}

type SqlArg = string | number | null;

interface SqlPart {
  sql: string;
  args: SqlArg[];
}

const adminIdentityCache = new AsyncTtlCache<{ id: string; email: string; name: string } | null>(30_000);

export async function getAdminByIdAndEmail(id: string, email: string): Promise<{ id: string; email: string; name: string } | null> {
  return adminIdentityCache.get(`id-email:${id}:${email}`, async () => {
    const result = await getDb().execute({
      sql: 'SELECT id, email, name FROM admins WHERE id = ? AND email = ? LIMIT 1',
      args: [id, email],
    });
    const row = result.rows[0];
    return row ? { id: String(row.id), email: String(row.email), name: String(row.name) } : null;
  });
}

export async function getAdminByEmail(email: string): Promise<{ id: string; email: string; name: string } | null> {
  return adminIdentityCache.get(`email:${email}`, async () => {
    const result = await getDb().execute({
      sql: 'SELECT id, email, name FROM admins WHERE email = ? LIMIT 1',
      args: [email],
    });
    const row = result.rows[0];
    return row ? { id: String(row.id), email: String(row.email), name: String(row.name) } : null;
  });
}

export async function getAdminStatsFromDb(): Promise<AdminStats> {
  const [magazines, issues, popular] = await Promise.all([
    getDb().execute('SELECT COUNT(*) AS count FROM magazines'),
    getDb().execute('SELECT id, read_count, download_count FROM issues'),
    getDb().execute('SELECT id, title, read_count, download_count FROM issues ORDER BY read_count DESC LIMIT 5'),
  ]);

  const issueRows = issues.rows;
  return {
    totalMagazines: Number(magazines.rows[0]?.count ?? 0),
    totalIssues: issueRows.length,
    totalReads: issueRows.reduce((sum, row) => sum + Number(row.read_count ?? 0), 0),
    totalDownloads: issueRows.reduce((sum, row) => sum + Number(row.download_count ?? 0), 0),
    popularIssues: popular.rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      read_count: Number(row.read_count ?? 0),
      download_count: Number(row.download_count ?? 0),
    })),
  };
}

export async function listAdminMagazinesFromDb(): Promise<AdminMagazine[]> {
  const result = await getDb().execute('SELECT id, name, language, description FROM magazines ORDER BY name ASC');
  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    language: String(row.language),
    description: String(row.description ?? ''),
  }));
}

export async function createAdminMagazineInDb(input: {
  name: string;
  language: string;
  description: string;
}): Promise<AdminMagazine> {
  const id = createId();
  const now = nowIso();
  await getDb().execute({
    sql: `
      INSERT INTO magazines (id, name, language, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [id, input.name, input.language, input.description ?? '', now, now],
  });

  return {
    id,
    name: input.name,
    language: input.language,
    description: input.description ?? '',
  };
}

export async function getMagazineNameFromDb(id: string): Promise<string | null> {
  const result = await getDb().execute({
    sql: 'SELECT name FROM magazines WHERE id = ? LIMIT 1',
    args: [id],
  });
  const row = result.rows[0];
  return row ? String(row.name) : null;
}

export async function updateAdminMagazineInDb(
  id: string,
  input: { name: string; language: string; description: string },
): Promise<AdminMagazine | null> {
  await getDb().execute({
    sql: `
      UPDATE magazines
      SET name = ?,
          language = ?,
          description = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [input.name, input.language, input.description ?? '', nowIso(), id],
  });

  const result = await getDb().execute({
    sql: 'SELECT id, name, language, description FROM magazines WHERE id = ? LIMIT 1',
    args: [id],
  });
  const row = result.rows[0];
  return row
    ? {
        id: String(row.id),
        name: String(row.name),
        language: String(row.language),
        description: String(row.description ?? ''),
      }
    : null;
}

export async function deleteAdminMagazineInDb(id: string): Promise<void> {
  await getDb().execute({
    sql: 'DELETE FROM magazines WHERE id = ?',
    args: [id],
  });
}

export async function listAdminIssuesFromDb(): Promise<AdminIssue[]> {
  const result = await getDb().execute(`
    SELECT
      i.*,
      m.name AS magazine_name,
      m.language AS magazine_language
    FROM issues i
    JOIN magazines m ON m.id = i.magazine_id
    ORDER BY i.year DESC, i.month DESC
  `);

  return result.rows.map(rowToAdminIssue);
}

export async function listAdminIssuesPageFromDb(input: AdminIssueListInput): Promise<AdminIssueListResult> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(5000, Math.max(1, input.pageSize));
  const offset = (page - 1) * pageSize;
  const where = buildAdminIssueWhere(input);
  const order = buildAdminIssueOrder(input.sort, input.dir);

  const [rowsResult, countResult, yearsResult, topicsResult] = await Promise.all([
    getDb().execute({
      sql: `
        SELECT
          i.*,
          m.name AS magazine_name,
          m.language AS magazine_language
        FROM issues i
        JOIN magazines m ON m.id = i.magazine_id
        ${where.sql}
        ${order}
        LIMIT ? OFFSET ?
      `,
      args: [...where.args, pageSize, offset],
    }),
    getDb().execute({
      sql: `
        SELECT COUNT(*) AS count
        FROM issues i
        JOIN magazines m ON m.id = i.magazine_id
        ${where.sql}
      `,
      args: where.args,
    }),
    getDb().execute('SELECT DISTINCT year FROM issues ORDER BY year DESC'),
    getDb().execute(`
      SELECT topic.value AS name, COUNT(DISTINCT i.id) AS count
      FROM issues i
      JOIN json_each(i.topics_json) topic ON true
      WHERE topic.value IS NOT NULL
        AND topic.value != ''
      GROUP BY topic.value
      ORDER BY lower(topic.value) ASC
    `),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);
  return {
    data: rowsResult.rows.map(rowToAdminIssue),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    facets: {
      years: yearsResult.rows.map((row) => Number(row.year)).filter(Number.isFinite),
      topics: topicsResult.rows.map((row) => ({
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
    },
  };
}

export async function updateAdminIssueInDb(
  id: string,
  input: {
    magazine_id: string;
    title: string;
    theme?: string | null;
    description?: string | null;
    topics: string[];
    year: number;
    month: number;
    is_published: boolean;
  },
): Promise<AdminIssue | null> {
  await getDb().execute({
    sql: `
      UPDATE issues
      SET magazine_id = ?,
          title = ?,
          theme = ?,
          description = ?,
          topics_json = ?,
          year = ?,
          month = ?,
          is_published = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [
      input.magazine_id,
      input.title,
      input.theme ?? null,
      input.description ?? null,
      JSON.stringify(input.topics ?? []),
      input.year,
      input.month,
      input.is_published ? 1 : 0,
      nowIso(),
      id,
    ],
  });

  const issues = await listAdminIssuesFromDb();
  return issues.find((issue) => issue.id === id) ?? null;
}

export async function getIssueStorageUrlsFromDb(id: string): Promise<{ pdf_url: string | null; cover_image_url: string | null } | null> {
  const result = await getDb().execute({
    sql: 'SELECT pdf_url, cover_image_url FROM issues WHERE id = ? LIMIT 1',
    args: [id],
  });
  const row = result.rows[0];
  return row
    ? {
        pdf_url: row.pdf_url == null ? null : String(row.pdf_url),
        cover_image_url: row.cover_image_url == null ? null : String(row.cover_image_url),
      }
    : null;
}

export async function deleteAdminIssueInDb(id: string): Promise<void> {
  await getDb().execute({
    sql: 'DELETE FROM issues WHERE id = ?',
    args: [id],
  });
}

export async function createAdminIssueInDb(input: {
  magazine_id: string;
  title: string;
  theme: string | null;
  year: number;
  month: number;
  description: string | null;
  topics: string[];
  pdf_url: string;
  cover_image_url: string | null;
  file_size_bytes: number;
  is_published: boolean;
}): Promise<Record<string, unknown>> {
  const id = createId();
  const now = nowIso();
  await getDb().execute({
    sql: `
      INSERT INTO issues (
        id, magazine_id, title, theme, year, month, description, topics_json,
        pdf_url, cover_image_url, file_size_bytes, is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      input.magazine_id,
      input.title,
      input.theme,
      input.year,
      input.month,
      input.description,
      JSON.stringify(input.topics),
      input.pdf_url,
      input.cover_image_url,
      input.file_size_bytes,
      input.is_published ? 1 : 0,
      now,
      now,
    ],
  });

  return {
    id,
    magazine_id: input.magazine_id,
    title: input.title,
    theme: input.theme,
    year: input.year,
    month: input.month,
    description: input.description,
    topics: input.topics,
    pdf_url: input.pdf_url,
    cover_image_url: input.cover_image_url,
    file_size_bytes: input.file_size_bytes,
    is_published: input.is_published,
    created_at: now,
    updated_at: now,
  };
}

export async function getAdminIssueFileRowFromDb(id: string): Promise<{
  id: string;
  title: string;
  pdf_url: string;
  cover_image_url: string | null;
} | null> {
  const result = await getDb().execute({
    sql: 'SELECT id, title, pdf_url, cover_image_url FROM issues WHERE id = ? LIMIT 1',
    args: [id],
  });
  const row = result.rows[0];
  return row
    ? {
        id: String(row.id),
        title: String(row.title),
        pdf_url: String(row.pdf_url),
        cover_image_url: row.cover_image_url == null ? null : String(row.cover_image_url),
      }
    : null;
}

export async function updateIssuePdfInDb(id: string, pdfUrl: string, fileSizeBytes: number): Promise<void> {
  await getDb().execute({
    sql: 'UPDATE issues SET pdf_url = ?, file_size_bytes = ?, updated_at = ? WHERE id = ?',
    args: [pdfUrl, fileSizeBytes, nowIso(), id],
  });
}

export async function updateIssueCoverInDb(id: string, coverImageUrl: string | null): Promise<void> {
  await getDb().execute({
    sql: 'UPDATE issues SET cover_image_url = ?, updated_at = ? WHERE id = ?',
    args: [coverImageUrl, nowIso(), id],
  });
}

export async function clearIssueCoverByStorageKeyInDb(key: string): Promise<void> {
  const rows = await getIssueUrlRows();
  for (const row of rows) {
    if (!row.cover_image_url) continue;
    if (storageKeyFromUrl(row.cover_image_url) === key) {
      await updateIssueCoverInDb(row.id, null);
    }
  }
}

export async function listReindexCandidatesFromDb(force: boolean): Promise<Array<{
  id: string;
  title: string;
  pdf_url: string;
  cover_image_url: string | null;
}>> {
  const result = await getDb().execute(`
    SELECT id, title, pdf_url, cover_image_url
    FROM issues
    WHERE pdf_url NOT LIKE '%.supabase.co/%'
    ORDER BY year DESC, month DESC
  `);
  const issues = result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    pdf_url: String(row.pdf_url),
    cover_image_url: row.cover_image_url == null ? null : String(row.cover_image_url),
  }));

  if (force) return issues;

  const indexed = await getDb().execute('SELECT DISTINCT issue_id FROM issue_search_index LIMIT 10000');
  const indexedIds = new Set(indexed.rows.map((row) => String(row.issue_id)));
  return issues.filter((issue) => !indexedIds.has(issue.id));
}

export async function listIssuesMissingCoverFromDb(): Promise<Array<{
  id: string;
  title: string;
  pdf_url: string;
}>> {
  const result = await getDb().execute(`
    SELECT id, title, pdf_url
    FROM issues
    WHERE cover_image_url IS NULL
      AND pdf_url NOT LIKE '%.supabase.co/%'
    ORDER BY year DESC, month DESC
  `);
  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    pdf_url: String(row.pdf_url),
  }));
}

export async function listTopicCountsFromDb(): Promise<Array<{ name: string; count: number }>> {
  const result = await getDb().execute('SELECT topics_json FROM issues');
  const counts = new Map<string, number>();
  for (const row of result.rows) {
    for (const topic of parseTopics(row.topics_json == null ? null : String(row.topics_json))) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function deleteTopicFromDb(name: string): Promise<number> {
  const affected = await getIssuesContainingTopic(name);
  let updated = 0;
  for (const issue of affected) {
    const next = issue.topics.filter((topic) => topic !== name);
    await updateIssueTopics(issue.id, next);
    updated++;
  }
  return updated;
}

export async function renameTopicInDb(from: string, to: string): Promise<number> {
  if (from === to) return 0;
  const affected = await getIssuesContainingTopic(from);
  let updated = 0;
  for (const issue of affected) {
    const next = [...new Set(issue.topics.map((topic) => (topic === from ? to : topic)))];
    next.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    await updateIssueTopics(issue.id, next);
    updated++;
  }
  return updated;
}

export async function getAdminSiteSettingsFromDb() {
  return readSiteSettingsFromDb();
}

export async function getAdminStorageDataFromDb(): Promise<AdminStorageData> {
  const r2Objects = [];
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

  const issues = await getIssueUrlRows();
  const keyToIssue = new Map();

  for (const issue of issues) {
    for (const field of ['pdf_url', 'cover_image_url'] as const) {
      const url = issue[field];
      if (!url || !isR2Url(url)) continue;
      const key = storageKeyFromUrl(url);
      if (key) keyToIssue.set(key, { id: issue.id, title: issue.title, field });
    }
  }

  const objects = r2Objects.map((object) => ({
    ...object,
    linkedIssue: keyToIssue.get(object.key) ?? null,
  }));

  const legacyIssues = issues
    .map((issue) => ({
      id: issue.id,
      title: issue.title,
      pdfOnSupabase: !!issue.pdf_url && issue.pdf_url.includes('.supabase.co/'),
      coverOnSupabase: !!issue.cover_image_url && issue.cover_image_url.includes('.supabase.co/'),
    }))
    .filter((issue) => issue.pdfOnSupabase || issue.coverOnSupabase);

  return {
    r2: {
      objects,
      objectCount: objects.length,
      totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
      orphanCount: objects.filter((object) => !object.linkedIssue).length,
      linkedCount: objects.filter((object) => object.linkedIssue).length,
    },
    supabaseLegacy: {
      issueCount: legacyIssues.length,
      issues: legacyIssues,
    },
  };
}

async function getIssueUrlRows(): Promise<IssueUrlRow[]> {
  const result = await getDb().execute('SELECT id, title, pdf_url, cover_image_url FROM issues ORDER BY year DESC, month DESC');
  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    pdf_url: row.pdf_url == null ? null : String(row.pdf_url),
    cover_image_url: row.cover_image_url == null ? null : String(row.cover_image_url),
  }));
}

async function getIssuesContainingTopic(name: string): Promise<Array<{ id: string; topics: string[] }>> {
  const result = await getDb().execute({
    sql: `
      SELECT id, topics_json
      FROM issues
      WHERE EXISTS (
        SELECT 1 FROM json_each(issues.topics_json)
        WHERE json_each.value = ?
      )
    `,
    args: [name],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    topics: parseTopics(row.topics_json == null ? null : String(row.topics_json)),
  }));
}

async function updateIssueTopics(id: string, topics: string[]): Promise<void> {
  await getDb().execute({
    sql: 'UPDATE issues SET topics_json = ?, updated_at = ? WHERE id = ?',
    args: [JSON.stringify(topics), nowIso(), id],
  });
}

function rowToAdminIssue(row: Record<string, unknown>): AdminIssue {
  return {
    id: String(row.id),
    title: String(row.title),
    theme: row.theme == null ? null : String(row.theme),
    year: Number(row.year),
    month: Number(row.month),
    description: row.description == null ? null : String(row.description),
    topics: parseTopics(row.topics_json == null ? null : String(row.topics_json)),
    read_count: Number(row.read_count ?? 0),
    download_count: Number(row.download_count ?? 0),
    file_size_bytes: Number(row.file_size_bytes ?? 0),
    is_published: Boolean(row.is_published),
    magazine_id: String(row.magazine_id),
    pdf_url: String(row.pdf_url),
    cover_image_url: displayableAssetUrl(row.cover_image_url == null ? null : String(row.cover_image_url)),
    updated_at: row.updated_at == null ? null : String(row.updated_at),
    page_count: row.page_count == null ? null : Number(row.page_count),
    magazines: { name: String(row.magazine_name), language: String(row.magazine_language) },
  };
}

function buildAdminIssueWhere(input: AdminIssueListInput): SqlPart {
  const clauses: string[] = [];
  const args: SqlArg[] = [];

  if (input.q) {
    const pattern = `%${escapeLike(input.q.toLowerCase().replace(/\s+/g, ' ').trim())}%`;
    clauses.push(`(
      lower(i.title) LIKE ? ESCAPE '\\'
      OR lower(coalesce(i.theme, '')) LIKE ? ESCAPE '\\'
      OR EXISTS (
        SELECT 1 FROM json_each(i.topics_json)
        WHERE lower(json_each.value) LIKE ? ESCAPE '\\'
      )
    )`);
    args.push(pattern, pattern, pattern);
  }

  if (input.magazineId !== 'all') {
    clauses.push('i.magazine_id = ?');
    args.push(input.magazineId);
  }

  if (input.year !== 'all') {
    const year = Number(input.year);
    if (Number.isFinite(year)) {
      clauses.push('i.year = ?');
      args.push(year);
    }
  }

  if (input.status === 'published') clauses.push('i.is_published = 1');
  if (input.status === 'draft') clauses.push('i.is_published = 0');

  if (input.topic !== 'all') {
    clauses.push(`EXISTS (
      SELECT 1 FROM json_each(i.topics_json)
      WHERE json_each.value = ?
    )`);
    args.push(input.topic);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    args,
  };
}

function buildAdminIssueOrder(sort: AdminIssueSortField, dir: 'asc' | 'desc'): string {
  const direction = dir === 'asc' ? 'ASC' : 'DESC';
  switch (sort) {
    case 'title':
      return `ORDER BY i.title ${direction}, i.year DESC, i.month DESC`;
    case 'read_count':
      return `ORDER BY i.read_count ${direction}, i.year DESC, i.month DESC`;
    case 'download_count':
      return `ORDER BY i.download_count ${direction}, i.year DESC, i.month DESC`;
    case 'file_size_bytes':
      return `ORDER BY i.file_size_bytes ${direction}, i.year DESC, i.month DESC`;
    case 'updated_at':
      return `ORDER BY i.updated_at ${direction}, i.year DESC, i.month DESC`;
    default:
      return `ORDER BY i.year ${direction}, i.month ${direction}, i.title ASC`;
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
