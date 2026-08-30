'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from '@/lib/auth-client';
import { AudioWaveformIcon, SparklesIcon } from '@animateicons/react/lucide';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace('/');
    }
  }, [session, router]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/`,
      });
    } catch {
      setSigningIn(false);
    }
  };

  return (
    <main className="flex min-h-screen pt-14 items-center justify-center p-4 sm:p-6 bg-black ambient-glow-meet">
      <div className="w-full max-w-md p-8 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl shadow-2xl space-y-6 relative overflow-hidden glow-card">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#3b9eff] opacity-15 blur-3xl pointer-events-none" />

        <div className="text-center space-y-3 relative z-10">
          <div className="h-10 w-10 rounded-xl bg-[#101012] border border-white/[0.10] text-[#fcfdff] flex items-center justify-center mx-auto shadow-inner">
            <AudioWaveformIcon size={20} />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif-headline text-2xl font-normal text-[#fcfdff] tracking-tight">
              Sign in to Connectling
            </h1>
            <p className="text-xs text-[#888e90]">
              Access encrypted video conferences, audio stages, and instant spaces.
            </p>
          </div>
        </div>

        {isPending ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-5 w-5 border border-white/20 border-t-[#fcfdff] rounded-full" />
          </div>
        ) : (
          <div className="space-y-4 pt-2 relative z-10">
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium rounded-lg transition-all shadow-[0_0_24px_rgba(252,253,255,0.15)] text-xs active:scale-[0.98] disabled:opacity-60"
            >
              {signingIn ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-black/30 border-t-black rounded-full" />
                  <span>Redirecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[#888e90]">
                <SparklesIcon size={11} className="text-[#3b9eff]" />
                Zero password friction • Instant OAuth session
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
