import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getClient();

  const [magazines, issues] = await Promise.all([
    supabase.from('magazines').select('id', { count: 'exact', head: true }),
    supabase.from('issues').select('id, read_count, download_count'),
  ]);

  const issueData = issues.data || [];
  const reads = issueData.reduce((sum, i) => sum + (i.read_count || 0), 0);
  const downloads = issueData.reduce((sum, i) => sum + (i.download_count || 0), 0);

  // Most popular issues
  const { data: popular } = await supabase
    .from('issues')
    .select('id, title, read_count, download_count')
    .order('read_count', { ascending: false })
    .limit(5);

  return NextResponse.json({
    totalMagazines: magazines.count || 0,
    totalIssues: issueData.length,
    totalReads: reads,
    totalDownloads: downloads,
    popularIssues: popular || [],
  });
}
