import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AIM Archive — Sri Aurobindo Society Magazine Archive',
    template: '%s | AIM Archive',
  },
  description:
    'Explore decades of spiritual wisdom from All India Magazine, Agnisikha, and other publications by Sri Aurobindo Society. Free digital archive of writings by Sri Aurobindo and The Mother.',
  keywords: [
    'Sri Aurobindo',
    'The Mother',
    'All India Magazine',
    'Agnisikha',
    'Sri Aurobindo Society',
    'spiritual magazine',
    'magazine archive',
    'Auroville',
    'yoga',
    'philosophy',
  ],
  openGraph: {
    title: 'AIM Archive — Sri Aurobindo Society Magazine Archive',
    description:
      'Free digital archive of All India Magazine and other Sri Aurobindo Society publications.',
    type: 'website',
    locale: 'en_IN',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-warm-white font-sans text-gray-900 antialiased">{children}</body>
    </html>
  );
}
