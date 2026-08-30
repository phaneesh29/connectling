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
  SparklesIcon,
  ArrowRightIcon,
} from '@animateicons/react/lucide';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [activeMode, setActiveMode] = useState<'meet' | 'audio'>('meet');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'meet' | 'audio'>('meet');
  const [codeInput, setCodeInput] = useState('');
  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const [checkingPresence, setCheckingPresence] = useState(false);
  const [leavingActive, setLeavingActive] = useState(false);
  const [joining, setJoining] = useState(false);

  const checkPresence = useCallback(async () => {
    if (!session) return;
    setCheckingPresence(true);
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

    if (!session) {
      router.push(`/login?callbackURL=${encodeURIComponent(`/${activeMode === 'meet' ? 'meet' : 'talk'}/${code}`)}`);
      return;
    }

    setJoining(true);
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
    if (!session) {
      router.push('/login');
      return;
    }
    setModalType(type);
    setModalOpen(true);
  };

  return (
    <div
      className={`min-h-screen pt-20 sm:pt-24 bg-black text-[#fcfdff] transition-all duration-700 ${
        activeMode === 'meet' ? 'ambient-glow-meet' : 'ambient-glow-audio'
      }`}
    >
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        {/* Active Room Banner */}
        {!checkingPresence && activeRoom && (
          <div className="p-4 sm:p-5 bg-[#0a0a0c] border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.05] to-transparent pointer-events-none" />
            <div className="flex items-center gap-3.5 relative z-10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#11ff99] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#11ff99]"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-medium text-amber-400 uppercase tracking-widest">
                    Active Session in Progress
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

          <div className="space-y-3 max-w-3xl">
            <h1 className="font-serif-headline text-4xl sm:text-5xl md:text-6xl font-normal text-[#fcfdff] tracking-tight leading-[1.05]">
              {activeMode === 'meet' ? (
                <>
                  Video conferences <br />
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
                ? 'High-density encrypted video conferences with crystal-clear screen sharing, grid autofocus, and single-click invites up to 4 participants.'
                : 'Moderated Clubhouse-style audio lounges and casual team voice stages with open mic modes up to 10 participants.'}
            </p>
          </div>
        </section>

        {/* Action Panel: Launch & Join Space */}
        <section className="relative glow-card rounded-2xl border border-white/[0.12] bg-[#0a0a0c] overflow-hidden p-6 sm:p-8 space-y-6">
          <div
            className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 -mr-20 -mt-20 ${
              activeMode === 'meet' ? 'bg-[#3b9eff]' : 'bg-[#a855f7]'
            }`}
          />

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
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium text-xs rounded-lg transition-all active:scale-[0.98] shadow-[0_0_24px_rgba(252,253,255,0.18)] shrink-0"
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
      </main>

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
