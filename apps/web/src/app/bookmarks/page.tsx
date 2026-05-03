import { Suspense } from 'react';
import { createPublicClient } from '@/lib/supabase-server';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { BookmarksClient } from './bookmarks-client';

// Bookmarks live in localStorage so the page is inherently client-stateful,
// but the issue catalog can still be pre-rendered. We fetch every published
// issue once on the server (small archive — full list is cheap) and let the
// client filter it down to the user's bookmarked IDs.
export const revalidate = 60;

async function fetchAllIssuesServer(): Promise<ApiIssue[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('issues')
    .select('*, magazines!inner(id, name, language, description, cover_image_url)')
    .eq('is_published', true)
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  return (data ?? []) as ApiIssue[];
}

async function fetchAllMagazinesServer(): Promise<ApiMagazine[]> {
  const supabase = createPublicClient();
  const { data } = await supabase.from('magazines').select('*').order('name');
  return (data ?? []) as ApiMagazine[];
}

export default async function BookmarksPage() {
  const [allIssues, allMagazines] = await Promise.all([
    fetchAllIssuesServer(),
    fetchAllMagazinesServer(),
  ]);
  return (
    <Suspense fallback={null}>
      <BookmarksClient allIssues={allIssues} allMagazines={allMagazines} />
    </Suspense>
  );
}
