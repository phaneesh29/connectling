'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { roomsApi, type RoomData } from '@/lib/rooms-api';
import { CreateRoomModal } from '@/components/create-room-modal';
import {
  VideoIcon,
  AudioWaveformIcon,
  MonitorIcon,
  UsersIcon,
  LockIcon,
  MicIcon,
  SparklesIcon,
  ArrowRightIcon,
  ZapIcon,
  HandCoinsIcon,
  CheckIcon,
  CopyIcon,
} from '@animateicons/react/lucide';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Mode state: 'meet' (Video Meetings) vs 'audio' (Audio Rooms)
  const [activeMode, setActiveMode] = useState<'meet' | 'audio'>('meet');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'meet' | 'audio'>('meet');

  const [codeInput, setCodeInput] = useState('');
  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const [checkingPresence, setCheckingPresence] = useState(true);
  const [leavingActive, setLeavingActive] = useState(false);

  // Code window tabs state
  const [activeCodeTab, setActiveCodeTab] = useState<'quickstart' | 'webrtc' | 'presence'>('quickstart');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login');
    }
  }, [session, isPending, router]);

  const checkPresence = useCallback(async () => {
    if (!session) return;
    try {
      const res = await roomsApi.getMyPresence();
      if (res.data?.isActive && res.data.activeRoom) {
        setActiveRoom(res.data.activeRoom);
      } else {
        setActiveRoom(null);
      }
    } catch {
      setActiveRoom(null);
    } finally {
      setCheckingPresence(false);
    }
  }, [session]);

  useEffect(() => {
    let ignore = false;
    if (session) {
      roomsApi
        .getMyPresence()
        .then((res) => {
          if (!ignore) {
            if (res.data?.isActive && res.data.activeRoom) {
              setActiveRoom(res.data.activeRoom);
            } else {
              setActiveRoom(null);
            }
          }
        })
        .catch(() => {
          if (!ignore) setActiveRoom(null);
        })
        .finally(() => {
          if (!ignore) setCheckingPresence(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [session]);

  const cleanRoomCode = (input: string) => {
    let clean = input.trim();
    if (clean.includes('/')) {
      const parts = clean.split('/');
      clean = parts[parts.length - 1] || clean;
    }
    return clean.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = cleanRoomCode(codeInput);
    if (!code) return;

    if (activeMode === 'meet') {
      router.push(`/meet/${code}`);
    } else {
      router.push(`/talk/${code}`);
    }
  };

  const handleLeaveActiveRoom = async () => {
    if (!activeRoom) return;
    setLeavingActive(true);
    try {
      await roomsApi.leaveRoom(activeRoom.code);
      setActiveRoom(null);
    } catch (err) {
      console.error('Failed to leave room:', err);
    } finally {
      setLeavingActive(false);
    }
  };

  const openCreateModal = (type: 'meet' | 'audio') => {
    setModalType(type);
    setModalOpen(true);
  };

  const codeSnippets = {
    quickstart: `// 1. Create a secure space via Connectling API
const space = await connectling.rooms.create({
  type: "${activeMode}",
  title: "${activeMode === 'meet' ? 'Product Design Review' : 'Weekly Podcast Lounge'}",
  settings: {
    micForAll: true,
    maxCapacity: ${activeMode === 'meet' ? 4 : 10},
    durationHours: 24,
  }
});

// 2. Direct browser routing
window.location.href = \`/\${space.type === 'meet' ? 'meet' : 'talk'}/\${space.code}\`;`,
    webrtc: `// Zero-lag WebRTC peer mesh with adaptive bitrate
const mediaSession = await connectling.media.connect({
  roomCode: "${activeMode === 'meet' ? '7au-qn5t-p8e' : 'tlk-92fa-10b'}",
  tracks: {
    audio: true,
    video: ${activeMode === 'meet' ? 'true' : 'false'},
    screenShare: ${activeMode === 'meet' ? 'true' : 'false'}
  }
});`,
    presence: `// Real-time Upstash Redis heartbeats (15s ping / 45s TTL)
setInterval(async () => {
  await fetch('/api/v1/rooms/active-call/heartbeat', {
    method: 'POST',
    credentials: 'include'
  });
}, 15000);`,
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeCodeTab]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (isPending || !session) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-black">
        <div className="animate-spin h-5 w-5 border border-white/20 border-t-[#fcfdff] rounded-full" />
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-black text-[#fcfdff] transition-all duration-700 ${
      activeMode === 'meet' ? 'ambient-glow-meet' : 'ambient-glow-audio'
    }`}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12">
        {/* Active Presence Banner */}
        {!checkingPresence && activeRoom && (
          <div className="p-4 sm:p-5 bg-[#0a0a0c] border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden animate-in fade-in">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.04] to-transparent pointer-events-none" />
            <div className="flex items-center gap-3.5 relative z-10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#11ff99] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#11ff99]"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-medium text-amber-400 uppercase tracking-widest">
                    Active Space Session
                  </span>
                  <span className="text-[10px] font-mono text-[#888e90]">({activeRoom.code})</span>
                </div>
                <h3 className="text-sm font-semibold text-[#fcfdff] mt-0.5">
                  {activeRoom.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto relative z-10">
              <Link
                href={activeRoom.type === 'meet' ? `/meet/${activeRoom.code}` : `/talk/${activeRoom.code}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#fcfdff] hover:bg-[#f1f7fe] text-black rounded-lg transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(252,253,255,0.15)]"
              >
                <span>Rejoin Space</span>
                <ArrowRightIcon size={12} />
              </Link>
              <button
                onClick={handleLeaveActiveRoom}
                disabled={leavingActive}
                className="px-3.5 py-2 text-xs font-medium bg-[#101012] hover:bg-[#18181c] border border-white/[0.08] text-[#888e90] hover:text-[#fcfdff] rounded-lg transition-all disabled:opacity-50"
              >
                {leavingActive ? 'Leaving...' : 'Leave'}
              </button>
            </div>
          </div>
        )}

        {/* Hero Section with Editorial Serif Headline */}
        <section className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Spec Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101012] border border-white/[0.08] text-xs text-[#888e90] w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99]" />
              <span className="font-mono text-[11px] text-[#fcfdff]/80">Connectling v1.0 • WebRTC & Audio Stages</span>
            </div>

            {/* Sub-Nav Pill Mode Switcher from DESIGN.md */}
            <div className="inline-flex p-1 bg-[#101012] border border-white/[0.08] rounded-full self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('meet');
                  setCodeInput('');
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeMode === 'meet'
                    ? 'bg-[#1e1e24] text-[#fcfdff] border border-white/[0.14] shadow-sm'
                    : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
              >
                <VideoIcon size={14} className={activeMode === 'meet' ? 'text-[#3b9eff]' : ''} />
                <span>Video Meetings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('audio');
                  setCodeInput('');
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeMode === 'audio'
                    ? 'bg-[#1e1e24] text-[#fcfdff] border border-white/[0.14] shadow-sm'
                    : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
              >
                <AudioWaveformIcon size={14} className={activeMode === 'audio' ? 'text-[#a855f7]' : ''} />
                <span>Audio Rooms</span>
              </button>
            </div>
          </div>

          {/* Headline and Editorial Statement */}
          <div className="space-y-4 max-w-3xl">
            <h1 className="font-serif-headline text-4xl sm:text-6xl md:text-7xl font-normal text-[#fcfdff] tracking-tight leading-[1.0]">
              {activeMode === 'meet' ? (
                <>
                  Video meetings <br />
                  <span className="text-[#888e90] italic font-serif">built for precision.</span>
                </>
              ) : (
                <>
                  Drop-in voice stages <br />
                  <span className="text-[#888e90] italic font-serif">reimagined for teams.</span>
                </>
              )}
            </h1>
            <p className="text-[#888e90] text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              {activeMode === 'meet'
                ? 'High-density video conferences with crystal-clear screen sharing, grid autofocus, and single-click invites up to 4 participants.'
                : 'Moderated Clubhouse-style audio lounges and casual team voice stages with open mic modes up to 10 participants.'}
            </p>
          </div>
        </section>

        {/* Primary Interactive Workspace Card with Chrome Traffic Lights */}
        <section className="relative glow-card rounded-xl border border-white/[0.12] bg-[#0a0a0c] overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Subtle Accent Glow Wash inside Card */}
          <div
            className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 -mr-20 -mt-20 ${
              activeMode === 'meet' ? 'bg-blue-600' : 'bg-purple-600'
            }`}
          />

          {/* Top Chrome Row */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff2047]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffc53d]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#11ff99]/80" />
              <span className="font-mono text-[11px] text-[#888e90] ml-2">
                connectling.com/{activeMode === 'meet' ? 'meet' : 'talk'}/[code]
              </span>
            </div>

            <span className="font-mono text-[11px] text-[#888e90] px-2.5 py-0.5 rounded bg-[#101012] border border-white/[0.06]">
              {activeMode === 'meet' ? 'Max 4 Seats • 24h' : 'Max 10 Seats • 24h'}
            </span>
          </div>

          {/* Action Launcher Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-medium text-[#fcfdff]">
                {activeMode === 'meet' ? 'Instant Video Meeting' : 'Instant Voice Stage'}
              </h2>
              <p className="text-xs text-[#888e90]">
                {activeMode === 'meet'
                  ? 'Launch an encrypted session and share the link with your collaborators.'
                  : 'Start a drop-in voice stage with optional open mic and audience hand-raising.'}
              </p>
            </div>

            <button
              onClick={() => openCreateModal(activeMode)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium text-xs rounded-lg transition-all active:scale-[0.98] shadow-[0_0_24px_rgba(252,253,255,0.18)]"
            >
              <SparklesIcon size={14} />
              <span>Launch {activeMode === 'meet' ? 'Video Meeting' : 'Audio Stage'}</span>
            </button>
          </div>

          {/* Fast Join Form */}
          <div className="pt-4 border-t border-white/[0.06]">
            <form onSubmit={handleJoin} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder={
                    activeMode === 'meet'
                      ? 'Enter meeting code (e.g. 7au-qn5t-p8e) or URL'
                      : 'Enter audio room code (e.g. tlk-92fa-10b) or URL'
                  }
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] text-xs font-mono focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!codeInput.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#101012] hover:bg-[#18181c] border border-white/[0.12] hover:border-white/25 text-[#fcfdff] font-medium text-xs rounded-lg transition-all disabled:opacity-40"
              >
                <span>Join Space</span>
                <ArrowRightIcon size={13} />
              </button>
            </form>
          </div>
        </section>

        {/* 3-Up Feature Grid with Hairline Borders */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeMode === 'meet' ? (
            <>
              <div className="glow-card rounded-xl p-6 space-y-3 bg-[#0a0a0c]">
                <div className="h-8 w-8 rounded-lg bg-[#101012] border border-white/[0.08] text-[#3b9eff] flex items-center justify-center">
                  <MonitorIcon size={16} />
                </div>
                <h3 className="text-sm font-medium text-[#fcfdff]">Crisp Screen Share</h3>
                <p className="text-xs text-[#888e90] leading-relaxed">
                  Stream high-framerate displays, browser tabs, or code windows without artifacts or compression lag.
                </p>
              </div>

              <div className="glow-card rounded-xl p-6 space-y-3 bg-[#0a0a0c]">
                <div className="h-8 w-8 rounded-lg bg-[#101012] border border-white/[0.08] text-[#3b9eff] flex items-center justify-center">
                  <UsersIcon size={16} />
                </div>
                <h3 className="text-sm font-medium text-[#fcfdff]">Strict 4-Seat Grid</h3>
                <p className="text-xs text-[#888e90] leading-relaxed">
                  Engineered for tight 2-4 person pairing, technical syncs, and high-focus engineering reviews.
                </p>
              </div>

              <div className="glow-card rounded-xl p-6 space-y-3 bg-[#0a0a0c]">
                <div className="h-8 w-8 rounded-lg bg-[#101012] border border-white/[0.08] text-[#3b9eff] flex items-center justify-center">
                  <LockIcon size={16} />
                </div>
                <h3 className="text-sm font-medium text-[#fcfdff]">Passcode Privacy</h3>
                <p className="text-xs text-[#888e90] leading-relaxed">
                  Optional 4+ character passcodes prevent unwanted intrusion into sensitive architecture calls.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="glow-card rounded-xl p-6 space-y-3 bg-[#0a0a0c]">
                <div className="h-8 w-8 rounded-lg bg-[#101012] border border-white/[0.08] text-[#a855f7] flex items-center justify-center">
                  <MicIcon size={16} />
                </div>
                <h3 className="text-sm font-medium text-[#fcfdff]">Speaker Podium</h3>
                <p className="text-xs text-[#888e90] leading-relaxed">
                  Designated host and speaker hierarchy with live audio visualization and open mic flexibility.
                </p>
              </div>

              <div className="glow-card rounded-xl p-6 space-y-3 bg-[#0a0a0c]">
                <div className="h-8 w-8 rounded-lg bg-[#101012] border border-white/[0.08] text-[#a855f7] flex items-center justify-center">
                  <HandCoinsIcon size={16} />
                </div>
                <h3 className="text-sm font-medium text-[#fcfdff]">Audience Hand-Raising</h3>
                <p className="text-xs text-[#888e90] leading-relaxed">
                  Listeners signal participation with fluid animated hand requests for organized stage Q&A.
                </p>
              </div>

              <div className="glow-card rounded-xl p-6 space-y-3 bg-[#0a0a0c]">
                <div className="h-8 w-8 rounded-lg bg-[#101012] border border-white/[0.08] text-[#a855f7] flex items-center justify-center">
                  <ZapIcon size={16} />
                </div>
                <h3 className="text-sm font-medium text-[#fcfdff]">10-Participant Lounge</h3>
                <p className="text-xs text-[#888e90] leading-relaxed">
                  Optimal capacity for drop-in podcasts, Twitter/X Space style lounges, and office hours.
                </p>
              </div>
            </>
          )}
        </section>

        {/* Technical Architecture / Code Window Component from DESIGN.md */}
        <section className="glow-card rounded-xl border border-white/[0.12] bg-[#06060a] overflow-hidden">
          {/* Window Header with Traffic Lights and Tabs */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0a0a0c]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff2047]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#ffc53d]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#11ff99]/80" />
              </div>
              <div className="flex items-center gap-1 ml-3">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab('quickstart')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                    activeCodeTab === 'quickstart'
                      ? 'bg-[#101012] text-[#fcfdff] border border-white/[0.10]'
                      : 'text-[#888e90] hover:text-[#fcfdff]'
                  }`}
                >
                  Quickstart.ts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab('webrtc')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                    activeCodeTab === 'webrtc'
                      ? 'bg-[#101012] text-[#fcfdff] border border-white/[0.10]'
                      : 'text-[#888e90] hover:text-[#fcfdff]'
                  }`}
                >
                  MediaStream.ts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab('presence')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                    activeCodeTab === 'presence'
                      ? 'bg-[#101012] text-[#fcfdff] border border-white/[0.10]'
                      : 'text-[#888e90] hover:text-[#fcfdff]'
                  }`}
                >
                  RedisPresence.ts
                </button>
              </div>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101012] border border-white/[0.08] hover:border-white/20 text-[11px] font-mono text-[#888e90] hover:text-[#fcfdff] transition-all"
            >
              {copiedCode ? <CheckIcon size={12} className="text-[#11ff99]" /> : <CopyIcon size={12} />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Syntax Code Body */}
          <div className="p-5 font-mono text-xs text-[#888e90] overflow-x-auto leading-relaxed">
            <pre className="text-[#fcfdff]/90">
              <code>{codeSnippets[activeCodeTab]}</code>
            </pre>
          </div>
        </section>
      </main>

      {/* Create Room Modal */}
      <CreateRoomModal
        key={`${modalType}-${modalOpen}`}
        isOpen={modalOpen}
        defaultType={modalType}
        onClose={() => {
          setModalOpen(false);
          void checkPresence();
        }}
      />
    </div>
  );
}
