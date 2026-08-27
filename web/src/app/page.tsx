'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { roomsApi, type RoomData } from '@/lib/rooms-api';
import { CreateRoomModal } from '@/components/create-room-modal';

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

  if (isPending || !session) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Active Presence Banner */}
      {!checkingPresence && activeRoom && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 dark:border-amber-700/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                You are in an Active Call
              </p>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {activeRoom.title}{' '}
                <span className="text-zinc-500 font-normal">
                  ({activeRoom.type === 'meet' ? 'Video Meeting' : 'Audio Room'})
                </span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href={activeRoom.type === 'meet' ? `/meet/${activeRoom.code}` : `/talk/${activeRoom.code}`}
              className="flex-1 sm:flex-none text-center px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl transition-all shadow-sm"
            >
              Rejoin Call &rarr;
            </Link>
            <button
              onClick={handleLeaveActiveRoom}
              disabled={leavingActive}
              className="px-3 py-2 text-xs font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
            >
              {leavingActive ? 'Leaving...' : 'Leave'}
            </button>
          </div>
        </div>
      )}

      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Connectling Spaces
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Toggle between Video Meetings and Drop-in Audio Rooms below.
          </p>
        </div>

        {/* CLICK TO SWITCH BETWEEN TWO MODES */}
        <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-750 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveMode('meet');
              setCodeInput('');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeMode === 'meet'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-md scale-[1.02]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <span>📹</span>
            <span>Video Meetings</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('audio');
              setCodeInput('');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeMode === 'audio'
                ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-md scale-[1.02]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <span>🎙️</span>
            <span>Audio Rooms</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC MODE SECTION CONTENT */}
      {activeMode === 'meet' ? (
        /* ================= MODE 1: MEET SECTION ================= */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Hero Action Card */}
          <div className="p-8 bg-gradient-to-br from-blue-600/5 via-white to-blue-600/10 dark:from-blue-950/20 dark:via-zinc-900 dark:to-blue-900/10 border border-blue-200/80 dark:border-blue-900/40 rounded-3xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-blue-600/20">
                  📹
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Video Meetings</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md uppercase tracking-wider">
                      Up to 4 Participants
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Start a face-to-face video conference with screen sharing, participant grid, and private codes.
                  </p>
                </div>
              </div>

              <button
                onClick={() => openCreateModal('meet')}
                className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>✨ Start Instant Meeting</span>
              </button>
            </div>

            {/* Quick Join Input Box */}
            <div className="pt-4 border-t border-blue-100 dark:border-blue-900/30">
              <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
                <input
                  type="text"
                  placeholder="Enter meeting code (e.g. 7au-qn5t-p8e) or meeting URL"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={!codeInput.trim()}
                  className="px-6 py-3 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl transition-colors disabled:opacity-50"
                >
                  Join Meeting &rarr;
                </button>
              </form>
            </div>
          </div>

          {/* Feature Grid for Meetings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1.5 shadow-sm">
              <div className="text-xl">🖥️</div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Screen Sharing</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Present slides, documents, or entire displays in crisp HD.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1.5 shadow-sm">
              <div className="text-xl">👥</div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Smart Video Grid</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Dynamic active speaker focus and multi-participant camera tiles.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1.5 shadow-sm">
              <div className="text-xl">🔒</div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Private Passcodes</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Protect sensitive team meetings with optional room entry passcodes.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ================= MODE 2: AUDIO SECTION ================= */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Hero Action Card */}
          <div className="p-8 bg-gradient-to-br from-purple-600/5 via-white to-purple-600/10 dark:from-purple-950/20 dark:via-zinc-900 dark:to-purple-900/10 border border-purple-200/80 dark:border-purple-900/40 rounded-3xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-purple-600/20">
                  🎙️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Audio Rooms</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-md uppercase tracking-wider">
                      Up to 10 Participants
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Host Clubhouse-style voice stages, podcast discussions, or chill drop-in study rooms.
                  </p>
                </div>
              </div>

              <button
                onClick={() => openCreateModal('audio')}
                className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🎙️ Launch Audio Stage</span>
              </button>
            </div>

            {/* Quick Join Input Box */}
            <div className="pt-4 border-t border-purple-100 dark:border-purple-900/30">
              <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
                <input
                  type="text"
                  placeholder="Enter audio room code (e.g. xxx-xxxx-xxx) or talk URL"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={!codeInput.trim()}
                  className="px-6 py-3 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl transition-colors disabled:opacity-50"
                >
                  Join Stage &rarr;
                </button>
              </form>
            </div>
          </div>

          {/* Feature Grid for Audio Rooms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1.5 shadow-sm">
              <div className="text-xl">🎤</div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Speaker Podium</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Moderated stage where designated speakers take the mic with visual audio indicators.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1.5 shadow-sm">
              <div className="text-xl">✋</div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Raise Hand to Speak</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Audience listeners can raise hands to be invited up to stage.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1.5 shadow-sm">
              <div className="text-xl">⚡</div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Zero-Lag Drop-In</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Instant audio connection with 1-click &apos;Leave Quietly&apos; exit.
              </p>
            </div>
          </div>
        </div>
      )}

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
    </main>
  );
}
