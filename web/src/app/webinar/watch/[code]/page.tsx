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
  Users,
  MessageSquare,
  HelpCircle,
  Clock,
  ArrowLeft,
  CheckCircle,
  X,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ code: string }>;
}

const QUICK_REACTIONS = ['🔥', '❤️', '👏', '🎉', '🚀', '💯'];

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
    <div className="flex flex-col h-screen bg-[#06060a] text-[#fcfdff] overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-white/[0.06] px-3 sm:px-6 flex items-center justify-between gap-4 bg-black/60 backdrop-blur-xl shrink-0 z-40">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/?mode=webinar"
            className="p-1.5 rounded-lg text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Leave Broadcast"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

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

            <p className="text-[10px] sm:text-[11px] text-[#888e90] font-mono truncate">
              #{webinar.code}
            </p>
          </div>
        </div>

        {/* Right Info: Live Viewer count + Sidebar Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#101012] border border-white/[0.08] text-xs font-mono text-[#fcfdff]"
            title="Active attendees tuned in"
          >
            <Users className="w-3.5 h-3.5 text-[#FF9933]" />
            <span>{viewerCount}</span>
          </div>

          {/* Chat & Q&A Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
              isSidebarOpen
                ? 'bg-[#FF9933]/15 text-[#FF9933] border-[#FF9933]/40 shadow-sm'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border-white/[0.08]'
            }`}
            title={isSidebarOpen ? 'Hide Chat' : 'Show Chat'}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#FF9933]" />
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
          <div className="relative flex-1 min-h-[380px] rounded-2xl bg-[#0a0a0c] border border-white/[0.08] overflow-hidden shadow-2xl flex items-center justify-center">
            {/* STATE 1: Scheduled / Waiting */}
            {!isLive && !isEnded && (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-[#FF9933]/10 border border-[#FF9933]/25 flex items-center justify-center text-[#FF9933] mb-5 shadow-[0_0_24px_rgba(255,153,51,0.2)]">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>

                <h2 className="font-serif-headline text-xl sm:text-2xl font-normal text-[#fcfdff] mb-2">{webinar.title}</h2>
                <p className="text-xs text-[#888e90] mb-5 leading-relaxed">
                  {webinar.description || 'The broadcast will begin shortly.'}
                </p>

                {countdown && (
                  <div className="px-5 py-2.5 rounded-xl bg-[#101012] border border-white/[0.1] text-lg font-mono font-bold text-[#FF9933] shadow-inner mb-4">
                    {countdown}
                  </div>
                )}

                <span className="text-[11px] font-mono tracking-wider uppercase text-[#888e90]">
                  Waiting for broadcast...
                </span>
              </div>
            )}

            {/* STATE 2: Ended */}
            {isEnded && (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-[#101012] border border-white/[0.08] flex items-center justify-center text-[#11ff99] mb-5 shadow-inner">
                  <CheckCircle className="w-7 h-7 text-[#11ff99]" />
                </div>
                <h2 className="font-serif-headline text-xl font-normal text-[#fcfdff] mb-2">Webinar Ended</h2>
                <p className="text-xs text-[#888e90] mb-6">
                  This broadcast has ended.
                </p>
                <Link
                  href="/?mode=webinar"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-xl shadow-brand-glow transition-all active:scale-95 cursor-pointer"
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
                title="Open Chat & Q&A"
              >
                <MessageSquare className="w-4 h-4 text-[#FF9933] group-hover:scale-110 transition-transform" />
                <span className="font-mono text-[11px]">Chat</span>
                {questions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30">
                    {questions.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Quick Emoji Reaction Bar (Bottom of Stage) */}
          {webinar.allowReactions && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 py-3 mt-2 shrink-0">
              <span className="text-[11px] font-mono text-[#888e90] uppercase tracking-wider mr-2 hidden sm:inline">
                Reactions:
              </span>
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-[#101012] hover:bg-[#18181c] active:scale-125 border border-white/[0.08] hover:border-white/[0.16] text-lg sm:text-xl flex items-center justify-center transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(255,153,51,0.15)]"
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Chat & Q&A */}
        {isSidebarOpen && (
          <aside className="w-80 md:w-96 border-l border-white/[0.06] bg-[#0a0a0c] flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
            {/* Tabs Header with Close (X) button */}
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/40 backdrop-blur-md px-2">
              <div className="flex flex-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                    activeTab === 'chat'
                      ? 'border-[#FF9933] text-[#fcfdff] font-semibold bg-white/[0.02]'
                      : 'border-transparent text-[#888e90] hover:text-[#fcfdff] font-medium'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#FF9933]" />
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('qa')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                    activeTab === 'qa'
                      ? 'border-[#FF9933] text-[#fcfdff] font-semibold bg-white/[0.02]'
                      : 'border-transparent text-[#888e90] hover:text-[#fcfdff] font-medium'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#FF9933]" />
                  Q&A ({questions.length})
                </button>
              </div>

              {/* Close Sidebar (X) button */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.08] transition-all ml-1 cursor-pointer"
                title="Close Chat & Q&A Sidebar"
              >
                <X className="w-4 h-4" />
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
    </div>
  );
}
