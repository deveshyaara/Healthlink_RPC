import type { NextConfig } from "next";

// LOW-SPEC OPTIMIZED NEXT.JS CONFIGURATION
// Target: 1-2 vCPUs, 2-4GB RAM
// Optimizations: Standalone output, minimal dependencies, aggressive caching

const nextConfig: NextConfig = {
  // CRITICAL: Enable standalone output (reduces build size from 300MB → 100MB)
  output: 'standalone',
  
  // Strict mode for production
  reactStrictMode: true,
  
  // Disable telemetry to save CPU/memory
  // Equivalent to setting NEXT_TELEMETRY_DISABLED=1
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Experimental features for performance
  experimental: {
    // Enable PPR (Partial Prerendering) for better caching
    ppr: false, // Disabled for stability on low-spec
    
    // Optimize CSS loading
    optimizeCss: true,
    
    // Reduce memory usage during builds
    workerThreads: false,
    
    // Disable source maps in production (saves memory)
    // Use the top-level `productionBrowserSourceMaps` setting instead.
  },
  
  // Image optimization (use external CDN for low-spec deployments)
  images: {
    // Disable built-in image optimization (high memory usage)
    unoptimized: true,
    
    // If you use external CDN, configure domains here
    domains: [],
  },
  
  // Production-only optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Minimize bundle size
    productionBrowserSourceMaps: false,
    
    // Disable React DevTools in production
    reactProductionProfiling: false,
  }),
  
  // Backend API proxy configuration (keep for middleware communication)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  
  // Headers for aggressive caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Webpack optimizations for low-spec builds
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Minimize bundle size
      config.optimization = {
        ...config.optimization,
        minimize: true,
        // Use single chunk for smaller memory footprint
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Single vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Single common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
