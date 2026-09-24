'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';
import { LogOutIcon, SparklesIcon, TriangleAlertIcon } from '@animateicons/react/lucide';
import { ReportModal } from './report-modal';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Hidden inside meeting and audio room viewports
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

  const userInitial = session?.user?.name
    ? session.user.name.trim().charAt(0).toUpperCase()
    : 'U';

  return (
    <>
      <header className="fixed top-2.5 sm:top-5 left-0 right-0 z-50 w-full px-2.5 sm:px-6 pointer-events-none transition-all duration-300">
        <div className="max-w-4xl mx-auto h-13 sm:h-14 px-3 sm:px-5 flex items-center justify-between rounded-2xl bg-[#0e0e14]/85 backdrop-blur-2xl backdrop-saturate-200 border border-white/[0.14] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7),inset_0_1px_1px_0_rgba(255,255,255,0.20)] pointer-events-auto">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center gap-2.5 sm:gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
              <div className="relative h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="Connectling"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,153,51,0.4)] group-hover:scale-110 transition-transform duration-200"
                  priority
                />
              </div>
              <span className="font-serif-headline text-sm sm:text-base text-[#fcfdff] tracking-tight font-normal">
                Connectling
              </span>
            </Link>

            {session && (
              <nav className="flex items-center p-0.5 sm:p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl shrink-0">
                <Link
                  href="/"
                  className={`px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs transition-all duration-150 ${
                    isActive('/')
                      ? 'bg-white/[0.14] text-[#fcfdff] font-medium border border-white/[0.18] shadow-sm'
                      : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.06]'
                  }`}
                >
                  Spaces
                </Link>
                <Link
                  href="/profile"
                  className={`px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs transition-all duration-150 ${
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

          {/* Right: Auth User Capsule / Feedback / Sign In Button */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Feedback & Report Button */}
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              title="Report an issue or give feedback"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] hover:border-white/[0.20] text-[#888e90] hover:text-[#fcfdff] text-xs transition-all cursor-pointer pointer-events-auto"
            >
              <TriangleAlertIcon size={13} className="text-[#ff7a1a]" />
              <span className="hidden xs:inline text-[11px] sm:text-xs">Report</span>
            </button>

            {isPending ? (
              <div className="h-7 w-16 sm:w-20 bg-white/[0.06] animate-pulse rounded-full" />
            ) : session ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* User Profile Pill */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] hover:border-white/[0.22] transition-all"
                  title={session.user.name || 'Profile'}
                >
                  {session.user.image && !imgError ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={20}
                      height={20}
                      unoptimized
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                      className="w-5 h-5 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-medium text-[#fcfdff]">
                      {userInitial}
                    </div>
                  )}
                  <span className="hidden md:inline max-w-[100px] truncate text-xs font-medium text-[#fcfdff]">
                    {session.user.name}
                  </span>
                </Link>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  title="Sign out"
                  className="h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-xl bg-white/[0.05] hover:bg-red-500/10 border border-white/[0.12] hover:border-red-500/30 text-[#888e90] hover:text-red-400 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
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
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium text-xs rounded-xl shadow-[0_0_20px_rgba(252,253,255,0.18)] transition-all active:scale-[0.98]"
              >
                <SparklesIcon size={12} />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </>
  );
}
