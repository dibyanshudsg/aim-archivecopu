import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('issues')
    .select('*, magazines!inner(id, name, language, description, cover_image_url)')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Issue not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  // Increment read count
  await supabase
    .from('issues')
    .update({ read_count: (data.read_count || 0) + 1 })
    .eq('id', id);

  return NextResponse.json(data);
}
