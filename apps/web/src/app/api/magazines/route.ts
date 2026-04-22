import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('magazines')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
  }

  return NextResponse.json(data);
}
