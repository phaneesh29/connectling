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
    'video conferencing',
    'real-time meetings',
    'drop-in audio stages',
    'voice rooms',
    'private video call',
    'webrtc meeting',
    'zero data retention',
    'encrypted conference',
    'no recording meetings',
    'browser audio spaces',
    'collaborative audio',
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connectling — Private Real-Time Video & Drop-In Audio Spaces',
    description:
      'Instant, privacy-first video conferencing and drop-in audio stages with zero data retention and peer-to-peer WebRTC.',
    creator: '@connectling',
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
  category: 'technology',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Connectling',
  url: siteUrl,
  applicationCategory: 'CommunicationApplication',
  operatingSystem: 'Any',
  description:
    'Instant, privacy-first video conferencing and drop-in audio stages with zero recordings and zero data retention.',
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
