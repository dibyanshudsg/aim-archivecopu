import { getPublicNavigationFromDb } from '@/lib/db';
import { SearchClient } from './search-client';
import { Suspense } from 'react';
import { SearchLoading } from './search-loading';

export const dynamic = 'force-dynamic';

async function SearchPageContent() {
  const navigation = await getPublicNavigationFromDb();
  return <SearchClient navigation={navigation} />;
}

export default function SearchPage() {
  return <Suspense fallback={<SearchLoading />}><SearchPageContent /></Suspense>;
}
