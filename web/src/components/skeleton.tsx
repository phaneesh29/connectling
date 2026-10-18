'use client';

import React from 'react';

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer rounded-md ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton for a single Hosted Space Card on the Dashboard
 */
export function HostedSpaceCardSkeleton() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] space-y-3.5 sm:space-y-4">
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-md bg-white/[0.08]" />
            <Skeleton className="h-5 w-12 rounded-md bg-white/[0.06]" />
          </div>
          <Skeleton className="h-4.5 w-3/4 rounded-md" />
          <div className="flex items-center gap-1.5 pt-0.5">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-5 w-5 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>

      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Full Dashboard Page Skeleton (Zero Layout Shift for /)
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen pt-20 sm:pt-24 bg-black text-[#fcfdff] ambient-glow-meet">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        {/* Hero Section */}
        <section className="space-y-5 sm:space-y-6 pt-1">
          <div className="flex items-center justify-start">
            {/* Segmented Mode Selector Skeleton */}
            <div className="inline-flex p-1 bg-[#101012] border border-white/[0.08] rounded-full gap-1.5">
              <Skeleton className="h-7 w-28 rounded-full bg-white/[0.12]" />
              <Skeleton className="h-7 w-24 rounded-full bg-white/[0.06]" />
              <Skeleton className="h-7 w-20 rounded-full bg-white/[0.06]" />
            </div>
          </div>

          <div className="space-y-3 max-w-3xl">
            <div className="space-y-2">
              <Skeleton className="h-9 sm:h-12 md:h-14 w-3/4 max-w-xl rounded-2xl" />
              <Skeleton className="h-9 sm:h-12 md:h-14 w-1/2 max-w-md rounded-2xl" />
            </div>
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-4 w-full max-w-xl rounded-lg" />
              <Skeleton className="h-4 w-2/3 max-w-md rounded-lg" />
            </div>
          </div>
        </section>

        {/* Action Panel Glow Card Skeleton */}
        <section className="relative glow-card rounded-2xl border border-white/[0.12] bg-[#0a0a0c] overflow-hidden p-4 sm:p-8 space-y-5 sm:space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20 shrink-0" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20 shrink-0" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20 shrink-0" />
              <Skeleton className="h-3 w-44 rounded ml-2" />
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-24 rounded" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 pt-1">
            <div className="space-y-2">
              <Skeleton className="h-5 sm:h-6 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-72 rounded-md" />
            </div>

            <Skeleton className="h-11 w-full sm:w-44 rounded-xl shrink-0" />
          </div>

          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Skeleton className="h-11 w-full flex-1 rounded-xl" />
              <Skeleton className="h-11 w-full sm:w-32 rounded-xl shrink-0" />
            </div>
          </div>
        </section>

        {/* Your Hosted Spaces Section Skeleton */}
        <section className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HostedSpaceCardSkeleton />
            <HostedSpaceCardSkeleton />
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Skeleton for a single authenticated device session in Profile
 */
export function SessionItemSkeleton() {
  return (
    <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-3 w-28 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded-lg shrink-0" />
    </div>
  );
}

/**
 * Full Profile Page Skeleton (Zero Layout Shift for /profile)
 */
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 bg-black text-[#fcfdff] ambient-glow-meet">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header */}
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>

        {/* User Card */}
        <section className="p-5 sm:p-6 rounded-2xl bg-[#0a0a0c] border border-white/[0.10] space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Skeleton className="h-14 w-14 rounded-full shrink-0" />
              <div className="space-y-1.5 min-w-0 flex-1">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-3.5 w-52 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
          </div>

          <div className="border-t border-white/[0.06] pt-4 flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        </section>

        {/* Devices Section */}
        <section className="p-5 sm:p-6 rounded-2xl bg-[#0a0a0c] border border-white/[0.10] space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>

          <div className="space-y-2.5 pt-2">
            <SessionItemSkeleton />
            <SessionItemSkeleton />
          </div>
        </section>

        {/* Issue Banner Skeleton */}
        <section className="p-5 sm:p-6 bg-[#0a0a0c] border border-white/[0.08] rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-56 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Skeleton for Terms + Google Button inside Login Content
 */
export function LoginFormSkeleton() {
  return (
    <div className="space-y-4 pt-1 relative z-10" aria-hidden="true">
      {/* Terms checkbox row skeleton */}
      <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center gap-3">
        <Skeleton className="h-4 w-4 rounded shrink-0 bg-white/10" />
        <Skeleton className="h-3.5 w-5/6 rounded bg-white/[0.06]" />
      </div>

      {/* Google button skeleton */}
      <Skeleton className="w-full h-11 rounded-xl bg-white/[0.08]" />
    </div>
  );
}

/**
 * Full Login Page Skeleton (Zero Layout Shift for /login)
 */
export function LoginSkeleton() {
  return (
    <main className="flex min-h-screen pt-24 pb-12 items-center justify-center p-4 sm:p-6 bg-black ambient-glow-meet">
      <div className="w-full max-w-md p-6 sm:p-8 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl shadow-2xl space-y-6 relative overflow-hidden glow-card">
        {/* Header */}
        <div className="text-center space-y-3 relative z-10">
          <div className="flex items-center justify-center mx-auto">
            <Skeleton className="w-14 h-14 rounded-2xl" />
          </div>
          <div className="space-y-1.5 flex flex-col items-center">
            <Skeleton className="h-7 w-52 rounded-lg" />
            <Skeleton className="h-3.5 w-72 rounded-md" />
          </div>
        </div>

        {/* Privacy Highlight Badge */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-2.5">
          <Skeleton className="h-4 w-4 rounded shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        </div>

        {/* Form area */}
        <LoginFormSkeleton />

        {/* Footer info */}
        <div className="pt-2 flex justify-center">
          <Skeleton className="h-3 w-48 rounded" />
        </div>
      </div>
    </main>
  );
}

/**
 * Full Meet Prejoin Lobby Skeleton (Zero Layout Shift for /meet/[code])
 */
export function MeetPrejoinLobbySkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-[#fcfdff] select-none ambient-glow-meet relative overflow-hidden">
      {/* Top Header */}
      <header className="px-5 sm:px-8 py-3.5 sm:py-4 border-b border-white/[0.06] bg-black/40 backdrop-blur-2xl flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Skeleton className="hidden sm:inline-block h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </header>

      {/* Main Content Area: 72% Video Stage on Left, 28% Action Card on Right */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
          {/* Left Column: Cinema Camera Preview Stage */}
          <div className="w-full lg:w-[72%] xl:w-[74%] flex flex-col items-center">
            <div className="w-full h-[460px] sm:h-[540px] lg:h-[72vh] max-h-[660px] rounded-3xl bg-[#07070a] border border-white/[0.12] relative overflow-hidden flex items-center justify-center shadow-2xl">
              {/* Standby avatar placeholder in center */}
              <div className="flex flex-col items-center justify-center gap-4">
                <Skeleton className="h-28 w-28 sm:h-36 sm:w-36 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>

              {/* Top Left Live Preview Badge Skeleton */}
              <div className="absolute top-4 left-4">
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>

              {/* Bottom Floating Media Controls Bar Skeleton */}
              <div className="absolute bottom-5 sm:bottom-6 z-20">
                <div className="flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-black/75 backdrop-blur-2xl border border-white/[0.14] shadow-2xl">
                  <Skeleton className="h-9 w-20 rounded-xl" />
                  <Skeleton className="h-9 w-20 rounded-xl" />
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Space Launch / Join Action Card */}
          <div className="w-full lg:w-[28%] xl:w-[26%] flex flex-col justify-center">
            <div className="w-full rounded-3xl border border-white/[0.12] bg-[#0a0a0c] p-6 sm:p-7 space-y-6 shadow-2xl">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </div>

              {/* Host and capacity pill */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>

              {/* Participant line */}
              <Skeleton className="h-4 w-32 rounded-md" />

              {/* User preview */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-2.5">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <Skeleton className="h-3.5 w-28 rounded flex-1" />
              </div>

              {/* Join Button */}
              <Skeleton className="w-full h-12 rounded-2xl bg-white/[0.12]" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Full Talk / Audio Room Stage Skeleton (Zero Layout Shift for /talk/[code])
 */
export function TalkStageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-black text-[#fcfdff] select-none ambient-glow-audio">
      {/* Top Header */}
      <header className="h-14 border-b border-white/[0.06] px-3 sm:px-6 flex items-center justify-between bg-black/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32 sm:w-44 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 sm:h-52 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] p-4 flex flex-col items-center justify-center space-y-3 relative shadow-lg"
            >
              <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
              <div className="space-y-1.5 flex flex-col items-center">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Controls Bar */}
      <footer className="h-16 sm:h-20 border-t border-white/[0.08] px-4 flex items-center justify-center gap-2 sm:gap-3 bg-black/80 backdrop-blur-2xl shrink-0">
        <Skeleton className="h-10 sm:h-11 w-10 sm:w-24 rounded-xl" />
        <Skeleton className="h-10 sm:h-11 w-10 sm:w-11 rounded-xl" />
        <Skeleton className="h-10 sm:h-11 w-10 sm:w-24 rounded-xl" />
        <Skeleton className="h-10 sm:h-11 w-10 sm:w-11 rounded-xl" />
        <Skeleton className="h-10 sm:h-11 w-10 sm:w-11 rounded-xl" />
        <Skeleton className="h-10 sm:h-11 w-10 sm:w-24 rounded-xl" />
      </footer>
    </div>
  );
}

/**
 * Navbar Profile Pill Skeleton
 */
export function NavbarProfileSkeleton() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.12]">
        <Skeleton className="w-5 h-5 rounded-full" />
        <Skeleton className="hidden md:inline-block w-16 h-3.5 rounded" />
      </div>
      <Skeleton className="h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-xl" />
    </div>
  );
}

/**
 * Full Webinar Host Studio Skeleton (Zero Layout Shift for /webinar/host/[code])
 */
export function WebinarStudioSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-black text-[#fcfdff] select-none ambient-glow-webinar">
      {/* Studio Top Bar */}
      <header className="relative h-14 border-b border-white/[0.08] px-3 sm:px-6 flex items-center justify-between gap-4 bg-[#060609]/85 backdrop-blur-2xl shrink-0 z-40">
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF9933]/30 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Skeleton className="h-7.5 w-16 rounded-lg bg-white/[0.08]" />
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4.5 w-32 sm:w-48 rounded-md bg-white/[0.12]" />
              <Skeleton className="h-4 w-16 rounded-md bg-amber-500/15" />
            </div>
            <Skeleton className="h-3 w-24 rounded-md bg-white/[0.06]" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Skeleton className="h-7.5 w-12 rounded-lg bg-white/[0.08]" />
          <Skeleton className="hidden sm:inline-block h-7.5 w-16 rounded-lg bg-white/[0.08]" />
          <Skeleton className="hidden sm:inline-block h-7.5 w-20 rounded-lg bg-white/[0.08]" />
          <Skeleton className="h-7.5 w-16 rounded-lg bg-white/[0.08]" />
          <Skeleton className="h-8 w-24 rounded-xl bg-gradient-brand-r opacity-50" />
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Stage */}
        <div className="flex-1 flex flex-col p-3 sm:p-5 bg-transparent overflow-y-auto">
          {/* Top Stage Control Pills */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7.5 w-24 rounded-lg bg-white/[0.08]" />
              <Skeleton className="h-7.5 w-28 rounded-lg bg-white/[0.08]" />
            </div>
          </div>

          {/* Stage Viewport */}
          <div className="relative flex-1 min-h-[420px] rounded-2xl bg-[#050508] border border-white/[0.14] overflow-hidden shadow-2xl flex flex-col items-center justify-center p-6 sm:p-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-15 bg-gradient-brand pointer-events-none" />
            <div className="relative z-10 mb-4 flex items-center justify-center">
              <Skeleton className="w-16 h-16 rounded-2xl bg-white/[0.08]" />
            </div>
            <Skeleton className="h-6 w-48 rounded-lg mb-2 bg-white/[0.10]" />
            <Skeleton className="h-3.5 w-72 rounded-md mb-5 bg-white/[0.06]" />
            <Skeleton className="h-9 w-36 rounded-xl bg-gradient-brand-r opacity-40" />
          </div>
        </div>

        {/* Right Drawer (Desktop) */}
        <aside className="hidden lg:flex w-80 md:w-96 border-l border-white/[0.08] bg-[#07070a]/95 flex-col shrink-0">
          <div className="p-2.5 border-b border-white/[0.08] bg-[#08080c]/80 flex items-center justify-between gap-2">
            <Skeleton className="h-8 w-full rounded-xl bg-white/[0.06]" />
            <Skeleton className="h-8 w-8 rounded-lg bg-white/[0.06] shrink-0" />
          </div>
          <div className="flex-1 p-4 space-y-4">
            <div className="flex gap-2.5">
              <Skeleton className="h-6 w-6 rounded-full bg-white/[0.08] shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-20 rounded bg-white/[0.06]" />
                <Skeleton className="h-10 w-44 rounded-2xl bg-white/[0.06]" />
              </div>
            </div>
            <div className="flex gap-2.5 flex-row-reverse">
              <div className="space-y-1 flex-1 flex flex-col items-end">
                <Skeleton className="h-3 w-16 rounded bg-white/[0.06]" />
                <Skeleton className="h-10 w-48 rounded-2xl bg-[#FF9933]/15" />
              </div>
            </div>
            <div className="flex gap-2.5">
              <Skeleton className="h-6 w-6 rounded-full bg-white/[0.08] shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-24 rounded bg-white/[0.06]" />
                <Skeleton className="h-14 w-52 rounded-2xl bg-white/[0.06]" />
              </div>
            </div>
          </div>
          <div className="p-3 border-t border-white/[0.08] bg-[#07070a]/90 flex items-center gap-2">
            <Skeleton className="h-8 flex-1 rounded-xl bg-white/[0.06]" />
            <Skeleton className="h-8 w-8 rounded-xl bg-white/[0.12] shrink-0" />
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Full Webinar Watch Stage Skeleton (Zero Layout Shift for /webinar/watch/[code])
 */
export function WebinarWatchSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-black text-[#fcfdff] select-none ambient-glow-webinar">
      {/* Top Header Bar */}
      <header className="relative h-14 border-b border-white/[0.08] px-3 sm:px-6 flex items-center justify-between gap-4 bg-[#060609]/85 backdrop-blur-2xl shrink-0 z-40">
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF9933]/30 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Skeleton className="h-7.5 w-16 rounded-lg bg-white/[0.08]" />
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4.5 w-32 sm:w-44 rounded-md bg-white/[0.12]" />
              <Skeleton className="h-4 w-16 rounded-md bg-amber-500/15" />
            </div>
            <Skeleton className="h-3 w-20 rounded-md bg-white/[0.06]" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Skeleton className="h-7.5 w-12 rounded-lg bg-white/[0.08]" />
          <Skeleton className="h-7.5 w-16 rounded-lg bg-white/[0.08]" />
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Stage Viewport */}
        <div className="flex-1 flex flex-col p-3 sm:p-5 bg-[#06060a] overflow-y-auto">
          <div className="relative flex-1 min-h-[380px] rounded-2xl bg-[#050508] border border-white/[0.14] overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8 sm:p-12">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-15 bg-gradient-brand pointer-events-none" />
            <div className="relative z-10 mb-4 flex items-center justify-center">
              <Skeleton className="w-16 h-16 rounded-2xl bg-white/[0.08]" />
            </div>
            <Skeleton className="h-6 w-52 rounded-lg mb-2 bg-white/[0.10]" />
            <Skeleton className="h-3.5 w-64 rounded-md mb-5 bg-white/[0.06]" />
            <Skeleton className="h-10 w-40 rounded-2xl bg-white/[0.08]" />
          </div>
        </div>

        {/* Right Drawer (Desktop) */}
        <aside className="hidden lg:flex w-80 md:w-96 border-l border-white/[0.08] bg-[#07070a]/95 flex-col shrink-0">
          <div className="p-2.5 border-b border-white/[0.08] bg-[#08080c]/80 flex items-center justify-between gap-2">
            <Skeleton className="h-8 w-full rounded-xl bg-white/[0.06]" />
            <Skeleton className="h-8 w-8 rounded-lg bg-white/[0.06] shrink-0" />
          </div>
          <div className="flex-1 p-4 space-y-4">
            <div className="flex gap-2.5">
              <Skeleton className="h-6 w-6 rounded-full bg-white/[0.08] shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-20 rounded bg-white/[0.06]" />
                <Skeleton className="h-10 w-44 rounded-2xl bg-white/[0.06]" />
              </div>
            </div>
            <div className="flex gap-2.5 flex-row-reverse">
              <div className="space-y-1 flex-1 flex flex-col items-end">
                <Skeleton className="h-3 w-16 rounded bg-white/[0.06]" />
                <Skeleton className="h-10 w-48 rounded-2xl bg-[#FF9933]/15" />
              </div>
            </div>
          </div>
          <div className="p-3 border-t border-white/[0.08] bg-[#07070a]/90 flex items-center gap-2">
            <Skeleton className="h-8 flex-1 rounded-xl bg-white/[0.06]" />
            <Skeleton className="h-8 w-8 rounded-xl bg-white/[0.12] shrink-0" />
          </div>
        </aside>
      </div>

      {/* Bottom Controls Dock */}
      <footer className="h-16 sm:h-20 border-t border-white/[0.08] px-4 flex items-center justify-between bg-black/80 backdrop-blur-2xl shrink-0">
        <Skeleton className="h-9 w-24 rounded-xl bg-white/[0.08]" />
        <Skeleton className="h-10 w-48 rounded-2xl bg-white/[0.08]" />
        <Skeleton className="h-9 w-20 rounded-xl bg-white/[0.08]" />
      </footer>
    </div>
  );
}
