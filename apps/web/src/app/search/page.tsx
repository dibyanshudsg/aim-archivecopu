import { getPublicNavigationFromDb } from '@/lib/db';
import { SearchClient } from './search-client';
import { Suspense } from 'react';
import { SearchLoading } from './search-loading';

// ISR: cache the search shell HTML for a minute. Stream its loading layout
// while navigation data resolves; search data loads on the client.
export const revalidate = 60;

async function SearchPageContent() {
  const navigation = await getPublicNavigationFromDb();
  return <SearchClient navigation={navigation} />;
}

export default function SearchPage() {
  return <Suspense fallback={<SearchLoading />}><SearchPageContent /></Suspense>;
}
