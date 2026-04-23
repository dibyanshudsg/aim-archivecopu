import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Bookmarks',
  description: 'Your saved magazine issues from the AIM Archive.',
  robots: { index: false },
  alternates: { canonical: '/bookmarks' },
};

export default function BookmarksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
