import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to Connectling to access encrypted video conferences, audio stages, and instant spaces.',
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'Sign In | Connectling',
    description:
      'Access encrypted video conferences, audio stages, and instant spaces on Connectling.',
    url: '/login',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
