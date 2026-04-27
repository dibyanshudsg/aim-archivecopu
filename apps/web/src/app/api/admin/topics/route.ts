import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** GET /api/admin/topics → list of all topics with usage counts */
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getClient();
  const { data, error } = await supabase.from('issues').select('topics');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const t of (row.topics as string[]) ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  const topics = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return NextResponse.json(topics);
}

/** DELETE /api/admin/topics  body: { name } → remove topic from every issue */
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const supabase = getClient();
  const { data: affected, error: selErr } = await supabase
    .from('issues')
    .select('id, topics')
    .contains('topics', [name]);

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  let updated = 0;
  for (const issue of affected ?? []) {
    const next = (issue.topics as string[]).filter((t) => t !== name);
    const { error: updErr } = await supabase
      .from('issues')
      .update({ topics: next })
      .eq('id', issue.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    updated++;
  }

  return NextResponse.json({ success: true, updated });
}
