import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search',
  description:
    'Search AIM Archive titles, themes, topics, and indexed page text. Find readable editions and explore the wider catalogue.',
  openGraph: {
    title: 'Search the Archive | AIM Archive',
    description: 'Full-text search across decades of spiritual literature.',
  },
  alternates: { canonical: '/search' },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
