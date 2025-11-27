/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow remote images from Picsum and other trusted hosts
  images: {
    domains: ['picsum.photos'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Dev-time proxy: forward /api/* requests to the backend
  // This eliminates CORS issues during development
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;
