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
  ClockIcon,
  ShieldCheckIcon,
  StarIcon,
} from '@animateicons/react/lucide';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [activeMode, setActiveMode] = useState<'meet' | 'audio'>('meet');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'meet' | 'audio'>('meet');
  const [codeInput, setCodeInput] = useState('');
  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const [checkingPresence, setCheckingPresence] = useState(true);
  const [leavingActive, setLeavingActive] = useState(false);
  const [joining, setJoining] = useState(false);

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
    setModalType(type);
    setModalOpen(true);
  };

  if (isPending || !session) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-black">
        <div className="animate-spin h-5 w-5 border border-white/20 border-t-[#fcfdff] rounded-full" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-[calc(100vh-4rem)] bg-black text-[#fcfdff] transition-all duration-700 ${
        activeMode === 'meet' ? 'ambient-glow-meet' : 'ambient-glow-audio'
      }`}
    >
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
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

        <section className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101012] border border-white/[0.08] text-xs text-[#888e90] w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99] shadow-[0_0_8px_#11ff99]" />
              <span className="font-mono text-[11px] text-[#fcfdff]/90">
                Connectling Realtime • {activeMode === 'meet' ? '4-Seat Video Mesh' : '10-Seat Voice Stage'}
              </span>
            </div>

            <div className="inline-flex p-1 bg-[#101012] border border-white/[0.08] rounded-full self-start sm:self-auto shadow-inner">
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

          <div className="space-y-4 max-w-3xl">
            <h1 className="font-serif-headline text-4xl sm:text-6xl md:text-7xl font-normal text-[#fcfdff] tracking-tight leading-[1.0]">
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

        <section className="relative glow-card rounded-2xl border border-white/[0.12] bg-[#0a0a0c] overflow-hidden p-6 sm:p-8 space-y-6">
          <div
            className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 -mr-24 -mt-24 ${
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
              <span className="font-mono text-[11px] text-[#888e90] px-2.5 py-0.5 rounded bg-[#101012] border border-white/[0.06]">
                {activeMode === 'meet' ? '4 Max Seats' : '10 Max Seats'}
              </span>
              <span className="font-mono text-[11px] text-[#888e90] px-2.5 py-0.5 rounded bg-[#101012] border border-white/[0.06]">
                24h Duration
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-1 relative z-10">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-medium text-[#fcfdff]">
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
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium text-xs rounded-lg transition-all active:scale-[0.98] shadow-[0_0_24px_rgba(252,253,255,0.18)] shrink-0"
            >
              <SparklesIcon size={14} />
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
                  className="w-full px-4 py-2.5 rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] text-xs font-mono focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!codeInput.trim() || joining}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#101012] hover:bg-[#18181c] border border-white/[0.12] hover:border-white/25 text-[#fcfdff] font-medium text-xs rounded-lg transition-all disabled:opacity-40 shrink-0"
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

        <section className="glow-card rounded-2xl border border-white/[0.12] bg-[#06060a] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-widest block mb-0.5">
                Live Space Experience
              </span>
              <h3 className="font-serif-headline text-lg sm:text-xl font-normal text-[#fcfdff]">
                {activeMode === 'meet' ? 'Multi-Peer Video Interface' : 'Clubhouse-Style Speaker Stage'}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99] shadow-[0_0_6px_#11ff99]" />
              <span className="text-[11px] font-mono text-[#888e90]">
                {activeMode === 'meet' ? 'Adaptive Active Speaker Grid' : 'Stage Microphone Waveform'}
              </span>
            </div>
          </div>

          {activeMode === 'meet' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-5 rounded-xl bg-[#0a0a0c] border border-white/[0.10] flex flex-col justify-between h-44 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#101012] border border-white/[0.08] text-[10px] font-mono text-[#3b9eff]">
                    Camera 1080p
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#11ff99]" />
                </div>
                <div className="flex flex-col items-center justify-center my-auto">
                  <div className="h-12 w-12 rounded-full bg-[#101012] border border-white/20 flex items-center justify-center font-serif text-lg text-[#fcfdff]">
                    {session.user.name?.charAt(0) || 'H'}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <MicIcon size={12} className="text-[#11ff99]" />
                    <span className="font-medium text-[#fcfdff] text-xs">{session.user.name}</span>
                  </div>
                  <span className="text-[9px] font-mono bg-white/10 text-[#fcfdff] px-1.5 py-0.5 rounded font-semibold">
                    HOST
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#0a0a0c] border border-blue-500/20 flex flex-col justify-between h-44 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono text-[#3b9eff]">
                    Screen Broadcast Live
                  </span>
                  <MonitorIcon size={14} className="text-[#3b9eff]" />
                </div>
                <div className="flex flex-col items-center justify-center my-auto space-y-1.5">
                  <div className="h-8 w-24 bg-[#101012] border border-white/[0.08] rounded-md flex items-center justify-center">
                    <span className="text-[10px] font-mono text-[#888e90]">Figma • 60fps</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-xs text-[#888e90]">Display Presentation</span>
                  <span className="text-[10px] font-mono text-[#3b9eff]">HD Stream</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#0a0a0c] border border-white/[0.10] space-y-6">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                <div className="p-4 rounded-xl bg-[#101012] border border-purple-500/30 flex flex-col items-center text-center space-y-2 relative w-36">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-[#18181c] border border-purple-500/50 flex items-center justify-center font-serif text-base text-[#fcfdff]">
                      {session.user.name?.charAt(0) || 'H'}
                    </div>
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#ffc53d] text-black flex items-center justify-center">
                      <StarIcon size={9} />
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#fcfdff] truncate max-w-[100px]">{session.user.name}</p>
                    <span className="text-[10px] font-mono text-[#a855f7]">Stage Host</span>
                  </div>
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-0.5 h-2 bg-[#11ff99] animate-pulse" />
                    <span className="w-0.5 h-3 bg-[#11ff99]" />
                    <span className="w-0.5 h-1.5 bg-[#11ff99] animate-pulse" />
                    <span className="w-0.5 h-2.5 bg-[#11ff99]" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#101012] border border-white/[0.08] flex flex-col items-center text-center space-y-2 w-36 opacity-75">
                  <div className="h-12 w-12 rounded-full bg-[#18181c] border border-white/10 flex items-center justify-center font-serif text-base text-[#fcfdff]">
                    A
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#fcfdff]">Alex M.</p>
                    <span className="text-[10px] font-mono text-[#3b9eff]">Speaker</span>
                  </div>
                  <MicIcon size={12} className="text-[#11ff99]" />
                </div>

                <div className="p-4 rounded-xl bg-[#06060a] border border-dashed border-white/[0.10] flex flex-col items-center text-center space-y-2 w-36">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-[#101012] border border-white/[0.08] flex items-center justify-center font-serif text-base text-[#888e90]">
                      S
                    </div>
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#ffc53d] text-black flex items-center justify-center animate-bounce">
                      <HandCoinsIcon size={8} />
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#888e90]">Sarah K.</p>
                    <span className="text-[9px] font-mono text-[#ffc53d]">Hand Raised</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-[#0a0a0c] border border-white/[0.06] rounded-xl flex items-center gap-2.5">
              <ZapIcon size={16} className="text-[#11ff99]" />
              <div>
                <span className="text-xs font-medium text-[#fcfdff] block">Sub-50ms</span>
                <span className="text-[10px] font-mono text-[#888e90]">Peer Mesh</span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-white/[0.06] rounded-xl flex items-center gap-2.5">
              <ClockIcon size={16} className="text-[#ffc53d]" />
              <div>
                <span className="text-xs font-medium text-[#fcfdff] block">24 Hours</span>
                <span className="text-[10px] font-mono text-[#888e90]">Room Duration</span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-white/[0.06] rounded-xl flex items-center gap-2.5">
              <UsersIcon size={16} className="text-[#3b9eff]" />
              <div>
                <span className="text-xs font-medium text-[#fcfdff] block">
                  {activeMode === 'meet' ? '4 Seats' : '10 Seats'}
                </span>
                <span className="text-[10px] font-mono text-[#888e90]">Strict Cap</span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-white/[0.06] rounded-xl flex items-center gap-2.5">
              <ShieldCheckIcon size={16} className="text-[#a855f7]" />
              <div>
                <span className="text-xs font-medium text-[#fcfdff] block">Passcode Lock</span>
                <span className="text-[10px] font-mono text-[#888e90]">Zero-Trust</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeMode === 'meet' ? (
            <>
              <div className="glow-card rounded-xl p-6 space-y-3 bg-[#0a0a0c]">
                <div className="h-8 w-8 rounded-lg bg-[#101012] border border-white/[0.08] text-[#3b9eff] flex items-center justify-center">
                  <MonitorIcon size={16} />
                </div>
                <h3 className="text-sm font-medium text-[#fcfdff]">Crisp Screen Share</h3>
                <p className="text-xs text-[#888e90] leading-relaxed">
                  Stream high-framerate displays, browser tabs, or code windows without compression lag.
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
