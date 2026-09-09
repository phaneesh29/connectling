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
  StarIcon,
  ChevronUpIcon,
} from '@animateicons/react/lucide';
import { getSocket } from '@/lib/socket';
import { playJoinChime, playLeaveChime } from '@/lib/chime';
import { InRoomChat } from '@/components/in-room-chat';
import { InRoomParticipants } from '@/components/in-room-participants';
import { TransferHostModal } from '@/components/transfer-host-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { MediaDeviceMenu } from '@/components/media-device-menu';
import { useMediaDevices } from '@/hooks/use-media-devices';
import type { ChatMessage, RoomParticipant } from '@/types/realtime';

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
  const [hasEntered, setHasEntered] = useState(false);
  const [passcodeRequired, setPasscodeRequired] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [joining, setJoining] = useState(false);

  const [room, setRoom] = useState<RoomData | null>(null);
  const [settings, setSettings] = useState<RoomSettingsData | null>(null);
  const [, setParticipant] = useState<ParticipantData | null>(null);

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
  const [roomToast, setRoomToast] = useState<{ text: string; type: 'join' | 'leave' } | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    alertOnly?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const mediaDevices = useMediaDevices();
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [videoMenuOpen, setVideoMenuOpen] = useState(false);

  const chatOpenRef = useRef(chatOpen);
  const isMicOnRef = useRef(isMicOn);
  const isVideoOnRef = useRef(isVideoOn);
  const joinedCodeRef = useRef<string | null>(null);
  const knownParticipantsRef = useRef<Set<string>>(new Set());
  const currentUserId = session?.user?.id;
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
    isVideoOnRef.current = isVideoOn;
  }, [isMicOn, isVideoOn]);

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
          joinedCodeRef.current = `${codeToJoin}:${currentUserIdRef.current}`;
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
          }
        })
        .catch((err: unknown) => {
          if (ignore) return;
          joinedCodeRef.current = null;
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
  }, [currentUserId, code]);

  const roomId = room?.id;
  const roomCode = room?.code;

  useEffect(() => {
    if (!roomId || !roomCode) return;

    const interval = setInterval(async () => {
      try {
        await roomsApi.sendHeartbeat(roomCode);
      } catch {
        setError('This meeting has ended or expired.');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [roomId, roomCode]);

  // Connect WebSocket and listen for in-room ephemeral messages
  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    socket.connect();

    socket.emit('room:join', {
      roomCode: code,
      isMuted: !isMicOnRef.current,
      isVideoOn: isVideoOnRef.current,
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
      // Suppress duplicate chime if user is already known in this space
      if (knownParticipantsRef.current.has(userId)) return;
      knownParticipantsRef.current.add(userId);

      playJoinChime();
      setRoomToast({ text: `${name} joined the space`, type: 'join' });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text === `${name} joined the space` ? null : curr));
      }, 3500);
    };

    const handleUserLeft = ({ userId, name }: { userId: string; name: string }) => {
      if (userId === currentUserIdRef.current) return;
      // Suppress duplicate chime if user wasn't in the space
      if (!knownParticipantsRef.current.has(userId)) return;
      knownParticipantsRef.current.delete(userId);

      playLeaveChime();
      setRoomToast({ text: `${name} left the space`, type: 'leave' });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text === `${name} left the space` ? null : curr));
      }, 3500);
    };

    const handleSettingsUpdated = (updated: RoomSettingsData) => {
      setSettings(updated);
      setRoomToast({ text: 'Space settings updated by host', type: 'join' });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text === 'Space settings updated by host' ? null : curr));
      }, 3500);

      const isNotHost = Boolean(
        roomHostIdRef.current &&
          currentUserIdRef.current &&
          roomHostIdRef.current !== currentUserIdRef.current
      );

      if (isNotHost) {
        if (updated.micForAll === false && isMicOnRef.current) {
          setIsMicOn(false);
          const socket = getSocket();
          socket.emit('room:media-toggle', {
            roomCode: code,
            isMuted: true,
            isVideoOn: isVideoOnRef.current,
          });
        }
        if (updated.videoForAll === false && isVideoOnRef.current) {
          setIsVideoOn(false);
          const socket = getSocket();
          socket.emit('room:media-toggle', {
            roomCode: code,
            isMuted: !isMicOnRef.current,
            isVideoOn: false,
          });
        }
        if (updated.screenShareForAll === false) {
          setIsScreenSharing(false);
        }
      }
    };

    const handleUserMuted = ({ targetUserId }: { targetUserId: string; byHost: boolean }) => {
      if (targetUserId === currentUserIdRef.current) {
        setIsMicOn(false);
        const socket = getSocket();
        socket.emit('room:media-toggle', {
          roomCode: code,
          isMuted: true,
          isVideoOn: isVideoOnRef.current,
        });
        playLeaveChime();
        setRoomToast({ text: 'You were muted by the host', type: 'leave' });
        setTimeout(() => {
          setRoomToast((curr) => (curr?.text === 'You were muted by the host' ? null : curr));
        }, 3500);
      }
      setParticipants((prev) =>
        prev.map((p) => (p.userId === targetUserId ? { ...p, isMuted: true } : p))
      );
    };

    const handleKicked = ({ message }: { message: string }) => {
      setConfirmModal({
        isOpen: true,
        title: 'Removed from Space',
        description: message || 'You have been removed from this space by the host.',
        confirmText: 'Return to Home',
        variant: 'danger',
        alertOnly: true,
        onConfirm: () => {
          setConfirmModal(null);
          router.push('/');
        },
      });
    };

    const handleUserKicked = ({
      targetUserId,
      targetName,
    }: {
      targetUserId: string;
      targetName: string;
    }) => {
      setRoomToast({ text: `${targetName} was removed from the space`, type: 'leave' });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text?.includes('was removed from the space') ? null : curr));
      }, 3500);
      setParticipants((prev) => prev.filter((p) => p.userId !== targetUserId));
    };

    const handleHostTransferred = ({
      newHostId,
      newHostName,
    }: {
      previousHostId: string;
      newHostId: string;
      newHostName: string;
    }) => {
      setRoom((prev) => (prev ? { ...prev, hostId: newHostId } : prev));
      if (newHostId === currentUserIdRef.current) {
        setRoomToast({ text: 'You are now the space host!', type: 'join' });
        playJoinChime();
      } else {
        setRoomToast({ text: `${newHostName} is now the space host`, type: 'join' });
      }
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text?.includes('space host') ? null : curr));
      }, 4000);
    };

    socket.on('chat:new-message', handleNewMessage);
    socket.on('room:roster', handleRoster);
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);
    socket.on('room:settings-updated', handleSettingsUpdated);
    socket.on('room:user-muted', handleUserMuted);
    socket.on('room:kicked', handleKicked);
    socket.on('room:user-kicked', handleUserKicked);
    socket.on('room:host-transferred', handleHostTransferred);

    return () => {
      socket.off('chat:new-message', handleNewMessage);
      socket.off('room:roster', handleRoster);
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
      socket.off('room:settings-updated', handleSettingsUpdated);
      socket.off('room:user-muted', handleUserMuted);
      socket.off('room:kicked', handleKicked);
      socket.off('room:user-kicked', handleUserKicked);
      socket.off('room:host-transferred', handleHostTransferred);
      socket.emit('room:leave', { roomCode: code });
    };
  }, [roomId, code, router]);

  const isHost = Boolean(room && session?.user && room.hostId === session.user.id);
  const isMicAllowed = isHost || settings?.micForAll !== false;
  const isVideoAllowed = isHost || settings?.videoForAll !== false;
  const isScreenShareAllowed = isHost || settings?.screenShareForAll !== false;
  const isChatAllowed = settings?.allowChat !== false;

  const handleSendMessage = (text: string) => {
    if (!isChatAllowed && !isHost) {
      setRoomToast({ text: 'Chat is disabled by the host', type: 'leave' });
      return;
    }
    const socket = getSocket();
    socket.emit('chat:message', { roomCode: code, text });
  };

  const handleToggleMic = () => {
    if (!isMicAllowed && !isMicOn) {
      setRoomToast({ text: 'Microphone is disabled by the host', type: 'leave' });
      return;
    }
    const next = !isMicOn;
    setIsMicOn(next);
    const socket = getSocket();
    socket.emit('room:media-toggle', {
      roomCode: code,
      isMuted: !next,
      isVideoOn,
    });
  };

  const handleToggleVideo = () => {
    if (!isVideoAllowed && !isVideoOn) {
      setRoomToast({ text: 'Camera is disabled by the host', type: 'leave' });
      return;
    }
    const next = !isVideoOn;
    setIsVideoOn(next);
    const socket = getSocket();
    socket.emit('room:media-toggle', {
      roomCode: code,
      isMuted: !isMicOn,
      isVideoOn: next,
    });
  };

  const handleToggleScreenShare = () => {
    if (!isScreenShareAllowed && !isScreenSharing) {
      setRoomToast({ text: 'Screen sharing is disabled by the host', type: 'leave' });
      return;
    }
    setIsScreenSharing(!isScreenSharing);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoteMute = (targetUserId: string, targetName: string) => {
    if (!isHost) return;
    const socket = getSocket();
    socket.emit('room:mute-user', {
      roomCode: code,
      targetUserId,
    });
    setRoomToast({
      text: `Muted ${targetName}`,
      type: 'leave',
    });
    setTimeout(() => {
      setRoomToast((curr) => (curr?.text?.startsWith('Muted ') ? null : curr));
    }, 3000);
  };

  const handleKickUser = (targetUserId: string, targetName: string) => {
    if (!isHost) return;
    setConfirmModal({
      isOpen: true,
      title: 'Remove Participant?',
      description: `Are you sure you want to remove ${targetName} from this space? They will be disconnected immediately.`,
      confirmText: 'Remove Participant',
      variant: 'danger',
      onConfirm: () => {
        const socket = getSocket();
        socket.emit('room:kick-user', {
          roomCode: code,
          targetUserId,
        });
        setRoomToast({
          text: `Removed ${targetName} from space`,
          type: 'leave',
        });
        setTimeout(() => {
          setRoomToast((curr) => (curr?.text?.startsWith('Removed ') ? null : curr));
        }, 3000);
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null),
    });
  };

  const handleTransferHost = async (newHostUserId: string, newHostName: string): Promise<boolean> => {
    if (!isHost) return false;
    try {
      const socket = getSocket();
      socket.emit('room:transfer-host', {
        roomCode: code,
        newHostUserId,
      });
      await roomsApi.transferHost(code, newHostUserId);
      setRoom((prev) => (prev ? { ...prev, hostId: newHostUserId } : prev));
      setRoomToast({
        text: `Made ${newHostName} the space host`,
        type: 'join',
      });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text?.startsWith('Made ') ? null : curr));
      }, 3000);
      return true;
    } catch (err) {
      console.error('Failed to transfer space host:', err);
      setRoomToast({ text: 'Failed to transfer space host', type: 'leave' });
      return false;
    }
  };

  const requestTransferHost = (targetUserId: string, targetName: string) => {
    if (!isHost) return;
    setConfirmModal({
      isOpen: true,
      title: 'Make Host?',
      description: `Transfer space host permissions to ${targetName}? They will have full moderation controls over the meeting.`,
      confirmText: 'Make Host',
      variant: 'primary',
      onConfirm: () => {
        setConfirmModal(null);
        void handleTransferHost(targetUserId, targetName);
      },
      onCancel: () => setConfirmModal(null),
    });
  };

  const handleLeaveClick = () => {
    if (!isHost) {
      void handleLeave();
      return;
    }

    const otherParticipants = participants.filter((p) => p.userId !== session?.user?.id);
    if (otherParticipants.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'End Space?',
        description: 'You are the only person in this meeting. Leaving will close this space. Leave and end meeting now?',
        confirmText: 'Leave & End Space',
        variant: 'danger',
        onConfirm: () => {
          setConfirmModal(null);
          void executeEndRoom();
        },
        onCancel: () => setConfirmModal(null),
      });
      return;
    }

    setTransferModalOpen(true);
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

  const executeEndRoom = async () => {
    if (!room) return;
    setEnding(true);
    try {
      await roomsApi.endRoom(room.code);
      router.push('/');
    } catch (err) {
      console.error('End room error:', err);
      setEnding(false);
    }
  };

  const handleEndRoom = () => {
    if (!room) return;
    setConfirmModal({
      isOpen: true,
      title: 'End Meeting for Everyone?',
      description: 'Are you sure you want to end this meeting for all participants? All active connections will be disconnected and this space will be closed.',
      confirmText: 'End Meeting',
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal(null);
        void executeEndRoom();
      },
      onCancel: () => setConfirmModal(null),
    });
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
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#ff7a1a] to-[#ea580c] opacity-10 blur-3xl pointer-events-none" />
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

  const otherParticipants = participants.filter((p) => p.userId !== session?.user?.id);

  return (
    <div className="flex flex-col h-screen bg-black text-[#fcfdff] select-none ambient-glow-meet">
      {roomToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121217]/90 border border-white/[0.14] text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <span className={`h-2 w-2 rounded-full ${roomToast.type === 'join' ? 'bg-[#11ff99]' : 'bg-[#ff7a1a]'}`} />
          <span className="text-[#fcfdff] font-medium">{roomToast.text}</span>
        </div>
      )}
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
            onClick={() => {
              setParticipantsOpen(!participantsOpen);
              if (!participantsOpen) setChatOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              participantsOpen
                ? 'bg-orange-500/20 text-[#ff7a1a] border-orange-500/40'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border-white/[0.08]'
            }`}
            title="People in space"
          >
            <UsersIcon size={13} />
            <span className="font-mono text-[11px]">{Math.max(1, participants.length)}</span>
          </button>

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
        <div
          className={`w-full max-w-5xl grid gap-4 h-full max-h-[72vh] ${
            otherParticipants.length === 0
              ? 'grid-cols-1 md:grid-cols-2'
              : otherParticipants.length === 1
              ? 'grid-cols-1 md:grid-cols-2'
              : otherParticipants.length <= 3
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {/* Local User Card */}
          <div className="relative bg-[#0a0a0c] border border-white/[0.12] rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl group min-h-[220px]">
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

          {/* Other Connected Participants */}
          {otherParticipants.map((p) => {
            const isOtherHost = p.userId === room.hostId;
            const initial = p.name ? p.name.trim().charAt(0).toUpperCase() : 'U';
            const isVideoActive = p.isVideoOn ?? true;

            return (
              <div
                key={p.userId}
                className="relative bg-[#0a0a0c] border border-white/[0.12] rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl group min-h-[220px]"
              >
                {isVideoActive ? (
                  <div className="w-full h-full bg-gradient-to-b from-[#0e0e12] to-[#06060a] flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full bg-[#101012] border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name || 'Participant'}
                            width={80}
                            height={80}
                            unoptimized
                            referrerPolicy="no-referrer"
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="font-serif text-2xl text-[#fcfdff]">{initial}</span>
                        )}
                      </div>
                      {isOtherHost && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#ffc53d] text-black flex items-center justify-center shadow-md">
                          <StarIcon size={11} />
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-[#fcfdff]">{p.name}</p>
                      <p className="text-[10px] font-mono text-[#11ff99]">Connected</p>
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

                {/* Host Moderation Controls on Video Card */}
                {isHost && !isOtherHost && (
                  <div className="absolute top-3 right-3 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1.5 z-30 transition-opacity">
                    {!p.isMuted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoteMute(p.userId, p.name);
                        }}
                        className="h-7 w-7 rounded-lg bg-black/80 hover:bg-amber-500/20 text-amber-300 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer shadow-md"
                        title={`Mute ${p.name}`}
                      >
                        <MicOffIcon size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestTransferHost(p.userId, p.name);
                      }}
                      className="h-7 w-7 rounded-lg bg-black/80 hover:bg-amber-500/20 text-[#888e90] hover:text-amber-300 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer shadow-md"
                      title={`Make ${p.name} the host`}
                    >
                      <StarIcon size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKickUser(p.userId, p.name);
                      }}
                      className="h-7 w-7 rounded-lg bg-black/80 hover:bg-red-500/20 text-[#888e90] hover:text-red-400 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer shadow-md"
                      title={`Remove ${p.name} from space`}
                    >
                      <LogOutIcon size={12} />
                    </button>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 bg-[#0a0a0c]/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 text-[#fcfdff] border border-white/[0.10]">
                  {p.isMuted ? (
                    <MicOffIcon size={13} className="text-[#ff2047]" />
                  ) : (
                    <MicIcon size={13} className="text-[#11ff99]" />
                  )}
                  <span className="text-xs">{p.name}</span>
                  {isOtherHost && (
                    <span className="text-[9px] font-mono bg-white/10 text-[#fcfdff] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                      HOST
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* If No Other Participants Yet: Show Waiting Tile */}
          {otherParticipants.length === 0 && (
            <div className="relative bg-[#0a0a0c] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-2xl min-h-[220px]">
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
          )}
        </div>
      </main>

      <footer className="relative z-40 h-20 border-t border-white/[0.06] px-4 sm:px-6 flex items-center justify-center bg-black/75 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4 p-1.5 bg-[#0a0a0c] border border-white/[0.12] rounded-xl shadow-2xl">
          {/* Microphone Split Button */}
          <div
            className={`inline-flex items-center rounded-xl transition-all ${
              !isMicAllowed && !isMicOn
                ? 'opacity-40 cursor-not-allowed bg-[#121216] border border-white/[0.06] text-[#888e90]'
                : isMicOn
                ? audioMenuOpen
                  ? 'bg-[#181820] text-[#fcfdff] border border-[#ff7a1a]/50 ring-1 ring-[#ff7a1a]/40 shadow-[0_0_20px_rgba(255,122,26,0.2)]'
                  : 'bg-[#121216] hover:bg-[#18181f] text-[#fcfdff] border border-white/[0.10] hover:border-white/[0.16] shadow-sm'
                : audioMenuOpen
                ? 'bg-gradient-to-r from-[#ff2047] to-[#e61239] text-white ring-2 ring-[#ff7a1a]/60 shadow-[0_0_20px_rgba(255,32,71,0.5)] border border-red-400/50'
                : 'bg-gradient-to-r from-[#ff2047] to-[#e61239] text-white shadow-[0_0_18px_rgba(255,32,71,0.4)] border border-red-500/40'
            }`}
          >
            <button
              type="button"
              onClick={handleToggleMic}
              disabled={!isMicAllowed && !isMicOn}
              className="h-10 px-3 rounded-l-xl flex items-center justify-center hover:bg-white/[0.06] transition-all cursor-pointer disabled:cursor-not-allowed"
              title={
                !isMicAllowed && !isMicOn
                  ? 'Microphone disabled by host'
                  : isMicOn
                  ? 'Mute Microphone'
                  : 'Unmute Microphone'
              }
            >
              {isMicOn ? <MicIcon size={17} /> : <MicOffIcon size={17} />}
            </button>
            <div
              className={`w-px h-4.5 ${
                isMicOn ? (audioMenuOpen ? 'bg-[#ff7a1a]/40' : 'bg-white/[0.10]') : 'bg-white/20'
              }`}
            />
            {/* Up-Arrow Trigger & Popover Anchor */}
            <div className={`relative ${audioMenuOpen ? 'z-50' : ''}`}>
              <button
                type="button"
                data-media-menu-toggle="audio"
                onClick={() => {
                  setAudioMenuOpen((prev) => !prev);
                  setVideoMenuOpen(false);
                }}
                className={`h-10 px-2 rounded-r-xl flex items-center justify-center hover:bg-white/[0.08] transition-all cursor-pointer ${
                  audioMenuOpen ? 'bg-white/[0.12] text-[#ff7a1a]' : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
                title="Microphone & Speaker Settings"
              >
                <ChevronUpIcon
                  size={14}
                  className={`transition-transform duration-200 pointer-events-none ${
                    audioMenuOpen ? 'rotate-180 text-[#ff7a1a]' : ''
                  }`}
                />
              </button>

              <MediaDeviceMenu
                isOpen={audioMenuOpen}
                onClose={() => setAudioMenuOpen(false)}
                type="audio"
                audioInputs={mediaDevices.audioInputs}
                audioOutputs={mediaDevices.audioOutputs}
                selectedAudioInputId={mediaDevices.selectedAudioInputId}
                selectedAudioOutputId={mediaDevices.selectedAudioOutputId}
                onSelectAudioInput={mediaDevices.setSelectedAudioInputId}
                onSelectAudioOutput={mediaDevices.setSelectedAudioOutputId}
                onRequestPermissions={() => mediaDevices.requestPermissions(true, false)}
                onTestSpeaker={mediaDevices.testSpeaker}
                testingSpeaker={mediaDevices.testingSpeaker}
                onTestMic={mediaDevices.testMic}
                testingMicStatus={mediaDevices.testingMicStatus}
                micVolume={mediaDevices.micVolume}
              />
            </div>
          </div>

          {/* Camera Split Button */}
          <div
            className={`inline-flex items-center rounded-xl transition-all ${
              !isVideoAllowed && !isVideoOn
                ? 'opacity-40 cursor-not-allowed bg-[#121216] border border-white/[0.06] text-[#888e90]'
                : isVideoOn
                ? videoMenuOpen
                  ? 'bg-[#181820] text-[#fcfdff] border border-[#ff7a1a]/50 ring-1 ring-[#ff7a1a]/40 shadow-[0_0_20px_rgba(255,122,26,0.2)]'
                  : 'bg-[#121216] hover:bg-[#18181f] text-[#fcfdff] border border-white/[0.10] hover:border-white/[0.16] shadow-sm'
                : videoMenuOpen
                ? 'bg-gradient-to-r from-[#ff2047] to-[#e61239] text-white ring-2 ring-[#ff7a1a]/60 shadow-[0_0_20px_rgba(255,32,71,0.5)] border border-red-400/50'
                : 'bg-gradient-to-r from-[#ff2047] to-[#e61239] text-white shadow-[0_0_18px_rgba(255,32,71,0.4)] border border-red-500/40'
            }`}
          >
            <button
              type="button"
              onClick={handleToggleVideo}
              disabled={!isVideoAllowed && !isVideoOn}
              className="h-10 px-3 rounded-l-xl flex items-center justify-center hover:bg-white/[0.06] transition-all cursor-pointer disabled:cursor-not-allowed"
              title={
                !isVideoAllowed && !isVideoOn
                  ? 'Camera disabled by host'
                  : isVideoOn
                  ? 'Turn Off Camera'
                  : 'Turn On Camera'
              }
            >
              {isVideoOn ? <VideoIcon size={17} /> : <CameraIcon size={17} />}
            </button>
            <div
              className={`w-px h-4.5 ${
                isVideoOn ? (videoMenuOpen ? 'bg-[#ff7a1a]/40' : 'bg-white/[0.10]') : 'bg-white/20'
              }`}
            />
            {/* Up-Arrow Trigger & Popover Anchor */}
            <div className={`relative ${videoMenuOpen ? 'z-50' : ''}`}>
              <button
                type="button"
                data-media-menu-toggle="video"
                onClick={() => {
                  setVideoMenuOpen((prev) => !prev);
                  setAudioMenuOpen(false);
                }}
                className={`h-10 px-2 rounded-r-xl flex items-center justify-center hover:bg-white/[0.08] transition-all cursor-pointer ${
                  videoMenuOpen ? 'bg-white/[0.12] text-[#ff7a1a]' : 'text-[#888e90] hover:text-[#fcfdff]'
                }`}
                title="Camera Settings"
              >
                <ChevronUpIcon
                  size={14}
                  className={`transition-transform duration-200 pointer-events-none ${
                    videoMenuOpen ? 'rotate-180 text-[#ff7a1a]' : ''
                  }`}
                />
              </button>

              <MediaDeviceMenu
                isOpen={videoMenuOpen}
                onClose={() => setVideoMenuOpen(false)}
                type="video"
                videoInputs={mediaDevices.videoInputs}
                selectedVideoInputId={mediaDevices.selectedVideoInputId}
                onSelectVideoInput={mediaDevices.setSelectedVideoInputId}
                onRequestPermissions={() => mediaDevices.requestPermissions(false, true)}
              />
            </div>
          </div>

          <button
            onClick={handleToggleScreenShare}
            disabled={!isScreenShareAllowed && !isScreenSharing}
            className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              !isScreenShareAllowed && !isScreenSharing
                ? 'opacity-40 cursor-not-allowed bg-[#101012] text-[#888e90]'
                : isScreenSharing
                ? 'bg-gradient-to-r from-[#ff7a1a] to-[#ea580c] text-white shadow-[0_0_16px_rgba(255,122,26,0.45)]'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
            }`}
            title={
              !isScreenShareAllowed && !isScreenSharing
                ? 'Screen sharing disabled by host'
                : isScreenSharing
                ? 'Stop Sharing'
                : 'Share Screen'
            }
          >
            <MonitorIcon size={17} />
          </button>

          <button
            onClick={() => {
              setParticipantsOpen(!participantsOpen);
              if (!participantsOpen) setChatOpen(false);
            }}
            className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              participantsOpen
                ? 'bg-orange-500/20 text-[#ff7a1a] border border-orange-500/40 shadow-sm'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
            }`}
            title="People in space"
          >
            <UsersIcon size={17} />
            {participants.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#ff7a1a] text-black font-mono text-[9px] font-bold flex items-center justify-center shadow-lg">
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
                ? 'bg-orange-500/20 text-[#ff7a1a] border border-orange-500/40 shadow-sm'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
            }`}
            title="In-Call Messages"
          >
            <MessageSquareIcon size={17} />
            {unreadChatCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#ff7a1a] text-black font-mono text-[9px] font-bold flex items-center justify-center shadow-lg animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-white/[0.08] mx-1" />

          <button
            onClick={handleLeaveClick}
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
        onMuteUser={isHost ? handleRemoteMute : undefined}
        onKickUser={isHost ? handleKickUser : undefined}
        onTransferHost={isHost ? requestTransferHost : undefined}
      />

      {/* Transfer Host & Leave Modal */}
      <TransferHostModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        participants={participants}
        currentUserId={session?.user?.id}
        onConfirmTransferAndLeave={async (newHostUserId, newHostName) => {
          const ok = await handleTransferHost(newHostUserId, newHostName);
          if (ok) {
            setTransferModalOpen(false);
            await new Promise((r) => setTimeout(r, 150));
            await handleLeave();
          }
        }}
        onEndRoom={handleEndRoom}
        spaceType="meet"
      />

      {confirmModal && (
        <ConfirmDialog
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          variant={confirmModal.variant}
          alertOnly={confirmModal.alertOnly}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
    </div>
  );
}
