import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Archive',
  description:
    'Browse Sri Aurobindo Society editions by magazine, year, language, or topic. Featured issues are readable now; other editions open after five years.',
  openGraph: {
    title: 'Browse Archive | AIM Archive',
    description: 'Browse the online collection of Sri Aurobindo Society magazines.',
  },
  alternates: { canonical: '/browse' },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
