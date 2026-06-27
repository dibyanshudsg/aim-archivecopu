import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aim-archive/shared'],
  serverExternalPackages: ['pdf-parse', 'tesseract.js', 'canvas', 'pdfjs-dist'],
  images: {
    remotePatterns: [
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
