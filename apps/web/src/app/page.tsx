import { createPublicClient } from '@/lib/supabase-server';
import type { ApiIssue } from '@/lib/api';
import { HomeClient } from './home-client';

export const revalidate = 60;

async function fetchRecentIssues(): Promise<ApiIssue[]> {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('issues')
    .select('*, magazines!inner(id, name, language, description, cover_image_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(8);

  return (data ?? []) as ApiIssue[];
}

/**
 * One issue per magazine — the most recent published issue. Used by the
 * "This Month's Editions" featured section. Done in two queries (magazines,
 * then most-recent issue per magazine) instead of `DISTINCT ON` because
 * Supabase's PostgREST builder doesn't expose that operator cleanly.
 */
async function fetchFeaturedIssues(): Promise<ApiIssue[]> {
  const supabase = createPublicClient();

  // Magazines, sorted by created_at ASC so AIM (the original) comes first,
  // Agnishikha next, then any future Tamil/Marathi/Bengali editions in the
  // order Hemlata Di adds them. Display order on the homepage follows this.
  const { data: magazines } = await supabase
    .from('magazines')
    .select('id')
    .order('created_at', { ascending: true });

  if (!magazines || magazines.length === 0) return [];

  // Fan out — one query per magazine, in parallel. With a small magazine
  // count (2 today, ~6 long-term), this is faster and clearer than a single
  // window-function query and avoids needing an RPC.
  const queries = magazines.map((m) =>
    supabase
      .from('issues')
      .select('*, magazines!inner(id, name, language, description, cover_image_url)')
      .eq('is_published', true)
      .eq('magazine_id', m.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  );

  const results = await Promise.all(queries);
  return results
    .map((r) => (r.error || !r.data ? null : (r.data as ApiIssue)))
    .filter((i): i is ApiIssue => i !== null);
}

export default async function HomePage() {
  const [recentIssues, featuredIssues] = await Promise.all([
    fetchRecentIssues(),
    fetchFeaturedIssues(),
  ]);

  return <HomeClient recentIssues={recentIssues} featuredIssues={featuredIssues} />;
}
