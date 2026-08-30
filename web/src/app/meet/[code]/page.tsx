'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from '@/lib/auth-client';
import {
  roomsApi,
  type RoomData,
  type RoomSettingsData,
  type ParticipantData,
} from '@/lib/rooms-api';
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  CameraIcon,
  MonitorIcon,
  SettingsIcon,
  CopyIcon,
  CheckIcon,
  LockIcon,
  UsersIcon,
  LogOutIcon,
  PhoneCallIcon,
  XIcon,
  MessageSquareIcon,
} from '@animateicons/react/lucide';
import { getSocket } from '@/lib/socket';
import { InRoomChat } from '@/components/in-room-chat';
import type { ChatMessage } from '@/types/realtime';

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

  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [ending, setEnding] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace(`/login?callbackURL=/meet/${code}`);
    }
  }, [session, sessionPending, router, code]);

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

  // Connect WebSocket and listen for in-room ephemeral messages
  useEffect(() => {
    if (!room || !participant) return;
    const socket = getSocket();
    socket.connect();

    socket.emit('room:join', {
      roomCode: code,
      isMuted: !isMicOn,
      isVideoOn: isVideoOn,
    });

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      setChatOpen((isOpen) => {
        if (!isOpen) {
          setUnreadChatCount((count) => count + 1);
        }
        return isOpen;
      });
    };

    socket.on('chat:new-message', handleNewMessage);

    return () => {
      socket.off('chat:new-message', handleNewMessage);
      socket.emit('room:leave', { roomCode: code });
    };
  }, [room, participant, code, isMicOn, isVideoOn]);

  const handleSendMessage = (text: string) => {
    const socket = getSocket();
    socket.emit('chat:message', { roomCode: code, text });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    setLeaving(true);
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
    setEnding(true);
    try {
      await roomsApi.endRoom(room.code);
      router.push('/');
    } catch (err) {
      console.error('End room error:', err);
      setEnding(false);
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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center space-y-3">
          <div className="animate-spin h-6 w-6 border border-white/20 border-t-[#fcfdff] rounded-full mx-auto" />
          <p className="text-xs font-mono text-[#888e90]">Establishing encrypted WebRTC connection...</p>
        </div>
      </div>
    );
  }

  if (passcodeRequired) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-black">
        <div className="w-full max-w-md p-8 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl space-y-6 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#3b9eff] opacity-10 blur-3xl pointer-events-none" />
          <div className="h-12 w-12 rounded-xl bg-[#101012] border border-white/[0.10] text-[#ffc53d] flex items-center justify-center mx-auto">
            <LockIcon size={22} />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif-headline text-xl font-normal text-[#fcfdff]">Private Meeting</h2>
            <p className="text-xs text-[#888e90]">
              This space requires a passcode from the host to enter.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void joinMeeting(code, passcode);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              required
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-white/[0.12] bg-[#06060a] text-center font-mono tracking-widest text-sm text-[#fcfdff] focus:outline-none focus:border-white/40"
            />
            <div className="flex gap-2">
              <Link
                href="/"
                className="flex-1 py-2.5 px-4 text-xs font-medium bg-[#101012] border border-white/[0.08] hover:bg-[#18181c] rounded-lg transition-colors text-[#888e90] hover:text-[#fcfdff]"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={joining || !passcode.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-medium bg-[#fcfdff] hover:bg-[#f1f7fe] text-black rounded-lg transition-all shadow-[0_0_20px_rgba(252,253,255,0.15)] disabled:opacity-50"
              >
                {joining ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border border-black/30 border-t-black rounded-full" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Enter Space</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-black">
        <div className="w-full max-w-md p-8 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl space-y-4 text-center">
          <div className="h-12 w-12 rounded-xl bg-[#ff2047]/10 border border-[#ff2047]/20 text-[#ff2047] flex items-center justify-center mx-auto">
            <LockIcon size={22} />
          </div>
          <h2 className="font-serif-headline text-xl font-normal text-[#fcfdff]">Space Unavailable</h2>
          <p className="text-xs text-[#888e90]">{error || 'Room not found or expired.'}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block py-2 px-5 text-xs font-medium bg-[#fcfdff] hover:bg-[#f1f7fe] text-black rounded-lg transition-all shadow-[0_0_20px_rgba(252,253,255,0.15)]"
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
    <div className="flex flex-col h-screen bg-black text-[#fcfdff] select-none ambient-glow-meet">
      <header className="h-14 border-b border-white/[0.06] px-4 sm:px-6 flex items-center justify-between bg-black/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#11ff99] shadow-[0_0_8px_#11ff99]" />
          <div>
            <h1 className="font-serif-headline text-sm font-normal text-[#fcfdff] truncate max-w-[200px] sm:max-w-md tracking-tight">
              {room.title}
            </h1>
            <p className="text-[11px] text-[#888e90] font-mono">ID: {room.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] transition-colors border border-white/[0.08]"
          >
            {copied ? <CheckIcon size={13} className="text-[#11ff99]" /> : <CopyIcon size={13} />}
            <span className="hidden sm:inline font-mono text-[11px]">{copied ? 'Copied' : 'Share Space'}</span>
          </button>

          {isHost && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] transition-colors border border-white/[0.08] flex items-center gap-1.5"
            >
              <SettingsIcon size={13} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex items-center justify-center">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 h-full max-h-[72vh]">
          <div className="relative bg-[#0a0a0c] border border-white/[0.12] rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl group">
            {isVideoOn ? (
              <div className="w-full h-full bg-gradient-to-b from-[#0e0e12] to-[#06060a] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="h-20 w-20 rounded-full bg-[#101012] border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl">
                  {session?.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={80}
                      height={80}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="font-serif text-2xl text-[#fcfdff]">{session?.user.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-[#fcfdff]">{session?.user.name} (You)</p>
                  <p className="text-[10px] font-mono text-[#11ff99]">Camera Feed Online</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="h-14 w-14 rounded-full bg-[#101012] border border-white/[0.08] text-[#888e90] flex items-center justify-center">
                  <CameraIcon size={20} />
                </div>
                <p className="text-[11px] font-mono text-[#888e90]">Camera muted</p>
              </div>
            )}

            <div className="absolute bottom-3 left-3 bg-[#0a0a0c]/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 text-[#fcfdff] border border-white/[0.10]">
              {isMicOn ? <MicIcon size={13} className="text-[#11ff99]" /> : <MicOffIcon size={13} className="text-[#ff2047]" />}
              <span className="text-xs">{session?.user.name}</span>
              {isHost && (
                <span className="text-[9px] font-mono bg-white/10 text-[#fcfdff] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                  HOST
                </span>
              )}
            </div>
          </div>

          <div className="relative bg-[#0a0a0c] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-2xl">
            <div className="h-16 w-16 rounded-full bg-[#101012] border border-white/[0.10] flex items-center justify-center text-[#888e90]">
              <UsersIcon size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif-headline text-base font-normal text-[#fcfdff]">Awaiting Collaborators</h3>
              <p className="text-xs text-[#888e90] max-w-xs font-mono">
                Share space link or ID <span className="text-[#fcfdff] font-semibold">{room.code}</span>
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#101012] hover:bg-[#18181c] text-xs font-medium rounded-lg transition-colors text-[#fcfdff] border border-white/[0.10]"
            >
              {copied ? <CheckIcon size={13} className="text-[#11ff99]" /> : <CopyIcon size={13} />}
              <span>{copied ? 'Copied Link' : 'Copy Space Invite'}</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="h-20 border-t border-white/[0.06] px-4 sm:px-6 flex items-center justify-center bg-black/75 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4 p-1.5 bg-[#0a0a0c] border border-white/[0.12] rounded-xl shadow-2xl">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              isMicOn
                ? 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
                : 'bg-[#ff2047] text-white shadow-[0_0_16px_rgba(255,32,71,0.4)]'
            }`}
            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicOn ? <MicIcon size={17} /> : <MicOffIcon size={17} />}
          </button>

          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              isVideoOn
                ? 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
                : 'bg-[#ff2047] text-white shadow-[0_0_16px_rgba(255,32,71,0.4)]'
            }`}
            title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoOn ? <VideoIcon size={17} /> : <CameraIcon size={17} />}
          </button>

          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              isScreenSharing
                ? 'bg-[#3b9eff] text-white shadow-[0_0_16px_rgba(59,158,255,0.4)]'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
            }`}
            title="Screen Share"
          >
            <MonitorIcon size={17} />
          </button>

          <button
            onClick={() => {
              setChatOpen(!chatOpen);
              if (!chatOpen) setUnreadChatCount(0);
            }}
            className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              chatOpen
                ? 'bg-blue-500/20 text-[#3b9eff] border border-blue-500/40 shadow-sm'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
            }`}
            title="In-Call Messages"
          >
            <MessageSquareIcon size={17} />
            {unreadChatCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#3b9eff] text-black font-mono text-[9px] font-bold flex items-center justify-center shadow-lg animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-white/[0.08] mx-1" />

          <button
            onClick={handleLeave}
            disabled={leaving || ending}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#101012] hover:bg-[#18181c] text-[#888e90] hover:text-[#fcfdff] font-medium text-xs transition-all border border-white/[0.08] disabled:opacity-50"
          >
            {leaving ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border border-white/30 border-t-white rounded-full" />
                <span>Leaving...</span>
              </>
            ) : (
              <>
                <LogOutIcon size={13} />
                <span>Leave</span>
              </>
            )}
          </button>

          {isHost && (
            <button
              onClick={handleEndRoom}
              disabled={leaving || ending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#ff2047] hover:bg-[#ff2047]/90 text-white font-medium text-xs transition-all shadow-[0_0_16px_rgba(255,32,71,0.3)] disabled:opacity-50"
            >
              {ending ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border border-white/30 border-t-white rounded-full" />
                  <span>Ending Space...</span>
                </>
              ) : (
                <>
                  <PhoneCallIcon size={13} />
                  <span>End Space</span>
                </>
              )}
            </button>
          )}
        </div>
      </footer>

      {settingsOpen && settings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#0a0a0c] border border-white/[0.12] rounded-2xl p-6 space-y-5 shadow-2xl text-[#fcfdff]">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="font-serif-headline text-base font-normal">Space Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-[#888e90] hover:text-[#fcfdff]">
                <XIcon size={15} />
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-3 text-xs">
              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-lg hover:bg-[#101012]">
                <span className="text-[#fcfdff]/90">Microphone for all participants</span>
                <input
                  type="checkbox"
                  checked={settings.micForAll}
                  onChange={(e) => setSettings({ ...settings, micForAll: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-[#06060a] text-white"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-lg hover:bg-[#101012]">
                <span className="text-[#fcfdff]/90">Video camera for all participants</span>
                <input
                  type="checkbox"
                  checked={settings.videoForAll}
                  onChange={(e) => setSettings({ ...settings, videoForAll: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-[#06060a] text-white"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-lg hover:bg-[#101012]">
                <span className="text-[#fcfdff]/90">Screen sharing for all participants</span>
                <input
                  type="checkbox"
                  checked={settings.screenShareForAll}
                  onChange={(e) => setSettings({ ...settings, screenShareForAll: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-[#06060a] text-white"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-lg hover:bg-[#101012]">
                <span className="text-[#fcfdff]/90">In-room text chat</span>
                <input
                  type="checkbox"
                  checked={settings.allowChat}
                  onChange={(e) => setSettings({ ...settings, allowChat: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-[#06060a] text-white"
                />
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#888e90] hover:text-[#fcfdff]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingSettings}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-medium text-xs transition-colors shadow-[0_0_16px_rgba(252,253,255,0.12)] disabled:opacity-50"
                >
                  {updatingSettings ? (
                    <>
                      <div className="animate-spin h-3 w-3 border border-black/30 border-t-black rounded-full" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Settings</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Call Ephemeral Chat */}
      <InRoomChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        currentUserId={session?.user?.id || ''}
        roomTitle={room?.title}
      />
    </div>
  );
}
