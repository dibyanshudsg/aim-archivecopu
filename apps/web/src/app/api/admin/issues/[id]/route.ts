import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import {
  deleteFromR2,
  isR2Url,
  isSupabaseStorageUrl,
  storageKeyFromUrl,
} from '@/lib/r2-client';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { issueUpdateSchema, formatZodError } = await import('@/lib/validations');
  const body = await request.json();
  const parsed = issueUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('issues')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * Delete an issue and clean up its stored files.
 *
 * Files may live on R2 (new uploads) or Supabase Storage (legacy, pre-migration);
 * we look at each URL and clean up the correct backend. Both `pdf_url` and
 * `cover_image_url` are removed — earlier code only cleaned up the PDF and
 * leaked the cover.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getClient();

  const { data: issue } = await supabase
    .from('issues')
    .select('pdf_url, cover_image_url')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('issues').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cleanups: Array<string | null | undefined> = [issue?.pdf_url, issue?.cover_image_url];
  for (const url of cleanups) {
    if (!url) continue;
    const key = storageKeyFromUrl(url);
    if (!key) continue;
    try {
      if (isR2Url(url)) {
        await deleteFromR2(key);
      } else if (isSupabaseStorageUrl(url)) {
        await supabase.storage.from('magazines').remove([key]);
      }
    } catch (cleanupErr) {
      console.error(`Storage cleanup failed for ${url}:`, cleanupErr);
    }
  }

  return NextResponse.json({ success: true });
}
