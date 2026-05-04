import type { Metadata } from 'next';
import { Inter, Aboreto, Tiro_Devanagari_Hindi, Tangerine } from 'next/font/google';
import '@/styles/globals.css';
import { ContinueReadingFab } from '@/components/layout/continue-reading-fab';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Aboreto: elegant display serif used for all headings (sections, issue titles,
// theme titles, etc.). Single-weight 400 — `font-synthesis: none` in globals.css
// prevents browsers from faux-bolding it on `font-bold` utilities.
const aboretoHeading = Aboreto({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-heading',
  display: 'swap',
});

const aboretoDisplay = Aboreto({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
});

// Devanagari fallback — Tiro Devanagari Hindi is John Hudson's purpose-designed
// devanagari typeface, calibrated to pair gracefully with Latin display fonts
// like Aboreto. Single weight 400, with proper Devanagari glyph proportions
// so Hindi headings sit visually balanced alongside English ones.
const tiroDevanagari = Tiro_Devanagari_Hindi({
  subsets: ['devanagari'],
  weight: ['400'],
  variable: '--font-heading-deva',
  display: 'swap',
});

const tangerine = Tangerine({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-cursive',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AIM Archive — Sri Aurobindo Society Magazine Archive',
    template: '%s | AIM Archive',
  },
  description:
    'Explore decades of spiritual wisdom from All India Magazine, Agnishikha, and other publications by Sri Aurobindo Society. Free digital archive of writings by Sri Aurobindo and The Mother.',
  keywords: [
    'Sri Aurobindo',
    'The Mother',
    'All India Magazine',
    'Agnishikha',
    'Sri Aurobindo Society',
    'spiritual magazine',
    'magazine archive',
    'Auroville',
    'yoga',
    'philosophy',
    'spirituality',
    'integral yoga',
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://aimarchive.aurosociety.org'),
  openGraph: {
    title: 'AIM Archive — Sri Aurobindo Society Magazine Archive',
    description:
      'Free digital archive of All India Magazine and other Sri Aurobindo Society publications.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'AIM Archive',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'AIM Archive Logo' }],
  },
  twitter: {
    card: 'summary',
    title: 'AIM Archive — Sri Aurobindo Society Magazine Archive',
    description:
      'Free digital archive of All India Magazine and other Sri Aurobindo Society publications.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: '/',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AIM Archive',
  description:
    'Digital archive of All India Magazine, Agnishikha, and other Sri Aurobindo Society publications.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://aimarchive.aurosociety.org',
  publisher: {
    '@type': 'Organization',
    name: 'Sri Aurobindo Society',
    url: 'https://aurosociety.org',
    logo: {
      '@type': 'ImageObject',
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aimarchive.aurosociety.org'}/logo.png`,
    },
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aimarchive.aurosociety.org'}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${aboretoHeading.variable} ${aboretoDisplay.variable} ${tiroDevanagari.variable} ${tangerine.variable}`}>
      <body className="bg-warm-white font-sans text-gray-900 antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <ContinueReadingFab />
      </body>
    </html>
  );
}
