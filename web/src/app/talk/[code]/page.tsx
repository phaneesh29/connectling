'use client';

import { useEffect, useState, useCallback, use, useRef } from 'react';
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
  UsersIcon,
  SettingsIcon,
  XIcon,
  ShieldCheckIcon,
} from '@animateicons/react/lucide';
import { getSocket } from '@/lib/socket';
import { playJoinChime, playLeaveChime } from '@/lib/chime';
import { InRoomChat } from '@/components/in-room-chat';
import { InRoomParticipants } from '@/components/in-room-participants';
import type { ChatMessage, RoomParticipant } from '@/types/realtime';

interface StageTileGradient {
  containerStyle: React.CSSProperties;
  borderClass: string;
}

const STAGE_TILE_GRADIENTS: StageTileGradient[] = [
  {
    // Sunset Orange subtle tint
    containerStyle: {
      background:
        'radial-gradient(ellipse 120% 75% at 50% -10%, rgba(255, 122, 26, 0.09) 0%, rgba(255, 122, 26, 0.02) 55%, #09090b 100%)',
      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
    borderClass: 'border-white/[0.08] hover:border-orange-500/30',
  },
  {
    // Amber subtle tint
    containerStyle: {
      background:
        'radial-gradient(ellipse 120% 75% at 50% -10%, rgba(245, 158, 11, 0.09) 0%, rgba(245, 158, 11, 0.02) 55%, #09090b 100%)',
      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
    borderClass: 'border-white/[0.08] hover:border-amber-500/30',
  },
  {
    // Tangerine Coral subtle tint
    containerStyle: {
      background:
        'radial-gradient(ellipse 120% 75% at 50% -10%, rgba(255, 98, 61, 0.09) 0%, rgba(255, 98, 61, 0.02) 55%, #09090b 100%)',
      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
    borderClass: 'border-white/[0.08] hover:border-[#ff623d]/30',
  },
  {
    // Warm Gold subtle tint
    containerStyle: {
      background:
        'radial-gradient(ellipse 120% 75% at 50% -10%, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.02) 55%, #09090b 100%)',
      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
    borderClass: 'border-white/[0.08] hover:border-yellow-500/30',
  },
  {
    // Terracotta subtle tint
    containerStyle: {
      background:
        'radial-gradient(ellipse 120% 75% at 50% -10%, rgba(234, 88, 12, 0.09) 0%, rgba(234, 88, 12, 0.02) 55%, #09090b 100%)',
      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
    borderClass: 'border-white/[0.08] hover:border-orange-600/30',
  },
  {
    // Warm Apricot subtle tint
    containerStyle: {
      background:
        'radial-gradient(ellipse 120% 75% at 50% -10%, rgba(251, 146, 60, 0.09) 0%, rgba(251, 146, 60, 0.02) 55%, #09090b 100%)',
      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
    borderClass: 'border-white/[0.08] hover:border-orange-400/30',
  },
];

const HOST_STAGE_GRADIENT: StageTileGradient = {
  containerStyle: {
    background:
      'radial-gradient(ellipse 120% 75% at 50% -10%, rgba(255, 197, 61, 0.12) 0%, rgba(245, 158, 11, 0.03) 55%, #09090b 100%)',
    boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
  },
  borderClass: 'border-amber-500/25 hover:border-amber-400/40',
};

function getStageTileGradient(userId: string, isHost: boolean): StageTileGradient {
  if (isHost) return HOST_STAGE_GRADIENT;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % STAGE_TILE_GRADIENTS.length;
  return STAGE_TILE_GRADIENTS[index];
}

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
  const [roomToast, setRoomToast] = useState<{ text: string; type: 'join' | 'leave' } | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<'micForAll' | 'allowChat' | 'allowRaiseHand' | null>(null);

  const chatOpenRef = useRef(chatOpen);
  const isMutedRef = useRef(isMuted);
  const handRaisedRef = useRef(handRaised);
  const participantRef = useRef(participant);
  const joinedCodeRef = useRef<string | null>(null);
  const knownParticipantsRef = useRef<Set<string>>(new Set());
  const currentUserId = session?.user?.id;
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    handRaisedRef.current = handRaised;
  }, [handRaised]);

  useEffect(() => {
    participantRef.current = participant;
  }, [participant]);

  const roomHostId = room?.hostId;
  const roomHostIdRef = useRef(roomHostId);

  useEffect(() => {
    roomHostIdRef.current = roomHostId;
  }, [roomHostId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

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
          joinedCodeRef.current = `${codeToJoin}:${currentUserIdRef.current}`;
          const isUserHost = res.data.room.hostId === currentUserIdRef.current;
          const userCanSpeak = isUserHost || res.data.participant?.role === 'speaker' || Boolean(res.data.settings?.micForAll);
          if (!userCanSpeak) {
            setIsMuted(true);
          }
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
    if (currentUserId && code) {
      const joinKey = `${code}:${currentUserId}`;
      if (joinedCodeRef.current === joinKey) return;
      joinedCodeRef.current = joinKey;

      roomsApi
        .joinRoom(code)
        .then((res) => {
          if (!ignore && res.data) {
            setRoom(res.data.room);
            setSettings(res.data.settings);
            setParticipant(res.data.participant);
            setPasscodeRequired(false);
            const isUserHost = res.data.room.hostId === currentUserIdRef.current;
            const userCanSpeak = isUserHost || res.data.participant?.role === 'speaker' || Boolean(res.data.settings?.micForAll);
            if (!userCanSpeak) {
              setIsMuted(true);
            }
          }
        })
        .catch((err: unknown) => {
          if (ignore) return;
          joinedCodeRef.current = null;
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
  }, [currentUserId, code]);

  const roomId = room?.id;
  const roomCode = room?.code;

  useEffect(() => {
    if (!roomId || !roomCode) return;

    const interval = setInterval(async () => {
      try {
        await roomsApi.sendHeartbeat(roomCode);
      } catch {
        setError('This audio room has ended or expired.');
      }
    }, 15000);

    const onBeforeUnload = () => {
      const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
      fetch(`${apiUrl}/api/v1/rooms/${roomCode}/leave`, {
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
  }, [roomId, roomCode]);

  // Connect WebSocket and listen for in-room ephemeral messages
  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    socket.connect();

    socket.emit('room:join', {
      roomCode: code,
      isMuted: isMutedRef.current,
    });

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      if (!chatOpenRef.current && msg.userId !== currentUserIdRef.current) {
        setUnreadChatCount((count) => count + 1);
      }
    };

    const handleRoster = ({ participants: roster }: { participants: RoomParticipant[] }) => {
      roster.forEach((p) => knownParticipantsRef.current.add(p.userId));
      setParticipants(roster);
    };

    const handleUserJoined = ({ userId, name }: { userId: string; name: string }) => {
      if (userId === currentUserIdRef.current) return;
      // Suppress duplicate chime if user is already known on this stage
      if (knownParticipantsRef.current.has(userId)) return;
      knownParticipantsRef.current.add(userId);

      playJoinChime();
      setRoomToast({ text: `${name} joined the stage`, type: 'join' });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text === `${name} joined the stage` ? null : curr));
      }, 3500);
    };

    const handleUserLeft = ({ userId, name }: { userId: string; name: string }) => {
      if (userId === currentUserIdRef.current) return;
      // Suppress duplicate chime if user was not on the stage
      if (!knownParticipantsRef.current.has(userId)) return;
      knownParticipantsRef.current.delete(userId);

      playLeaveChime();
      setRoomToast({ text: `${name} left the stage`, type: 'leave' });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text === `${name} left the stage` ? null : curr));
      }, 3500);
    };

    const handleSettingsUpdated = (updated: RoomSettingsData) => {
      setSettings(updated);
      setRoomToast({ text: 'Stage settings updated by host', type: 'join' });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text === 'Stage settings updated by host' ? null : curr));
      }, 3500);

      const isNotHost = Boolean(
        roomHostIdRef.current &&
          currentUserIdRef.current &&
          roomHostIdRef.current !== currentUserIdRef.current
      );

      if (
        isNotHost &&
        updated.micForAll === false &&
        participantRef.current?.role !== 'speaker' &&
        !isMutedRef.current
      ) {
        setIsMuted(true);
        const socket = getSocket();
        socket.emit('room:media-toggle', {
          roomCode: code,
          isMuted: true,
        });
        setRoomToast({ text: 'Microphone restricted to host only', type: 'leave' });
      }

      if (isNotHost && updated.allowRaiseHand === false && handRaisedRef.current) {
        setHandRaised(false);
      }
    };

    socket.on('chat:new-message', handleNewMessage);
    socket.on('room:roster', handleRoster);
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);
    socket.on('room:settings-updated', handleSettingsUpdated);

    return () => {
      socket.off('chat:new-message', handleNewMessage);
      socket.off('room:roster', handleRoster);
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
      socket.off('room:settings-updated', handleSettingsUpdated);
      socket.emit('room:leave', { roomCode: code });
    };
  }, [roomId, code]);

  const isHost = Boolean(room && session?.user && room.hostId === session.user.id);
  const isSpeaker = isHost || participant?.role === 'speaker' || settings?.micForAll;
  const isChatAllowed = settings?.allowChat !== false;
  const isRaiseHandAllowed = settings?.allowRaiseHand !== false;

  const handleSendMessage = (text: string) => {
    if (!isChatAllowed && !isHost) {
      setRoomToast({ text: 'Chat is disabled by the host', type: 'leave' });
      return;
    }
    const socket = getSocket();
    socket.emit('chat:message', { roomCode: code, text });
  };

  const handleToggleMic = () => {
    if (!isSpeaker) {
      setRoomToast({ text: 'Microphone is restricted by the host', type: 'leave' });
      return;
    }
    const next = !isMuted;
    setIsMuted(next);
    const socket = getSocket();
    socket.emit('room:media-toggle', {
      roomCode: code,
      isMuted: next,
    });
  };

  const handleQuickToggle = async (key: 'micForAll' | 'allowChat' | 'allowRaiseHand') => {
    if (!room || !settings || !isHost || updatingKey) return;
    const previousValue = Boolean(settings[key]);
    const nextValue = !previousValue;
    const newSettings = { ...settings, [key]: nextValue };

    setSettings(newSettings);
    setUpdatingKey(key);

    const labels: Record<'micForAll' | 'allowChat' | 'allowRaiseHand', { on: string; off: string }> = {
      micForAll: { on: 'Open mic enabled for all participants', off: 'Microphone restricted to host only' },
      allowChat: { on: 'In-room stage chat enabled', off: 'In-room stage chat disabled' },
      allowRaiseHand: { on: 'Audience mic requests enabled', off: 'Audience mic requests disabled' },
    };

    setRoomToast({
      text: nextValue ? labels[key].on : labels[key].off,
      type: nextValue ? 'join' : 'leave',
    });
    setTimeout(() => {
      setRoomToast((curr) =>
        curr?.text === (nextValue ? labels[key].on : labels[key].off) ? null : curr
      );
    }, 3000);

    try {
      const res = await roomsApi.updateSettings(room.code, {
        micForAll: newSettings.micForAll,
        videoForAll: newSettings.videoForAll,
        screenShareForAll: newSettings.screenShareForAll,
        allowChat: newSettings.allowChat,
        allowRaiseHand: newSettings.allowRaiseHand,
      });
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to update stage setting:', err);
      setSettings((curr) => (curr ? { ...curr, [key]: previousValue } : curr));
      setRoomToast({ text: 'Failed to update setting', type: 'leave' });
    } finally {
      setUpdatingKey(null);
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
      console.error('Failed to update stage settings:', err);
    } finally {
      setUpdatingSettings(false);
    }
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
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#f59e0b] to-[#ea580c] opacity-10 blur-3xl pointer-events-none" />
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

  const displayParticipants: RoomParticipant[] =
    participants.length > 0
      ? participants
      : room.host
      ? [
          {
            userId: room.hostId,
            name: room.host.name || 'Host',
            image: room.host.image,
            isMuted: isHost ? isMuted : false,
          },
          ...(!isHost && session?.user
            ? [
                {
                  userId: session.user.id,
                  name: session.user.name || 'You',
                  image: session.user.image,
                  isMuted,
                },
              ]
            : []),
        ]
      : [];

  return (
    <div className="flex flex-col h-screen bg-black text-[#fcfdff] select-none ambient-glow-audio">
      {roomToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121217]/90 border border-white/[0.14] text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <span className={`h-2 w-2 rounded-full ${roomToast.type === 'join' ? 'bg-[#11ff99]' : 'bg-[#ff7a1a]'}`} />
          <span className="text-[#fcfdff] font-medium">{roomToast.text}</span>
        </div>
      )}
      <header className="h-14 border-b border-white/[0.06] px-4 sm:px-6 flex items-center justify-between bg-black/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-[#101012] border border-white/[0.08] text-[#f59e0b] flex items-center justify-center">
            <AudioWaveformIcon size={14} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif-headline text-sm font-normal text-[#fcfdff] truncate max-w-[200px] sm:max-w-md tracking-tight">
                {room.title}
              </h1>
              <span className="text-[9px] font-mono px-2 py-0.5 bg-[#101012] text-[#f59e0b] border border-white/[0.08] rounded-full uppercase tracking-wider font-semibold">
                STAGE LIVE
              </span>
            </div>
            <p className="text-[11px] text-[#888e90] font-mono">ID: {room.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setParticipantsOpen(!participantsOpen);
              if (!participantsOpen) setChatOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              participantsOpen
                ? 'bg-amber-500/20 text-[#f59e0b] border-amber-500/40'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border-white/[0.08]'
            }`}
            title="People in lounge"
          >
            <UsersIcon size={13} />
            <span className="font-mono text-[11px]">{Math.max(1, displayParticipants.length)}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] transition-colors border border-white/[0.08]"
          >
            {copied ? <CheckIcon size={13} className="text-[#11ff99]" /> : <CopyIcon size={13} />}
            <span className="hidden sm:inline font-mono text-[11px]">{copied ? 'Copied' : 'Share Stage'}</span>
          </button>

          {isHost && (
            <button
              onClick={() => {
                setSettingsOpen(true);
                setParticipantsOpen(false);
                setChatOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] transition-colors border border-white/[0.08] flex items-center gap-1.5"
            >
              <SettingsIcon size={13} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-6">
        {/* Host Quick Control Strip */}
        {isHost && settings && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#09090b] border border-white/[0.10] shadow-xl relative overflow-hidden">
            {/* Top specular highlight */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#f59e0b] flex items-center justify-center shrink-0">
                  <ShieldCheckIcon size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-medium text-[#fcfdff]">Host Stage Controls</h2>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-[#f59e0b] border border-amber-500/30 font-semibold tracking-wider">
                      HOST ONLY
                    </span>
                  </div>
                  <p className="text-[11px] text-[#888e90]">
                    Manage audience microphone access, chat, and speaking requests in real time
                  </p>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center flex-wrap gap-2">
                {/* 1. Open Mic Toggle */}
                <button
                  type="button"
                  onClick={() => handleQuickToggle('micForAll')}
                  disabled={updatingKey === 'micForAll'}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    settings.micForAll
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
                      : 'bg-[#101014] border-white/[0.08] text-[#888e90] hover:text-[#fcfdff] hover:bg-[#16161c]'
                  } disabled:opacity-50`}
                  title={settings.micForAll ? 'Click to restrict mic to host only' : 'Click to allow all participants to unmute'}
                >
                  <span className={`h-2 w-2 rounded-full ${settings.micForAll ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  {settings.micForAll ? <MicIcon size={13} /> : <MicOffIcon size={13} />}
                  <span>{settings.micForAll ? 'Open Mic: ON' : 'Open Mic: OFF'}</span>
                </button>

                {/* 2. In-Room Chat Toggle */}
                <button
                  type="button"
                  onClick={() => handleQuickToggle('allowChat')}
                  disabled={updatingKey === 'allowChat'}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    settings.allowChat
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/15'
                      : 'bg-[#101014] border-white/[0.08] text-[#888e90] hover:text-[#fcfdff] hover:bg-[#16161c]'
                  } disabled:opacity-50`}
                  title={settings.allowChat ? 'Click to mute chat for participants' : 'Click to enable in-room chat'}
                >
                  <span className={`h-2 w-2 rounded-full ${settings.allowChat ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                  <MessageSquareIcon size={13} />
                  <span>{settings.allowChat ? 'Chat: ON' : 'Chat: MUTED'}</span>
                </button>

                {/* 3. Raise Hand / Mic Requests Toggle */}
                <button
                  type="button"
                  onClick={() => handleQuickToggle('allowRaiseHand')}
                  disabled={updatingKey === 'allowRaiseHand'}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    settings.allowRaiseHand
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/15'
                      : 'bg-[#101014] border-white/[0.08] text-[#888e90] hover:text-[#fcfdff] hover:bg-[#16161c]'
                  } disabled:opacity-50`}
                  title={settings.allowRaiseHand ? 'Click to disable mic requests' : 'Click to allow audience mic requests'}
                >
                  <span className={`h-2 w-2 rounded-full ${settings.allowRaiseHand ? 'bg-orange-400' : 'bg-zinc-600'}`} />
                  <HandCoinsIcon size={13} />
                  <span>{settings.allowRaiseHand ? 'Requests: ALLOWED' : 'Requests: OFF'}</span>
                </button>

                {/* Open Modal Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(true);
                    setParticipantsOpen(false);
                    setChatOpen(false);
                  }}
                  className="h-8 w-8 rounded-xl bg-[#101014] border border-white/[0.08] text-[#888e90] hover:text-[#fcfdff] hover:bg-[#16161c] flex items-center justify-center transition-all"
                  title="More room settings"
                >
                  <SettingsIcon size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audience Policy Status Strip (When not host) */}
        {!isHost && settings && (
          <div className="px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
              <span className="text-[#888e90] text-[11px] font-mono">Stage Permissions:</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className={`flex items-center gap-1.5 ${settings.micForAll ? 'text-emerald-400' : 'text-[#888e90]'}`}>
                {settings.micForAll ? <MicIcon size={11} /> : <MicOffIcon size={11} />}
                <span>{settings.micForAll ? 'Open Mic' : 'Host Only Mic'}</span>
              </span>
              <span className="text-white/10">•</span>
              <span className={`flex items-center gap-1.5 ${settings.allowChat ? 'text-[#fcfdff]' : 'text-[#888e90]'}`}>
                <MessageSquareIcon size={11} />
                <span>{settings.allowChat ? 'Chat Open' : 'Chat Muted'}</span>
              </span>
              <span className="text-white/10">•</span>
              <span className={`flex items-center gap-1.5 ${settings.allowRaiseHand ? 'text-amber-400' : 'text-[#888e90]'}`}>
                <HandCoinsIcon size={11} />
                <span>{settings.allowRaiseHand ? 'Requests Allowed' : 'Requests Closed'}</span>
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#888e90] uppercase tracking-wider">
              Stage Participants & Listeners
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#101012] border border-white/[0.06] text-[#f59e0b] font-medium">
              {Math.max(1, displayParticipants.length)} in space
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            className="text-xs text-[#888e90] hover:text-[#fcfdff] font-mono flex items-center gap-1 transition-colors"
          >
            <span>Stage ID: <strong className="text-[#fcfdff]">{room.code}</strong></span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayParticipants.map((p) => {
            const isPHost = p.userId === room.hostId;
            const isMe = p.userId === session?.user?.id;
            const initial = p.name ? p.name.trim().charAt(0).toUpperCase() : 'U';
            const gradient = getStageTileGradient(p.userId, isPHost);
            const isSpeaking = !p.isMuted;

            return (
              <div
                key={p.userId}
                style={gradient.containerStyle}
                className={`relative p-5 border rounded-2xl flex flex-col items-center justify-center text-center space-y-3 transition-all duration-200 group overflow-hidden min-h-[160px] ${
                  gradient.borderClass
                } ${
                  isSpeaking ? 'ring-1 ring-emerald-500/50' : ''
                }`}
              >
                {/* Subtle top edge specular highlight line */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

                <div className="relative z-10">
                  <div
                    className={`h-16 w-16 rounded-full bg-[#121216] border border-white/[0.10] flex items-center justify-center overflow-hidden shadow-lg transition-transform duration-200 group-hover:scale-[1.02] ${
                      isSpeaking ? 'ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-[#09090b]' : ''
                    }`}
                  >
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={64}
                        height={64}
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-serif text-2xl text-[#fcfdff] font-normal">{initial}</span>
                    )}
                  </div>

                  {isPHost && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#ffc53d] text-black flex items-center justify-center shadow-md">
                      <StarIcon size={11} />
                    </span>
                  )}

                  {isMe && handRaised && (
                    <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-[#ff7a1a] text-black flex items-center justify-center animate-bounce shadow-md">
                      <HandCoinsIcon size={10} />
                    </span>
                  )}

                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#101014] border border-white/[0.14] flex items-center justify-center">
                    {p.isMuted ? (
                      <MicOffIcon size={10} className="text-[#888e90]" />
                    ) : (
                      <MicIcon size={10} className="text-[#11ff99]" />
                    )}
                  </span>
                </div>

                <div className="space-y-0.5 max-w-full px-1 relative z-10">
                  <p className="text-xs font-medium text-[#fcfdff] truncate">
                    {p.name}
                    {isMe && <span className="text-[#888e90]"> (You)</span>}
                  </p>
                  {isPHost ? (
                    <span className="text-[10px] font-mono text-[#f59e0b] uppercase tracking-wider block font-semibold">
                      Stage Host
                    </span>
                  ) : isSpeaking ? (
                    <span className="text-[10px] font-mono text-[#11ff99] uppercase tracking-wider block font-medium">
                      Speaking
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-wider block">
                      Listener
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {displayParticipants.length <= 1 && (
            <div className="p-5 bg-[#09090b]/60 border border-dashed border-white/[0.08] hover:border-white/[0.14] rounded-2xl flex flex-col items-center justify-center text-center space-y-2.5 min-h-[160px] transition-all">
              <div className="h-10 w-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#888e90]">
                <HeadphonesIcon size={18} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-[#fcfdff] font-medium">Listening Lounge</p>
                <p className="text-[10px] font-mono text-[#888e90]">Share ID {room.code} to invite</p>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-[#fcfdff] transition-all border border-white/[0.08]"
              >
                {copied ? 'Copied' : 'Copy Invite'}
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="h-20 border-t border-white/[0.06] px-4 sm:px-6 flex items-center justify-center bg-black/75 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4 p-1.5 bg-[#0a0a0c] border border-white/[0.12] rounded-xl shadow-2xl">
          {isSpeaker ? (
            <button
              onClick={handleToggleMic}
              className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
                !isMuted
                  ? 'bg-gradient-to-r from-[#f59e0b] to-[#ea580c] text-white shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                  : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
              }`}
              title={!isMuted ? 'Mute microphone' : 'Unmute microphone'}
            >
              {!isMuted ? <MicIcon size={17} /> : <MicOffIcon size={17} />}
            </button>
          ) : (
            <button
              onClick={() => {
                if (!isRaiseHandAllowed && !handRaised) {
                  setRoomToast({ text: 'Mic requests are disabled by the host', type: 'leave' });
                  return;
                }
                setHandRaised(!handRaised);
              }}
              disabled={!isRaiseHandAllowed && !handRaised}
              className={`h-10 px-4 rounded-lg flex items-center gap-2 font-medium text-xs transition-all ${
                !isRaiseHandAllowed && !handRaised
                  ? 'opacity-40 cursor-not-allowed bg-[#101012] text-[#888e90]'
                  : handRaised
                  ? 'bg-[#ffc53d] text-black shadow-[0_0_16px_rgba(255,197,61,0.4)]'
                  : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
              }`}
              title={
                !isRaiseHandAllowed && !handRaised
                  ? 'Mic requests disabled by host'
                  : handRaised
                  ? 'Lower Hand'
                  : 'Request Mic'
              }
            >
              <HandCoinsIcon size={14} />
              <span>{handRaised ? 'Hand Raised' : 'Request Mic'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setParticipantsOpen(!participantsOpen);
              if (!participantsOpen) setChatOpen(false);
            }}
            className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              participantsOpen
                ? 'bg-amber-500/20 text-[#f59e0b] border border-amber-500/40 shadow-sm'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
            }`}
            title="People in lounge"
          >
            <UsersIcon size={17} />
            {participants.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#f59e0b] text-black font-mono text-[9px] font-bold flex items-center justify-center shadow-lg">
                {participants.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setChatOpen(!chatOpen);
              if (!chatOpen) {
                setParticipantsOpen(false);
                setUnreadChatCount(0);
              }
            }}
            className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              chatOpen
                ? 'bg-amber-500/20 text-[#f59e0b] border border-amber-500/40 shadow-sm'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
            }`}
            title="In-Call Messages"
          >
            <MessageSquareIcon size={17} />
            {unreadChatCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#f59e0b] text-black font-mono text-[9px] font-bold flex items-center justify-center shadow-lg animate-pulse">
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

      {/* Stage Settings Modal */}
      {settingsOpen && settings && isHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#0a0a0c] border border-white/[0.12] rounded-2xl p-6 space-y-5 shadow-2xl text-[#fcfdff]">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="font-serif-headline text-base font-normal">Stage Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-[#888e90] hover:text-[#fcfdff]">
                <XIcon size={15} />
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-3 text-xs">
              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-lg hover:bg-[#101012]">
                <div className="pr-4">
                  <span className="text-[#fcfdff]/90 block font-medium">Open microphone for all participants</span>
                  <span className="text-[11px] text-[#888e90]">Allow anyone on stage to speak freely without asking</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.micForAll}
                  onChange={(e) => setSettings({ ...settings, micForAll: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-[#06060a] text-white"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-lg hover:bg-[#101012]">
                <div className="pr-4">
                  <span className="text-[#fcfdff]/90 block font-medium">In-room text chat</span>
                  <span className="text-[11px] text-[#888e90]">Allow participants to send messages in stage chat</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowChat}
                  onChange={(e) => setSettings({ ...settings, allowChat: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-[#06060a] text-white"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-lg hover:bg-[#101012]">
                <div className="pr-4">
                  <span className="text-[#fcfdff]/90 block font-medium">Allow audience to request mic</span>
                  <span className="text-[11px] text-[#888e90]">Listeners can raise hand to request speaking turn</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowRaiseHand}
                  onChange={(e) => setSettings({ ...settings, allowRaiseHand: e.target.checked })}
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
        isChatAllowed={isChatAllowed}
        isHost={isHost}
      />

      {/* In-Call Room Participants Roster */}
      <InRoomParticipants
        isOpen={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        participants={participants}
        currentUserId={session?.user?.id}
        hostId={room?.hostId}
        roomCode={room?.code || code}
        onCopyLink={handleCopyLink}
        copied={copied}
      />
    </div>
  );
}
