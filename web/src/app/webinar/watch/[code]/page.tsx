'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { webinarsApi } from '@/lib/webinars-api';
import { useWebinarStore } from '@/stores/webinar-store';
import { useWebinarSocket } from '@/hooks/use-webinar-socket';
import { getSocket } from '@/lib/socket';

// Components
import { WebinarPlayer } from '@/components/webinar/webinar-player';
import { WebinarQa } from '@/components/webinar/webinar-qa';
import { InRoomChat } from '@/components/in-room-chat';
import { Whiteboard } from '@/components/whiteboard';
import { FloatingReactions } from '@/components/reactions/floating-reactions';

import {
  UsersIcon,
  MessageSquareIcon,
  LogOutIcon,
  XIcon,
  CheckIcon,
} from '@animateicons/react/lucide';

import {
  Clock,
  HelpCircle,
  Pencil,
} from 'lucide-react';
import { CallDuration } from '@/components/call-duration';
import { ReactionPicker } from '@/components/reactions/reaction-picker';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function WebinarWatchPage({ params }: PageProps) {
  const router = useRouter();
  const { code } = use(params);
  const { data: session, isPending: isSessionPending } = useSession();

  const webinar = useWebinarStore((s) => s.webinar);
  const viewerCount = useWebinarStore((s) => s.viewerCount);
  const isWhiteboardActive = useWebinarStore((s) => s.isWhiteboardActive);
  const questions = useWebinarStore((s) => s.questions);
  const setWebinar = useWebinarStore((s) => s.setWebinar);

  const [activeTab, setActiveTab] = useState<'chat' | 'qa'>('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!isSessionPending && !session?.user) {
      router.replace('/login');
    }
  }, [session?.user, isSessionPending, router]);

  // Real-time socket connection
  const {
    sendChatMessage,
    sendReaction,
    askQuestion,
    upvoteQuestion,
    answerQuestion,
  } = useWebinarSocket({ webinarCode: code, enabled: Boolean(code) });

  // Initial fetch
  useEffect(() => {
    let isSubscribed = true;

    async function loadWebinar() {
      try {
        const res = await webinarsApi.getWebinar(code);
        if (!isSubscribed) return;
        if (res.success && res.data) {
          setWebinar(res.data);
        }
      } catch (err) {
        console.error('Failed to load webinar:', err);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    if (session?.user) {
      loadWebinar();
    }

    return () => {
      isSubscribed = false;
    };
  }, [code, session?.user, setWebinar]);

  // Countdown timer for scheduled webinars
  useEffect(() => {
    if (!webinar?.scheduledAt || webinar.status !== 'scheduled') {
      return;
    }

    const computeDiff = () => {
      const diff = new Date(webinar.scheduledAt!).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Starting any moment...');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`);
      }
    };

    const interval = setInterval(computeDiff, 1000);
    return () => clearInterval(interval);
  }, [webinar?.scheduledAt, webinar?.status]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center text-white gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#FF9933] border-t-transparent animate-spin" />
        <span className="text-xs font-mono tracking-wider text-zinc-400 uppercase">
          Loading...
        </span>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-[#06060a] flex flex-col items-center justify-center p-6 text-center text-[#fcfdff]">
        <h2 className="font-serif-headline text-xl font-normal mb-2 text-[#fcfdff]">Webinar not found</h2>
        <p className="text-xs text-[#888e90] mb-6">
          This webinar does not exist or has ended.
        </p>
        <Link
          href="/?mode=webinar"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-xl shadow-brand-glow transition-all active:scale-95 cursor-pointer"
        >
          Return to Hub
        </Link>
      </div>
    );
  }

  const isLive = webinar.status === 'live';
  const isEnded = webinar.status === 'ended';

  return (
    <div className="flex flex-col h-screen bg-black text-[#fcfdff] select-none ambient-glow-webinar">
      {/* Top Header Bar */}
      <header className="relative h-14 border-b border-white/[0.08] px-3 sm:px-6 flex items-center justify-between gap-4 bg-[#060609]/85 backdrop-blur-2xl shrink-0 z-40">
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF9933]/30 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/?mode=webinar"
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#888e90] hover:text-[#fcfdff] transition-colors border border-white/[0.08] cursor-pointer"
            title="Leave Broadcast"
          >
            <LogOutIcon size={13} />
            <span className="hidden sm:inline font-mono text-[11px]">Leave</span>
          </Link>

          {isLive && (
            <span
              className="h-2 w-2 rounded-full shrink-0 bg-[#11ff99] shadow-[0_0_8px_#11ff99]"
              title="Live Broadcast Active"
            />
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-serif-headline text-xs sm:text-sm font-normal text-[#fcfdff] truncate max-w-[130px] xs:max-w-[200px] sm:max-w-md tracking-tight">
                {webinar.title}
              </h1>

              {isLive ? (
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse shrink-0">
                  LIVE
                </span>
              ) : isEnded ? (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase bg-white/[0.06] text-[#888e90] shrink-0">
                  CONCLUDED
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/25 shrink-0">
                  UPCOMING
                </span>
              )}
            </div>

            <p className="text-[10px] sm:text-[11px] text-[#888e90] font-mono truncate flex items-center gap-1.5">
              <span>ID: {webinar.code}</span>
              {isLive && (
                <>
                  <span aria-hidden="true">·</span>
                  <CallDuration key={webinar.code} active={isLive} />
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Info: Live Viewer count + Sidebar Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#101012] border border-white/[0.08] text-xs font-mono text-[#fcfdff]"
            title="Attendees"
          >
            <UsersIcon size={13} className="text-[#FF9933]" />
            <span>{viewerCount}</span>
          </div>

          {/* Chat & Q&A Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
              isSidebarOpen
                ? 'bg-[#FF9933]/15 text-[#FF9933] border-[#FF9933]/35 shadow-[0_0_12px_rgba(255,153,51,0.15)]'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border-white/[0.08] hover:border-white/[0.14]'
            }`}
            title="Chat"
          >
            <MessageSquareIcon size={13} className={isSidebarOpen ? 'text-[#FF9933]' : 'text-[#888e90]'} />
            <span className="hidden sm:inline font-mono text-[11px]">Chat</span>
            {questions.length > 0 && !isSidebarOpen && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-[#FF9933] text-black font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                {questions.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Stage Viewport */}
        <div className="flex-1 flex flex-col p-3 sm:p-5 bg-[#06060a] overflow-y-auto">
          <div className="relative flex-1 min-h-[380px] rounded-2xl bg-[#050508] border border-white/[0.14] overflow-hidden shadow-2xl flex items-center justify-center">
            {/* STATE 1: Scheduled / Waiting */}
            {!isLive && !isEnded && (
              <div className="relative flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-lg z-10">
                {/* Ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20 bg-gradient-brand pointer-events-none" />

                {/* Radar rings & Icon */}
                <div className="relative mb-5 flex items-center justify-center">
                  <div className="absolute w-28 h-28 rounded-full border border-[#FF9933]/15 animate-ping opacity-35 pointer-events-none" />
                  <div className="absolute w-20 h-20 rounded-full border border-white/[0.08] pointer-events-none" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF9933]/20 via-[#FF9933]/10 to-transparent border border-[#FF9933]/35 flex items-center justify-center text-[#FF9933] shadow-[0_0_30px_rgba(255,153,51,0.25)] backdrop-blur-md">
                    <Clock className="w-7 h-7 animate-pulse" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101016]/90 border border-white/[0.10] text-[10px] font-mono tracking-wider text-[#888e90] uppercase mb-3 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933] animate-pulse shadow-[0_0_8px_#FF9933]" />
                  <span>Standing By</span>
                </div>

                <h2 className="font-serif-headline text-xl sm:text-2xl font-normal text-[#fcfdff] mb-2">{webinar.title}</h2>
                <p className="text-xs text-[#888e90] mb-5 leading-relaxed max-w-sm">
                  {webinar.description || 'The broadcast will begin shortly.'}
                </p>

                {countdown && (
                  <div className="px-6 py-2.5 rounded-2xl bg-[#0e0e14]/90 border border-white/[0.12] text-xl font-mono font-bold text-[#FF9933] shadow-inner mb-4 backdrop-blur-md">
                    {countdown}
                  </div>
                )}

                <span className="text-[11px] font-mono tracking-wider uppercase text-[#888e90]">
                  Waiting for host to go live...
                </span>
              </div>
            )}

            {/* STATE 2: Ended */}
            {isEnded && (
              <div className="relative flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-md z-10">
                <div className="relative mb-5 flex items-center justify-center">
                  <div className="relative w-16 h-16 rounded-2xl bg-[#11ff99]/10 border border-[#11ff99]/25 flex items-center justify-center text-[#11ff99] shadow-[0_0_24px_rgba(17,255,153,0.2)]">
                    <CheckIcon size={28} className="text-[#11ff99]" />
                  </div>
                </div>
                <h2 className="font-serif-headline text-xl sm:text-2xl font-normal text-[#fcfdff] mb-2">Webinar Ended</h2>
                <p className="text-xs text-[#888e90] mb-6 leading-relaxed">
                  This broadcast has wrapped up. Thank you for tuning in!
                </p>
                <Link
                  href="/?mode=webinar"
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-xl shadow-brand-glow transition-all active:scale-95 cursor-pointer"
                >
                  Return to Hub
                </Link>
              </div>
            )}

            {/* STATE 3: Live Broadcast (Custom Unbranded Player) */}
            {isLive && (
              <>
                {/* If Whiteboard is toggled by Host */}
                {isWhiteboardActive ? (
                  <div className="relative w-full h-full flex flex-col">
                    {/* View-only Excalidraw Canvas */}
                    <div className="flex-1 w-full h-full">
                      <Whiteboard
                        roomCode={code}
                        isHost={false}
                        socket={getSocket()}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Picture-in-Picture Mini Player Dock for the Host Video */}
                    <div className="absolute bottom-4 right-4 z-30 w-56 sm:w-72 aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
                      <WebinarPlayer
                        videoId={webinar.youtubeVideoId}
                        title={webinar.title}
                        isHost={false}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                ) : (
                  /* Standard Unbranded Custom Player */
                  <div className="w-full h-full flex items-center justify-center">
                    <WebinarPlayer
                      videoId={webinar.youtubeVideoId}
                      title={webinar.title}
                      isHost={false}
                      className="w-full h-full"
                    />
                  </div>
                )}
              </>
            )}

            {/* Floating Reactions Layer */}
            <FloatingReactions />

            {/* Floating Reopen Chat button when sidebar is closed */}
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-[#101012]/95 hover:bg-[#18181c] backdrop-blur-xl border border-white/[0.12] text-xs font-medium text-[#fcfdff] shadow-xl hover:border-[#FF9933]/40 transition-all cursor-pointer group"
                title="Open Chat"
              >
                <MessageSquareIcon size={14} className="text-[#FF9933] group-hover:scale-110 transition-transform" />
                <span className="font-mono text-[11px]">Chat</span>
                {questions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30">
                    {questions.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar: Chat & Q&A */}
        {isSidebarOpen && (
          <aside className="w-80 md:w-96 border-l border-white/[0.08] bg-[#07070a]/95 backdrop-blur-2xl flex flex-col shrink-0 animate-in slide-in-from-right duration-200 shadow-2xl">
            {/* Tabs Header with Close (X) button */}
            <div className="p-2.5 border-b border-white/[0.08] bg-[#08080c]/80 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
              <div className="flex-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-[#FF9933]/15 text-[#FF9933] font-semibold border border-[#FF9933]/30 shadow-sm'
                      : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.04] font-medium border border-transparent'
                  }`}
                >
                  <MessageSquareIcon size={13} className={activeTab === 'chat' ? 'text-[#FF9933]' : 'text-[#888e90]'} />
                  <span>Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('qa')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    activeTab === 'qa'
                      ? 'bg-[#FF9933]/15 text-[#FF9933] font-semibold border border-[#FF9933]/30 shadow-sm'
                      : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.04] font-medium border border-transparent'
                  }`}
                >
                  <HelpCircle className={`w-3.5 h-3.5 ${activeTab === 'qa' ? 'text-[#FF9933]' : 'text-[#888e90]'}`} />
                  <span>Q&A</span>
                  {questions.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      activeTab === 'qa'
                        ? 'bg-[#FF9933] text-black font-bold'
                        : 'bg-white/10 text-[#888e90]'
                    }`}>
                      {questions.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Close Sidebar (X) button */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="h-8 w-8 rounded-lg text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Close Chat"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-hidden bg-[#06060a]">
              {activeTab === 'chat' ? (
                <InRoomChat
                  isOpen={true}
                  embedded={true}
                  onSendMessage={sendChatMessage}
                  currentUserId={session?.user?.id || 'anonymous'}
                  roomTitle={webinar.title}
                  isChatAllowed={webinar.allowChat}
                  isHost={false}
                />
              ) : (
                <WebinarQa
                  questions={questions}
                  currentUserId={session?.user?.id}
                  isHost={false}
                  onAskQuestion={askQuestion}
                  onUpvoteQuestion={upvoteQuestion}
                  onAnswerQuestion={answerQuestion}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Viewer Control Dock (Meet & Talk Style) */}
      <footer className="relative z-40 h-auto py-2 sm:py-0 sm:h-20 border-t border-white/[0.06] px-1.5 sm:px-6 flex items-center justify-center bg-black/85 backdrop-blur-xl pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl shadow-2xl max-w-full overflow-x-auto sm:overflow-visible no-scrollbar">
          {/* Reaction Picker with animated popover */}
          {webinar.allowReactions && (
            <ReactionPicker
              onSelectReaction={sendReaction}
              accentColor="orange"
            />
          )}

          {/* Connected Attendees count */}
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121216] border border-white/[0.10] text-[#fcfdff] text-xs font-medium shrink-0"
            title="Attendees"
          >
            <UsersIcon size={14} className="text-[#FF9933]" />
            <span className="font-mono text-xs">{viewerCount}</span>
          </div>

          {/* Chat & Q&A Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isSidebarOpen
                ? 'bg-orange-500/20 text-[#ff7a1a] border border-orange-500/40 shadow-sm'
                : 'bg-[#121216] hover:bg-[#18181f] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.10] hover:border-white/[0.16]'
            }`}
            title="Chat & Q&A"
          >
            <MessageSquareIcon size={16} />
            {questions.length > 0 && !isSidebarOpen && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#ff7a1a] text-black font-mono text-[9px] font-bold flex items-center justify-center shadow-lg animate-pulse">
                {questions.length}
              </span>
            )}
          </button>

          <div className="h-5 sm:h-6 w-px bg-white/[0.08] mx-0.5 sm:mx-1 shrink-0" />

          {/* Leave Broadcast */}
          <Link
            href="/?mode=webinar"
            className="flex items-center gap-1.5 h-9 px-2 sm:h-10 sm:px-3.5 rounded-xl bg-[#101012] hover:bg-[#18181c] text-[#888e90] hover:text-[#fcfdff] font-medium text-xs transition-all border border-white/[0.08] cursor-pointer shrink-0"
            title="Leave Broadcast"
          >
            <LogOutIcon size={13} />
            <span className="hidden sm:inline font-mono text-[11px]">Leave</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
