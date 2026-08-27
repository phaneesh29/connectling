import type { Metadata } from 'next';
import { Inter, Newsreader, Geist_Mono } from 'next/font/google';
import { Navbar } from '@/components/navbar';
import './globals.css';

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

export const metadata: Metadata = {
  title: 'Connectling — Real-Time Meetings & Voice Stages',
  description: 'Instant video conferences and drop-in audio rooms with zero friction.',
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
      <body className="min-h-full flex flex-col bg-black text-[#fcfdff] selection:bg-white/20 selection:text-white">
        <Navbar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
