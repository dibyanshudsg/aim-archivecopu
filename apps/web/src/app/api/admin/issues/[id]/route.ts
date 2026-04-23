import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getClient();

  // Get issue to find PDF path for cleanup
  const { data: issue } = await supabase.from('issues').select('pdf_url').eq('id', id).single();

  const { error } = await supabase.from('issues').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Clean up storage if PDF was in our bucket
  if (issue?.pdf_url?.includes('supabase.co/storage')) {
    const path = issue.pdf_url.split('/magazines/')[1];
    if (path) await supabase.storage.from('magazines').remove([decodeURIComponent(path)]);
  }

  return NextResponse.json({ success: true });
}
