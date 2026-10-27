import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { WebVitals } from '@/components/web-vitals';
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
const inter = localFont({
  src: './fonts/Inter-variable.woff2',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
});

const aboreto = localFont({
  src: './fonts/Aboreto-Regular.woff2',
  weight: '400',
  variable: '--font-aboreto',
  display: 'swap',
});

const tiroDevanagari = localFont({
  src: './fonts/TiroDevanagariHindi-Regular.woff2',
  weight: '400',
  variable: '--font-tiro-deva',
  display: 'swap',
});

const tangerine = localFont({
  src: [
    { path: './fonts/Tangerine-Regular.woff2', weight: '400' },
    { path: './fonts/Tangerine-Bold.woff2', weight: '700' },
  ],
  variable: '--font-tangerine',
  preload: false,
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AIM Archive — Sri Aurobindo Society Magazine Archive',
    template: '%s | AIM Archive',
  },
  description:
    'Explore Sri Aurobindo Society magazine editions and writings by Sri Aurobindo and The Mother. Featured issues are readable now; other editions enter the free public archive after five years.',
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
      'Explore featured Sri Aurobindo Society issues and a growing public archive.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'AIM Archive',
    images: [{ url: '/api/brand/social', width: 1200, height: 1200, alt: 'AIM Archive Logo' }],
  },
  twitter: {
    card: 'summary',
    title: 'AIM Archive — Sri Aurobindo Society Magazine Archive',
    description:
      'Explore featured Sri Aurobindo Society issues and a growing public archive.',
    images: ['/api/brand/social'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: '/',
  },
  icons: { icon: '/api/brand/favicon', apple: '/api/brand/favicon' },
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
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aimarchive.aurosociety.org'}/api/brand/logo`,
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
        {process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS === 'true' && <WebVitals />}
      </body>
    </html>
  );
}
