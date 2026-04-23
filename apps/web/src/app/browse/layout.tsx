import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Archive',
  description:
    'Browse the complete archive of All India Magazine, Agnisikha, and other Sri Aurobindo Society publications. Filter by magazine, year, language, or topic.',
  openGraph: {
    title: 'Browse Archive | AIM Archive',
    description: 'Browse the complete collection of Sri Aurobindo Society magazines.',
  },
  alternates: { canonical: '/browse' },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
