import Link from 'next/link';
import {
  ShieldCheckIcon,
  AudioWaveformIcon,
  LockIcon,
  ArrowLeftIcon,
  SparklesIcon,
  CheckIcon,
} from '@animateicons/react/lucide';

export const metadata = {
  title: 'Terms of Service & Privacy Policy — Connectling',
  description: 'Our zero-data retention architecture, ephemeral spaces policy, and privacy commitments.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-4 sm:px-6 bg-black ambient-glow-meet text-[#fcfdff]">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Top Back Link */}
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#888e90] hover:text-[#fcfdff] p-2 -ml-2 rounded-lg hover:bg-white/[0.05] transition-all"
          >
            <ArrowLeftIcon size={14} />
            <span>Back to Login</span>
          </Link>
        </div>

        {/* Header */}
        <header className="space-y-4 border-b border-white/[0.10] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#ff7a1a]">
            <ShieldCheckIcon size={13} />
            <span>Zero-Data Retention Architecture</span>
          </div>

          <h1 className="font-serif-headline text-3xl sm:text-5xl font-normal tracking-tight text-[#fcfdff]">
            Terms of Service & Privacy Notice
          </h1>

          <p className="text-[#888e90] text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
            Connectling is designed around a fundamental conviction: real-time communication should be as private and unrecorded as a conversation in a closed room.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-[#888e90] font-mono">
            <span>Last Updated: September 2026</span>
            <span>•</span>
            <span className="text-[#ff7a1a]">Version 2.0 (Zero-Telemetry)</span>
          </div>
        </header>

        {/* Quick Highlights Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.10] space-y-2">
            <div className="h-8 w-8 rounded-lg bg-white/[0.05] border border-white/[0.10] flex items-center justify-center text-[#ff7a1a]">
              <LockIcon size={16} />
            </div>
            <h3 className="text-xs font-semibold text-[#fcfdff]">Zero Recordings</h3>
            <p className="text-[11px] text-[#888e90] leading-relaxed">
              No audio, video, or screen sharing streams are recorded, transcribed, or stored on servers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.10] space-y-2">
            <div className="h-8 w-8 rounded-lg bg-white/[0.05] border border-white/[0.10] flex items-center justify-center text-[#f59e0b]">
              <AudioWaveformIcon size={16} />
            </div>
            <h3 className="text-xs font-semibold text-[#fcfdff]">Ephemeral Rooms</h3>
            <p className="text-[11px] text-[#888e90] leading-relaxed">
              In-room text chats exist only in transient server RAM and are wiped instantly when rooms end.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.10] space-y-2">
            <div className="h-8 w-8 rounded-lg bg-white/[0.05] border border-white/[0.10] flex items-center justify-center text-[#11ff99]">
              <SparklesIcon size={16} />
            </div>
            <h3 className="text-xs font-semibold text-[#fcfdff]">Zero Surveillance</h3>
            <p className="text-[11px] text-[#888e90] leading-relaxed">
              No presence history, user status tracking, or behavioral telemetry profiles are collected.
            </p>
          </div>
        </section>

        {/* Detailed Legal Sections */}
        <div className="space-y-10 text-xs sm:text-sm text-[#a0a6a8] leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-medium text-[#fcfdff] font-serif-headline">
              1. Acceptance of Terms
            </h2>
            <p>
              By signing in to Connectling via Google OAuth and checking the acceptance checkbox, you enter into a binding legal agreement with Connectling. If you do not accept these terms, you may not access or use any spaces, video meetings, or audio lounges provided by the platform.
            </p>
            <p>
              When you accept these terms, our authentication service records a timestamped consent flag (<code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#ff7a1a] font-mono text-xs">terms_accepted: true</code>) alongside your user identifier in our database to ensure compliance with digital consent regulations.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-medium text-[#fcfdff] font-serif-headline">
              2. Privacy & Zero-Data Architecture
            </h2>
            <p>
              Most communication platforms monetize or retain user interaction metadata. Connectling deliberately eliminates data retention at the infrastructure level:
            </p>
            <ul className="space-y-2 pl-4 border-l border-white/[0.10]">
              <li className="flex items-start gap-2">
                <CheckIcon size={14} className="text-[#ff7a1a] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#fcfdff]">No Media Recording:</strong> Audio, video, and screen-sharing data pass directly between participants without archival pipelines.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon size={14} className="text-[#ff7a1a] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#fcfdff]">Ephemeral In-Memory Chat:</strong> In-room messages are routed via WebSocket connection memory and are never committed to permanent database tables.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon size={14} className="text-[#ff7a1a] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#fcfdff]">Zero Presence Surveillance:</strong> We do not log when you enter or leave spaces, your online/offline status, or your engagement time.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-medium text-[#fcfdff] font-serif-headline">
              3. User Accounts & Google OAuth
            </h2>
            <p>
              Authentication is handled exclusively through Google OAuth. Connectling stores only the essential profile claims provided by Google (your public display name, email address, and avatar URL) to identify you within active spaces and manage session tokens. We never receive or store your Google password.
            </p>
            <p>
              You can view and revoke any active login sessions at any time directly from your <Link href="/profile" className="text-[#ff7a1a] hover:underline font-medium">Account Profile</Link>.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-medium text-[#fcfdff] font-serif-headline">
              4. Space Ownership & Host Responsibilities
            </h2>
            <p>
              Users who create a space are designated as the room creator. Spaces can be locked with an optional passcode for restricted entry. Room creators may terminate their spaces at any time, which immediately disconnects all participants and clears all volatile in-memory chat state.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-medium text-[#fcfdff] font-serif-headline">
              5. Acceptable Use Policy
            </h2>
            <p>
              You agree not to use Connectling for any illegal, harmful, or abusive purpose, including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#888e90]">
              <li>Transmitting unsolicited, harassing, defamatory, or hateful content.</li>
              <li>Attempting to probe, scan, or breach the security of Connectling systems.</li>
              <li>Impersonating any person or entity without legal authorization.</li>
              <li>Using automated bots or scrapers to overload infrastructure or disrupt meetings.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-medium text-[#fcfdff] font-serif-headline">
              6. Modifications to Terms
            </h2>
            <p>
              We may periodically update these terms to reflect infrastructure enhancements or regulatory adjustments. Continued use of Connectling following notification or posting of updated terms constitutes your acceptance of the revisions.
            </p>
          </section>
        </div>

        {/* Footer CTA */}
        <div className="pt-8 border-t border-white/[0.10] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#888e90]">
            Questions about our zero-data policies? Contact privacy@connectling.com
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium text-xs rounded-xl shadow-[0_0_20px_rgba(252,253,255,0.18)] transition-all active:scale-[0.98]"
          >
            <span>Proceed to Login</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
