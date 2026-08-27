'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import {
  roomsApi,
  type RoomData,
  type RoomSettingsData,
  type ParticipantData,
} from '@/lib/rooms-api';

interface TalkPageProps {
  params: Promise<{ code: string }>;
}

export default function TalkPage({ params }: TalkPageProps) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passcodeRequired, setPasscodeRequired] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [joining, setJoining] = useState(false);

  const [room, setRoom] = useState<RoomData | null>(null);
  const [settings, setSettings] = useState<RoomSettingsData | null>(null);
  const [participant, setParticipant] = useState<ParticipantData | null>(null);

  // Audio Stage states
  const [isMuted, setIsMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [copied, setCopied] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace(`/login?callbackURL=/talk/${code}`);
    }
  }, [session, sessionPending, router, code]);

  // Initial Join Flow
  const joinAudioRoom = useCallback(
    async (codeToJoin: string, enteredPasscode?: string) => {
      setJoining(true);
      setError(null);
      try {
        const res = await roomsApi.joinRoom(codeToJoin, { passcode: enteredPasscode });
        if (res.data) {
          setRoom(res.data.room);
          setSettings(res.data.settings);
          setParticipant(res.data.participant);
          setPasscodeRequired(false);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to join audio room';
        if (msg.toLowerCase().includes('passcode')) {
          setPasscodeRequired(true);
        } else {
          setError(msg);
        }
      } finally {
        setJoining(false);
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let ignore = false;
    if (session && code) {
      roomsApi
        .joinRoom(code)
        .then((res) => {
          if (!ignore && res.data) {
            setRoom(res.data.room);
            setSettings(res.data.settings);
            setParticipant(res.data.participant);
            setPasscodeRequired(false);
          }
        })
        .catch((err: unknown) => {
          if (ignore) return;
          const msg = err instanceof Error ? err.message : 'Failed to join audio room';
          if (msg.toLowerCase().includes('passcode')) {
            setPasscodeRequired(true);
          } else {
            setError(msg);
          }
        })
        .finally(() => {
          if (!ignore) {
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [session, code]);

  // 15-Second Heartbeat Loop to Maintain Redis Active Presence
  useEffect(() => {
    if (!room || !participant) return;

    const interval = setInterval(async () => {
      try {
        await roomsApi.sendHeartbeat(room.code);
      } catch {
        setError('This audio room has ended or expired.');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [room, participant]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    if (room) {
      try {
        await roomsApi.leaveRoom(room.code);
      } catch (err) {
        console.error('Leave error:', err);
      }
    }
    router.push('/');
  };

  const handleEndRoom = async () => {
    if (!room || !confirm('Are you sure you want to end this audio room for all listeners?')) return;
    try {
      await roomsApi.endRoom(room.code);
      router.push('/');
    } catch (err) {
      console.error('End room error:', err);
    }
  };

  if (sessionPending || loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-zinc-500 font-medium">Entering Audio Stage...</p>
        </div>
      </div>
    );
  }

  // Passcode Prompt Screen
  if (passcodeRequired) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl space-y-5 text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto text-2xl">
            🔒
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Private Audio Lounge</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Enter the passcode provided by the stage host.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void joinAudioRoom(code, passcode);
            }}
            className="space-y-4 pt-2"
          >
            <input
              type="text"
              required
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-center font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <div className="flex gap-2">
              <Link
                href="/"
                className="flex-1 py-2.5 px-4 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-700 dark:text-zinc-300"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={joining || !passcode.trim()}
                className="flex-1 py-2.5 px-4 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {joining ? 'Checking...' : 'Enter Lounge'}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // Error Screen
  if (error || !room) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl space-y-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto text-2xl">
            🎙️ 🚫
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Lounge Unavailable</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{error || 'This audio room has ended or expired.'}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block py-2.5 px-6 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl transition-colors shadow-sm"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isHost = room.hostId === session?.user.id;
  const isSpeaker = isHost || participant?.role === 'speaker' || settings?.micForAll;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 select-none">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-base">
            🎙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-zinc-100 truncate max-w-[200px] sm:max-w-md">
                {room.title}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full uppercase tracking-wider">
                LIVE STAGE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">Code: {room.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700/60"
          >
            <span>{copied ? '✓' : '🔗'}</span>
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share Stage'}</span>
          </button>
        </div>
      </header>

      {/* Main Stage Content */}
      <main className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-8">
        {/* SECTION 1: THE SPEAKERS STAGE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Speakers & Stage
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
              {isHost ? '1 on stage' : 'Stage Active'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* Host Speaker Card */}
            <div className="relative p-5 bg-gradient-to-b from-zinc-900 to-zinc-925 border-2 border-purple-500/40 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 shadow-lg shadow-purple-900/10 group">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-purple-600/20 border-2 border-purple-500 flex items-center justify-center text-3xl overflow-hidden shadow-inner">
                  {room.host?.image ? (
                    <img src={room.host.image} alt={room.host.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{room.host?.name?.charAt(0) || 'H'}</span>
                  )}
                </div>
                {/* Host Crown */}
                <span className="absolute -top-1 -right-1 text-sm">👑</span>
                {/* Mic Status */}
                <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs">
                  {!isMuted && isHost ? '🎙️' : '🔇'}
                </span>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-zinc-100 truncate max-w-[120px]">{room.host?.name}</p>
                <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider block">
                  Stage Host
                </span>
              </div>
            </div>

            {/* Current User Card if on Stage and NOT Host */}
            {!isHost && isSpeaker && (
              <div className="relative p-5 bg-gradient-to-b from-zinc-900 to-zinc-925 border-2 border-zinc-700 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 shadow-lg group">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center text-3xl overflow-hidden">
                    {session?.user.image ? (
                      <img src={session.user.image} alt={session.user.name} className="h-full w-full object-cover" />
                    ) : (
                      <span>{session?.user.name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs">
                    {!isMuted ? '🎙️' : '🔇'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-zinc-100 truncate max-w-[120px]">{session?.user.name} (You)</p>
                  <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">
                    Speaker
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: AUDIENCE / LISTENERS */}
        <section className="space-y-4 pt-4 border-t border-zinc-900">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Audience & Listeners
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {/* Current User in Audience if not Speaker */}
            {!isSpeaker && (
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl overflow-hidden">
                    {session?.user.image ? (
                      <img src={session.user.image} alt={session.user.name} className="h-full w-full object-cover" />
                    ) : (
                      <span>{session?.user.name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  {handRaised && (
                    <span className="absolute -top-1 -right-1 text-xs animate-bounce">✋</span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-zinc-300 truncate max-w-[90px]">{session?.user.name}</p>
                <span className="text-[9px] text-zinc-500">Listener</span>
              </div>
            )}

            {/* Waiting Audience Placeholder */}
            <div className="p-4 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 opacity-60">
              <span className="text-xl">🎧</span>
              <p className="text-[11px] text-zinc-400 font-medium">Listening Room</p>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Floating Stage Control Bar */}
      <footer className="h-20 border-t border-zinc-800/80 px-4 sm:px-6 flex items-center justify-center bg-zinc-900/90 backdrop-blur-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mute/Unmute Mic Button (for Speakers) */}
          {isSpeaker ? (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`h-12 px-5 rounded-2xl flex items-center gap-2 font-semibold text-xs transition-all shadow-md active:scale-95 ${
                !isMuted
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
            >
              <span>{!isMuted ? '🎙️' : '🔇'}</span>
              <span>{!isMuted ? 'Mic Live' : 'Unmute'}</span>
            </button>
          ) : (
            /* Raise Hand Button for Audience */
            <button
              onClick={() => setHandRaised(!handRaised)}
              className={`h-12 px-5 rounded-2xl flex items-center gap-2 font-semibold text-xs transition-all shadow-md active:scale-95 ${
                handRaised
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
            >
              <span>✋</span>
              <span>{handRaised ? 'Hand Raised' : 'Request to Speak'}</span>
            </button>
          )}

          <div className="h-8 w-px bg-zinc-800 mx-1" />

          {/* Leave Quietly Button */}
          <button
            onClick={handleLeave}
            className="px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-all border border-zinc-700 active:scale-95"
          >
            ✌️ Leave Quietly
          </button>

          {/* End Room Button (Host Only) */}
          {isHost && (
            <button
              onClick={handleEndRoom}
              className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-md shadow-red-600/20 active:scale-95"
            >
              End Stage
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
