'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { roomsApi, type AvailableRoomItem } from '@/lib/rooms-api';
import { CreateRoomModal } from '@/components/create-room-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ReportModal } from '@/components/report-modal';
import { DashboardSkeleton, HostedSpaceCardSkeleton } from '@/components/skeleton';
import {
  VideoIcon,
  AudioWaveformIcon,
  RadioIcon,
  SparklesIcon,
  ArrowRightIcon,
  LockIcon,
  CopyIcon,
  CheckIcon,
  Trash2Icon,
} from '@animateicons/react/lucide';

const ARCHITECTURE_FEATURES = [
  {
    title: 'Peer-to-Peer Encrypted WebRTC',
    description:
      'Direct browser-to-browser media streaming with DTLS-SRTP encryption, sub-second latency, and lossless crystal-clear screen sharing.',
    badge: 'End-to-End Encrypted',
  },
  {
    title: 'Zero Data Retention Architecture',
    description:
      'We do not record calls, store persistent transcripts, or keep historical activity logs on our servers. Your conversations stay strictly in the room.',
    badge: '100% Private',
  },
  {
    title: '24-Hour Ephemeral Lifespan',
    description:
      'Every space automatically self-destructs after 24 hours. Rooms can be password-protected or moderated in real time by the space host.',
    badge: 'Auto Self-Destruct',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  const [activeMode, setActiveMode] = useState<'meet' | 'audio' | 'webinar'>('meet');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'meet' | 'audio'>('meet');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [myRooms, setMyRooms] = useState<AvailableRoomItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [deleteConfirmRoom, setDeleteConfirmRoom] = useState<string | null>(null);
  const [webinarNotified, setWebinarNotified] = useState(false);

  const fetchMyRooms = useCallback(async () => {
    if (!session) return;
    setLoadingRooms(true);
    try {
      const res = await roomsApi.listMyRooms();
      if (res.data) {
        setMyRooms(res.data);
      }
    } catch {
      setMyRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }, [session]);

  useEffect(() => {
    let ignore = false;
    if (session) {
      roomsApi
        .listMyRooms()
        .then((res) => {
          if (!ignore && res.data) {
            setMyRooms(res.data);
          }
        })
        .catch(() => {
          if (!ignore) setMyRooms([]);
        });
    }
    return () => {
      ignore = true;
    };
  }, [session]);

  const handleCopy = (codeToCopy: string) => {
    navigator.clipboard.writeText(codeToCopy);
    setCopiedCode(codeToCopy);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmRoom) return;
    const codeToDelete = deleteConfirmRoom;
    setDeletingCode(codeToDelete);
    try {
      await roomsApi.endRoom(codeToDelete);
      const res = await roomsApi.listMyRooms();
      if (res.data) setMyRooms(res.data);
      setDeleteConfirmRoom(null);
    } catch (err) {
      console.error('Failed to end space:', err);
    } finally {
      setDeletingCode(null);
    }
  };

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setJoining(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const cleanRoomCode = (input: string) => {
    let clean = input.trim();
    if (clean.includes('/')) {
      const parts = clean.split('/');
      clean = parts[parts.length - 1] || clean;
    }
    return clean.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = codeInput.trim();
    const code = cleanRoomCode(raw);
    if (!code) return;

    let target = activeMode === 'meet' ? `/meet/${code}` : `/talk/${code}`;
    if (raw.includes('/talk/')) {
      target = `/talk/${code}`;
    } else if (raw.includes('/meet/')) {
      target = `/meet/${code}`;
    }

    if (!session) {
      router.push(`/login?callbackURL=${encodeURIComponent(target)}`);
      return;
    }

    setJoining(true);

    try {
      const probePromise = roomsApi.getRoom(code);
      const timeoutPromise = new Promise<{ data?: { type?: string } }>((resolve) =>
        setTimeout(() => resolve({}), 300)
      );
      const res = await Promise.race([probePromise, timeoutPromise]);
      if (res.data?.type === 'audio') {
        target = `/talk/${code}`;
      } else if (res.data?.type === 'meet') {
        target = `/meet/${code}`;
      }
    } catch {
      // Fallback to detected target
    }

    router.push(target);
  };

  const openCreateModal = (type: 'meet' | 'audio') => {
    if (!session) {
      router.push('/login?callbackURL=/');
      return;
    }
    setModalType(type);
    setModalOpen(true);
  };

  if (sessionPending) {
    return <DashboardSkeleton />;
  }

  return (
    <div
      className={`min-h-screen pt-20 sm:pt-24 bg-black text-[#fcfdff] transition-all duration-700 ${
        activeMode === 'meet'
          ? 'ambient-glow-meet'
          : activeMode === 'audio'
          ? 'ambient-glow-audio'
          : 'ambient-glow-webinar'
      }`}
    >
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-8">

        {/* Hero Section */}
        <section className="space-y-5 sm:space-y-6 pt-1">
          <div className="flex items-center justify-start">
            {/* Segmented Mode Selector */}
            <div className="inline-flex p-1 bg-[#101012] border border-white/[0.08] rounded-full shadow-inner max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('meet');
                  setCodeInput('');
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  activeMode === 'meet'
                    ? 'bg-[#1e1e24] text-[#fcfdff] border border-white/[0.14] shadow-sm'
                    : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
              >
                <VideoIcon size={14} className={activeMode === 'meet' ? 'text-[#FF9933]' : ''} />
                <span>Video Meetings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('audio');
                  setCodeInput('');
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  activeMode === 'audio'
                    ? 'bg-[#1e1e24] text-[#fcfdff] border border-white/[0.14] shadow-sm'
                    : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
              >
                <AudioWaveformIcon size={14} className={activeMode === 'audio' ? 'text-[#F4C430]' : ''} />
                <span>Audio Rooms</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('webinar');
                  setCodeInput('');
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  activeMode === 'webinar'
                    ? 'bg-[#1e1e24] text-[#fcfdff] border border-white/[0.14] shadow-sm'
                    : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
              >
                <RadioIcon size={14} className={activeMode === 'webinar' ? 'text-[#FF9933]' : ''} />
                <span>Webinars</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="font-serif-headline text-3xl sm:text-5xl md:text-6xl font-normal text-[#fcfdff] tracking-tight leading-[1.08] sm:leading-[1.05]">
              {activeMode === 'meet' ? (
                <>
                  Video conferences <br />
                  <span className="text-gradient-brand italic font-serif">built for precision.</span>
                </>
              ) : activeMode === 'audio' ? (
                <>
                  Drop-in voice stages <br />
                  <span className="text-gradient-brand italic font-serif">reimagined for teams.</span>
                </>
              ) : (
                <>
                  Interactive webinars <br />
                  <span className="text-gradient-brand italic font-serif">crafted for audiences.</span>
                </>
              )}
            </h1>
            <p className="text-[#888e90] text-xs sm:text-base leading-relaxed max-w-xl font-normal">
              {activeMode === 'meet'
                ? 'High-density encrypted video conferences with crystal-clear screen sharing, grid autofocus, and single-click invites up to 4 participants.'
                : activeMode === 'audio'
                ? 'Moderated Clubhouse-style audio lounges and casual team voice stages with open mic modes up to 10 participants.'
                : 'Host keynote presentations, interactive product demos, and community stages designed for live participation.'}
            </p>
          </div>
        </section>

        {/* Action Panel: Launch & Join Space */}
        <section className="relative glow-card rounded-2xl border border-white/[0.12] bg-[#0a0a0c] overflow-hidden p-4 sm:p-8 space-y-5 sm:space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-25 -mr-20 -mt-20 bg-gradient-brand-br" />

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3 sm:pb-4 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff2047]/80 shrink-0" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffc53d]/80 shrink-0" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#11ff99]/80 shrink-0" />
              <span className="font-mono text-[11px] text-[#888e90] ml-1 sm:ml-2 truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none">
                connectling.com/{activeMode === 'meet' ? 'meet' : activeMode === 'audio' ? 'talk' : 'webinars'}/[code]
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="font-mono text-[10px] text-[#888e90] px-2 sm:px-2.5 py-0.5 rounded bg-[#101012] border border-white/[0.06]">
                {activeMode === 'meet' ? '4 Seats' : activeMode === 'audio' ? '10 Seats' : '100+ Seats'}
              </span>
              <span className="font-mono text-[10px] text-[#888e90] px-2 sm:px-2.5 py-0.5 rounded bg-[#101012] border border-white/[0.06]">
                {activeMode === 'webinar' ? 'Coming Soon' : '24h Ephemeral'}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 pt-1 relative z-10">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-medium text-[#fcfdff]">
                {activeMode === 'meet'
                  ? 'Instant Video Meeting'
                  : activeMode === 'audio'
                  ? 'Instant Voice Stage'
                  : 'Live Webinar Stage'}
              </h2>
              <p className="text-xs text-[#888e90] leading-relaxed">
                {activeMode === 'meet'
                  ? 'Launch an encrypted session with screen sharing and custom permissions.'
                  : activeMode === 'audio'
                  ? 'Start a drop-in voice stage with open mic or audience hand-raising moderation.'
                  : 'Broadcast to large audiences with interactive stages and live participation.'}
              </p>
            </div>

            {activeMode !== 'webinar' && (
              <button
                onClick={() => openCreateModal(activeMode)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-xl sm:rounded-lg transition-all active:scale-[0.98] shadow-brand-glow shrink-0 cursor-pointer"
              >
                <SparklesIcon size={13} />
                <span>
                  {session
                    ? `Launch ${activeMode === 'meet' ? 'Video Meeting' : 'Audio Stage'}`
                    : `Start Free ${activeMode === 'meet' ? 'Video Meeting' : 'Audio Stage'}`}
                </span>
              </button>
            )}
          </div>

          <div className="pt-3 sm:pt-4 border-t border-white/[0.06] relative z-10">
            {activeMode === 'webinar' ? (
              <div className="py-4 sm:py-5 flex items-center justify-center relative">
                <div className="relative group inline-flex items-center justify-center">
                  {/* Ambient Outer Saffron/Amber Aura Glow */}
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#FF9933]/30 via-[#F4C430]/20 to-[#FF8C00]/30 blur-lg sm:blur-xl opacity-50 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none" />

                  {/* Fluid Liquid Saffron/Gold Border */}
                  <div className="relative p-[1.5px] rounded-full bg-gradient-to-r from-[#FF9933] via-[#F4C430] to-[#FF8C00] animate-border-flow shadow-[0_0_16px_rgba(255,153,51,0.2)] group-hover:shadow-[0_0_30px_rgba(255,153,51,0.4)] transition-shadow duration-500">
                    <button
                      type="button"
                      onClick={() => {
                        setWebinarNotified(true);
                        setTimeout(() => setWebinarNotified(false), 3200);
                      }}
                      className="relative inline-flex items-center gap-3 sm:gap-4.5 px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-full bg-gradient-to-b from-[#131318]/95 via-[#0c0c10]/95 to-[#07070a]/98 backdrop-blur-2xl cursor-pointer active:scale-[0.98] transition-all duration-300 overflow-hidden select-none"
                    >
                      {/* Subtle Top-Rim Highlight Reflection */}
                      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

                      {/* Diagonal Glass Sheen Sweep on Hover */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />

                      {webinarNotified ? (
                        <div className="flex items-center gap-2 py-0.5">
                          <SparklesIcon size={15} className="text-[#11ff99]" />
                          <span className="font-serif italic text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-[#11ff99] to-[#80ffc2]">
                            Stage in craft • You&apos;re on early radar
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* Studio Live Equalizer Capsule (No Dot) */}
                          <div className="flex items-center px-2 py-1 rounded-full bg-black/40 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(0,0,0,0.6)] shrink-0">
                            <div className="flex items-end gap-[2.5px] h-4 sm:h-4.5 px-0.5">
                              <span className="w-[2px] sm:w-[2.5px] rounded-full bg-[#FF9933] animate-eq-1" />
                              <span className="w-[2px] sm:w-[2.5px] rounded-full bg-[#F4C430] animate-eq-2" />
                              <span className="w-[2px] sm:w-[2.5px] rounded-full bg-[#FF8C00] animate-eq-3" />
                              <span className="w-[2px] sm:w-[2.5px] rounded-full bg-[#FF9933] animate-eq-4" />
                              <span className="w-[2px] sm:w-[2.5px] rounded-full bg-[#F4C430] animate-eq-5" />
                            </div>
                          </div>

                          {/* Signature Typography ("Coming Soon") */}
                          <div className="flex items-baseline gap-1.5 sm:gap-2">
                            <span className="font-serif-headline text-lg sm:text-2xl text-[#fcfdff] font-light tracking-tight group-hover:text-white transition-colors">
                              Coming
                            </span>
                            <span className="font-serif italic text-lg sm:text-2xl font-normal text-gradient-brand drop-shadow-[0_0_16px_rgba(255,153,51,0.5)]">
                              Soon
                            </span>
                          </div>

                          {/* Broadcast Stage Chip */}
                          <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-white/[0.04] border border-white/[0.08] group-hover:border-[#FF9933]/40 group-hover:bg-[#FF9933]/15 transition-all shrink-0">
                            <RadioIcon size={11} className="text-[#FF9933] animate-pulse" />
                            <span className="font-mono text-[9px] sm:text-[10px] tracking-widest uppercase text-[#888e90] group-hover:text-white transition-colors">
                              Stage
                            </span>
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleJoin} className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
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
                    className="w-full px-3.5 py-2.5 rounded-xl sm:rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] text-base sm:text-xs font-mono focus:outline-none focus:border-white/40 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!codeInput.trim() || joining}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#101012] hover:bg-[#18181c] border border-white/[0.12] hover:border-white/25 text-[#fcfdff] font-medium text-xs rounded-xl sm:rounded-lg transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                >
                  {joining ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border border-white/30 border-t-white rounded-full" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Join Space</span>
                      <ArrowRightIcon size={13} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Your Hosted Spaces Section */}
        {session && (
          <section className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm sm:text-base font-medium text-[#fcfdff]">
                  Your Hosted Spaces
                </h2>
                {myRooms.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.10] text-[#fcfdff]">
                    {myRooms.length} Live
                  </span>
                )}
              </div>

              <button
                onClick={() => void fetchMyRooms()}
                disabled={loadingRooms}
                className="text-xs font-mono text-[#888e90] hover:text-[#fcfdff] transition-all disabled:opacity-50"
              >
                {loadingRooms ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loadingRooms && myRooms.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <HostedSpaceCardSkeleton />
                <HostedSpaceCardSkeleton />
              </div>
            ) : myRooms.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-white/[0.08] bg-[#0a0a0c]/60 flex flex-col items-center justify-center text-center space-y-1.5 opacity-70">
                <p className="text-xs text-[#fcfdff] font-medium">No active spaces created by you</p>
                <p className="text-[11px] text-[#888e90] max-w-sm">
                  Spaces you launch will appear here with live seat counts so you can quickly jump back in or share codes with teammates.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myRooms.map((r) => {
                  const isMeet = r.type === 'meet';
                  const roomHref = isMeet ? `/meet/${r.code}` : `/talk/${r.code}`;
                  const isFull = r.participantCount >= r.maxParticipants;

                  return (
                    <div
                      key={r.id}
                      className="p-4 sm:p-5 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] hover:border-white/20 transition-all space-y-3.5 sm:space-y-4 relative group"
                    >
                      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium font-mono px-2 py-0.5 rounded-md ${
                                isMeet
                                  ? 'bg-[#ff7a1a]/10 text-[#ff7a1a] border border-[#ff7a1a]/20'
                                  : 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                              }`}
                            >
                              {isMeet ? <VideoIcon size={11} /> : <AudioWaveformIcon size={11} />}
                              <span>{isMeet ? 'Video' : 'Voice'}</span>
                            </span>

                            {r.hasPasscode && (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md"
                                title="Passcode protected"
                              >
                                <LockIcon size={10} />
                                <span>Locked</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-semibold text-[#fcfdff] truncate">
                            {r.title}
                          </h3>
                          {r.description && (
                            <p className="text-[11px] text-[#888e90] line-clamp-1">
                              {r.description}
                            </p>
                          )}
                        </div>

                        {/* Room Code with Copy */}
                        <button
                          onClick={() => handleCopy(r.code)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] text-[11px] font-mono text-[#888e90] hover:text-[#fcfdff] transition-all shrink-0 cursor-pointer"
                          title="Copy room code"
                        >
                          <span>{r.code}</span>
                          {copiedCode === r.code ? (
                            <CheckIcon size={11} className="text-[#11ff99]" />
                          ) : (
                            <CopyIcon size={11} />
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-xs">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#888e90]">
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              isFull ? 'bg-[#ff2047]' : 'bg-[#11ff99] animate-pulse'
                            }`}
                          />
                          <span className={isFull ? 'text-[#ffc53d]' : ''}>
                            {r.participantCount} / {r.maxParticipants} Seats{isFull ? ' (Full)' : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDeleteConfirmRoom(r.code)}
                            disabled={deletingCode === r.code}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 text-[#888e90] hover:text-[#ff2047] font-medium text-xs transition-all disabled:opacity-50 cursor-pointer"
                            title="End and delete space"
                          >
                            {deletingCode === r.code ? (
                              <div className="animate-spin h-3 w-3 border border-red-400/30 border-t-red-400 rounded-full" />
                            ) : (
                              <>
                                <Trash2Icon size={12} />
                                <span className="text-[11px]">Delete</span>
                              </>
                            )}
                          </button>

                          <Link
                            href={roomHref}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs transition-all active:scale-[0.98] shadow-sm"
                          >
                            <span>Enter Space</span>
                            <ArrowRightIcon size={11} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Architecture & Zero-Data Highlights */}
        <section className="space-y-4 pt-4 sm:pt-6">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-medium text-[#fcfdff]">
              Engineered for Zero Surveillance
            </h2>
            <p className="text-xs text-[#888e90]">
              How Connectling keeps your video conferences and audio stages unrecorded and private.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ARCHITECTURE_FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="p-5 rounded-2xl border border-white/[0.08] bg-[#0a0a0c] space-y-3 relative group hover:border-white/[0.18] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#FF9933]">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#fcfdff]">
                  {feat.title}
                </h3>
                <p className="text-xs text-[#888e90] leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-1 flex justify-start sm:justify-end">
            <Link
              href="/faqs"
              className="inline-flex items-center gap-1.5 text-xs text-[#888e90] hover:text-[#fcfdff] transition-colors font-mono group"
            >
              <span>Explore architecture details &amp; common questions in FAQs</span>
              <ArrowRightIcon size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </section>

        {/* Unauthenticated Bottom CTA Banner */}
        {!session && (
          <section className="relative overflow-hidden p-6 sm:p-8 rounded-2xl border border-white/[0.12] bg-[#0a0a0c] text-center space-y-4 glow-card">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-brand-br opacity-20 blur-3xl pointer-events-none" />
            <div className="max-w-xl mx-auto space-y-2 relative z-10">
              <h2 className="font-serif-headline text-xl sm:text-2xl font-normal text-[#fcfdff] tracking-tight">
                Private Real-Time Conversations. Zero Surveillance.
              </h2>
              <p className="text-xs text-[#888e90] leading-relaxed">
                Launch an instant encrypted video conference or drop-in voice stage in seconds. No desktop apps to install, no recordings, and 100% free.
              </p>
            </div>
            <div className="relative z-10 pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-xl transition-all shadow-brand-glow active:scale-[0.98]"
              >
                <SparklesIcon size={14} />
                <span>Get Started with Connectling</span>
              </Link>
            </div>
          </section>
        )}
      </main>

      <footer className="mt-14 sm:mt-18 pt-8 pb-12 border-t border-white/[0.06] text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-[#888e90]">
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="hover:text-[#fcfdff] transition-colors cursor-pointer text-[#888e90]"
          >
            Report Issue &amp; Feedback
          </button>
          <span>•</span>
          <Link href="/faqs" className="hover:text-[#fcfdff] transition-colors">
            FAQs
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-[#fcfdff] transition-colors">
            Privacy &amp; Zero-Data Terms
          </Link>
          <span>•</span>
          <a
            href="mailto:sreephaneesha2005@gmail.com"
            className="text-[#ff7a1a] hover:underline font-mono"
          >
            Any issue? Contact sreephaneesha2005@gmail.com
          </a>
        </div>
        <p className="text-[11px] text-[#555a5e]">
          Connectling — Ephemeral, zero-data real-time communication.
        </p>
      </footer>

      <CreateRoomModal
        key={`${modalType}-${modalOpen}`}
        isOpen={modalOpen}
        defaultType={modalType}
        onClose={() => {
          setModalOpen(false);
          void fetchMyRooms();
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteConfirmRoom)}
        title="Delete Space?"
        description="Are you sure you want to end and delete this space? All participants inside will be disconnected immediately."
        confirmText="Delete Space"
        variant="danger"
        isLoading={Boolean(deletingCode)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmRoom(null)}
      />

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}
