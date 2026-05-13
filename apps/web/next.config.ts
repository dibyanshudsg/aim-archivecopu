import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aim-archive/shared', '@aim-archive/supabase'],
  serverExternalPackages: ['pdf-parse', 'tesseract.js', 'canvas', 'pdfjs-dist'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Cloudflare R2 (dev URL — replace with custom domain when DNS is ready)
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
