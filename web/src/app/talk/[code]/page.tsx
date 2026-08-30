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
  AudioWaveformIcon,
  HeadphonesIcon,
  HandCoinsIcon,
  CopyIcon,
  CheckIcon,
  LockIcon,
  LogOutIcon,
  PhoneCallIcon,
  StarIcon,
  MessageSquareIcon,
} from '@animateicons/react/lucide';
import { getSocket } from '@/lib/socket';
import { InRoomChat } from '@/components/in-room-chat';
import type { ChatMessage } from '@/types/realtime';

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

  const [isMuted, setIsMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [ending, setEnding] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace(`/login?callbackURL=/talk/${code}`);
    }
  }, [session, sessionPending, router, code]);

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

  useEffect(() => {
    if (!room || !participant) return;

    const interval = setInterval(async () => {
      try {
        await roomsApi.sendHeartbeat(room.code);
      } catch {
        setError('This audio room has ended or expired.');
      }
    }, 15000);

    const onBeforeUnload = () => {
      const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
      fetch(`${apiUrl}/api/v1/rooms/${room.code}/leave`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      });
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [room, participant]);

  // Connect WebSocket and listen for in-room ephemeral messages
  useEffect(() => {
    if (!room || !participant) return;
    const socket = getSocket();
    socket.connect();

    socket.emit('room:join', {
      roomCode: code,
      isMuted: isMuted,
      isVideoOn: false,
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
  }, [room, participant, code, isMuted]);

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
    if (!room || !confirm('Are you sure you want to end this audio room for all listeners?')) return;
    setEnding(true);
    try {
      await roomsApi.endRoom(room.code);
      router.push('/');
    } catch (err) {
      console.error('End room error:', err);
      setEnding(false);
    }
  };

  if (sessionPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center space-y-3">
          <div className="animate-spin h-6 w-6 border border-white/20 border-t-[#fcfdff] rounded-full mx-auto" />
          <p className="text-xs font-mono text-[#888e90]">Connecting to Live Audio Stage...</p>
        </div>
      </div>
    );
  }

  if (passcodeRequired) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-black">
        <div className="w-full max-w-md p-8 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl space-y-6 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#a855f7] opacity-10 blur-3xl pointer-events-none" />
          <div className="h-12 w-12 rounded-xl bg-[#101012] border border-white/[0.10] text-[#ffc53d] flex items-center justify-center mx-auto">
            <LockIcon size={22} />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif-headline text-xl font-normal text-[#fcfdff]">Private Audio Lounge</h2>
            <p className="text-xs text-[#888e90]">
              Enter the passcode provided by the stage host.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void joinAudioRoom(code, passcode);
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
                  <span>Enter Lounge</span>
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
            <MicOffIcon size={22} />
          </div>
          <h2 className="font-serif-headline text-xl font-normal text-[#fcfdff]">Lounge Unavailable</h2>
          <p className="text-xs text-[#888e90]">{error || 'This audio room has ended or expired.'}</p>
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
  const isSpeaker = isHost || participant?.role === 'speaker' || settings?.micForAll;

  return (
    <div className="flex flex-col h-screen bg-black text-[#fcfdff] select-none ambient-glow-audio">
      <header className="h-14 border-b border-white/[0.06] px-4 sm:px-6 flex items-center justify-between bg-black/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.08] text-[#a855f7] flex items-center justify-center">
            <AudioWaveformIcon size={14} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif-headline text-sm font-normal text-[#fcfdff] truncate max-w-[200px] sm:max-w-md tracking-tight">
                {room.title}
              </h1>
              <span className="text-[9px] font-mono px-2 py-0.5 bg-[#101012] text-[#a855f7] border border-white/[0.08] rounded-full uppercase tracking-wider font-semibold">
                STAGE LIVE
              </span>
            </div>
            <p className="text-[11px] text-[#888e90] font-mono">ID: {room.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] transition-colors border border-white/[0.08]"
          >
            {copied ? <CheckIcon size={13} className="text-[#11ff99]" /> : <CopyIcon size={13} />}
            <span className="hidden sm:inline font-mono text-[11px]">{copied ? 'Copied' : 'Share Stage'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#888e90] uppercase tracking-wider">
              Podium & Active Speakers
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#101012] border border-white/[0.06] text-[#888e90]">
              {isHost ? '1 on podium' : 'Active Stage'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div className="relative p-6 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl flex flex-col items-center justify-center text-center space-y-3 shadow-2xl group glow-card">
              <div className="relative">
                <div className="h-18 w-18 rounded-full bg-[#101012] border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl">
                  {room.host?.image ? (
                    <Image
                      src={room.host.image}
                      alt={room.host.name || 'Host'}
                      width={72}
                      height={72}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-serif text-2xl text-[#fcfdff]">{room.host?.name?.charAt(0) || 'H'}</span>
                  )}
                </div>
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#ffc53d] text-black flex items-center justify-center shadow-md">
                  <StarIcon size={11} />
                </span>
                <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#101012] border border-white/20 flex items-center justify-center">
                  {!isMuted && isHost ? (
                    <MicIcon size={10} className="text-[#11ff99]" />
                  ) : (
                    <MicOffIcon size={10} className="text-[#888e90]" />
                  )}
                </span>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-[#fcfdff] truncate max-w-[120px]">{room.host?.name}</p>
                <span className="text-[10px] font-mono text-[#a855f7] uppercase tracking-wider block">
                  Stage Host
                </span>
              </div>
            </div>

            {!isHost && isSpeaker && (
              <div className="relative p-6 bg-[#0a0a0c] border border-white/[0.10] rounded-2xl flex flex-col items-center justify-center text-center space-y-3 shadow-2xl group glow-card">
                <div className="relative">
                  <div className="h-18 w-18 rounded-full bg-[#101012] border border-white/20 flex items-center justify-center overflow-hidden">
                    {session?.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={72}
                        height={72}
                        unoptimized
                      referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-serif text-2xl text-[#fcfdff]">{session?.user.name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#101012] border border-white/20 flex items-center justify-center">
                    {!isMuted ? <MicIcon size={10} className="text-[#11ff99]" /> : <MicOffIcon size={10} className="text-[#888e90]" />}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-[#fcfdff] truncate max-w-[120px]">{session?.user.name} (You)</p>
                  <span className="text-[10px] font-mono text-[#3b9eff] uppercase tracking-wider block">
                    Speaker
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 pt-6 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#888e90] uppercase tracking-wider">
              Audience & Listeners
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {!isSpeaker && (
              <div className="p-4 bg-[#0a0a0c] border border-white/[0.08] rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-[#101012] border border-white/10 flex items-center justify-center overflow-hidden">
                    {session?.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={48}
                        height={48}
                        unoptimized
                      referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-serif text-sm text-[#fcfdff]">{session?.user.name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  {handRaised && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#ffc53d] text-black flex items-center justify-center animate-bounce shadow-md">
                      <HandCoinsIcon size={9} />
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-[#fcfdff] truncate max-w-[90px]">{session?.user.name}</p>
                <span className="text-[9px] font-mono text-[#888e90]">Listener</span>
              </div>
            )}

            <div className="p-4 border border-dashed border-white/[0.08] rounded-xl flex flex-col items-center justify-center text-center space-y-1.5 opacity-60">
              <HeadphonesIcon size={18} className="text-[#888e90]" />
              <p className="text-[10px] font-mono text-[#888e90]">Listening Lounge</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="h-20 border-t border-white/[0.06] px-4 sm:px-6 flex items-center justify-center bg-black/75 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4 p-1.5 bg-[#0a0a0c] border border-white/[0.12] rounded-xl shadow-2xl">
          {isSpeaker ? (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`h-10 px-4 rounded-lg flex items-center gap-2 font-medium text-xs transition-all ${
                !isMuted
                  ? 'bg-[#a855f7] text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]'
                  : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
              }`}
            >
              {!isMuted ? <MicIcon size={14} /> : <MicOffIcon size={14} />}
              <span>{!isMuted ? 'Mic Live' : 'Unmute'}</span>
            </button>
          ) : (
            <button
              onClick={() => setHandRaised(!handRaised)}
              className={`h-10 px-4 rounded-lg flex items-center gap-2 font-medium text-xs transition-all ${
                handRaised
                  ? 'bg-[#ffc53d] text-black shadow-[0_0_16px_rgba(255,197,61,0.4)]'
                  : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
              }`}
            >
              <HandCoinsIcon size={14} />
              <span>{handRaised ? 'Hand Raised' : 'Request Mic'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setChatOpen(!chatOpen);
              if (!chatOpen) setUnreadChatCount(0);
            }}
            className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              chatOpen
                ? 'bg-purple-500/20 text-[#a855f7] border border-purple-500/40 shadow-sm'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
            }`}
            title="In-Call Messages"
          >
            <MessageSquareIcon size={17} />
            {unreadChatCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#a855f7] text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-lg animate-pulse">
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
                <span>Leave Quietly</span>
              </>
            )}
          </button>

          {isHost && (
            <button
              onClick={handleEndRoom}
              disabled={leaving || ending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#ff2047] hover:bg-[#ff2047]/90 text-white font-medium text-xs transition-all shadow-[0_0_16px_rgba(252,32,71,0.3)] disabled:opacity-50"
            >
              {ending ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border border-white/30 border-t-white rounded-full" />
                  <span>Ending Stage...</span>
                </>
              ) : (
                <>
                  <PhoneCallIcon size={13} />
                  <span>End Stage</span>
                </>
              )}
            </button>
          )}
        </div>
      </footer>

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
