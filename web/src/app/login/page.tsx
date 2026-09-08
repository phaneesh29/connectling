'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from '@/lib/auth-client';
import {
  AudioWaveformIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CheckIcon,
  FileTextIcon,
  XIcon,
} from '@animateicons/react/lucide';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get('callbackURL') || '/';

  const { data: session, isPending } = useSession();
  const [signingIn, setSigningIn] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace(callbackURL.startsWith('/') ? callbackURL : '/');
    }
  }, [session, router, callbackURL]);

  const handleGoogleSignIn = async () => {
    if (!acceptedTerms) {
      setTermsError(true);
      return;
    }

    setTermsError(false);
    setSigningIn(true);
    try {
      const redirectTarget = `${window.location.origin}${
        callbackURL.startsWith('/') ? callbackURL : '/'
      }`;
      await signIn.social({
        provider: 'google',
        callbackURL: redirectTarget,
      });
    } catch {
      setSigningIn(false);
    }
  };

  return (
    <main className="flex min-h-screen pt-24 pb-12 items-center justify-center p-4 sm:p-6 bg-black ambient-glow-meet">
      <div className="w-full max-w-md p-6 sm:p-8 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl shadow-2xl space-y-6 relative overflow-hidden glow-card">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#3b9eff] opacity-15 blur-3xl pointer-events-none" />

        {/* Header */}
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

        {/* Privacy Highlight Badge */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-2.5 relative z-10">
          <ShieldCheckIcon size={16} className="text-[#3b9eff] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#888e90] leading-relaxed">
            <strong className="text-[#fcfdff] font-medium">Zero-data architecture:</strong> We do not store meeting recordings, persistent chat transcripts, or user presence histories.
          </p>
        </div>

        {isPending ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-5 w-5 border border-white/20 border-t-[#fcfdff] rounded-full" />
          </div>
        ) : (
          <div className="space-y-4 pt-1 relative z-10">
            {/* Terms and Conditions Checkbox */}
            <div
              className={`p-3 rounded-xl border transition-all duration-200 ${
                termsError
                  ? 'bg-red-500/[0.06] border-red-500/40 ring-1 ring-red-500/30'
                  : acceptedTerms
                  ? 'bg-[#3b9eff]/[0.05] border-[#3b9eff]/30'
                  : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              <label
                htmlFor="terms-checkbox"
                className="flex items-start gap-3 cursor-pointer select-none"
              >
                <div className="relative flex items-center mt-0.5">
                  <input
                    id="terms-checkbox"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      if (e.target.checked) setTermsError(false);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`h-4 w-4 rounded flex items-center justify-center border transition-all ${
                      acceptedTerms
                        ? 'bg-[#3b9eff] border-[#3b9eff] text-black shadow-[0_0_10px_rgba(59,158,255,0.4)]'
                        : termsError
                        ? 'border-red-500/80 bg-red-500/10'
                        : 'border-white/30 bg-[#101012] hover:border-white/50'
                    }`}
                  >
                    {acceptedTerms && <CheckIcon size={11} className="stroke-[3]" />}
                  </div>
                </div>

                <div className="text-[11px] leading-snug space-y-0.5">
                  <span className="text-[#c8ced0]">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTermsModalOpen(true);
                      }}
                      className="text-[#3b9eff] hover:underline font-medium inline-flex items-center gap-0.5"
                    >
                      Terms of Service & Privacy Policy
                    </button>
                  </span>
                  <p className="text-[10px] text-[#888e90]">
                    Your acceptance will be securely recorded in your account profile.
                  </p>
                </div>
              </label>

              {termsError && (
                <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1 font-mono">
                  <span>* Please accept the terms to proceed with login</span>
                </div>
              )}
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium text-xs transition-all ${
                acceptedTerms
                  ? 'bg-[#fcfdff] hover:bg-[#f1f7fe] text-black shadow-[0_0_24px_rgba(252,253,255,0.15)] active:scale-[0.98]'
                  : 'bg-white/[0.12] text-white/60 hover:bg-white/[0.16] cursor-pointer'
              } disabled:opacity-60`}
            >
              {signingIn ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-black/30 border-t-black rounded-full" />
                  <span>Redirecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

      {/* Terms & Privacy Modal */}
      {termsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0e0e12] border border-white/[0.14] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#121217]">
              <div className="flex items-center gap-2.5">
                <FileTextIcon size={18} className="text-[#3b9eff]" />
                <h3 className="font-serif-headline text-lg text-[#fcfdff]">
                  Terms of Service & Privacy Notice
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="h-7 w-7 rounded-lg hover:bg-white/[0.08] text-[#888e90] hover:text-[#fcfdff] flex items-center justify-center transition-all"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#a0a6a8] leading-relaxed">
              <div className="space-y-1">
                <h4 className="font-medium text-[#fcfdff] text-sm">1. Zero-Data Commitment</h4>
                <p>
                  Connectling is engineered with privacy as a foundational principle. We do not record, transcribe, or archive audio or video communication occurring inside any space or conference.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-medium text-[#fcfdff] text-sm">2. Ephemeral Chat & In-Memory State</h4>
                <p>
                  Messages sent within meeting and voice spaces exist solely in volatile server memory for real-time delivery to participants. Once a space is closed or participants disconnect, chat histories are immediately discarded.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-medium text-[#fcfdff] text-sm">3. Zero Presence Tracking</h4>
                <p>
                  We do not retain logs of your online status, presence history, or duration within rooms. We do not construct behavioral tracking profiles or sell any telemetry data to third parties.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-medium text-[#fcfdff] text-sm">4. Account & Acceptance Record</h4>
                <p>
                  Authentication is performed via secure Google OAuth. Your acceptance of these terms and conditions is timestamped and stored alongside your user profile in our database to ensure compliance with privacy regulations.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-medium text-[#fcfdff] text-sm">5. Acceptable Conduct</h4>
                <p>
                  Users must not use the platform for unlawful activities, harassment, unauthorized distribution of copyrighted material, or system abuse. We reserve the right to revoke access for violations of acceptable conduct.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/[0.08] bg-[#121217] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.06] transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setAcceptedTerms(true);
                  setTermsError(false);
                  setTermsModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3b9eff] hover:bg-[#328be0] text-black transition-all font-semibold shadow-[0_0_16px_rgba(59,158,255,0.3)]"
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen pt-24 pb-12 items-center justify-center p-4 bg-black">
          <div className="animate-spin h-6 w-6 border-2 border-white/20 border-t-[#3b9eff] rounded-full" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
