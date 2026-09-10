import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://connectling.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/terms'],
        disallow: ['/meet/*', '/talk/*', '/profile/*', '/api/*'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
