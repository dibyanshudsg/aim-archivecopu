import { getPublicNavigationFromDb } from '@/lib/db';
import { SearchClient } from './search-client';
import { Suspense } from 'react';

// ISR: cache the search shell HTML for a minute. Search data and the optional
// magazine filter load on the client so route navigation never waits on them.
export const revalidate = 60;

export default async function SearchPage() {
  const navigation = await getPublicNavigationFromDb();
  return <Suspense fallback={<main className="p-8" aria-busy="true">Loading search…</main>}><SearchClient navigation={navigation} /></Suspense>;
}
