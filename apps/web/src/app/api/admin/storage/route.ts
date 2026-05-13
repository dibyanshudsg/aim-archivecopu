import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { verifyAdmin } from '@/lib/admin-auth';
import {
  deleteFromR2,
  getR2Client,
  isR2Url,
  isSupabaseStorageUrl,
  r2Bucket,
  r2PublicUrl,
  storageKeyFromUrl,
} from '@/lib/r2-client';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type LinkedField = 'pdf_url' | 'cover_image_url';

interface LinkedIssue {
  id: string;
  title: string;
  field: LinkedField;
}

interface R2ObjectRow {
  key: string;
  size: number;
  lastModified: string | null;
  publicUrl: string;
  linkedIssue: LinkedIssue | null;
}

interface LegacyIssueRow {
  id: string;
  title: string;
  pdfOnSupabase: boolean;
  coverOnSupabase: boolean;
}

/**
 * GET /api/admin/storage
 * Returns a cross-referenced view of every object in R2 and every issue
 * whose URLs still point at the legacy Supabase Storage bucket.
 */
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. List every R2 object (paginated)
  const r2Objects: Array<Omit<R2ObjectRow, 'linkedIssue'>> = [];
  let token: string | undefined;
  do {
    const resp = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const obj of resp.Contents ?? []) {
      if (!obj.Key) continue;
      r2Objects.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ? obj.LastModified.toISOString() : null,
        publicUrl: r2PublicUrl(obj.Key),
      });
    }
    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token);

  // 2. Pull every issue's URL fields
  const db = getDb();
  const { data: issues, error: issuesErr } = await db
    .from('issues')
    .select('id, title, pdf_url, cover_image_url')
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  if (issuesErr) {
    return NextResponse.json({ error: issuesErr.message }, { status: 500 });
  }

  // 3. Build key → linkedIssue map for R2-hosted references
  const keyToIssue = new Map<string, LinkedIssue>();
  for (const issue of issues ?? []) {
    for (const field of ['pdf_url', 'cover_image_url'] as const) {
      const url = issue[field];
      if (!url || !isR2Url(url)) continue;
      const key = storageKeyFromUrl(url);
      if (key) {
        keyToIssue.set(key, { id: issue.id, title: issue.title, field });
      }
    }
  }

  // 4. Enrich R2 objects with linkage
  const r2Enriched: R2ObjectRow[] = r2Objects.map((obj) => ({
    ...obj,
    linkedIssue: keyToIssue.get(obj.key) ?? null,
  }));

  // 5. Legacy Supabase issues (pdf or cover still pointing at Supabase)
  const legacyIssues: LegacyIssueRow[] = (issues ?? [])
    .map((i) => {
      const pdfOnSupabase = !!i.pdf_url && isSupabaseStorageUrl(i.pdf_url);
      const coverOnSupabase = !!i.cover_image_url && isSupabaseStorageUrl(i.cover_image_url);
      return { id: i.id, title: i.title, pdfOnSupabase, coverOnSupabase };
    })
    .filter((i) => i.pdfOnSupabase || i.coverOnSupabase);

  return NextResponse.json({
    r2: {
      objects: r2Enriched,
      objectCount: r2Enriched.length,
      totalBytes: r2Enriched.reduce((s, o) => s + o.size, 0),
      orphanCount: r2Enriched.filter((o) => !o.linkedIssue).length,
      linkedCount: r2Enriched.filter((o) => o.linkedIssue).length,
    },
    supabaseLegacy: {
      issueCount: legacyIssues.length,
      issues: legacyIssues,
    },
  });
}

/**
 * DELETE /api/admin/storage
 * Body: { key: string }
 *
 * Removes the object from R2. If the deleted key was an issue's
 * `cover_image_url`, that column is also nulled so the UI doesn't render
 * a broken image. PDF URLs are NOT NULL in the schema and are left
 * pointing at the now-missing file — caller is expected to re-upload
 * (the admin UI surfaces the consequence before letting you delete).
 */
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const key =
    typeof body === 'object' && body !== null && 'key' in body && typeof (body as { key: unknown }).key === 'string'
      ? (body as { key: string }).key
      : null;
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  try {
    await deleteFromR2(key);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Delete failed: ' + message }, { status: 500 });
  }

  const db = getDb();
  const { data: issues } = await db.from('issues').select('id, cover_image_url');
  for (const issue of issues ?? []) {
    if (issue.cover_image_url && storageKeyFromUrl(issue.cover_image_url) === key) {
      await db.from('issues').update({ cover_image_url: null }).eq('id', issue.id);
    }
  }

  return NextResponse.json({ success: true });
}
