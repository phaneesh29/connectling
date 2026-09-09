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
  SearchIcon,
  ChevronUpIcon,
} from '@animateicons/react/lucide';
import { getSocket } from '@/lib/socket';
import { playJoinChime, playLeaveChime } from '@/lib/chime';
import { InRoomChat } from '@/components/in-room-chat';
import { InRoomParticipants } from '@/components/in-room-participants';
import { TransferHostModal } from '@/components/transfer-host-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { MediaDeviceMenu } from '@/components/media-device-menu';
import { AudioWaveform, AudioRipple, AudioTileBadge } from '@/components/audio-waveform';
import { useMediaDevices } from '@/hooks/use-media-devices';
import { useLocalAudioLevel } from '@/hooks/use-local-audio-level';
import { ReactionPicker } from '@/components/reactions/reaction-picker';
import { FloatingReactions } from '@/components/reactions/floating-reactions';
import { ReactionBadge } from '@/components/reactions/reaction-badge';
import { useRoomReactions } from '@/hooks/use-room-reactions';
import type { ChatMessage, RoomParticipant, RoomReaction } from '@/types/realtime';

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
  const [updatingKey, setUpdatingKey] = useState<'micForAll' | 'allowChat' | 'allowRaiseHand' | null>(null);
  const [grantedSpeaker, setGrantedSpeaker] = useState(false);
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
  const { floatingReactions, tileReactions, handleIncomingReaction } = useRoomReactions();

  const isHost = Boolean(room && session?.user && room.hostId === session.user.id);
  const isHostRef = useRef(isHost);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

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

    const handleExit = () => {
      try {
        const socket = getSocket();
        if (socket.connected) {
          socket.emit('room:leave', { roomCode: code });
          socket.disconnect();
        }
      } catch {}

      const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
      try {
        fetch(`${apiUrl}/api/v1/rooms/${roomCode}/leave`, {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
        });
      } catch {}
    };

    window.addEventListener('pagehide', handleExit);
    window.addEventListener('beforeunload', handleExit);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pagehide', handleExit);
      window.removeEventListener('beforeunload', handleExit);
    };
  }, [roomId, roomCode, code]);

  // Connect WebSocket and listen for in-room ephemeral messages
  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    socket.connect();

    socket.emit('room:join', {
      roomCode: code,
      isMuted: isMutedRef.current,
      handRaised: handRaisedRef.current,
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

    const handleHandRaised = ({
      userId,
      name,
      handRaised: isRaised,
    }: {
      userId: string;
      name: string;
      handRaised: boolean;
    }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, handRaised: isRaised } : p))
      );

      if (userId === currentUserIdRef.current) {
        setHandRaised(isRaised);
      }

      if (isHostRef.current && isRaised && userId !== currentUserIdRef.current) {
        playJoinChime();
        setRoomToast({ text: `${name} requested to speak`, type: 'join' });
        setTimeout(() => {
          setRoomToast((curr) => (curr?.text === `${name} requested to speak` ? null : curr));
        }, 4000);
      }
    };

    const handleMicGranted = ({ targetUserId }: { targetUserId: string; byUserId: string }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === targetUserId ? { ...p, canSpeak: true, handRaised: false } : p
        )
      );

      if (targetUserId === currentUserIdRef.current) {
        setGrantedSpeaker(true);
        setHandRaised(false);
        setIsMuted(false);
        const socket = getSocket();
        socket.emit('room:media-toggle', {
          roomCode: code,
          isMuted: false,
          handRaised: false,
        });
        playJoinChime();
        setRoomToast({
          text: 'Host granted you speaking access! Your mic is live.',
          type: 'join',
        });
        setTimeout(() => {
          setRoomToast((curr) =>
            curr?.text === 'Host granted you speaking access! Your mic is live.' ? null : curr
          );
        }, 4500);
      }
    };

    const handleMicRevoked = ({ targetUserId }: { targetUserId: string }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === targetUserId ? { ...p, canSpeak: false } : p))
      );

      if (targetUserId === currentUserIdRef.current) {
        setGrantedSpeaker(false);
        setIsMuted(true);
        const socket = getSocket();
        socket.emit('room:media-toggle', {
          roomCode: code,
          isMuted: true,
        });
        playLeaveChime();
        setRoomToast({ text: 'Host muted your microphone', type: 'leave' });
        setTimeout(() => {
          setRoomToast((curr) =>
            curr?.text === 'Host muted your microphone' ? null : curr
          );
        }, 3500);
      }
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
        !grantedSpeaker &&
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
        const socket = getSocket();
        socket.emit('room:raise-hand', {
          roomCode: code,
          handRaised: false,
        });
      }
    };

    const handleUserMuted = ({ targetUserId }: { targetUserId: string; byHost: boolean }) => {
      if (targetUserId === currentUserIdRef.current) {
        setIsMuted(true);
        const socket = getSocket();
        socket.emit('room:media-toggle', {
          roomCode: code,
          isMuted: true,
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
        title: 'Removed from Stage',
        description: message || 'You have been removed from the stage by the host.',
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
      setRoomToast({ text: `${targetName} was removed from the stage`, type: 'leave' });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text?.includes('was removed from the stage') ? null : curr));
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
        setRoomToast({ text: 'You are now the stage host!', type: 'join' });
        playJoinChime();
      } else {
        setRoomToast({ text: `${newHostName} is now the stage host`, type: 'join' });
      }
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text?.includes('stage host') ? null : curr));
      }, 4000);
    };

    socket.on('chat:new-message', handleNewMessage);
    socket.on('room:roster', handleRoster);
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);
    socket.on('room:settings-updated', handleSettingsUpdated);
    socket.on('room:hand-raised', handleHandRaised);
    socket.on('room:mic-granted', handleMicGranted);
    socket.on('room:mic-revoked', handleMicRevoked);
    socket.on('room:user-muted', handleUserMuted);
    socket.on('room:kicked', handleKicked);
    socket.on('room:user-kicked', handleUserKicked);
    socket.on('room:host-transferred', handleHostTransferred);
    socket.on('room:reaction', handleIncomingReaction);

    return () => {
      socket.off('chat:new-message', handleNewMessage);
      socket.off('room:roster', handleRoster);
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
      socket.off('room:settings-updated', handleSettingsUpdated);
      socket.off('room:hand-raised', handleHandRaised);
      socket.off('room:mic-granted', handleMicGranted);
      socket.off('room:mic-revoked', handleMicRevoked);
      socket.off('room:user-muted', handleUserMuted);
      socket.off('room:kicked', handleKicked);
      socket.off('room:user-kicked', handleUserKicked);
      socket.off('room:host-transferred', handleHostTransferred);
      socket.off('room:reaction', handleIncomingReaction);
      socket.emit('room:leave', { roomCode: code });
    };
  }, [roomId, code, grantedSpeaker, router, handleIncomingReaction]);

  const myRosterParticipant = participants.find((p) => p.userId === currentUserId);
  const isSpeaker =
    isHost ||
    participant?.role === 'speaker' ||
    settings?.micForAll ||
    grantedSpeaker ||
    Boolean(myRosterParticipant?.canSpeak);
  const isChatAllowed = settings?.allowChat !== false;
  const isRaiseHandAllowed = settings?.allowRaiseHand !== false;

  const isLocalMicActive = Boolean(room) && !isMuted && isSpeaker;
  const localAudio = useLocalAudioLevel({
    isEnabled: isLocalMicActive,
    deviceId: mediaDevices.selectedAudioInputId,
  });

  const handleSendMessage = (text: string) => {
    if (!isChatAllowed && !isHost) {
      setRoomToast({ text: 'Chat is disabled by the host', type: 'leave' });
      return;
    }
    const socket = getSocket();
    socket.emit('chat:message', { roomCode: code, text });
  };

  const handleSendReaction = (emoji: string) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('room:reaction', { roomCode: code, emoji });
    }
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

  const handleToggleHandRaise = () => {
    if (!isRaiseHandAllowed && !handRaised) {
      setRoomToast({ text: 'Mic requests are disabled by the host', type: 'leave' });
      return;
    }
    const next = !handRaised;
    setHandRaised(next);
    const socket = getSocket();
    socket.emit('room:raise-hand', {
      roomCode: code,
      handRaised: next,
    });
    setRoomToast({
      text: next ? 'Hand raised — waiting for host to unmute' : 'Hand lowered',
      type: next ? 'join' : 'leave',
    });
    setTimeout(() => {
      setRoomToast((curr) => (curr?.text?.startsWith('Hand') ? null : curr));
    }, 3000);
  };

  const handleGrantMic = (targetUserId: string, targetName: string) => {
    if (!isHost) return;
    const socket = getSocket();
    socket.emit('room:grant-mic', {
      roomCode: code,
      targetUserId,
    });
    setRoomToast({
      text: `Granted speaking access to ${targetName}`,
      type: 'join',
    });
    setTimeout(() => {
      setRoomToast((curr) =>
        curr?.text?.startsWith('Granted speaking access') ? null : curr
      );
    }, 3000);
  };

  const handleRevokeMic = (targetUserId: string, targetName: string) => {
    if (!isHost) return;
    const socket = getSocket();
    socket.emit('room:revoke-mic', {
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
      description: `Are you sure you want to remove ${targetName} from the stage? They will be disconnected immediately.`,
      confirmText: 'Remove Participant',
      variant: 'danger',
      onConfirm: () => {
        const socket = getSocket();
        socket.emit('room:kick-user', {
          roomCode: code,
          targetUserId,
        });
        setRoomToast({
          text: `Removed ${targetName} from stage`,
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
        text: `Made ${newHostName} the stage host`,
        type: 'join',
      });
      setTimeout(() => {
        setRoomToast((curr) => (curr?.text?.startsWith('Made ') ? null : curr));
      }, 3000);
      return true;
    } catch (err) {
      console.error('Failed to transfer stage host:', err);
      setRoomToast({ text: 'Failed to transfer stage host', type: 'leave' });
      return false;
    }
  };

  const requestTransferHost = (targetUserId: string, targetName: string) => {
    if (!isHost) return;
    setConfirmModal({
      isOpen: true,
      title: 'Make Stage Host?',
      description: `Transfer stage host permissions to ${targetName}? They will have full moderation controls over the audio space.`,
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
        title: 'End Audio Stage?',
        description: 'You are the only person on stage. Leaving will close this space. Leave and end stage now?',
        confirmText: 'Leave & End Stage',
        variant: 'danger',
        onConfirm: () => {
          setConfirmModal(null);
          void executeEndRoom();
        },
        onCancel: () => setConfirmModal(null),
      });
      return;
    }

    // Host has other participants -> Show transfer host dialog
    setTransferModalOpen(true);
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
      title: 'End Audio Stage for Everyone?',
      description: 'Are you sure you want to end this audio room for all listeners? All active connections will be disconnected and this space will be closed.',
      confirmText: 'End Audio Stage',
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal(null);
        void executeEndRoom();
      },
      onCancel: () => setConfirmModal(null),
    });
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

  const rawParticipants: RoomParticipant[] =
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

  const displayParticipants: RoomParticipant[] = Array.from(
    rawParticipants
      .reduce((map, p) => {
        if (!map.has(p.userId)) {
          map.set(p.userId, p);
        }
        return map;
      }, new Map<string, RoomParticipant>())
      .values()
  );

  const pendingHandRaisesCount = participants.filter(
    (p) => p.handRaised && p.userId !== room.hostId
  ).length;

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
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stage Settings (Host) or Permissions (Audience) */}
          {settings && (
            <button
              onClick={() => {
                setSettingsOpen(!settingsOpen);
                setParticipantsOpen(false);
                setChatOpen(false);
              }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isHost && pendingHandRaisesCount > 0
                  ? 'bg-[#ffc53d]/15 text-[#ffc53d] border-[#ffc53d]/40 shadow-[0_0_12px_rgba(255,197,61,0.2)]'
                  : settingsOpen
                  ? 'bg-amber-500/20 text-[#f59e0b] border-amber-500/40'
                  : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border-white/[0.08]'
              }`}
              title={isHost ? 'Stage Settings & Speaking Requests' : 'View Stage Permissions'}
            >
              {isHost ? (
                <SettingsIcon size={13} className={pendingHandRaisesCount > 0 ? 'text-[#f59e0b]' : 'text-zinc-400'} />
              ) : (
                <ShieldCheckIcon size={13} className="text-zinc-400" />
              )}
              <span className="hidden sm:inline font-mono text-[11px]">
                {isHost ? 'Settings' : 'Permissions'}
              </span>
              {isHost && pendingHandRaisesCount > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-[#ffc53d] text-black font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {pendingHandRaisesCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => {
              setParticipantsOpen(!participantsOpen);
              if (!participantsOpen) {
                setChatOpen(false);
                setSettingsOpen(false);
              }
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
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-[#888e90] uppercase tracking-wider">
              Stage Participants & Listeners
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#101012] border border-white/[0.06] text-[#f59e0b] font-medium">
              {displayParticipants.length} in space
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayParticipants.map((p) => {
            const isPHost = p.userId === room.hostId;
            const isMe = p.userId === session?.user?.id;
            const initial = p.name ? p.name.trim().charAt(0).toUpperCase() : 'U';
            const gradient = getStageTileGradient(p.userId, isPHost);
            const isMicActive = isMe ? isLocalMicActive : !p.isMuted;
            const isSpeaking = isMe
              ? isLocalMicActive && localAudio.isSpeaking
              : !p.isMuted;

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

                {/* Host Hover Action Buttons (Mute / Make Host / Kick) */}
                {isHost && !isPHost && (
                  <div className="absolute top-2.5 right-2.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1 z-30 transition-opacity">
                    {!p.isMuted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoteMute(p.userId, p.name);
                        }}
                        className="h-6 w-6 rounded-md bg-black/80 hover:bg-amber-500/20 text-amber-300 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer"
                        title={`Mute ${p.name}`}
                      >
                        <MicOffIcon size={10} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestTransferHost(p.userId, p.name);
                      }}
                      className="h-6 w-6 rounded-md bg-black/80 hover:bg-amber-500/20 text-[#888e90] hover:text-amber-300 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer"
                      title={`Make ${p.name} the stage host`}
                    >
                      <StarIcon size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKickUser(p.userId, p.name);
                      }}
                      className="h-6 w-6 rounded-md bg-black/80 hover:bg-red-500/20 text-[#888e90] hover:text-red-400 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer"
                      title={`Remove ${p.name} from stage`}
                    >
                      <LogOutIcon size={10} />
                    </button>
                  </div>
                )}

                <div className="relative z-10">
                  {/* Reaction Badge on Stage Tile */}
                  <ReactionBadge
                    emoji={tileReactions[p.userId]?.emoji}
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  />

                  <AudioRipple
                    isActive={isMicActive}
                    isSpeaking={isSpeaking}
                    size="md"
                  />
                  <div
                    className={`h-16 w-16 rounded-full bg-[#121216] border border-white/[0.10] flex items-center justify-center overflow-hidden shadow-lg transition-transform duration-200 group-hover:scale-[1.02] relative z-10 ${
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

                  {((isMe && handRaised) || p.handRaised) && (
                    <span
                      className="absolute -top-1 -left-1 h-6 w-6 rounded-full bg-[#ffc53d] text-black flex items-center justify-center animate-bounce shadow-lg ring-2 ring-amber-400/60 z-20"
                      title={`${p.name} requested to speak`}
                    >
                      <HandCoinsIcon size={12} />
                    </span>
                  )}

                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#101014] border border-white/[0.14] flex items-center justify-center z-10">
                    {isMe ? (
                      isMuted ? (
                        <MicOffIcon size={10} className="text-[#888e90]" />
                      ) : (
                        <MicIcon
                          size={10}
                          className={localAudio.isSpeaking ? 'text-[#11ff99]' : 'text-emerald-400/70'}
                        />
                      )
                    ) : p.isMuted ? (
                      <MicOffIcon size={10} className="text-[#888e90]" />
                    ) : (
                      <MicIcon size={10} className="text-[#11ff99]" />
                    )}
                  </span>
                </div>

                <div className="space-y-0.5 max-w-full px-1 relative z-10 w-full">
                  <p className="text-xs font-medium text-[#fcfdff] truncate">
                    {p.name}
                    {isMe && <span className="text-[#888e90]"> (You)</span>}
                  </p>
                  {isPHost ? (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-[#f59e0b] uppercase tracking-wider block font-semibold">
                        Stage Host
                      </span>
                      {isMicActive ? (
                        <div className="flex items-center justify-center gap-1.5 text-[#11ff99]">
                          <AudioWaveform
                            isActive={true}
                            size="xs"
                            barCount={3}
                            volume={isMe ? localAudio.volume : undefined}
                            frequencyBands={isMe ? localAudio.frequencyBands : undefined}
                          />
                          <span className="text-[9px] font-mono uppercase tracking-wider block font-semibold">
                            {isSpeaking ? 'Speaking' : 'Live'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-mono text-[#ff2047] uppercase tracking-wider block">
                          Muted
                        </span>
                      )}
                    </div>
                  ) : isMicActive ? (
                    <div className="flex items-center justify-center gap-1.5 text-[#11ff99]">
                      <AudioWaveform
                        isActive={true}
                        size="xs"
                        barCount={3}
                        volume={isMe ? localAudio.volume : undefined}
                        frequencyBands={isMe ? localAudio.frequencyBands : undefined}
                      />
                      <span className="text-[10px] font-mono uppercase tracking-wider block font-semibold">
                        {isSpeaking ? 'Speaking' : 'Speaker'}
                      </span>
                    </div>
                  ) : p.canSpeak || (isMe && (participant?.role === 'speaker' || grantedSpeaker)) ? (
                    <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-wider block font-medium">
                      Speaker (Muted)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-wider block">
                      Listener
                    </span>
                  )}

                  {/* Host Direct Unmute / Remote Mute / Speaker Controls on Participant Tile */}
                  {isHost && !isPHost && (
                    <div className="pt-2 flex justify-center w-full">
                      {p.handRaised ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGrantMic(p.userId, p.name);
                          }}
                          className="w-full py-1 px-2 rounded-lg bg-[#ffc53d] hover:bg-[#ffc53d]/90 text-black text-[11px] font-semibold flex items-center justify-center gap-1 shadow-[0_0_12px_rgba(255,197,61,0.5)] transition-all animate-pulse active:scale-95 cursor-pointer"
                          title="Unmute and allow participant to speak"
                        >
                          <MicIcon size={12} />
                          <span>Allow to Speak</span>
                        </button>
                      ) : !p.isMuted ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoteMute(p.userId, p.name);
                          }}
                          className="w-full py-0.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Mute participant"
                        >
                          <MicOffIcon size={11} />
                          <span>Mute</span>
                        </button>
                      ) : p.canSpeak ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevokeMic(p.userId, p.name);
                          }}
                          className="w-full py-0.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Revoke speaking access"
                        >
                          <MicOffIcon size={11} />
                          <span>Revoke Mic</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGrantMic(p.userId, p.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 w-full py-0.5 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.08] text-[10px] font-mono flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Invite participant to speak"
                        >
                          <MicIcon size={11} />
                          <span>Allow Mic</span>
                        </button>
                      )}
                    </div>
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
                <p className="text-[10px] font-mono text-[#888e90]">Share link to invite listeners</p>
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

      <footer className="relative z-40 h-20 border-t border-white/[0.06] px-4 sm:px-6 flex items-center justify-center bg-black/75 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4 p-1.5 bg-[#0a0a0c] border border-white/[0.12] rounded-xl shadow-2xl">
          {isSpeaker ? (
            <div
              className={`inline-flex items-center rounded-xl transition-all ${
                !isMuted
                  ? audioMenuOpen
                    ? 'bg-gradient-to-r from-[#f59e0b] to-[#ea580c] text-white ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-amber-400/40'
                    : 'bg-gradient-to-r from-[#f59e0b] to-[#ea580c] text-white shadow-[0_0_16px_rgba(245,158,11,0.4)] border border-amber-500/30'
                  : audioMenuOpen
                  ? 'bg-[#181820] text-[#fcfdff] border border-amber-500/50 ring-1 ring-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-[#121216] hover:bg-[#18181f] text-[#fcfdff] border border-white/[0.10] hover:border-white/[0.16] shadow-sm'
              }`}
            >
              <button
                type="button"
                onClick={handleToggleMic}
                className="h-10 px-3 rounded-l-xl flex items-center justify-center hover:bg-white/[0.06] transition-all cursor-pointer"
                title={!isMuted ? 'Mute microphone' : 'Unmute microphone'}
              >
                {!isMuted ? <MicIcon size={17} /> : <MicOffIcon size={17} />}
              </button>
              <div
                className={`w-px h-4.5 ${
                  !isMuted ? 'bg-white/25' : audioMenuOpen ? 'bg-amber-500/40' : 'bg-white/[0.10]'
                }`}
              />
              {/* Up-Arrow Trigger & Popover Anchor */}
              <div className={`relative ${audioMenuOpen ? 'z-50' : ''}`}>
                <button
                  type="button"
                  data-media-menu-toggle="audio"
                  onClick={() => setAudioMenuOpen((prev) => !prev)}
                  className={`h-10 px-2 rounded-r-xl flex items-center justify-center hover:bg-white/[0.08] transition-all cursor-pointer ${
                    audioMenuOpen ? 'bg-white/[0.12] text-amber-300' : 'text-[#888e90] hover:text-[#fcfdff]'
                  }`}
                  title="Audio & Speaker Settings"
                >
                  <ChevronUpIcon
                    size={14}
                    className={`transition-transform duration-200 pointer-events-none ${
                      audioMenuOpen ? 'rotate-180 text-amber-300' : ''
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
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleHandRaise}
                disabled={!isRaiseHandAllowed && !handRaised}
                className={`h-10 px-4 rounded-xl flex items-center gap-2 font-medium text-xs transition-all ${
                  !isRaiseHandAllowed && !handRaised
                    ? 'opacity-40 cursor-not-allowed bg-[#121216] text-[#888e90] border border-white/[0.06]'
                    : handRaised
                    ? 'bg-[#ffc53d] text-black shadow-[0_0_16px_rgba(255,197,61,0.4)] ring-2 ring-amber-400/50 animate-pulse font-semibold'
                    : 'bg-[#121216] hover:bg-[#18181f] text-[#fcfdff] border border-white/[0.10] hover:border-white/[0.16]'
                }`}
                title={
                  !isRaiseHandAllowed && !handRaised
                    ? 'Mic requests disabled by host'
                    : handRaised
                    ? 'Lower Hand (Cancel Request)'
                    : 'Request Mic to Speak'
                }
              >
                <HandCoinsIcon size={14} />
                <span>{handRaised ? 'Hand Raised' : 'Request Mic'}</span>
              </button>

              <div className={`relative ${audioMenuOpen ? 'z-50' : 'z-10'}`}>
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
                <button
                  type="button"
                  data-media-menu-toggle="audio"
                  onClick={() => setAudioMenuOpen((prev) => !prev)}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                    audioMenuOpen
                      ? 'bg-amber-500/20 text-[#f59e0b] border border-amber-500/40 ring-1 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'bg-[#121216] hover:bg-[#18181f] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.10] hover:border-white/[0.16]'
                  }`}
                  title="Audio & Speaker Settings"
                >
                  <HeadphonesIcon size={17} className="pointer-events-none" />
                </button>
              </div>
            </div>
          )}

          {/* Emoji Reactions Picker */}
          <ReactionPicker
            onSelectReaction={handleSendReaction}
            accentColor="amber"
          />

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

      {/* Stage Settings & Permissions Modal */}
      {settingsOpen && settings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#0a0a0e] border border-white/[0.12] rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden text-[#fcfdff] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top specular highlight line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  {isHost ? <SettingsIcon size={16} /> : <ShieldCheckIcon size={16} />}
                </div>
                <div>
                  <h3 className="font-serif-headline text-base font-medium tracking-tight text-[#fcfdff]">
                    {isHost ? 'Stage Settings & Controls' : 'Stage Permissions'}
                  </h3>
                  <p className="text-[11px] text-[#888e90] font-sans">
                    {isHost
                      ? 'Live microphone access & room policies'
                      : 'Current broadcast policies set by the host'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.06] transition-colors"
                aria-label="Close"
              >
                <XIcon size={15} />
              </button>
            </div>

            {/* Content for Host vs Audience */}
            {isHost ? (
              <div className="space-y-4">
                {/* Hand-raise queue section if someone requested to speak */}
                {pendingHandRaisesCount > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
                        <HandCoinsIcon size={13} className="animate-bounce" />
                        <span>Speaking Requests ({pendingHandRaisesCount})</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400/80">Pending</span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {participants
                        .filter((p) => p.handRaised && p.userId !== room.hostId)
                        .map((p) => (
                          <div
                            key={p.userId}
                            className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.06]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs flex items-center justify-center font-bold">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-[#fcfdff] truncate font-medium max-w-[140px]">
                                {p.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGrantMic(p.userId, p.name)}
                              className="px-2.5 py-1 rounded-md bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-semibold text-[11px] shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <MicIcon size={11} />
                              <span>Allow Mic</span>
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Stage Policies Quick Toggles */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#888e90] px-0.5">
                    Stage Policies
                  </div>

                  {/* Open Mic Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${settings.micForAll ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.04] text-zinc-400'}`}>
                        <MicIcon size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#fcfdff]">Open Microphone</div>
                        <div className="text-[11px] text-[#888e90]">
                          {settings.micForAll ? 'Everyone can speak freely' : 'Host & granted speakers only'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickToggle('micForAll')}
                      disabled={updatingKey === 'micForAll'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.micForAll ? 'bg-amber-500' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                          settings.micForAll ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Stage Chat Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${settings.allowChat ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.04] text-zinc-400'}`}>
                        <MessageSquareIcon size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#fcfdff]">In-Room Chat</div>
                        <div className="text-[11px] text-[#888e90]">
                          {settings.allowChat ? 'Participants can chat' : 'Chat is muted'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickToggle('allowChat')}
                      disabled={updatingKey === 'allowChat'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.allowChat ? 'bg-amber-500' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                          settings.allowChat ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Raise Hand Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${settings.allowRaiseHand ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.04] text-zinc-400'}`}>
                        <HandCoinsIcon size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#fcfdff]">Audience Mic Requests</div>
                        <div className="text-[11px] text-[#888e90]">
                          {settings.allowRaiseHand ? 'Listeners can raise hand' : 'Requests disabled'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickToggle('allowRaiseHand')}
                      disabled={updatingKey === 'allowRaiseHand'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.allowRaiseHand ? 'bg-amber-500' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                          settings.allowRaiseHand ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-2 border-t border-white/[0.06] text-xs">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-[#fcfdff] transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Non-Host / Audience View */
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className={`p-2 rounded-lg ${isSpeaker ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-zinc-400'}`}>
                      {isSpeaker ? <MicIcon size={14} /> : <MicOffIcon size={14} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#fcfdff]">Microphone Access</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isSpeaker
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/[0.05] text-[#888e90]'
                        }`}>
                          {isSpeaker ? 'Speaking Allowed' : 'Muted by Host'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#888e90] mt-1">
                        {isSpeaker
                          ? 'You have permission to unmute and speak on stage.'
                          : settings.allowRaiseHand
                          ? 'You can click "Request Mic" in the bottom controls to request speaking.'
                          : 'Microphone is restricted by the stage host.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className={`p-2 rounded-lg ${isChatAllowed ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.04] text-zinc-400'}`}>
                      <MessageSquareIcon size={14} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#fcfdff]">Stage Chat</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isChatAllowed
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-white/[0.05] text-[#888e90]'
                        }`}>
                          {isChatAllowed ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#888e90] mt-1">
                        {isChatAllowed
                          ? 'All participants can send text messages in stage chat.'
                          : 'Host has temporarily disabled in-room stage chat.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className={`p-2 rounded-lg ${settings.allowRaiseHand ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.04] text-zinc-400'}`}>
                      <HandCoinsIcon size={14} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#fcfdff]">Speaking Requests</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          settings.allowRaiseHand
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-white/[0.05] text-[#888e90]'
                        }`}>
                          {settings.allowRaiseHand ? 'Allowed' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#888e90] mt-1">
                        {settings.allowRaiseHand
                          ? 'Audience members may raise hands to ask to speak.'
                          : 'Audience hand-raising is currently turned off by the host.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs font-medium text-[#fcfdff] transition-colors cursor-pointer"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
        spaceType="audio"
      />

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
        onGrantMic={isHost ? handleGrantMic : undefined}
        onRevokeMic={isHost ? handleRevokeMic : undefined}
        onMuteUser={isHost ? handleRemoteMute : undefined}
        onKickUser={isHost ? handleKickUser : undefined}
        onTransferHost={isHost ? requestTransferHost : undefined}
        localVolume={localAudio.volume}
        localFrequencyBands={localAudio.frequencyBands}
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

      {/* Floating Reactions Stream */}
      <FloatingReactions reactions={floatingReactions} />
    </div>
  );
}
