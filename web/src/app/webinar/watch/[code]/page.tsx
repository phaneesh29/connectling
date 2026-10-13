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
          Tuning into Webinar Broadcast...
        </span>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-6 text-center text-white">
        <h2 className="text-xl font-bold mb-2">Webinar Not Found</h2>
        <p className="text-sm text-zinc-400 mb-6">
          This webinar does not exist or may have been removed.
        </p>
        <Link
          href="/?mode=webinar"
          className="px-4 py-2 rounded-xl bg-white/[0.08] text-xs font-semibold hover:bg-white/[0.14]"
        >
          Browse Other Webinars
        </Link>
      </div>
    );
  }

  const isLive = webinar.status === 'live';
  const isEnded = webinar.status === 'ended';

  return (
    <div className="flex flex-col h-screen bg-[#070709] text-white overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="h-14 bg-[#0a0a0f] border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/?mode=webinar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Leave Broadcast"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {webinar.title}
            </h1>

            {isLive ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                LIVE
              </span>
            ) : isEnded ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-zinc-800 text-zinc-400 shrink-0">
                CONCLUDED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                UPCOMING
              </span>
            )}
          </div>
        </div>

        {/* Right Info: Live Viewer count + Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-300"
            title="Active attendees tuned in"
          >
            <Users className="w-3.5 h-3.5 text-[#FF9933]" />
            <span>{viewerCount}</span>
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer"
            title={isSidebarOpen ? 'Hide Chat & Q&A' : 'Show Chat & Q&A'}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Stage Viewport */}
        <div className="flex-1 flex flex-col p-3 sm:p-6 bg-[#070709] overflow-y-auto">
          <div className="relative flex-1 min-h-[380px] rounded-2xl bg-black border border-white/[0.1] overflow-hidden shadow-2xl flex items-center justify-center">
            {/* STATE 1: Scheduled / Waiting */}
            {!isLive && !isEnded && (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                <div className="w-16 h-16 rounded-3xl bg-[#FF9933]/10 border border-[#FF9933]/25 flex items-center justify-center text-[#FF9933] mb-6 shadow-[0_0_30px_rgba(255,153,51,0.2)]">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>

                <h2 className="text-xl font-extrabold text-white mb-2">{webinar.title}</h2>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                  {webinar.description || 'The broadcast has not started yet. Grab a drink and get ready!'}
                </p>

                {countdown && (
                  <div className="px-5 py-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-lg font-mono font-bold text-[#FF9933] shadow-inner mb-4">
                    {countdown}
                  </div>
                )}

                <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500">
                  Waiting for host to go live • Stand By
                </span>
              </div>
            )}

            {/* STATE 2: Ended */}
            {isEnded && (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-zinc-400 mb-6">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Webinar Concluded</h2>
                <p className="text-xs text-zinc-400 mb-6">
                  Thank you for attending {webinar.title}. The live broadcast has wrapped up.
                </p>
                <Link
                  href="/webinar"
                  className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-all"
                >
                  Explore More Events
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
          </div>

          {/* Quick Emoji Reaction Bar (Bottom of Stage) */}
          {webinar.allowReactions && (
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-3 mt-2 shrink-0">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mr-2 hidden sm:inline">
                React:
              </span>
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] active:scale-125 border border-white/[0.06] hover:border-white/[0.15] text-lg sm:text-xl transition-all cursor-pointer filter drop-shadow-md"
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
          <aside className="w-80 md:w-96 border-l border-white/[0.08] bg-[#0a0a0f] flex flex-col shrink-0">
            {/* Tabs Header */}
            <div className="flex border-b border-white/[0.08]">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-[#FF9933] text-white bg-white/[0.02]'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Live Chat
              </button>
              <button
                onClick={() => setActiveTab('qa')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'qa'
                    ? 'border-[#FF9933] text-white bg-white/[0.02]'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Q&A ({questions.length})
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'chat' ? (
                <InRoomChat
                  isOpen={true}
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
