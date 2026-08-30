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
  MicOffIcon,
  SparklesIcon,
  ArrowRightIcon,
  ZapIcon,
  HandCoinsIcon,
  ShieldCheckIcon,
  StarIcon,
  CameraIcon,
  RadioIcon,
  ActivityIcon,
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

  // Interactive Live Demo controls
  const [previewTab, setPreviewTab] = useState<'code' | 'figma'>('code');
  const [isDemoMicActive, setIsDemoMicActive] = useState(true);
  const [isDemoCamActive, setIsDemoCamActive] = useState(true);

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

  const displayName = session?.user?.name || 'You';

  return (
    <div
      className={`min-h-screen pt-14 bg-black text-[#fcfdff] transition-all duration-700 ${
        activeMode === 'meet' ? 'ambient-glow-meet' : 'ambient-glow-audio'
      }`}
    >
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101012] border border-white/[0.08] text-xs text-[#888e90] w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99] shadow-[0_0_8px_#11ff99]" />
              <span className="font-mono text-[11px] text-[#fcfdff]/90">
                Connectling Realtime • {activeMode === 'meet' ? '4-Seat Video Mesh' : '10-Seat Voice Stage'}
              </span>
            </div>

            {/* Segmented Mode Selector */}
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

        {/* REDESIGNED: Live Space Interactive Studio Console */}
        <section className="glow-card rounded-2xl border border-white/[0.12] bg-[#06060a] overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Header with real-time signal stream tag */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.10] flex items-center justify-center text-[#11ff99]">
                <ActivityIcon size={14} />
              </div>
              <div>
                <h3 className="font-serif-headline text-base sm:text-lg font-normal text-[#fcfdff]">
                  {activeMode === 'meet' ? 'Live Mesh Peer Grid' : 'Stage Acoustic Visualizer'}
                </h3>
                <p className="text-[11px] text-[#888e90] font-mono">
                  {activeMode === 'meet'
                    ? 'Encrypted Full-Mesh WebRTC • 1080p 60fps Broadcast'
                    : 'Spatial Audio Waveform • Dynamic Host/Speaker Podium'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#101012] border border-white/[0.08] text-[11px] font-mono text-[#11ff99]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99] shadow-[0_0_8px_#11ff99] animate-pulse" />
                <span>WebRTC Signaling Live</span>
              </span>
            </div>
          </div>

          {/* Interactive Mode Surface */}
          {activeMode === 'meet' ? (
            <div className="space-y-4">
              {/* Meeting Viewport Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Tile 1: Host Camera Feed (Interactive test) */}
                <div className="relative p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.12] flex flex-col justify-between h-52 overflow-hidden group">
                  <div className="flex items-center justify-between z-10">
                    <span className="px-2 py-0.5 rounded bg-[#101012] border border-white/[0.08] text-[10px] font-mono text-[#3b9eff]">
                      {isDemoCamActive ? 'HD Camera 1080p' : 'Camera Off'}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-[#11ff99] shadow-[0_0_6px_#11ff99]" />
                  </div>

                  <div className="flex flex-col items-center justify-center my-auto z-10">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full bg-[#141418] border border-white/20 flex items-center justify-center font-serif text-xl text-[#fcfdff] shadow-inner speaker-active-ring">
                        {displayName.charAt(0) || 'Y'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDemoMicActive(!isDemoMicActive)}
                        title="Toggle demo mic"
                        className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#101012] border border-white/20 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                      >
                        {isDemoMicActive ? (
                          <MicIcon size={10} className="text-[#11ff99]" />
                        ) : (
                          <MicOffIcon size={10} className="text-[#ff2047]" />
                        )}
                      </button>
                    </div>
                    <span className="text-xs font-medium text-[#fcfdff] mt-2">{displayName}</span>
                    <span className="text-[10px] font-mono text-[#888e90]">Host (Speaking)</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#888e90] z-10 pt-2 border-t border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => setIsDemoCamActive(!isDemoCamActive)}
                      className="text-[10px] text-[#3b9eff] hover:underline flex items-center gap-1"
                    >
                      <CameraIcon size={10} />
                      <span>{isDemoCamActive ? 'Disable' : 'Enable'}</span>
                    </button>
                    <span className="text-[#11ff99]">28ms RTT</span>
                  </div>
                </div>

                {/* Tile 2 & 3: Live Screen Share Window Simulator */}
                <div className="md:col-span-2 relative p-4 rounded-xl bg-[#0a0a0c] border border-blue-500/30 flex flex-col justify-between h-52 overflow-hidden shadow-2xl">
                  {/* Top Bar with tab switches */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 z-10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('code')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                          previewTab === 'code'
                            ? 'bg-blue-500/20 text-[#3b9eff] border border-blue-500/40'
                            : 'text-[#888e90] hover:text-[#fcfdff]'
                        }`}
                      >
                        editor.ts
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('figma')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                          previewTab === 'figma'
                            ? 'bg-blue-500/20 text-[#3b9eff] border border-blue-500/40'
                            : 'text-[#888e90] hover:text-[#fcfdff]'
                        }`}
                      >
                        design_canvas.fig
                      </button>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#3b9eff] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      <MonitorIcon size={11} />
                      <span>Screen Live 60fps</span>
                    </span>
                  </div>

                  {/* Window Content */}
                  <div className="my-auto font-mono text-xs text-[#888e90] leading-relaxed p-2.5 bg-[#06060a]/80 rounded-lg border border-white/[0.04]">
                    {previewTab === 'code' ? (
                      <div className="space-y-1">
                        <p className="text-[#3b9eff]">{'// Connectling Peer Mesh WebRTC Handshake'}</p>
                        <p className="text-[#fcfdff]">
                          const peer = new <span className="text-[#ffc53d]">RTCPeerConnection</span>(iceConfig);
                        </p>
                        <p className="text-[#888e90]">peer.ontrack = (event) =&gt; attachRemoteStream(event);</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 text-center">
                        <div className="space-y-1 text-left">
                          <span className="text-[11px] text-[#fcfdff] block font-sans font-medium">Design Mockup: Video Mesh Stage</span>
                          <span className="text-[10px] text-[#888e90] block">4 Participants • 0ms UI Latency</span>
                        </div>
                        <div className="h-6 px-2.5 bg-purple-500/20 text-purple-300 rounded flex items-center text-[10px] border border-purple-500/30">
                          Figma Live
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#888e90] pt-1">
                    <span>Bitrate: 2,400 kbps</span>
                    <span className="text-[#3b9eff]">1080p Resolution</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Audio Stage Interactive Studio */
            <div className="p-6 rounded-xl bg-[#0a0a0c] border border-white/[0.10] space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Host Stage Podium */}
                <div className="p-5 rounded-xl bg-[#101012] border border-purple-500/40 flex flex-col items-center text-center space-y-2 relative">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-[#18181c] border border-purple-500/60 flex items-center justify-center font-serif text-xl text-[#fcfdff] speaker-active-ring">
                      {displayName.charAt(0) || 'H'}
                    </div>
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#ffc53d] text-black flex items-center justify-center shadow-md">
                      <StarIcon size={11} />
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#fcfdff] truncate max-w-[120px]">{displayName}</p>
                    <span className="text-[10px] font-mono text-[#a855f7]">Stage Host</span>
                  </div>
                  {/* Animated Waveform Equalizer */}
                  <div className="flex items-center gap-0.5 h-4 pt-1">
                    <span className="w-1 bg-[#11ff99] animate-waveform-1" />
                    <span className="w-1 bg-[#11ff99] animate-waveform-2" />
                    <span className="w-1 bg-[#11ff99] animate-waveform-3" />
                    <span className="w-1 bg-[#11ff99] animate-waveform-4" />
                    <span className="w-1 bg-[#11ff99] animate-waveform-2" />
                  </div>
                </div>

                {/* Speaker 2 Podium */}
                <div className="p-5 rounded-xl bg-[#101012] border border-white/[0.08] flex flex-col items-center text-center space-y-2">
                  <div className="h-16 w-16 rounded-full bg-[#18181c] border border-white/10 flex items-center justify-center font-serif text-xl text-[#fcfdff]">
                    M
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#fcfdff]">Maya Chen</p>
                    <span className="text-[10px] font-mono text-[#3b9eff]">Keynote Speaker</span>
                  </div>
                  <MicIcon size={13} className="text-[#11ff99]" />
                </div>

                {/* Audience Hand Raised */}
                <div className="p-5 rounded-xl bg-[#06060a] border border-dashed border-white/[0.12] flex flex-col items-center text-center space-y-2">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-[#101012] border border-white/[0.08] flex items-center justify-center font-serif text-xl text-[#888e90]">
                      L
                    </div>
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#ffc53d] text-black flex items-center justify-center animate-bounce shadow-md">
                      <HandCoinsIcon size={10} />
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#888e90]">Liam Ross</p>
                    <span className="text-[10px] font-mono text-[#ffc53d]">Hand Raised for Q&A</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#888e90] bg-white/5 px-2 py-0.5 rounded">Audience</span>
                </div>
              </div>
            </div>
          )}

          {/* Realtime Telemetry HUD */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-[#0a0a0c] border border-white/[0.08] rounded-xl flex items-center gap-3">
                <ZapIcon size={16} className="text-[#11ff99]" />
                <div>
                  <span className="text-xs font-medium text-[#fcfdff] block font-mono">28ms RTT</span>
                  <span className="text-[10px] font-mono text-[#888e90]">Sub-50ms Mesh</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#0a0a0c] border border-white/[0.08] rounded-xl flex items-center gap-3">
                <RadioIcon size={16} className="text-[#3b9eff]" />
                <div>
                  <span className="text-xs font-medium text-[#fcfdff] block font-mono">Opus 48kHz</span>
                  <span className="text-[10px] font-mono text-[#888e90]">Lossless Audio</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#0a0a0c] border border-white/[0.08] rounded-xl flex items-center gap-3">
                <UsersIcon size={16} className="text-[#ffc53d]" />
                <div>
                  <span className="text-xs font-medium text-[#fcfdff] block font-mono">
                    {activeMode === 'meet' ? '4 Seats Cap' : '10 Seats Cap'}
                  </span>
                  <span className="text-[10px] font-mono text-[#888e90]">Strict Mesh Size</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#0a0a0c] border border-white/[0.08] rounded-xl flex items-center gap-3">
                <ShieldCheckIcon size={16} className="text-[#a855f7]" />
                <div>
                  <span className="text-xs font-medium text-[#fcfdff] block font-mono">Zero-Trust</span>
                  <span className="text-[10px] font-mono text-[#888e90]">Passcode Lock</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeMode === 'meet' ? (
            <>
              <div className="glow-card rounded-xl p-5 space-y-2.5 bg-[#0a0a0c]">
                <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.08] text-[#3b9eff] flex items-center justify-center">
                  <MonitorIcon size={15} />
                </div>
                <h3 className="text-xs font-medium text-[#fcfdff]">Crisp Screen Share</h3>
                <p className="text-[11px] text-[#888e90] leading-relaxed">
                  Stream high-framerate displays, browser tabs, or code windows without compression lag.
                </p>
              </div>

              <div className="glow-card rounded-xl p-5 space-y-2.5 bg-[#0a0a0c]">
                <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.08] text-[#3b9eff] flex items-center justify-center">
                  <UsersIcon size={15} />
                </div>
                <h3 className="text-xs font-medium text-[#fcfdff]">Strict 4-Seat Grid</h3>
                <p className="text-[11px] text-[#888e90] leading-relaxed">
                  Engineered for tight 2-4 person pairing, technical syncs, and high-focus engineering reviews.
                </p>
              </div>

              <div className="glow-card rounded-xl p-5 space-y-2.5 bg-[#0a0a0c]">
                <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.08] text-[#3b9eff] flex items-center justify-center">
                  <LockIcon size={15} />
                </div>
                <h3 className="text-xs font-medium text-[#fcfdff]">Passcode Privacy</h3>
                <p className="text-[11px] text-[#888e90] leading-relaxed">
                  Optional 4+ character passcodes prevent unwanted intrusion into sensitive architecture calls.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="glow-card rounded-xl p-5 space-y-2.5 bg-[#0a0a0c]">
                <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.08] text-[#a855f7] flex items-center justify-center">
                  <MicIcon size={15} />
                </div>
                <h3 className="text-xs font-medium text-[#fcfdff]">Speaker Podium</h3>
                <p className="text-[11px] text-[#888e90] leading-relaxed">
                  Designated host and speaker hierarchy with live audio visualization and open mic flexibility.
                </p>
              </div>

              <div className="glow-card rounded-xl p-5 space-y-2.5 bg-[#0a0a0c]">
                <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.08] text-[#a855f7] flex items-center justify-center">
                  <HandCoinsIcon size={15} />
                </div>
                <h3 className="text-xs font-medium text-[#fcfdff]">Audience Hand-Raising</h3>
                <p className="text-[11px] text-[#888e90] leading-relaxed">
                  Listeners signal participation with fluid animated hand requests for organized stage Q&A.
                </p>
              </div>

              <div className="glow-card rounded-xl p-5 space-y-2.5 bg-[#0a0a0c]">
                <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.08] text-[#a855f7] flex items-center justify-center">
                  <ZapIcon size={15} />
                </div>
                <h3 className="text-xs font-medium text-[#fcfdff]">10-Participant Lounge</h3>
                <p className="text-[11px] text-[#888e90] leading-relaxed">
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
