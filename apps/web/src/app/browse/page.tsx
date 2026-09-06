import { Suspense } from 'react';
import { BrowseClient } from './browse-client';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { getPublicNavigationFromDb } from '@/lib/db';
import {
  listPublicIssues,
  parsePublicIssueListInput,
  type BrowseFacets,
} from '@/lib/public-issues';

// Edge-cache the server-rendered HTML for a minute. Stale-while-revalidate
// behavior is implicit with Next's ISR — visitors past the 60 s mark get a
// stale render instantly while the next request rebuilds in the background.
export const revalidate = 60;

async function fetchInitialBrowseData(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<{
  issues: ApiIssue[];
  magazines: ApiMagazine[];
  total: number;
  totalPages: number;
  facets: BrowseFacets;
}> {
  const result = await listPublicIssues(
    parsePublicIssueListInput({ ...searchParams, page_size: searchParams.page_size ?? '24' }),
  );

  return {
    issues: result.data,
    magazines: result.magazines,
    total: result.total,
    totalPages: result.totalPages,
    facets: result.facets,
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [{ issues, magazines, total, totalPages, facets }, navigation] = await Promise.all([
    fetchInitialBrowseData(params),
    getPublicNavigationFromDb(),
  ]);

  return (
    <Suspense fallback={null}>
      <BrowseClient
        initialIssues={issues}
        initialMagazines={magazines}
        initialTotal={total}
        initialTotalPages={totalPages}
        initialFacets={facets}
        navigation={navigation}
      />
    </Suspense>
  );
}
