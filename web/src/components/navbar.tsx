'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';
import { AudioWaveformIcon, LogOutIcon, SparklesIcon } from '@animateicons/react/lucide';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);

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
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-black/75 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand & Main Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.12] text-[#fcfdff] flex items-center justify-center transition-all duration-200 group-hover:border-white/30 group-hover:bg-[#18181c]">
              <AudioWaveformIcon size={15} />
            </div>
            <span className="font-serif-headline text-lg text-[#fcfdff] tracking-tight font-medium">
              Connectling
            </span>
          </Link>

          {session && (
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive('/')
                    ? 'text-[#fcfdff] bg-[#101012] border border-white/[0.08]'
                    : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
              >
                Spaces
              </Link>
              <Link
                href="/profile"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive('/profile')
                    ? 'text-[#fcfdff] bg-[#101012] border border-white/[0.08]'
                    : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
              >
                Profile
              </Link>
            </nav>
          )}
        </div>

        {/* Status indicator & User CTA */}
        <div className="flex items-center gap-4">
          {/* Status Badge Pill from DESIGN.md */}
          <div className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#101012] border border-white/[0.06] text-[11px] text-[#888e90]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99] shadow-[0_0_8px_#11ff99]" />
            <span className="font-mono">Live Systems OK</span>
          </div>

          {isPending ? (
            <div className="h-8 w-20 bg-[#101012] border border-white/[0.06] animate-pulse rounded-lg" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 p-1 pr-2 rounded-full bg-[#101012] border border-white/[0.08] hover:border-white/[0.18] transition-all"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-6 h-6 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#18181c] border border-white/10 flex items-center justify-center text-[10px] font-mono text-[#fcfdff]">
                    {session.user.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-[#fcfdff]/90 max-w-[120px] truncate hidden sm:inline">
                  {session.user.name}
                </span>
              </Link>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                title="Sign out"
                className="h-8 w-8 rounded-lg bg-[#101012] border border-white/[0.08] hover:bg-[#18181c] hover:border-white/[0.2] flex items-center justify-center text-[#888e90] hover:text-[#fcfdff] transition-all disabled:opacity-50"
              >
                {signingOut ? (
                  <div className="animate-spin h-3.5 w-3.5 border border-white/30 border-t-white rounded-full" />
                ) : (
                  <LogOutIcon size={13} />
                )}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium text-xs rounded-lg transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(252,253,255,0.12)]"
            >
              <SparklesIcon size={12} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
