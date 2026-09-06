import { Suspense } from 'react';
import { getPublicNavigationFromDb } from '@/lib/db';
import { BookmarksClient } from './bookmarks-client';

// Bookmarks live in localStorage, so the route renders its shell first and
// the client requests only the saved issue IDs instead of the full archive.
export const revalidate = 60;

export default async function BookmarksPage() {
  const navigation = await getPublicNavigationFromDb();
  return (
    <Suspense fallback={null}>
      <BookmarksClient navigation={navigation} />
    </Suspense>
  );
}
