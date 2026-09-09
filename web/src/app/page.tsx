'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { roomsApi, type AvailableRoomItem } from '@/lib/rooms-api';
import { CreateRoomModal } from '@/components/create-room-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  VideoIcon,
  AudioWaveformIcon,
  SparklesIcon,
  ArrowRightIcon,
  LockIcon,
  CopyIcon,
  CheckIcon,
  Trash2Icon,
} from '@animateicons/react/lucide';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace('/login');
    }
  }, [session, sessionPending, router]);

  const [activeMode, setActiveMode] = useState<'meet' | 'audio'>('meet');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'meet' | 'audio'>('meet');
  const [codeInput, setCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [myRooms, setMyRooms] = useState<AvailableRoomItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [deleteConfirmRoom, setDeleteConfirmRoom] = useState<string | null>(null);

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
    setJoining(false);
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
      router.push('/login');
      return;
    }
    setModalType(type);
    setModalOpen(true);
  };

  if (sessionPending || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin h-6 w-6 border-2 border-white/20 border-t-[#FF9933] rounded-full" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pt-20 sm:pt-24 bg-black text-[#fcfdff] transition-all duration-700 ${
        activeMode === 'meet' ? 'ambient-glow-meet' : 'ambient-glow-audio'
      }`}
    >
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-8">

        {/* Hero Section */}
        <section className="space-y-6 pt-1">
          <div className="flex items-center justify-start">
            {/* Segmented Mode Selector */}
            <div className="inline-flex p-1 bg-[#101012] border border-white/[0.08] rounded-full shadow-inner">
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
                <VideoIcon size={14} className={activeMode === 'meet' ? 'text-[#FF9933]' : ''} />
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
                <AudioWaveformIcon size={14} className={activeMode === 'audio' ? 'text-[#F4C430]' : ''} />
                <span>Audio Rooms</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="font-serif-headline text-4xl sm:text-5xl md:text-6xl font-normal text-[#fcfdff] tracking-tight leading-[1.05]">
              {activeMode === 'meet' ? (
                <>
                  Video conferences <br />
                  <span className="text-gradient-brand italic font-serif">built for precision.</span>
                </>
              ) : (
                <>
                  Drop-in voice stages <br />
                  <span className="text-gradient-brand italic font-serif">reimagined for teams.</span>
                </>
              )}
            </h1>
            <p className="text-[#888e90] text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              {activeMode === 'meet'
                ? 'High-density encrypted video conferences with crystal-clear screen sharing, grid autofocus, and single-click invites up to 4 participants.'
                : 'Moderated Clubhouse-style audio lounges and casual team voice stages with open mic modes up to 10 participants.'}
            </p>
          </div>
        </section>

        {/* Action Panel: Launch & Join Space */}
        <section className="relative glow-card rounded-2xl border border-white/[0.12] bg-[#0a0a0c] overflow-hidden p-6 sm:p-8 space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-25 -mr-20 -mt-20 bg-gradient-brand-br" />

          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 relative z-10">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff2047]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffc53d]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#11ff99]/80" />
              <span className="font-mono text-[11px] text-[#888e90] ml-2">
                connectling.com/{activeMode === 'meet' ? 'meet' : 'talk'}/[code]
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#888e90] px-2.5 py-0.5 rounded bg-[#101012] border border-white/[0.06]">
                {activeMode === 'meet' ? '4 Max Seats' : '10 Max Seats'}
              </span>
              <span className="font-mono text-[10px] text-[#888e90] px-2.5 py-0.5 rounded bg-[#101012] border border-white/[0.06]">
                24h Ephemeral
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-1 relative z-10">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-medium text-[#fcfdff]">
                {activeMode === 'meet' ? 'Instant Video Meeting' : 'Instant Voice Stage'}
              </h2>
              <p className="text-xs text-[#888e90]">
                {activeMode === 'meet'
                  ? 'Launch an encrypted session with screen sharing and custom permissions.'
                  : 'Start a drop-in voice stage with open mic or audience hand-raising moderation.'}
              </p>
            </div>

            <button
              onClick={() => openCreateModal(activeMode)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-lg transition-all active:scale-[0.98] shadow-brand-glow shrink-0 cursor-pointer"
            >
              <SparklesIcon size={13} />
              <span>Launch {activeMode === 'meet' ? 'Video Meeting' : 'Audio Stage'}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-white/[0.06] relative z-10">
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
                  className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] text-xs font-mono focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!codeInput.trim() || joining}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#101012] hover:bg-[#18181c] border border-white/[0.12] hover:border-white/25 text-[#fcfdff] font-medium text-xs rounded-lg transition-all disabled:opacity-40 shrink-0"
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
              <div className="p-8 rounded-2xl border border-white/[0.08] bg-[#0a0a0c] flex items-center justify-center">
                <div className="animate-spin h-4 w-4 border border-white/30 border-t-white rounded-full" />
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
                      className="p-5 rounded-2xl border border-white/[0.10] bg-[#0a0a0c] hover:border-white/20 transition-all space-y-4 relative group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
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
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] text-[11px] font-mono text-[#888e90] hover:text-[#fcfdff] transition-all shrink-0"
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

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#888e90]">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
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
      </main>

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
    </div>
  );
}
