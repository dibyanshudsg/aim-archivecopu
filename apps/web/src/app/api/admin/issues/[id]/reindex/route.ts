import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import { indexIssueFromUrl } from '@/lib/search-indexer';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getClient();

  const { data: issue, error } = await supabase
    .from('issues')
    .select('id, title, pdf_url')
    .eq('id', id)
    .single();

  if (error || !issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  try {
    const pagesIndexed = await indexIssueFromUrl(supabase, issue.id, issue.pdf_url);
    return NextResponse.json({
      success: true,
      issue: issue.title,
      pagesIndexed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Indexing failed: ${message}` }, { status: 500 });
  }
}
