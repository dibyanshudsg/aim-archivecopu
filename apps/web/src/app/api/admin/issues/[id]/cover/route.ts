import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import { cropAndUploadCover, type SpreadOrientation } from '@/lib/crop-cover-spread';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Recover the storage path used when the original PDF was uploaded.
 * `pdf_url` looks like:
 *   https://<project>.supabase.co/storage/v1/object/public/magazines/<storagePath>
 */
function storagePathFromPdfUrl(pdfUrl: string): string | null {
  const marker = '/magazines/';
  const i = pdfUrl.indexOf(marker);
  if (i < 0) return null;
  // Strip any query string (e.g. cache-bust ?v=…) before returning the storage path
  return pdfUrl.slice(i + marker.length).split('?')[0];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getClient();

  const { data: issue, error: fetchErr } = await supabase
    .from('issues')
    .select('id, pdf_url')
    .eq('id', id)
    .single();
  if (fetchErr || !issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const storagePath = storagePathFromPdfUrl(issue.pdf_url);
  if (!storagePath) {
    return NextResponse.json({ error: 'Could not derive storage path' }, { status: 500 });
  }

  const formData = await request.formData();
  const cover = formData.get('cover') as File | null;
  if (!cover || cover.size === 0 || !cover.type.startsWith('image/')) {
    return NextResponse.json({ error: 'A cover image is required' }, { status: 400 });
  }
  if (cover.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Cover image must be under 25MB' }, { status: 400 });
  }

  const orientationRaw = formData.get('cover_orientation');
  const orientation: SpreadOrientation =
    orientationRaw === 'front-left' ? 'front-left' : 'front-right';

  try {
    const buf = Buffer.from(await cover.arrayBuffer());
    const result = await cropAndUploadCover(supabase, buf, storagePath, orientation);

    const { error: upErr } = await supabase
      .from('issues')
      .update({ cover_image_url: result.publicUrl })
      .eq('id', id);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ cover_image_url: result.publicUrl, cropped: result.cropped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cover upload failed' },
      { status: 500 },
    );
  }
}
