'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { ConfirmDialog } from '@/components/confirm-dialog';

import {
  UsersIcon,
  CopyIcon,
  CheckIcon,
  SettingsIcon,
  MessageSquareIcon,
  LogOutIcon,
  PhoneCallIcon,
  XIcon,
} from '@animateicons/react/lucide';
import {
  Pencil,
  Radio,
  Sliders,
  HelpCircle,
  Dices,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { generateRandomWebinarTitle } from '@/lib/room-names';
import { CallDuration } from '@/components/call-duration';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function WebinarHostStudioPage({ params }: PageProps) {
  const router = useRouter();
  const { code } = use(params);
  const { data: session, isPending: isSessionPending } = useSession();

  const webinar = useWebinarStore((s) => s.webinar);
  const viewerCount = useWebinarStore((s) => s.viewerCount);
  const isWhiteboardActive = useWebinarStore((s) => s.isWhiteboardActive);
  const questions = useWebinarStore((s) => s.questions);
  const setWebinar = useWebinarStore((s) => s.setWebinar);
  const setStatus = useWebinarStore((s) => s.setStatus);
  const updateWebinarDetails = useWebinarStore((s) => s.updateWebinarDetails);

  const [activeTab, setActiveTab] = useState<'chat' | 'qa'>('chat');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmGoLiveOpen, setConfirmGoLiveOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings form state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVideoId, setEditVideoId] = useState('');

  // Socket connection
  const {
    sendChatMessage,
    toggleWhiteboard,
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
          // Verify host authorization
          if (session?.user && res.data.hostId !== session.user.id) {
            router.replace(`/webinar/watch/${code}`);
            return;
          }

          setWebinar(res.data);
          setEditTitle(res.data.title);
          setEditDesc(res.data.description || '');
          setEditVideoId(res.data.youtubeVideoId || '');
        }
      } catch (err) {
        console.error('Failed to load webinar for studio:', err);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    if (!isSessionPending) {
      if (!session?.user) {
        router.replace('/login');
      } else {
        loadWebinar();
      }
    }

    return () => {
      isSubscribed = false;
    };
  }, [code, session?.user, isSessionPending, router, setWebinar]);

  const handleCopyAttendeeLink = () => {
    const url = `${window.location.origin}/webinar/watch/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleGoLive = async () => {
    try {
      const res = await webinarsApi.updateStatus(code, 'live');
      if (res.success) {
        setStatus('live');
        setConfirmGoLiveOpen(false);
      }
    } catch (err) {
      console.error('Failed to start broadcast:', err);
    }
  };

  const handleEndWebinar = async () => {
    try {
      const res = await webinarsApi.updateStatus(code, 'ended');
      if (res.success) {
        setStatus('ended');
        setConfirmEndOpen(false);
      }
    } catch (err) {
      console.error('Failed to end broadcast:', err);
    }
  };

  const handleDeleteWebinar = async () => {
    setIsDeleting(true);
    try {
      await webinarsApi.deleteWebinar(code);
      setConfirmDeleteOpen(false);
      router.replace('/?mode=webinar');
    } catch (err) {
      console.error('Failed to delete webinar:', err);
      setIsDeleting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await webinarsApi.updateWebinar(code, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        youtubeVideoId: editVideoId.trim() || null,
      });

      if (res.success && res.data) {
        updateWebinarDetails({
          title: res.data.title,
          description: res.data.description,
          youtubeVideoId: res.data.youtubeVideoId,
        });
        setIsSettingsOpen(false);
      }
    } catch (err) {
      console.error('Failed to update webinar settings:', err);
    }
  };

  const openSettingsModal = () => {
    if (webinar) {
      setEditTitle(webinar.title);
      setEditDesc(webinar.description || '');
      setEditVideoId(webinar.youtubeVideoId || '');
    }
    setIsSettingsOpen(true);
  };

  if (isLoading || isSessionPending) {
    return (
      <div className="min-h-screen bg-[#06060a] flex flex-col items-center justify-center text-[#fcfdff] gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#FF9933] border-t-transparent animate-spin" />
        <span className="text-xs font-mono tracking-wider text-[#888e90] uppercase">
          Loading...
        </span>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-[#06060a] flex flex-col items-center justify-center p-6 text-center text-[#fcfdff]">
        <h2 className="font-serif-headline text-xl font-normal mb-2 text-[#fcfdff]">Webinar not found</h2>
        <p className="text-xs text-[#888e90] mb-6">This webinar may be invalid or deleted.</p>
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
      {/* Studio Top Bar */}
      <header className="relative h-14 border-b border-white/[0.08] px-3 sm:px-6 flex items-center justify-between gap-4 bg-[#060609]/85 backdrop-blur-2xl shrink-0 z-40">
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF9933]/30 to-transparent pointer-events-none" />
        {/* Left: Leave, Status Dot, Title & Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/?mode=webinar"
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#888e90] hover:text-[#fcfdff] transition-colors border border-white/[0.08] cursor-pointer"
            title="Leave Studio"
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
                  ENDED
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/25 shrink-0">
                  STANDBY
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

        {/* Right: Attendee count, Share, Settings, Chat Toggle, Go Live Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Live Viewer Counter */}
          <div
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#101012] border border-white/[0.08] text-xs font-mono text-[#fcfdff]"
            title="Attendees"
          >
            <UsersIcon size={13} className="text-[#ff7a1a]" />
            <span>{viewerCount}</span>
          </div>

          {/* Copy Attendee Link */}
          <button
            type="button"
            onClick={handleCopyAttendeeLink}
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] transition-colors border border-white/[0.08] cursor-pointer"
            title="Share space invite"
          >
            {copiedLink ? (
              <>
                <CheckIcon size={13} className="text-[#11ff99]" />
                <span className="text-[#11ff99] font-mono text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <CopyIcon size={13} className="text-[#888e90]" />
                <span className="font-mono text-[11px]">Share</span>
              </>
            )}
          </button>

          {/* Settings modal button */}
          <button
            type="button"
            onClick={openSettingsModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] transition-colors border border-white/[0.08] cursor-pointer"
            title="Stream Settings"
          >
            <SettingsIcon size={13} className="text-[#888e90]" />
            <span className="hidden sm:inline font-mono text-[11px]">Settings</span>
          </button>

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

          {/* Broadcast Go Live / End Control */}
          {!isLive && !isEnded && (
            <button
              type="button"
              onClick={() => setConfirmGoLiveOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-xl shadow-brand-glow transition-all active:scale-95 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Go Live</span>
            </button>
          )}

          {isLive && (
            <button
              type="button"
              onClick={() => setConfirmEndOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#240a0f] to-[#1a070b] hover:from-[#2e0e15] hover:to-[#220a0f] text-[#f87171] hover:text-[#fca5a5] border border-red-500/35 hover:border-red-500/50 font-medium text-xs transition-all shadow-[0_0_14px_rgba(220,38,38,0.18)] cursor-pointer"
            >
              <PhoneCallIcon size={13} className="text-[#f87171]" />
              <span>End</span>
            </button>
          )}

          {isEnded && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[#f87171] hover:text-[#fca5a5] border border-red-500/30 hover:border-red-500/50 font-medium text-xs transition-all cursor-pointer"
              title="Delete Webinar Permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace: Left Stage + Right Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Stage Area */}
        <div className="flex-1 flex flex-col p-3 sm:p-5 bg-transparent overflow-y-auto">
          {/* Top Stage Control Pills */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleWhiteboard(!isWhiteboardActive)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                  isWhiteboardActive
                    ? 'bg-[#FF9933]/20 text-[#FF9933] border-[#FF9933]/40 shadow-[0_0_12px_rgba(255,153,51,0.2)]'
                    : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border-white/[0.08]'
                }`}
              >
                <Pencil className={`w-3.5 h-3.5 shrink-0 ${isWhiteboardActive ? 'text-[#FF9933]' : 'text-zinc-400'}`} />
                <span className="font-mono text-[11px]">
                  {isWhiteboardActive ? 'Close Board' : 'Whiteboard'}
                </span>
              </button>

              <button
                type="button"
                onClick={openSettingsModal}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                  webinar.youtubeVideoId
                    ? 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border-white/[0.08]'
                    : 'bg-[#FF9933]/15 hover:bg-[#FF9933]/25 text-[#FF9933] border-[#FF9933]/30 shadow-sm hover:shadow-[0_0_12px_rgba(255,153,51,0.2)]'
                }`}
                title="Change or set your YouTube stream URL / video ID"
              >
                <Sliders className="w-3.5 h-3.5 text-[#FF9933] shrink-0" />
                <span className="font-mono text-[11px]">
                  {webinar.youtubeVideoId ? 'Stream Link' : 'Connect Stream'}
                </span>
                {webinar.youtubeVideoId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#11ff99]" title="Stream connected" />
                )}
              </button>
            </div>
          </div>

          {/* Stage Viewport */}
          <div className="relative flex-1 min-h-[420px] rounded-2xl bg-[#050508] border border-white/[0.14] overflow-hidden shadow-2xl flex items-center justify-center">
            {/* If Whiteboard is active, show Excalidraw */}
            {isWhiteboardActive ? (
              <div className="absolute inset-0 z-20">
                <Whiteboard
                  roomCode={code}
                  isHost={true}
                  socket={getSocket()}
                  onClose={() => toggleWhiteboard(false)}
                />
              </div>
            ) : (
              /* Otherwise, show Stream Player Preview */
              <div className="w-full h-full flex items-center justify-center relative">
                <WebinarPlayer
                  videoId={webinar.youtubeVideoId}
                  title={webinar.title}
                  isHost={true}
                  onConfigureStream={openSettingsModal}
                  className="w-full h-full"
                />
              </div>
            )}

            {/* Floating Reactions overlay over the stage */}
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

        {/* Right Engagement Sidebar */}
        {isSidebarOpen && (
          <aside className="w-80 md:w-96 border-l border-white/[0.08] bg-[#07070a]/95 backdrop-blur-2xl flex flex-col shrink-0 animate-in slide-in-from-right duration-200 shadow-2xl">
            {/* Tabs Header with Close (X) Button */}
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

              {/* Close Sidebar button */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="h-8 w-8 rounded-lg text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Close Chat"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden bg-[#06060a]">
              {activeTab === 'chat' ? (
                <InRoomChat
                  isOpen={true}
                  embedded={true}
                  onSendMessage={sendChatMessage}
                  currentUserId={session?.user?.id || ''}
                  roomTitle={webinar.title}
                  isChatAllowed={webinar.allowChat}
                  isHost={true}
                />
              ) : (
                <WebinarQa
                  questions={questions}
                  currentUserId={session?.user?.id}
                  isHost={true}
                  onAskQuestion={askQuestion}
                  onUpvoteQuestion={upvoteQuestion}
                  onAnswerQuestion={answerQuestion}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Stream Settings Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#0a0a0c] border border-white/[0.14] rounded-2xl p-5 sm:p-6 shadow-2xl text-[#fcfdff] space-y-4 sm:space-y-5 relative overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Amber Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full blur-2xl opacity-25 bg-gradient-brand-r pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF9933]/40 to-transparent pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-[#FF9933]/15 border border-[#FF9933]/30 flex items-center justify-center text-[#FF9933] shadow-[0_0_12px_rgba(255,153,51,0.15)]">
                  <SettingsIcon size={14} />
                </div>
                <div>
                  <h3 className="font-serif-headline text-base font-normal text-[#fcfdff] leading-tight">
                    Stream Settings
                  </h3>
                  <p className="text-[11px] text-[#888e90]">
                    Stream details & video source
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-[#888e90] hover:text-[#fcfdff] p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Close"
              >
                <XIcon size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 relative z-10">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#888e90]">
                    Title
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditTitle(generateRandomWebinarTitle(editTitle))}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-mono text-[#FF9933] hover:text-[#ffaa4d] bg-[#FF9933]/10 hover:bg-[#FF9933]/20 border border-[#FF9933]/25 transition-all cursor-pointer select-none active:scale-95"
                    title="Generate random title"
                  >
                    <Dices size={12} className="shrink-0" />
                    <span>Randomize</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-[#fcfdff] placeholder-[#888e90] focus:outline-none focus:border-[#FF9933]/50 focus:ring-1 focus:ring-[#FF9933]/30 transition-all font-sans"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#0f0f14]/80 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#fcfdff]">
                    YouTube URL or ID
                  </label>
                  <a
                    href="/webinar/guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-[#FF9933] hover:underline"
                    title="Setup guide"
                  >
                    <span>Guide</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={editVideoId}
                    onChange={(e) => setEditVideoId(e.target.value)}
                    placeholder="YouTube URL or Video ID"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-[#fcfdff] placeholder-[#888e90] font-mono focus:outline-none focus:border-[#FF9933]/50 focus:ring-1 focus:ring-[#FF9933]/30 transition-all"
                  />
                  {editVideoId && (
                    <button
                      type="button"
                      onClick={() => setEditVideoId('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888e90] hover:text-[#fcfdff] px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-white/[0.08] cursor-pointer"
                      title="Clear"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#888e90] leading-relaxed">
                  Paste your YouTube live URL or video ID.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setConfirmDeleteOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 transition-all cursor-pointer"
                  title="Delete Webinar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-xl shadow-brand-glow transition-all active:scale-95 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation: Go Live */}
      <ConfirmDialog
        isOpen={confirmGoLiveOpen}
        onCancel={() => setConfirmGoLiveOpen(false)}
        onConfirm={handleGoLive}
        title="Go Live?"
        description="Start broadcast for all waiting attendees."
        confirmText="Go Live"
        variant="warning"
      />

      {/* Confirmation: End Webinar */}
      <ConfirmDialog
        isOpen={confirmEndOpen}
        onCancel={() => setConfirmEndOpen(false)}
        onConfirm={handleEndWebinar}
        title="End Webinar?"
        description="Disconnect all attendees and finish broadcast."
        confirmText="End"
        variant="danger"
      />

      {/* Confirmation: Delete Webinar */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteWebinar}
        title="Delete Webinar?"
        description="Permanently delete this webinar and close studio."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
