'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Radio,
  Tv,
  CheckCircle2,
  Zap,
  Sparkles,
  ShieldCheck,
  PenTool,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Sliders,
  Monitor,
} from 'lucide-react';

export default function WebinarGuidePage() {
  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-20 bg-black text-[#fcfdff] transition-all duration-700 ambient-glow-webinar selection:bg-[#FF9933]/30">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10 sm:space-y-12">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/?mode=webinar"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] hover:border-white/[0.20] text-xs text-[#888e90] hover:text-[#fcfdff] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Webinars</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#101012] border border-white/[0.10] text-[11px] font-mono text-[#FF9933] shadow-inner">
              <Radio className="w-3 h-3 animate-pulse text-[#FF9933]" />
              Broadcaster Guide
            </span>
          </div>
        </div>

        {/* Hero Section matching Home Page Typography */}
        <section className="space-y-4">
          <div className="space-y-3">
            <h1 className="font-serif-headline text-3xl sm:text-5xl md:text-6xl font-normal text-[#fcfdff] tracking-tight leading-[1.08] sm:leading-[1.05]">
              Broadcasting engine <br />
              <span className="text-gradient-brand italic font-serif">crafted for audiences.</span>
            </h1>
            <p className="text-xs sm:text-base text-[#888e90] leading-relaxed max-w-2xl font-normal">
              Stream pristine 1080p broadcast video to unlimited attendees with zero video delivery fees, zero external watermarks, and Connectling’s real-time interactive suite (Socket.IO chat, live vector whiteboard, audience Q&amp;A, and reactions).
            </p>
          </div>
        </section>

        {/* Architecture Overview Card */}
        <section className="relative glow-card rounded-2xl border border-white/[0.12] bg-[#0a0a0c] overflow-hidden p-5 sm:p-7 space-y-5">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 -mr-20 -mt-20 bg-gradient-brand-br" />

          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 relative z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF9933] uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>How The Pipeline Operates</span>
            </div>
            <span className="font-mono text-[10px] text-[#888e90] px-2 py-0.5 rounded bg-[#101012] border border-white/[0.06]">
              Low-Latency RTMP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs relative z-10">
            <div className="p-4 rounded-xl bg-[#06060a]/80 border border-white/[0.08] space-y-2">
              <div className="flex items-center gap-2 text-[#fcfdff] font-semibold">
                <div className="p-1.5 rounded-lg bg-[#FF9933]/15 text-[#FF9933]">
                  <Monitor className="w-4 h-4" />
                </div>
                <span>1. OBS / Encoder</span>
              </div>
              <p className="text-[11px] text-[#888e90] leading-relaxed">
                Broadcast your webcam, screen share, slides, or high-fidelity audio via OBS Studio using RTMP streaming.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#06060a]/80 border border-white/[0.08] space-y-2">
              <div className="flex items-center gap-2 text-[#fcfdff] font-semibold">
                <div className="p-1.5 rounded-lg bg-[#F4C430]/15 text-[#F4C430]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>2. Planetary Video CDN</span>
              </div>
              <p className="text-[11px] text-[#888e90] leading-relaxed">
                Streamed as a private <strong>Unlisted</strong> feed, providing rock-solid planetary edge delivery at 0 bandwidth cost.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#06060a]/80 border border-white/[0.08] space-y-2">
              <div className="flex items-center gap-2 text-[#fcfdff] font-semibold">
                <div className="p-1.5 rounded-lg bg-[#11ff99]/15 text-[#11ff99]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>3. Connectling Studio</span>
              </div>
              <p className="text-[11px] text-[#888e90] leading-relaxed">
                Attendees view your stream on Connectling’s in-house unbranded player with live Socket.IO chat, whiteboards, and Q&amp;A.
              </p>
            </div>
          </div>
        </section>

        {/* 4-Step Walkthrough */}
        <section className="space-y-5">
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif-headline text-xl sm:text-2xl text-[#fcfdff]">
              Step-by-Step Setup
            </h2>
            <span className="font-mono text-[10px] text-[#888e90] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
              4 Simple Steps
            </span>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="glow-card p-5 sm:p-6 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-xl bg-[#FF9933]/15 border border-[#FF9933]/30 text-[#FF9933] font-mono text-xs flex items-center justify-center font-bold shrink-0">
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
            <div className="glow-card p-5 sm:p-6 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-xl bg-[#FF9933]/15 border border-[#FF9933]/30 text-[#FF9933] font-mono text-xs flex items-center justify-center font-bold shrink-0">
                    02
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-[#fcfdff]">
                      Create an Unlisted Broadcast Feed
                    </h3>
                    <p className="text-xs text-[#888e90]">Configure your private RTMP stream endpoint</p>
                  </div>
                </div>

                <a
                  href="https://studio.youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-[#fcfdff] border border-white/[0.08] transition-all shrink-0 cursor-pointer"
                >
                  <span>Open YouTube Studio</span>
                  <ExternalLink className="w-3 h-3 text-[#888e90]" />
                </a>
              </div>

              <div className="space-y-3 text-xs text-[#888e90] leading-relaxed">
                <p>
                  In YouTube Studio (<span className="text-[#fcfdff] font-mono">studio.youtube.com</span>), click the top-right <strong className="text-[#fcfdff]">Create (+)</strong> button and select <strong className="text-[#fcfdff]">Go live</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1.5">
                    <span className="text-[10px] font-mono text-[#F4C430] uppercase block">Key Setting A</span>
                    <strong className="text-[#fcfdff] text-xs block">Set Visibility to &quot;Unlisted&quot;</strong>
                    <p className="text-[11px] text-[#888e90] leading-relaxed">
                      Only people inside your Connectling webinar can watch. It will not appear on your public channel or send subscriber notifications.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1.5">
                    <span className="text-[10px] font-mono text-[#11ff99] uppercase block">Key Setting B</span>
                    <strong className="text-[#fcfdff] text-xs block">Select &quot;Ultra-low Latency&quot;</strong>
                    <p className="text-[11px] text-[#888e90] leading-relaxed">
                      Under Stream Latency, choose <strong>Ultra-low</strong>. This reduces broadcast delay to 1–2 seconds for instant audience responsiveness.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-2">
                  <span className="text-[10px] font-mono text-[#888e90] uppercase block">
                    Copy Stream Key to OBS
                  </span>
                  <p className="text-[11px] text-[#888e90]">
                    In OBS, go to <strong>Settings → Stream</strong>, choose <strong>YouTube - RTMPS</strong>, and paste your Stream Key. Click <strong>Apply</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="glow-card p-5 sm:p-6 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-xl bg-[#FF9933]/15 border border-[#FF9933]/30 text-[#FF9933] font-mono text-xs flex items-center justify-center font-bold shrink-0">
                    03
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-[#fcfdff]">
                      Connect Stream URL to Connectling
                    </h3>
                    <p className="text-xs text-[#888e90]">Link the feed to your webinar</p>
                  </div>
                </div>

                <Link
                  href="/?mode=webinar"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-[#fcfdff] border border-white/[0.08] transition-all shrink-0 cursor-pointer"
                >
                  <span>Dashboard</span>
                  <Sparkles className="w-3 h-3 text-[#FF9933]" />
                </Link>
              </div>

              <div className="space-y-3 text-xs text-[#888e90] leading-relaxed">
                <p>
                  Copy your live stream share link (e.g. <span className="font-mono text-[#fcfdff]">https://youtube.com/live/xyz123abc</span> or the video ID <span className="font-mono text-[#fcfdff]">xyz123abc</span>).
                </p>
                <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-2">
                  <p className="text-[11px] text-[#888e90]">
                    Paste it either into:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-[11px] pl-1 text-[#fcfdff]">
                    <li>The <strong>Host a Webinar</strong> modal when creating your session from the dashboard.</li>
                    <li>Or inside your <strong>Host Studio Settings</strong> (<Sliders className="inline w-3 h-3 text-[#FF9933] mx-1" />) at any time before or during the stream!</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="glow-card p-5 sm:p-6 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-[#FF9933]/15 border border-[#FF9933]/30 text-[#FF9933] font-mono text-xs flex items-center justify-center font-bold shrink-0">
                  04
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#fcfdff]">
                    Enter Studio &amp; Start Broadcasting
                  </h3>
                  <p className="text-xs text-[#888e90]">Real-time interaction with your audience</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#fcfdff] font-medium">
                    <PenTool className="w-3.5 h-3.5 text-[#FF9933]" />
                    <span>Live Whiteboard</span>
                  </div>
                  <p className="text-[11px] text-[#888e90] leading-relaxed">
                    Toggle the vector canvas. Your drawings broadcast instantaneously to all attendees.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#fcfdff] font-medium">
                    <HelpCircle className="w-3.5 h-3.5 text-[#F4C430]" />
                    <span>Audience Q&amp;A</span>
                  </div>
                  <p className="text-[11px] text-[#888e90] leading-relaxed">
                    Attendees submit and upvote questions. Mark them answered as you address them.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#fcfdff] font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-[#11ff99]" />
                    <span>Real-Time Chat</span>
                  </div>
                  <p className="text-[11px] text-[#888e90] leading-relaxed">
                    Socket.IO text discussion and burst emoji reactions with zero delay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recommended OBS Encoder Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif-headline text-xl sm:text-2xl text-[#fcfdff]">
              Recommended OBS Settings
            </h2>
            <span className="font-mono text-[10px] text-[#888e90] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
              Optimal Bitrate
            </span>
          </div>

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
        <section className="glow-card p-6 sm:p-7 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-brand-br opacity-15 blur-3xl pointer-events-none" />

          <h3 className="text-base font-semibold text-[#fcfdff] flex items-center gap-2 relative z-10">
            <CheckCircle2 className="w-4 h-4 text-[#11ff99]" />
            Broadcaster Pro Tips
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#888e90] relative z-10">
            <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.06] space-y-1">
              <strong className="text-[#fcfdff] block">Start OBS 2 minutes early</strong>
              <p className="text-[11px] leading-relaxed">
                Click &quot;Start Streaming&quot; in OBS 1-2 minutes before your scheduled time so your stream feed locks onto the ingest servers before going live in studio.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.06] space-y-1">
              <strong className="text-[#fcfdff] block">Zero external branding</strong>
              <p className="text-[11px] leading-relaxed">
                Connectling’s custom player uses an edge crop, click-shield, and in-house controls so attendees never see external watermarks or recommendations.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.06] space-y-1">
              <strong className="text-[#fcfdff] block">Test in private first</strong>
              <p className="text-[11px] leading-relaxed">
                Create a test webinar to verify your mic levels and screen sharing before your official presentation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.06] space-y-1">
              <strong className="text-[#fcfdff] block">Whiteboard live toggle</strong>
              <p className="text-[11px] leading-relaxed">
                You can toggle between your video broadcast and interactive whiteboard anytime during the stream without interrupting the feed.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="relative overflow-hidden p-6 sm:p-8 rounded-2xl border border-white/[0.12] bg-[#0a0a0c] text-center space-y-4 glow-card">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-brand-br opacity-20 blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10">
            <h2 className="font-serif-headline text-xl sm:text-2xl font-normal text-[#fcfdff] tracking-tight">
              Ready to Broadcast Your Next Webinar?
            </h2>
            <p className="text-xs text-[#888e90] max-w-md mx-auto leading-relaxed">
              Jump straight to your dashboard, create a session, and start engaging your audience with zero latency.
            </p>
          </div>

          <div className="pt-2 relative z-10">
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
