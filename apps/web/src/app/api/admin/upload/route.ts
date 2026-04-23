import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import { extractPdfText } from '@/lib/pdf-extract';
import { indexIssue } from '@/lib/search-indexer';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { issueUploadSchema, formatZodError } = await import('@/lib/validations');

  const formData = await request.formData();
  const file = formData.get('pdf') as File | null;

  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'A valid PDF file is required', code: 'VALIDATION' }, { status: 400 });
  }
  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF must be under 100MB', code: 'VALIDATION' }, { status: 400 });
  }

  const parsed = issueUploadSchema.safeParse({
    magazine_id: formData.get('magazine_id'),
    title: formData.get('title'),
    year: formData.get('year'),
    month: formData.get('month'),
    description: formData.get('description'),
    topics: formData.get('topics'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  const { magazine_id: magazineId, title, year, month, description, topics: topicsStr } = parsed.data;
  const topics = topicsStr ? topicsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const supabase = getClient();

  // Get magazine name for storage path
  const { data: mag } = await supabase.from('magazines').select('name').eq('id', magazineId).single();
  if (!mag) return NextResponse.json({ error: 'Magazine not found' }, { status: 404 });

  // Upload PDF to storage
  const storagePath = `${mag.name.replace(/ /g, '-').toLowerCase()}-${year}/${file.name.replace(/ /g, '-')}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from('magazines')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: 'Upload failed: ' + uploadErr.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('magazines').getPublicUrl(storagePath);

  // Create issue record
  const { data: issue, error: insertErr } = await supabase
    .from('issues')
    .insert({
      magazine_id: magazineId,
      title,
      year,
      month,
      description: description || null,
      topics,
      pdf_url: urlData.publicUrl,
      file_size_bytes: file.size,
      is_published: true,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Extract text from PDF and index for full-text search
  let pagesIndexed = 0;
  try {
    const pages = await extractPdfText(buffer);
    pagesIndexed = await indexIssue(supabase, issue.id, pages);
  } catch (extractErr) {
    console.error('PDF text extraction failed (can be retried via reindex):', extractErr);
  }

  return NextResponse.json({ ...issue, pages_indexed: pagesIndexed }, { status: 201 });
}
