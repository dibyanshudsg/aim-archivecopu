import { createPublicClient } from '@/lib/supabase-server';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
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

interface CarouselData {
  magazines: ApiMagazine[];
  issues: ApiIssue[];
}

/**
 * Up to 3 most recent published issues per magazine — feeds the
 * "This Month's Editions" carousel. Returns the magazines list too so the
 * carousel can render its magazine filter chips even before any issue is
 * present for a particular publication.
 *
 * Magazines ordered by `created_at` ASC so AIM (the original) comes first,
 * Agnishikha next, then future Tamil/Marathi/Bengali editions in the order
 * Hemlata Di adds them. Issues per magazine ordered newest-first.
 */
async function fetchCarouselData(): Promise<CarouselData> {
  const supabase = createPublicClient();

  const { data: magazinesRaw } = await supabase
    .from('magazines')
    .select('*')
    .order('created_at', { ascending: true });

  const magazines = (magazinesRaw ?? []) as ApiMagazine[];
  if (magazines.length === 0) return { magazines: [], issues: [] };

  // Fan out — 3 most recent issues per magazine, in parallel. Small magazine
  // count makes this faster + clearer than a window-function RPC.
  const queries = magazines.map((m) =>
    supabase
      .from('issues')
      .select('*, magazines!inner(id, name, language, description, cover_image_url)')
      .eq('is_published', true)
      .eq('magazine_id', m.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3),
  );

  const results = await Promise.all(queries);
  const issues = results.flatMap((r) =>
    r.error || !r.data ? [] : (r.data as ApiIssue[]),
  );

  return { magazines, issues };
}

export default async function HomePage() {
  const [recentIssues, carousel] = await Promise.all([
    fetchRecentIssues(),
    fetchCarouselData(),
  ]);

  return (
    <HomeClient
      recentIssues={recentIssues}
      carouselMagazines={carousel.magazines}
      carouselIssues={carousel.issues}
    />
  );
}
