import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createPublicClient } from '@/lib/supabase-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('issues')
    .select('*, magazines!inner(id, name, language, description, cover_image_url)')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Issue not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  // Atomic, fire-and-forget analytics increment. The public read above keeps
  // draft visibility governed by RLS / is_published before the admin client is used.
  const adminSupabase = createAdminClient();
  const { error: incrementError } = await adminSupabase.rpc('increment_issue_read_count', {
    issue_id: id,
  });
  if (incrementError) {
    console.error('Failed to increment read count:', incrementError);
  }

  return NextResponse.json(data);
}
