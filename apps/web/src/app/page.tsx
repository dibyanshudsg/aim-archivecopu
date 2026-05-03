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

export default async function HomePage() {
  const recentIssues = await fetchRecentIssues();

  return <HomeClient recentIssues={recentIssues} />;
}
