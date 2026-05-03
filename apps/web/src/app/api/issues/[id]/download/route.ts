import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createPublicClient } from '@/lib/supabase-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createPublicClient();

  const { data: issue, error } = await supabase
    .from('issues')
    .select('id, pdf_url')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error || !issue?.pdf_url) {
    return NextResponse.json({ error: 'Issue not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const adminSupabase = createAdminClient();
  const { error: incrementError } = await adminSupabase.rpc('increment_issue_download_count', {
    issue_id: id,
  });
  if (incrementError) {
    console.error('Failed to increment download count:', incrementError);
  }

  return NextResponse.redirect(issue.pdf_url);
}
