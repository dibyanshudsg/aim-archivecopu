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

  const formData = await request.formData();
  const file = formData.get('pdf') as File | null;
  const magazineId = formData.get('magazine_id') as string;
  const title = formData.get('title') as string;
  const year = parseInt(formData.get('year') as string);
  const month = parseInt(formData.get('month') as string);
  const description = formData.get('description') as string;
  const topicsStr = formData.get('topics') as string;
  const topics = topicsStr ? topicsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];

  if (!file || !magazineId || !title || !year || !month) {
    return NextResponse.json({ error: 'Missing required fields', code: 'VALIDATION' }, { status: 400 });
  }

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
