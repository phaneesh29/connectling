'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';
import { AudioWaveformIcon, LogOutIcon, SparklesIcon } from '@animateicons/react/lucide';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  const userInitial = session?.user?.name ? session.user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full glass-navbar transition-all duration-300">
      <div className="max-w-5xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand & Main Nav */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-lg bg-white/[0.08] border border-white/[0.16] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] transition-all duration-200 group-hover:scale-105 group-hover:border-white/[0.30] group-hover:bg-white/[0.12]">
              <AudioWaveformIcon
                size={15}
                className="text-[#fcfdff] transition-transform duration-200 group-hover:scale-110"
              />
            </div>
            <span className="font-serif-headline text-base text-[#fcfdff] tracking-tight font-normal">
              Connectling
            </span>
          </Link>

          {session && (
            <nav className="hidden sm:flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl backdrop-blur-md">
              <Link
                href="/"
                className={`px-3 py-1 rounded-lg text-xs transition-all duration-150 ${
                  isActive('/')
                    ? 'bg-white/[0.14] text-[#fcfdff] font-medium border border-white/[0.18] shadow-sm'
                    : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.06]'
                }`}
              >
                Spaces
              </Link>
              <Link
                href="/profile"
                className={`px-3 py-1 rounded-lg text-xs transition-all duration-150 ${
                  isActive('/profile')
                    ? 'bg-white/[0.14] text-[#fcfdff] font-medium border border-white/[0.18] shadow-sm'
                    : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.06]'
                }`}
              >
                Profile
              </Link>
            </nav>
          )}
        </div>

        {/* User / CTA */}
        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="h-7 w-20 bg-white/[0.06] animate-pulse rounded-full" />
          ) : session ? (
            <div className="flex items-center gap-2">
              {/* Glass User Capsule */}
              <Link
                href="/profile"
                className="glass-pill px-2.5 py-1 rounded-xl flex items-center gap-2 text-xs text-[#888e90] hover:text-[#fcfdff] transition-all"
              >
                {session.user.image && !imageError ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={20}
                    height={20}
                    unoptimized
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-5 h-5 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-white/10 to-white/20 border border-white/25 flex items-center justify-center text-[10px] font-medium text-[#fcfdff]">
                    {userInitial}
                  </div>
                )}
                <span className="hidden sm:inline max-w-[120px] truncate text-xs font-medium text-[#fcfdff]">
                  {session.user.name}
                </span>
              </Link>

              {/* Glass Sign Out Icon Button */}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                title="Sign out"
                className="h-7 w-7 rounded-xl glass-pill flex items-center justify-center text-[#888e90] hover:text-[#ff2047] transition-all disabled:opacity-50"
              >
                {signingOut ? (
                  <div className="animate-spin h-3 w-3 border border-white/30 border-t-white rounded-full" />
                ) : (
                  <LogOutIcon size={12} />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium text-xs rounded-xl shadow-[0_0_20px_rgba(252,253,255,0.18)] transition-all active:scale-[0.98]"
              >
                <SparklesIcon size={12} />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
