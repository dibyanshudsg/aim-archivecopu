import { Suspense } from 'react';
import { listMagazines, listPublicIssues } from '@/lib/db';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { BookmarksClient } from './bookmarks-client';

// Bookmarks live in localStorage so the page is inherently client-stateful,
// but the issue catalog can still be pre-rendered. We fetch every published
// issue once on the server (small archive — full list is cheap) and let the
// client filter it down to the user's bookmarked IDs.
export const revalidate = 60;

async function fetchAllIssuesServer(): Promise<ApiIssue[]> {
  const result = await listPublicIssues({
    availability: 'all',
    years: [],
    months: [],
    magazines: [],
    languages: [],
    subjects: [],
    q: '',
    sort: null,
    dir: 'desc',
    page: 1,
    pageSize: 100,
  });
  return result.data;
}

async function fetchAllMagazinesServer(): Promise<ApiMagazine[]> {
  return listMagazines();
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
