import { Suspense } from 'react';
import { createPublicClient } from '@/lib/supabase-server';
import { BrowseClient } from './browse-client';
import type { ApiIssue, ApiMagazine } from '@/lib/api';

// Edge-cache the server-rendered HTML for a minute. Stale-while-revalidate
// behavior is implicit with Next's ISR — visitors past the 60 s mark get a
// stale render instantly while the next request rebuilds in the background.
export const revalidate = 60;

async function fetchInitialBrowseData(): Promise<{
  issues: ApiIssue[];
  magazines: ApiMagazine[];
}> {
  const supabase = createPublicClient();

  const [issuesRes, magazinesRes] = await Promise.all([
    supabase
      .from('issues')
      .select('*, magazines!inner(id, name, language, description, cover_image_url)')
      .eq('is_published', true)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .range(0, 99),
    supabase.from('magazines').select('*').order('name'),
  ]);

  return {
    issues: (issuesRes.data ?? []) as ApiIssue[],
    magazines: (magazinesRes.data ?? []) as ApiMagazine[],
  };
}

export default async function BrowsePage() {
  const { issues, magazines } = await fetchInitialBrowseData();

  return (
    <Suspense fallback={null}>
      <BrowseClient initialIssues={issues} initialMagazines={magazines} />
    </Suspense>
  );
}
