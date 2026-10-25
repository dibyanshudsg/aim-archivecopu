import { Suspense } from 'react';
import { getPublicNavigationFromDb } from '@/lib/db';
import { BookmarksClient } from './bookmarks-client';
import { BookmarksLoading } from './bookmarks-loading';

// Bookmarks live in localStorage, so the route renders its shell first and
// the client requests only the saved issue IDs instead of the full archive.
export const revalidate = 60;

async function BookmarksPageContent() {
  const navigation = await getPublicNavigationFromDb();
  return <BookmarksClient navigation={navigation} />;
}

export default function BookmarksPage() {
  return <Suspense fallback={<BookmarksLoading />}><BookmarksPageContent /></Suspense>;
}
