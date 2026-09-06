import type { Metadata } from 'next';
import { Inter, Aboreto, Tiro_Devanagari_Hindi, Tangerine } from 'next/font/google';
import '@/styles/globals.css';
import { ContinueReadingFab } from '@/components/layout/continue-reading-fab';
import { PageTransition } from '@/components/layout/page-transition';

// Each next/font is given a UNIQUE CSS variable name. The composed
// `--font-heading` / `--font-sans` / etc. tokens in `globals.css` then
// reference these variables so the actual loaded font-family strings
// (which next/font obfuscates, like `__Aboreto_abc123`) get substituted
// into the cascade at render time. Without this composition, only the
// primary font of each token would actually load — fallback fonts
// (e.g. Tiro Devanagari Hindi for Hindi glyphs) would silently miss.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const aboreto = Aboreto({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-aboreto',
  display: 'swap',
});

const tiroDevanagari = Tiro_Devanagari_Hindi({
  subsets: ['devanagari'],
  weight: ['400'],
  variable: '--font-tiro-deva',
  display: 'swap',
});

const tangerine = Tangerine({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-tangerine',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AIM Archive — Sri Aurobindo Society Magazine Archive',
    template: '%s | AIM Archive',
  },
  description:
    'Explore Sri Aurobindo Society magazine editions and writings by Sri Aurobindo and The Mother. Editions enter the free public archive five years after publication.',
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
      'Explore Sri Aurobindo Society magazines. Editions become freely readable five years after publication.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'AIM Archive',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'AIM Archive Logo' }],
  },
  twitter: {
    card: 'summary',
    title: 'AIM Archive — Sri Aurobindo Society Magazine Archive',
    description:
      'Explore Sri Aurobindo Society magazines. Editions become freely readable five years after publication.',
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
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${aboreto.variable} ${tiroDevanagari.variable} ${tangerine.variable}`}
    >
      <body className="bg-warm-white font-sans text-gray-900 antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <PageTransition>{children}</PageTransition>
        <ContinueReadingFab />
      </body>
    </html>
  );
}
