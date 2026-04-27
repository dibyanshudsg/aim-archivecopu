import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** POST /api/admin/topics/rename  body: { from, to } → rename across every issue */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { from, to } = await request.json();
  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  }
  const newName = to.trim().slice(0, 100);
  if (!newName) return NextResponse.json({ error: 'to cannot be empty' }, { status: 400 });
  if (from === newName) return NextResponse.json({ success: true, updated: 0 });

  const supabase = getClient();
  const { data: affected, error: selErr } = await supabase
    .from('issues')
    .select('id, topics')
    .contains('topics', [from]);

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  let updated = 0;
  for (const issue of affected ?? []) {
    const replaced = (issue.topics as string[]).map((t) => (t === from ? newName : t));
    const deduped = [...new Set(replaced)];
    deduped.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const { error: updErr } = await supabase
      .from('issues')
      .update({ topics: deduped })
      .eq('id', issue.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    updated++;
  }

  return NextResponse.json({ success: true, updated });
}
