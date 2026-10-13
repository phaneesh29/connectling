import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/faq',
        destination: '/faqs',
        permanent: true,
      },
      {
        source: '/webinar',
        destination: '/?mode=webinar',
        permanent: false,
      },
      {
        source: '/talk',
        destination: '/?mode=audio',
        permanent: false,
      },
      {
        source: '/meet',
        destination: '/?mode=meet',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/auth/:path*',
        destination: `${apiUrl}/api/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
