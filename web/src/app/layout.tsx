import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader, Geist_Mono } from 'next/font/google';
import { Navbar } from '@/components/navbar';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://connectling.vercel.app';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Connectling — Private Real-Time Video & Drop-In Audio Spaces',
    template: '%s | Connectling',
  },
  description:
    'Instant, privacy-first video conferencing and drop-in audio stages. Peer-to-peer WebRTC, zero recordings, and zero persistent data retention.',
  applicationName: 'Connectling',
  authors: [{ name: 'Connectling Team', url: siteUrl }],
  generator: 'Next.js',
  keywords: [
    'Connectling',
    'private video call',
    'drop-in audio spaces',
    'real-time meetings',
    'voice rooms',
    'webrtc meeting',
    'zero data retention',
    'encrypted conference',
    'no recording meetings',
    'browser audio spaces',
    'ephemeral voice chat',
    'peer-to-peer video',
    'collaborative audio stage',
    'zoom alternative private',
    'clubhouse alternative web',
    'instant meet spaces',
  ],
  creator: 'Connectling',
  publisher: 'Connectling',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Connectling',
    title: 'Connectling — Private Real-Time Video & Drop-In Audio Spaces',
    description:
      'Instant, privacy-first video conferencing and drop-in audio stages with zero data retention and peer-to-peer WebRTC.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Connectling — Private Real-Time Video & Drop-In Audio Spaces',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connectling — Private Real-Time Video & Drop-In Audio Spaces',
    description:
      'Instant, privacy-first video conferencing and drop-in audio stages with zero data retention and peer-to-peer WebRTC.',
    creator: '@connectling',
    site: '@connectling',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  category: 'technology',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Connectling',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
        width: 854,
        height: 818,
      },
      description:
        'Connectling provides privacy-first, zero-data real-time video conferencing and drop-in audio stages.',
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Connectling',
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
      inLanguage: 'en-US',
      description:
        'Private Real-Time Video & Drop-In Audio Spaces with zero recordings and zero data retention.',
    },
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}/#webapp`,
      name: 'Connectling',
      url: siteUrl,
      applicationCategory: 'CommunicationApplication',
      operatingSystem: 'All modern web browsers (Chrome, Firefox, Safari, Edge)',
      description:
        'Instant, privacy-first video conferencing and drop-in audio stages with zero recordings and zero data retention.',
      screenshot: `${siteUrl}/og-image.png`,
      image: `${siteUrl}/og-image.png`,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'High-definition WebRTC video conferencing',
        'Interactive drop-in audio spaces with host-moderated stages',
        'Zero persistent data retention architecture',
        'Instant room generation with one-click sharing',
        'In-call ephemeral chat and real-time reactions',
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased dark ${inter.variable} ${newsreader.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-black text-[#fcfdff] selection:bg-white/20 selection:text-white">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
