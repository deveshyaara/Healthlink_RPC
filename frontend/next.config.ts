import type { NextConfig } from "next";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  
  // Production-ready TypeScript configuration
  typescript: {
    ignoreBuildErrors: false, // Enforce TypeScript in production
  },
  
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint during production builds to avoid style-only failures
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Webpack configuration
  webpack: (config: any) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = config.resolve.fallback || {};
    return config;
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.app.github.dev', // Codespaces
      },
    ],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ],
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: '2.0.0',
    NEXT_PUBLIC_APP_NAME: 'HealthLink Pro',
  },
};

export default nextConfig;
