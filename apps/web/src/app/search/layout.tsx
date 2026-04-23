import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search',
  description:
    'Full-text search across every page of every issue in the AIM Archive. Find spiritual wisdom from Sri Aurobindo and The Mother with highlighted snippets.',
  openGraph: {
    title: 'Search the Archive | AIM Archive',
    description: 'Full-text search across decades of spiritual literature.',
  },
  alternates: { canonical: '/search' },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
