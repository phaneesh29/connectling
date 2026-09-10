import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Video Space',
  description: 'Private encrypted video conference on Connectling.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MeetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
