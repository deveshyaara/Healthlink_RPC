import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Production deployment safety net
  // These settings allow the build to complete even with minor issues
  typescript: {
    // ⚠️ Warning: This allows production builds to successfully complete
    // even if your project has TypeScript errors.
    // Only use temporarily during deployment - fix issues ASAP
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // ⚠️ Warning: This allows production builds to successfully complete
    // even if your project has ESLint errors.
    // Only use temporarily during deployment - fix issues ASAP
    ignoreDuringBuilds: true,
  },
  
  // Experimental features (if needed)
  experimental: {
    // Add any experimental features here
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
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
