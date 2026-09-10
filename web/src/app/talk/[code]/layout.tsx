import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audio Stage',
  description: 'Private drop-in audio room on Connectling.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TalkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
