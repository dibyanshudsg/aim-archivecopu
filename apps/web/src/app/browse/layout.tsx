import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Archive',
  description:
    'Browse listed Sri Aurobindo Society magazine editions by magazine, year, language, or topic. Public reading opens five years after publication.',
  openGraph: {
    title: 'Browse Archive | AIM Archive',
    description: 'Browse the online collection of Sri Aurobindo Society magazines.',
  },
  alternates: { canonical: '/browse' },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
