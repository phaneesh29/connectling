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

interface MeetPageProps {
  params: Promise<{ code: string }>;
}

export default function MeetPage({ params }: MeetPageProps) {
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

  // Local Media states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace(`/login?callbackURL=/meet/${code}`);
    }
  }, [session, sessionPending, router, code]);

  // Initial Room Join Flow
  const joinMeeting = useCallback(
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
        const msg = err instanceof Error ? err.message : 'Failed to join meeting';
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
          const msg = err instanceof Error ? err.message : 'Failed to join meeting';
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
        setError('This meeting has ended or expired.');
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
    if (!room || !confirm('Are you sure you want to end this meeting for all participants?')) return;
    try {
      await roomsApi.endRoom(room.code);
      router.push('/');
    } catch (err) {
      console.error('End room error:', err);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !settings) return;
    setUpdatingSettings(true);
    try {
      const res = await roomsApi.updateSettings(room.code, {
        micForAll: settings.micForAll,
        videoForAll: settings.videoForAll,
        screenShareForAll: settings.screenShareForAll,
        allowChat: settings.allowChat,
        allowRaiseHand: settings.allowRaiseHand,
      });
      if (res.data) {
        setSettings(res.data);
        setSettingsOpen(false);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  if (sessionPending || loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-zinc-500 font-medium">Entering Video Space...</p>
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
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Private Meeting</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              This space requires a passcode from the host to enter.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void joinMeeting(code, passcode);
            }}
            className="space-y-4 pt-2"
          >
            <input
              type="text"
              required
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-center font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                className="flex-1 py-2.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {joining ? 'Checking...' : 'Enter Space'}
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
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Unable to Join Space</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{error || 'Room not found or expired.'}</p>
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 select-none">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-100 truncate max-w-[200px] sm:max-w-md">
              {room.title}
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono">Code: {room.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700/60"
          >
            <span>{copied ? '✓' : '🔗'}</span>
            <span className="hidden sm:inline">{copied ? 'Copied Link' : 'Share Link'}</span>
          </button>

          {/* Host Settings Button */}
          {isHost && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700/60 flex items-center gap-1"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Video Grid Area */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex items-center justify-center">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 h-full max-h-[70vh]">
          {/* User's Own Video Tile */}
          <div className="relative bg-zinc-900 border-2 border-zinc-800 rounded-3xl overflow-hidden flex items-center justify-center group shadow-xl">
            {isVideoOn ? (
              <div className="w-full h-full bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-850 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="h-20 w-20 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center text-3xl shadow-lg">
                  {session?.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{session?.user.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-200">{session?.user.name} (You)</p>
                  <p className="text-[11px] text-emerald-400 font-medium">Camera Feed Live</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="h-16 w-16 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xl">
                  📷 🚫
                </div>
                <p className="text-xs text-zinc-400">Camera is turned off</p>
              </div>
            )}

            {/* In-Tile Badges */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 text-zinc-200 border border-white/10">
              <span>{isMicOn ? '🎙️' : '🔇'}</span>
              <span>{session?.user.name}</span>
              {isHost && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 rounded">HOST</span>}
            </div>
          </div>

          {/* Connected Peers Placeholder Tile */}
          <div className="relative bg-zinc-900 border-2 border-zinc-800 rounded-3xl overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-xl">
            <div className="h-20 w-20 rounded-full bg-purple-600/20 border-2 border-purple-500/50 flex items-center justify-center text-2xl">
              👥
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-200">Waiting for participants to join</h3>
              <p className="text-xs text-zinc-500 max-w-xs">
                Share this link or code <span className="font-mono text-zinc-300 font-bold">{room.code}</span> with your team.
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-xl transition-colors text-zinc-200 border border-zinc-700"
            >
              {copied ? '✓ Copied!' : 'Copy Meeting Invite'}
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Floating Media Control Bar */}
      <footer className="h-20 border-t border-zinc-800/80 px-4 sm:px-6 flex items-center justify-center bg-zinc-900/90 backdrop-blur-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mic Toggle */}
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg transition-all shadow-md active:scale-95 ${
              isMicOn
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
          >
            {isMicOn ? '🎙️' : '🔇'}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg transition-all shadow-md active:scale-95 ${
              isVideoOn
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoOn ? '📹' : '🚫'}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg transition-all shadow-md active:scale-95 ${
              isScreenSharing
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
            }`}
            title="Screen Share"
          >
            🖥️
          </button>

          <div className="h-8 w-px bg-zinc-800 mx-1" />

          {/* Leave Button */}
          <button
            onClick={handleLeave}
            className="px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-all border border-zinc-700 active:scale-95"
          >
            Leave
          </button>

          {/* End Room Button (Host Only) */}
          {isHost && (
            <button
              onClick={handleEndRoom}
              className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-md shadow-red-600/20 active:scale-95"
            >
              End Room
            </button>
          )}
        </div>
      </footer>

      {/* Host Settings Modal */}
      {settingsOpen && settings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-base">In-Meeting Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs">
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-zinc-800">
                <span>Microphone for all participants</span>
                <input
                  type="checkbox"
                  checked={settings.micForAll}
                  onChange={(e) => setSettings({ ...settings, micForAll: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-zinc-800">
                <span>Video camera for all participants</span>
                <input
                  type="checkbox"
                  checked={settings.videoForAll}
                  onChange={(e) => setSettings({ ...settings, videoForAll: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-zinc-800">
                <span>Screen sharing for all participants</span>
                <input
                  type="checkbox"
                  checked={settings.screenShareForAll}
                  onChange={(e) => setSettings({ ...settings, screenShareForAll: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-zinc-800">
                <span>In-room text chat</span>
                <input
                  type="checkbox"
                  checked={settings.allowChat}
                  onChange={(e) => setSettings({ ...settings, allowChat: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                />
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingSettings}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-white transition-colors"
                >
                  {updatingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
