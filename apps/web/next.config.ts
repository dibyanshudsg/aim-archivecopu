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
    ],
  },
  webpack: (config) => {
    // Required for react-pdf
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
