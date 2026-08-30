'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';
import { AudioWaveformIcon, LogOutIcon } from '@animateicons/react/lucide';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  // Do not render the global navbar inside active meeting/audio room pages
  if (pathname.startsWith('/meet/') || pathname.startsWith('/talk/')) {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/login');
          },
        },
      });
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-black/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand & Main Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <AudioWaveformIcon
              size={17}
              className="text-[#fcfdff] transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-serif-headline text-base text-[#fcfdff] tracking-tight font-normal">
              Connectling
            </span>
          </Link>

          {session && (
            <nav className="hidden sm:flex items-center gap-6">
              <Link
                href="/"
                className={`text-xs transition-colors duration-150 ${
                  isActive('/')
                    ? 'text-[#fcfdff] font-medium'
                    : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
              >
                Spaces
              </Link>
              <Link
                href="/profile"
                className={`text-xs transition-colors duration-150 ${
                  isActive('/profile')
                    ? 'text-[#fcfdff] font-medium'
                    : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
              >
                Profile
              </Link>
            </nav>
          )}
        </div>

        {/* User / CTA */}
        <div className="flex items-center gap-4">
          {isPending ? (
            <div className="h-6 w-16 bg-white/[0.06] animate-pulse rounded" />
          ) : session ? (
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="flex items-center gap-2 text-xs text-[#888e90] hover:text-[#fcfdff] transition-colors"
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={20}
                    height={20}
                    unoptimized
                    className="w-5 h-5 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono text-[#fcfdff]">
                    {session.user.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="hidden sm:inline max-w-[120px] truncate text-xs">
                  {session.user.name}
                </span>
              </Link>

              <div className="h-3 w-px bg-white/[0.10]" />

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                title="Sign out"
                className="text-[#888e90] hover:text-[#fcfdff] p-1 transition-colors disabled:opacity-50"
              >
                {signingOut ? (
                  <div className="animate-spin h-3 w-3 border border-white/30 border-t-white rounded-full" />
                ) : (
                  <LogOutIcon size={14} />
                )}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-3.5 py-1.5 bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium text-xs rounded-md transition-all active:scale-[0.98]"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
