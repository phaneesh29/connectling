'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Radio,
  Tv,
  Settings,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  PenTool,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Sliders,
  Play,
  Monitor,
} from 'lucide-react';

export default function WebinarGuidePage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-[#fcfdff] pt-20 sm:pt-24 pb-20 selection:bg-[#FF9933]/30">
      {/* Ambient Saffron Atmosphere Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#FF9933]/15 via-[#F4C430]/05 to-transparent blur-3xl pointer-events-none -z-10" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/?mode=webinar"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] hover:border-white/[0.20] text-xs text-[#888e90] hover:text-[#fcfdff] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Webinars</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF9933]/10 border border-[#FF9933]/25 text-[11px] font-mono text-[#FF9933]">
              <Radio className="w-3 h-3 animate-pulse" />
              Broadcaster Guide
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#FF9933]/20 to-[#FF8C00]/10 border border-[#FF9933]/30 flex items-center justify-center text-[#FF9933] shadow-[0_0_20px_rgba(255,153,51,0.25)]">
              <Tv className="w-5 h-5" />
            </div>
            <h1 className="font-serif-headline text-2xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#fcfdff]">
              How to Stream &amp; Host on Connectling
            </h1>
          </div>
          <p className="text-sm sm:text-base text-[#888e90] leading-relaxed max-w-2xl">
            Stream pristine 1080p broadcast video to unlimited attendees with zero video delivery costs, zero YouTube branding, and Connectling’s real-time interactive suite (Socket.IO chat, vector whiteboard, Q&amp;A, and reactions).
          </p>
        </section>

        {/* Architecture Overview Card */}
        <section className="p-5 sm:p-6 rounded-2xl border border-white/[0.12] bg-[#0a0a0c] relative overflow-hidden space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[#FF9933] uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>How The Engine Operates</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-2 text-[#fcfdff] font-semibold">
                <Monitor className="w-4 h-4 text-[#FF9933]" />
                <span>1. OBS / Encoder</span>
              </div>
              <p className="text-[11px] text-[#888e90] leading-relaxed">
                You broadcast your screen, webcam, or presentation via OBS Studio using RTMP.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-2 text-[#fcfdff] font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#F4C430]" />
                <span>2. Planetary Video CDN</span>
              </div>
              <p className="text-[11px] text-[#888e90] leading-relaxed">
                Streamed as an <strong>Unlisted</strong> feed, providing rock-solid global video delivery at 0 bandwidth cost.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-2 text-[#fcfdff] font-semibold">
                <Sparkles className="w-4 h-4 text-[#11ff99]" />
                <span>3. Connectling Studio</span>
              </div>
              <p className="text-[11px] text-[#888e90] leading-relaxed">
                Attendees watch on Connectling’s custom unbranded player with live Socket.IO chat, whiteboards, and Q&amp;A.
              </p>
            </div>
          </div>
        </section>

        {/* 4-Step Walkthrough */}
        <section className="space-y-6">
          <h2 className="font-serif-headline text-xl sm:text-2xl text-[#fcfdff]">
            Step-by-Step Setup
          </h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-xl bg-[#FF9933]/15 border border-[#FF9933]/30 text-[#FF9933] font-mono text-xs flex items-center justify-center font-bold">
                    01
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-[#fcfdff]">
                      Download &amp; Open OBS Studio
                    </h3>
                    <p className="text-xs text-[#888e90]">Free, open-source broadcasting software</p>
                  </div>
                </div>

                <a
                  href="https://obsproject.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-[#fcfdff] border border-white/[0.08] transition-all shrink-0 cursor-pointer"
                >
                  <span>Get OBS</span>
                  <ExternalLink className="w-3 h-3 text-[#888e90]" />
                </a>
              </div>

              <p className="text-xs text-[#888e90] leading-relaxed">
                OBS Studio (Open Broadcaster Software) runs on macOS, Windows, and Linux. You can configure scenes with your camera, screen share, slides, or microphone. (Streamlabs and vMix work identically).
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-xl bg-[#FF9933]/15 border border-[#FF9933]/30 text-[#FF9933] font-mono text-xs flex items-center justify-center font-bold">
                  02
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#fcfdff]">
                    Create an Unlisted Broadcast Feed
                  </h3>
                  <p className="text-xs text-[#888e90]">Configure your private RTMP stream endpoint</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-[#888e90] leading-relaxed">
                <p>
                  Open YouTube Studio (<span className="text-[#fcfdff] font-mono">studio.youtube.com</span>) and click <strong className="text-[#fcfdff]">Go Live</strong> (Stream tab):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-mono text-[#F4C430] uppercase block">Key Setting A</span>
                    <strong className="text-[#fcfdff] text-xs block">Set Visibility to &quot;Unlisted&quot;</strong>
                    <p className="text-[11px] text-[#888e90]">
                      Only people inside your Connectling webinar can watch. It will not show on your public channel or send subscriber notifications.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-mono text-[#11ff99] uppercase block">Key Setting B</span>
                    <strong className="text-[#fcfdff] text-xs block">Select &quot;Ultra-low Latency&quot;</strong>
                    <p className="text-[11px] text-[#888e90]">
                      Under Stream Latency, choose <strong>Ultra-low</strong>. This reduces broadcast latency to 1–2 seconds for real-time responsiveness.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-2">
                  <span className="text-[10px] font-mono text-[#888e90] uppercase block">
                    Copy Stream Key to OBS
                  </span>
                  <p className="text-[11px]">
                    In OBS, go to <strong>Settings → Stream</strong>, choose <strong>YouTube - RTMPS</strong>, and paste your Stream Key. Click <strong>Apply</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-xl bg-[#FF9933]/15 border border-[#FF9933]/30 text-[#FF9933] font-mono text-xs flex items-center justify-center font-bold">
                  03
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#fcfdff]">
                    Connect Stream URL to Connectling
                  </h3>
                  <p className="text-xs text-[#888e90]">Link the feed to your webinar</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-[#888e90] leading-relaxed">
                <p>
                  Copy your live stream share link (e.g. <span className="font-mono text-[#fcfdff]">https://youtube.com/live/xyz123abc</span> or the video ID <span className="font-mono text-[#fcfdff]">xyz123abc</span>).
                </p>
                <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-2">
                  <p className="text-[11px]">
                    Paste it either into:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] pl-1 text-[#fcfdff]">
                    <li>The <strong>Host a Webinar</strong> modal when creating your session from the dashboard.</li>
                    <li>Or inside your <strong>Host Studio Settings</strong> (<Sliders className="inline w-3 h-3 text-[#FF9933] mx-1" />) at any time before or during the stream!</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-xl bg-[#FF9933]/15 border border-[#FF9933]/30 text-[#FF9933] font-mono text-xs flex items-center justify-center font-bold">
                  04
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#fcfdff]">
                    Enter Studio &amp; Start Broadcasting
                  </h3>
                  <p className="text-xs text-[#888e90]">Real-time interaction with your audience</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#fcfdff] font-medium">
                    <PenTool className="w-3.5 h-3.5 text-[#FF9933]" />
                    <span>Live Whiteboard</span>
                  </div>
                  <p className="text-[11px] text-[#888e90]">
                    Toggle the vector canvas. Your drawings broadcast instantaneously to all attendees.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#fcfdff] font-medium">
                    <HelpCircle className="w-3.5 h-3.5 text-[#F4C430]" />
                    <span>Audience Q&amp;A</span>
                  </div>
                  <p className="text-[11px] text-[#888e90]">
                    Attendees submit and upvote questions. Mark them answered as you address them.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#fcfdff] font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-[#11ff99]" />
                    <span>Real-Time Chat</span>
                  </div>
                  <p className="text-[11px] text-[#888e90]">
                    Socket.IO text discussion and burst emoji reactions with zero delay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recommended OBS Encoder Settings */}
        <section className="space-y-4">
          <h2 className="font-serif-headline text-xl sm:text-2xl text-[#fcfdff]">
            Recommended OBS Settings
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.10] bg-[#0a0a0c]">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0e0e14] text-[#888e90] font-mono text-[11px]">
                  <th className="py-3 px-4">Parameter</th>
                  <th className="py-3 px-4">Recommended Value</th>
                  <th className="py-3 px-4">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                <tr>
                  <td className="py-3 px-4 font-medium text-[#fcfdff]">Resolution</td>
                  <td className="py-3 px-4 font-mono text-[#FF9933]">1920 × 1080 (1080p)</td>
                  <td className="py-3 px-4 text-[#888e90]">Crisp presentation slides and camera feeds</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-[#fcfdff]">Frame Rate</td>
                  <td className="py-3 px-4 font-mono text-[#FF9933]">60 fps (or 30 fps)</td>
                  <td className="py-3 px-4 text-[#888e90]">Smooth screen scrolling and cursor movement</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-[#fcfdff]">Video Bitrate</td>
                  <td className="py-3 px-4 font-mono text-[#FF9933]">4,500 – 6,000 Kbps</td>
                  <td className="py-3 px-4 text-[#888e90]">CBR (Constant Bitrate) for stable streaming</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-[#fcfdff]">Keyframe Interval</td>
                  <td className="py-3 px-4 font-mono text-[#FF9933]">2 seconds</td>
                  <td className="py-3 px-4 text-[#888e90]">Required for ultra-low latency playback</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-[#fcfdff]">Audio Bitrate</td>
                  <td className="py-3 px-4 font-mono text-[#FF9933]">160 Kbps AAC</td>
                  <td className="py-3 px-4 text-[#888e90]">Studio vocal clarity</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Pro Tips / Checklist */}
        <section className="p-6 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4">
          <h3 className="text-base font-semibold text-[#fcfdff] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#11ff99]" />
            Broadcaster Pro Tips
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#888e90]">
            <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.06] space-y-1">
              <strong className="text-[#fcfdff] block">Start OBS 2 minutes early</strong>
              <p className="text-[11px]">
                Click &quot;Start Streaming&quot; in OBS 1-2 minutes before scheduled time so your stream feed locks onto the ingest servers before going live in studio.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.06] space-y-1">
              <strong className="text-[#fcfdff] block">Zero YouTube branding</strong>
              <p className="text-[11px]">
                Connectling’s custom player uses an edge crop, click-shield, and in-house controls so attendees never see YouTube watermarks or recommendations.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.06] space-y-1">
              <strong className="text-[#fcfdff] block">Test in private first</strong>
              <p className="text-[11px]">
                Create a test webinar to verify your mic levels and screen sharing before your official presentation.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#06060a] border border-white/[0.06] space-y-1">
              <strong className="text-[#fcfdff] block">Whiteboard live toggle</strong>
              <p className="text-[11px]">
                You can toggle between your video broadcast and interactive whiteboard anytime during the stream without interrupting the feed.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="p-6 sm:p-8 rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#0e0e16] to-[#07070a] text-center space-y-4">
          <div className="space-y-1.5">
            <h2 className="font-serif-headline text-xl sm:text-2xl font-normal text-[#fcfdff]">
              Ready to Broadcast Your Next Webinar?
            </h2>
            <p className="text-xs text-[#888e90] max-w-md mx-auto">
              Jump straight to your dashboard, create a session, and start engaging your audience.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/?mode=webinar"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs shadow-brand-glow transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Go to Webinars Dashboard</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
