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
  Users,
  Copy,
  Check,
  Settings,
  PenTool,
  HelpCircle,
  MessageSquare,
  Power,
  ArrowLeft,
  X,
} from 'lucide-react';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmGoLiveOpen, setConfirmGoLiveOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

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

  if (isLoading || isSessionPending) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center text-white gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#FF9933] border-t-transparent animate-spin" />
        <span className="text-xs font-mono tracking-wider text-zinc-400 uppercase">
          Initializing Host Studio...
        </span>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-6 text-center text-white">
        <h2 className="text-xl font-bold mb-2">Webinar Studio Not Found</h2>
        <p className="text-sm text-zinc-400 mb-6">This webinar code may be invalid or deleted.</p>
        <Link
          href="/?mode=webinar"
          className="px-4 py-2 rounded-xl bg-white/[0.08] text-xs font-semibold hover:bg-white/[0.14]"
        >
          Return to Hub
        </Link>
      </div>
    );
  }

  const isLive = webinar.status === 'live';
  const isEnded = webinar.status === 'ended';

  return (
    <div className="flex flex-col h-screen bg-[#070709] text-white overflow-hidden select-none">
      {/* Studio Top Bar */}
      <header className="h-14 bg-[#0a0a0f] border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-40">
        {/* Left: Back, Title, Live Status */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/?mode=webinar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Leave Studio"
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
                ENDED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                STANDBY
              </span>
            )}
          </div>
        </div>

        {/* Right: Attendee count, Share, Settings, Go Live Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live Viewer Counter */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-300"
            title="Current connected attendees"
          >
            <Users className="w-3.5 h-3.5 text-[#FF9933]" />
            <span>{viewerCount}</span>
          </div>

          {/* Copy Attendee Link */}
          <button
            onClick={handleCopyAttendeeLink}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Copy attendee invite URL"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </>
            )}
          </button>

          {/* Settings modal button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Stream Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Broadcast Go Live / End Control */}
          {!isLive && !isEnded && (
            <button
              onClick={() => setConfirmGoLiveOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
            >
              <Power className="w-3.5 h-3.5 stroke-[2.5]" />
              Go Live
            </button>
          )}

          {isLive && (
            <button
              onClick={() => setConfirmEndOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.4)]"
            >
              <Power className="w-3.5 h-3.5 stroke-[2.5]" />
              End Webinar
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace: Left Stage + Right Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Stage Area */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 bg-[#070709] overflow-y-auto">
          {/* Top Stage Control Pills */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleWhiteboard(!isWhiteboardActive)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isWhiteboardActive
                    ? 'bg-[#FF9933] text-black shadow-[0_0_15px_rgba(255,153,51,0.4)]'
                    : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                {isWhiteboardActive ? 'Close Live Whiteboard' : 'Broadcast Live Whiteboard'}
              </button>
            </div>

            <div className="text-[11px] font-mono text-zinc-500">
              Host Studio • Broadcast Mode
            </div>
          </div>

          {/* Stage Viewport */}
          <div className="relative flex-1 min-h-[420px] rounded-2xl bg-black border border-white/[0.1] overflow-hidden shadow-2xl flex items-center justify-center">
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
              <div className="w-full h-full flex items-center justify-center">
                <WebinarPlayer
                  videoId={webinar.youtubeVideoId}
                  title={webinar.title}
                  isHost={true}
                  className="w-full h-full"
                />
              </div>
            )}

            {/* Floating Reactions overlay over the stage */}
            <FloatingReactions />
          </div>
        </div>

        {/* Right Engagement Sidebar */}
        <aside className="w-80 md:w-96 border-l border-white/[0.08] bg-[#0a0a0f] flex flex-col shrink-0">
          {/* Tabs header */}
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

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <InRoomChat
                isOpen={true}
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
      </div>

      {/* Stream Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0e0e16] border border-white/[0.12] rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Broadcast Stream Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#161622] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                  YouTube Live Link or Video ID
                </label>
                <input
                  type="text"
                  value={editVideoId}
                  onChange={(e) => setEditVideoId(e.target.value)}
                  placeholder="https://youtube.com/live/... or ID"
                  className="w-full bg-[#161622] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  You can change this anytime during or before the stream.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#FF9933] text-black text-xs font-bold"
                >
                  Save Changes
                </button>
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
        title="Ready to Go Live?"
        description="This will start the webinar broadcast. All waiting attendees will instantly tune in to your stream."
        confirmText="Yes, Go Live!"
        variant="warning"
      />

      {/* Confirmation: End Webinar */}
      <ConfirmDialog
        isOpen={confirmEndOpen}
        onCancel={() => setConfirmEndOpen(false)}
        onConfirm={handleEndWebinar}
        title="End Webinar Broadcast?"
        description="Are you sure you want to end this webinar? All attendees will be disconnected from the live broadcast."
        confirmText="End Webinar"
        variant="danger"
      />
    </div>
  );
}
