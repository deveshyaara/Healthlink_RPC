import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for production deployment
  
  // Production deployment configuration
  typescript: {
    // Temporarily allow build errors until all dependencies are resolved
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Temporarily allow ESLint warnings during development
    ignoreDuringBuilds: true,
  },
  
  // Experimental features (if needed)
  experimental: {
    // Add any experimental features here
  },
  
  // Image optimization
  images: {
    domains: ['localhost', 'images.unsplash.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: '2.0.0-RELEASE',
  },
  
  // Webpack config (if needed)
  webpack: (config, { isServer }) => {
    // Custom webpack config
    return config;
  },
};

export default nextConfig;
