import type { NextConfig } from 'next';
import { realpathSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

// Trace the real pnpm package directory, not files beneath its symlink.
// Vercel cannot package a path as both a symlink and a parent directory.
const pdfJsDirectory = dirname(realpathSync(require.resolve('pdfjs-dist/package.json')));
const pdfJsFontFiles = `${relative(__dirname, pdfJsDirectory).replace(/\\/g, '/')}/standard_fonts/**/*`;
// The reader follows short-lived signed redirects to R2; its worker and fonts
// are hosted by this application. Next.js still emits inline bootstrap scripts,
// so script-src must permit those until nonce-based dynamic rendering is adopted.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://pub-3ed08073797148cf93d772ea1eb341f9.r2.dev",
  "font-src 'self' data:",
  "connect-src 'self' https://*.r2.cloudflarestorage.com",
  "worker-src 'self' blob:",
  "frame-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // Allow verification builds alongside an active local development server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['@aim-archive/shared'],
  serverExternalPackages: ['pdf-parse', 'tesseract.js', 'canvas', 'pdfjs-dist'],
  outputFileTracingRoot: resolve(__dirname, '../..'),
  outputFileTracingIncludes: {
    '/api/admin/*': [pdfJsFontFiles],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/pdf.worker-4.8.69.min.mjs',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  images: {
    // Authenticated/catalogue cover routes must never enter the shared optimizer cache.
    localPatterns: [{ pathname: '/logo.png' }, { pathname: '/icon.png' }, { pathname: '/_next/static/media/**' }],
    remotePatterns: [
      ...(process.env.R2_PUBLIC_BASE_URL ? [{
        protocol: 'https' as const,
        hostname: new URL(process.env.R2_PUBLIC_BASE_URL).hostname,
      }] : []),
      {
        protocol: 'https',
        hostname: 'pub-3ed08073797148cf93d772ea1eb341f9.r2.dev',
      },
    ],
  },
  webpack: (config) => {
    // Required for react-pdf
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
