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
import { Maximize2, Minimize2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { playJoinChime, playLeaveChime } from '@/lib/chime';
import { InRoomChat } from '@/components/in-room-chat';
import { InRoomParticipants } from '@/components/in-room-participants';
import { TransferHostModal } from '@/components/transfer-host-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { MediaDeviceMenu } from '@/components/media-device-menu';
import { AudioWaveform, AudioRipple } from '@/components/audio-waveform';
import { useMediaDevices } from '@/hooks/use-media-devices';
import { useLocalAudioLevel } from '@/hooks/use-local-audio-level';
import { useWebRTC } from '@/hooks/use-webrtc';
import { LocalVideo, RemoteVideo, RemoteAudio } from '@/components/webrtc-media';
import { ReactionPicker } from '@/components/reactions/reaction-picker';
import { FloatingReactions } from '@/components/reactions/floating-reactions';
import { ReactionBadge } from '@/components/reactions/reaction-badge';
import { useRoomReactions } from '@/hooks/use-room-reactions';
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
  const [passcodeRequired, setPasscodeRequired] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [joining, setJoining] = useState(false);

  const [room, setRoom] = useState<RoomData | null>(null);
  const [settings, setSettings] = useState<RoomSettingsData | null>(null);
  const [, setParticipant] = useState<ParticipantData | null>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [filmstripCollapsed, setFilmstripCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [isRoomEnded, setIsRoomEnded] = useState(false);

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
  const { floatingReactions, tileReactions, handleIncomingReaction } = useRoomReactions();
  const handleIncomingReactionRef = useRef(handleIncomingReaction);
  useEffect(() => {
    handleIncomingReactionRef.current = handleIncomingReaction;
  }, [handleIncomingReaction]);

  const chatOpenRef = useRef(chatOpen);
  const isMicOnRef = useRef(isMicOn);
  const isVideoOnRef = useRef(isVideoOn);
  const [handRaised, setHandRaised] = useState(false);
  const handRaisedRef = useRef(handRaised);
  const joinedCodeRef = useRef<string | null>(null);
  const knownParticipantsRef = useRef<Set<string>>(new Set());
  const currentUserId = session?.user?.id;
  const currentUserIdRef = useRef(currentUserId);
  const webrtcRef = useRef<ReturnType<typeof useWebRTC> | null>(null);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
    isVideoOnRef.current = isVideoOn;
  }, [isMicOn, isVideoOn]);

  useEffect(() => {
    handRaisedRef.current = handRaised;
  }, [handRaised]);

  const roomHostId = room?.hostId;
  const roomHostIdRef = useRef(roomHostId);

  useEffect(() => {
    roomHostIdRef.current = roomHostId;
  }, [roomHostId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      const doc = document as unknown as {
        fullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        exitFullscreen?: () => Promise<void>;
        webkitExitFullscreen?: () => void;
        documentElement: HTMLElement & {
          requestFullscreen?: () => Promise<void>;
          webkitRequestFullscreen?: () => void;
        };
      };

      const isFs = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);

      if (isFs) {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        }
      } else {
        const root = doc.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if (root.webkitRequestFullscreen) {
          root.webkitRequestFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

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
          if (res.data.room.type === 'audio') {
            router.replace(`/talk/${codeToJoin}`);
            return;
          }
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
    [router]
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
            if (res.data.room.type === 'audio') {
              router.replace(`/talk/${code}`);
              return;
            }
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
      joinedCodeRef.current = null;
    };
  }, [currentUserId, code, router]);

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

    const handleExit = () => {
      try {
        webrtcRef.current?.stopMediaTracks();
      } catch {}
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
      isMuted: !isMicOnRef.current,
      isVideoOn: isVideoOnRef.current,
      isScreenSharing: false,
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
      setIsRoomEnded(true);
      webrtcRef.current?.stopMediaTracks();
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

    let roomEndedTimer: NodeJS.Timeout | null = null;

    const handleRoomEnded = ({ message }: { message?: string }) => {
      setIsRoomEnded(true);
      webrtcRef.current?.stopMediaTracks();
      playLeaveChime();
      setConfirmModal({
        isOpen: true,
        title: 'Meeting Ended',
        description: `${message || 'The host has ended this meeting for all participants.'} Returning to home...`,
        confirmText: 'Return to Home Now',
        variant: 'danger',
        alertOnly: true,
        onConfirm: () => {
          if (roomEndedTimer) clearTimeout(roomEndedTimer);
          setConfirmModal(null);
          router.push('/');
        },
      });

      roomEndedTimer = setTimeout(() => {
        setConfirmModal(null);
        router.push('/');
      }, 3000);
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

    const handleHandRaised = ({
      userId,
      name,
      handRaised: isRaised,
    }: {
      userId: string;
      name: string;
      handRaised: boolean;
    }) => {
      if (isRaised) {
        setRoomToast({ text: `${name} raised their hand ✋`, type: 'join' });
        setTimeout(() => {
          setRoomToast((curr) => (curr?.text?.includes('raised their hand') ? null : curr));
        }, 3500);
      }
      setParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, handRaised: isRaised } : p))
      );
    };

    const onReaction = (data: Parameters<typeof handleIncomingReaction>[0]) => {
      handleIncomingReactionRef.current(data);
    };

    const handleUnmuteRequested = ({
      targetUserId,
      hostName,
    }: {
      targetUserId: string;
      hostName: string;
    }) => {
      if (targetUserId === currentUserIdRef.current) {
        playJoinChime();
        setConfirmModal({
          isOpen: true,
          title: 'Host Asked You to Unmute',
          description: `${hostName || 'The host'} has asked you to unmute your microphone. Would you like to turn your microphone on?`,
          confirmText: 'Unmute Mic',
          cancelText: 'Stay Muted',
          variant: 'primary',
          onConfirm: () => {
            setConfirmModal(null);
            setIsMicOn(true);
            const socket = getSocket();
            socket.emit('room:media-toggle', {
              roomCode: code,
              isMuted: false,
              isVideoOn: isVideoOnRef.current,
            });
            setRoomToast({ text: 'Microphone unmuted', type: 'join' });
            setTimeout(() => {
              setRoomToast((curr) => (curr?.text === 'Microphone unmuted' ? null : curr));
            }, 3000);
          },
          onCancel: () => {
            setConfirmModal(null);
          },
        });
      }
    };

    socket.on('chat:new-message', handleNewMessage);
    socket.on('room:roster', handleRoster);
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);
    socket.on('room:settings-updated', handleSettingsUpdated);
    socket.on('room:user-muted', handleUserMuted);
    socket.on('room:unmute-requested', handleUnmuteRequested);
    socket.on('room:kicked', handleKicked);
    socket.on('room:user-kicked', handleUserKicked);
    socket.on('room:host-transferred', handleHostTransferred);
    socket.on('room:reaction', onReaction);
    socket.on('room:hand-raised', handleHandRaised);
    socket.on('room:ended', handleRoomEnded);

    return () => {
      socket.off('chat:new-message', handleNewMessage);
      socket.off('room:roster', handleRoster);
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
      socket.off('room:settings-updated', handleSettingsUpdated);
      socket.off('room:user-muted', handleUserMuted);
      socket.off('room:unmute-requested', handleUnmuteRequested);
      socket.off('room:kicked', handleKicked);
      socket.off('room:user-kicked', handleUserKicked);
      socket.off('room:host-transferred', handleHostTransferred);
      socket.off('room:reaction', onReaction);
      socket.off('room:hand-raised', handleHandRaised);
      socket.off('room:ended', handleRoomEnded);
      if (roomEndedTimer) clearTimeout(roomEndedTimer);
      socket.emit('room:leave', { roomCode: code });
    };
  }, [roomId, code, router]);

  const isHost = Boolean(room && session?.user && room.hostId === session.user.id);
  const isMicAllowed = isHost || settings?.micForAll !== false;
  const isVideoAllowed = isHost || settings?.videoForAll !== false;
  const isScreenShareAllowed = isHost || settings?.screenShareForAll !== false;
  const isChatAllowed = settings?.allowChat !== false;
  const isRaiseHandAllowed = isHost || settings?.allowRaiseHand !== false;

  const isInRoom = Boolean(room) && !passcodeRequired && !isRoomEnded;

  const webrtc = useWebRTC({
    roomCode: code,
    currentUserId: session?.user?.id,
    enabled: isInRoom && Boolean(session?.user?.id),
    mediaType: 'meet',
    isMicOn: isMicOn && isMicAllowed,
    isVideoOn: isVideoOn && isVideoAllowed,
    isScreenSharing,
    selectedAudioInputId: mediaDevices.selectedAudioInputId,
    selectedAudioOutputId: mediaDevices.selectedAudioOutputId,
    selectedVideoInputId: mediaDevices.selectedVideoInputId,
    onScreenShareEnded: () => {
      setIsScreenSharing(false);
      setRoomToast({ text: 'Screen sharing ended', type: 'leave' });
    },
    onError: (msg) => {
      setRoomToast({ text: msg, type: 'leave' });
    },
  });

  useEffect(() => {
    webrtcRef.current = webrtc;
  }, [webrtc]);

  // Ensure camera, mic, and screen share are stopped when component unmounts
  useEffect(() => {
    return () => {
      webrtcRef.current?.stopMediaTracks();
    };
  }, []);

  const localAudio = useLocalAudioLevel({
    isEnabled: isInRoom && isMicOn && isMicAllowed,
    deviceId: mediaDevices.selectedAudioInputId,
    stream: webrtc.localStream,
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

  const handleToggleHandRaise = () => {
    if (!isRaiseHandAllowed && !handRaised) {
      setRoomToast({ text: 'Hand raise disabled by the host', type: 'leave' });
      return;
    }
    const next = !handRaised;
    setHandRaised(next);
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('room:raise-hand', { roomCode: code, handRaised: next });
    }
    setRoomToast({
      text: next ? 'Hand raised ✋ (showing presence)' : 'Hand lowered',
      type: next ? 'join' : 'leave',
    });
    setTimeout(() => {
      setRoomToast((curr) => (curr?.text?.includes('Hand') ? null : curr));
    }, 2500);
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

  // Broadcast screen sharing state changes to room roster
  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('room:media-toggle', {
        roomCode: code,
        isMuted: !isMicOn,
        isVideoOn,
        isScreenSharing,
        handRaised,
      });
    }
  }, [roomId, code, isScreenSharing, isMicOn, isVideoOn, handRaised]);

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

  const handleRequestUnmute = (targetUserId: string, targetName: string) => {
    if (!isHost) return;
    const socket = getSocket();
    socket.emit('room:request-unmute', {
      roomCode: code,
      targetUserId,
    });
    setRoomToast({
      text: `Asked ${targetName} to unmute`,
      type: 'join',
    });
    setTimeout(() => {
      setRoomToast((curr) => (curr?.text?.startsWith('Asked ') ? null : curr));
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
    setIsRoomEnded(true);
    webrtcRef.current?.stopMediaTracks();
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
    setIsRoomEnded(true);
    webrtcRef.current?.stopMediaTracks();
    try {
      await roomsApi.endRoom(room.code);
      router.push('/');
    } catch (err) {
      console.error('End room error:', err);
      setEnding(false);
      setIsRoomEnded(false);
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
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-brand-br opacity-20 blur-3xl pointer-events-none" />
          <div className="h-12 w-12 rounded-xl bg-[#101012] border border-white/[0.10] text-[#FF9933] flex items-center justify-center mx-auto shadow-inner">
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
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold bg-gradient-brand-r hover:brightness-105 text-black rounded-lg transition-all shadow-brand-glow disabled:opacity-50 cursor-pointer"
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
  const isLocalVideoLive = Boolean((isVideoOn || isScreenSharing) && webrtc.localStream);

  // Presenter detection for Google Meet style focused screen share
  const remotePresenter = otherParticipants.find((p) => p.isScreenSharing);
  const isAnyoneScreenSharing = Boolean(isScreenSharing || remotePresenter);

  const renderLocalTile = (isCompact: boolean) => {
    const isPresenting = isScreenSharing;
    const showVideo = isLocalVideoLive && !isPresenting;

    return (
      <div
        key="local-tile"
        className={`relative bg-[#0a0a0c] overflow-hidden flex items-center justify-center shadow-2xl group transition-all duration-300 ${
          isCompact
            ? 'rounded-xl aspect-video w-40 sm:w-44 lg:w-full min-h-[90px] lg:min-h-[105px] shrink-0'
            : 'rounded-2xl min-h-[220px] w-full h-full'
        } ${
          isMicOn && localAudio.isSpeaking
            ? 'border border-[#11ff99]/50 ring-2 ring-[#11ff99]/40 shadow-[0_0_35px_rgba(17,255,153,0.18)]'
            : isMicOn
            ? 'border border-[#11ff99]/25 ring-1 ring-[#11ff99]/15'
            : 'border border-white/[0.12]'
        }`}
      >
        {/* Hand Raised Badge on Local Tile */}
        {handRaised && (
          <div className="absolute top-2.5 left-2.5 bg-[#0e0c0a]/90 border border-[#FF9933]/50 text-[#FF9933] rounded-full px-2 py-0.5 text-xs font-bold flex items-center gap-1 shadow-[0_0_16px_rgba(255,153,51,0.3)] ring-1 ring-[#FF9933]/40 z-30 animate-bounce">
            <span className="text-xs">✋</span>
            {!isCompact && (
              <span className="text-[10px] font-mono tracking-wider uppercase font-extrabold hidden sm:inline">Hand Raised</span>
            )}
          </div>
        )}

        {/* Reaction Badge on Local Tile */}
        <ReactionBadge
          emoji={tileReactions[session?.user?.id || '']?.emoji}
          className="absolute top-2.5 right-2.5"
        />

        {/* Live WebRTC Local Video Preview */}
        <LocalVideo
          stream={webrtc.localStream}
          isActive={showVideo}
          isMirrored={isVideoOn && !isScreenSharing}
        />

        {showVideo ? (
          <div className="w-full h-full relative z-10 flex flex-col justify-between p-3 pointer-events-none">
            <div className="flex items-center justify-between">
              <div />
              {isHost && (
                <span
                  className="h-4.5 w-4.5 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300/90 pointer-events-auto"
                  title="Meeting Host (You)"
                >
                  <StarIcon size={10} className="fill-black/30" />
                </span>
              )}
            </div>
            <div />
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center gap-2 z-10">
            <div className="relative">
              <AudioRipple isActive={isMicOn} isSpeaking={localAudio.isSpeaking} size={isCompact ? 'sm' : 'md'} />
              <div
                className={`${
                  isCompact ? 'h-10 w-10 text-xs' : 'h-14 w-14'
                } rounded-full bg-[#101012] border border-white/[0.08] text-[#888e90] flex items-center justify-center relative z-10 transition-all ${
                  isMicOn && localAudio.isSpeaking ? 'ring-2 ring-emerald-400/90 text-emerald-300' : ''
                }`}
              >
                {session?.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={isCompact ? 40 : 56}
                    height={isCompact ? 40 : 56}
                    unoptimized
                    referrerPolicy="no-referrer"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <CameraIcon size={isCompact ? 16 : 20} />
                )}
              </div>
              {isHost && (
                <span
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300/90 z-30"
                  title="Meeting Host (You)"
                >
                  <StarIcon size={9} className="fill-black/30" />
                </span>
              )}
            </div>
            {isPresenting ? (
              <p className="text-[10px] font-mono text-[#ff7a1a] font-medium flex items-center gap-1">
                <MonitorIcon size={11} />
                <span>Presenting</span>
              </p>
            ) : isMicOn ? (
              <p className="text-[10px] font-mono text-[#11ff99] relative z-10 font-medium flex items-center gap-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full bg-[#11ff99] ${
                    localAudio.isSpeaking ? 'animate-ping' : 'opacity-70'
                  }`}
                />
                <span>{localAudio.isSpeaking ? 'Speaking' : 'Mic active'}</span>
              </p>
            ) : (
              <p className="text-[10px] font-mono text-[#888e90] relative z-10">Camera muted</p>
            )}
          </div>
        )}

        {/* Bottom Name & Mic Badge */}
        <div
          className={`absolute bottom-2.5 left-2.5 bg-[#0a0a0c]/85 backdrop-blur-md ${
            isCompact ? 'px-2 py-1' : 'px-3 py-1.5'
          } rounded-full text-xs font-medium flex items-center gap-1.5 text-[#fcfdff] border transition-all duration-200 z-20 shadow-lg ${
            isMicOn && localAudio.isSpeaking
              ? 'border-[#11ff99]/40 ring-1 ring-[#11ff99]/30'
              : 'border-white/[0.10]'
          }`}
        >
          {isMicOn ? (
            <div className="flex items-center gap-1">
              <MicIcon
                size={11}
                className={localAudio.isSpeaking ? 'text-[#11ff99]' : 'text-emerald-400/70'}
              />
              {!isCompact && (
                <AudioWaveform
                  isActive={isMicOn}
                  size="xs"
                  barCount={3}
                  volume={localAudio.volume}
                  frequencyBands={localAudio.frequencyBands}
                />
              )}
            </div>
          ) : (
            <MicOffIcon size={11} className="text-[#ff2047]" />
          )}
          <span className="text-[11px] truncate max-w-[90px] sm:max-w-[120px]">{session?.user.name}</span>
          {isHost && (
            <span className="text-[8px] font-mono bg-white/10 text-[#fcfdff] px-1 py-0.2 rounded uppercase tracking-wider font-semibold">
              HOST
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderParticipantTile = (p: RoomParticipant, isCompact: boolean) => {
    const isOtherHost = p.userId === room.hostId;
    const initial = p.name ? p.name.trim().charAt(0).toUpperCase() : 'U';
    const remoteStream = webrtc.remoteStreams.get(p.userId);
    const hasRemoteVideoTrack = Boolean(
      remoteStream &&
        remoteStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)
    );
    const isThisPresenter = Boolean(p.isScreenSharing);
    const isVideoActive = Boolean(
      !isCompact && p.isScreenSharing ? true : (p.isVideoOn ?? true) && hasRemoteVideoTrack && (!isCompact || !isThisPresenter)
    );
    const remoteAudio = webrtc.remoteAudioLevels[p.userId];
    const isSpeaking = remoteAudio ? remoteAudio.isSpeaking : !p.isMuted;

    return (
      <div
        key={p.userId}
        className={`relative bg-[#0a0a0c] overflow-hidden flex items-center justify-center shadow-2xl group transition-all duration-300 ${
          isCompact
            ? 'rounded-xl aspect-video w-40 sm:w-44 lg:w-full min-h-[90px] lg:min-h-[105px] shrink-0'
            : 'rounded-2xl min-h-[220px] w-full h-full'
        } ${
          isSpeaking
            ? 'border border-[#11ff99]/40 ring-1 ring-[#11ff99]/30 shadow-[0_0_30px_rgba(17,255,153,0.12)]'
            : 'border border-white/[0.12]'
        }`}
      >
        {/* Live WebRTC Remote Video */}
        <RemoteVideo
          stream={remoteStream}
          isVideoActive={isVideoActive}
          audioOutputId={mediaDevices.selectedAudioOutputId}
        />

        {/* Hand Raised & Reaction Badges on Other Participant Tile */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-30">
          {p.handRaised && (
            <div className="bg-[#0e0c0a]/90 border border-[#FF9933]/50 text-[#FF9933] rounded-full px-2 py-0.5 text-xs font-bold flex items-center gap-1 shadow-[0_0_16px_rgba(255,153,51,0.3)] ring-1 ring-[#FF9933]/40 animate-bounce">
              <span className="text-xs">✋</span>
              {!isCompact && (
                <span className="text-[10px] font-mono tracking-wider uppercase font-extrabold hidden sm:inline">Hand Raised</span>
              )}
            </div>
          )}
          <ReactionBadge emoji={tileReactions[p.userId]?.emoji} />
        </div>

        {isVideoActive ? (
          <div className="w-full h-full relative z-10 flex flex-col justify-between p-3 pointer-events-none">
            <div className="flex items-center justify-between">
              <div />
              {isOtherHost && (
                <span
                  className="h-4.5 w-4.5 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300/90 pointer-events-auto"
                  title="Meeting Host"
                >
                  <StarIcon size={10} className="fill-black/30" />
                </span>
              )}
            </div>
            {!isCompact && p.isScreenSharing && (
              <div className="self-center bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono text-[#11ff99] flex items-center gap-1.5 shadow-lg pointer-events-auto">
                <MonitorIcon size={11} />
                <span>{p.name?.split(' ')[0] || 'User'} is presenting</span>
              </div>
            )}
            <div />
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center gap-2 z-10">
            <div className="relative">
              <AudioRipple isActive={isSpeaking} size={isCompact ? 'sm' : 'md'} />
              <div
                className={`${
                  isCompact ? 'h-10 w-10 text-xs' : 'h-14 w-14'
                } rounded-full bg-[#101012] border border-white/[0.08] text-[#888e90] flex items-center justify-center relative z-10 transition-all ${
                  isSpeaking ? 'ring-2 ring-emerald-400/80 text-emerald-300' : ''
                }`}
              >
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name || 'Participant'}
                    width={isCompact ? 40 : 56}
                    height={isCompact ? 40 : 56}
                    unoptimized
                    referrerPolicy="no-referrer"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className={`font-serif ${isCompact ? 'text-sm' : 'text-xl'} text-[#fcfdff]`}>{initial}</span>
                )}
              </div>
              {isOtherHost && (
                <span
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300/90 z-30"
                  title="Meeting Host"
                >
                  <StarIcon size={9} className="fill-black/30" />
                </span>
              )}
            </div>
            {isThisPresenter ? (
              <p className="text-[10px] font-mono text-[#ff7a1a] font-medium flex items-center gap-1">
                <MonitorIcon size={11} />
                <span>Presenting</span>
              </p>
            ) : isSpeaking ? (
              <p className="text-[10px] font-mono text-[#11ff99] relative z-10 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99] opacity-80" />
                <span>Speaking</span>
              </p>
            ) : (
              <p className="text-[10px] font-mono text-[#888e90] relative z-10">Camera muted</p>
            )}
          </div>
        )}

        {/* Host Moderation Controls on Video Card */}
        {isHost && !isOtherHost && (
          <div
            className={`absolute ${
              isCompact ? 'top-1.5 right-1.5 gap-1' : 'top-3 right-3 gap-1.5'
            } opacity-80 sm:opacity-0 sm:group-hover:opacity-100 flex items-center z-30 transition-opacity`}
          >
            {p.isMuted ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRequestUnmute(p.userId, p.name);
                }}
                className={`${
                  isCompact ? 'h-6 w-6 rounded-md' : 'h-7 w-7 rounded-lg'
                } bg-black/80 hover:bg-emerald-500/20 text-emerald-300 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer shadow-md`}
                title={`Ask ${p.name} to unmute`}
              >
                <MicIcon size={isCompact ? 10 : 12} />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoteMute(p.userId, p.name);
                }}
                className={`${
                  isCompact ? 'h-6 w-6 rounded-md' : 'h-7 w-7 rounded-lg'
                } bg-black/80 hover:bg-amber-500/20 text-amber-300 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer shadow-md`}
                title={`Mute ${p.name}`}
              >
                <MicOffIcon size={isCompact ? 10 : 12} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                requestTransferHost(p.userId, p.name);
              }}
              className={`${
                isCompact ? 'h-6 w-6 rounded-md' : 'h-7 w-7 rounded-lg'
              } bg-black/80 hover:bg-amber-500/20 text-[#888e90] hover:text-amber-300 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer shadow-md`}
              title={`Make ${p.name} the host`}
            >
              <StarIcon size={isCompact ? 10 : 12} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleKickUser(p.userId, p.name);
              }}
              className={`${
                isCompact ? 'h-6 w-6 rounded-md' : 'h-7 w-7 rounded-lg'
              } bg-black/80 hover:bg-red-500/20 text-[#888e90] hover:text-red-400 border border-white/[0.10] flex items-center justify-center transition-all cursor-pointer shadow-md`}
              title={`Remove ${p.name} from space`}
            >
              <LogOutIcon size={isCompact ? 10 : 12} />
            </button>
          </div>
        )}

        {/* Bottom Name & Mic Badge */}
        <div
          className={`absolute bottom-2.5 left-2.5 bg-[#0a0a0c]/85 backdrop-blur-md ${
            isCompact ? 'px-2 py-1' : 'px-3 py-1.5'
          } rounded-full text-xs font-medium flex items-center gap-1.5 text-[#fcfdff] border transition-all duration-200 z-20 shadow-lg ${
            isSpeaking
              ? 'border-[#11ff99]/40 ring-1 ring-[#11ff99]/30'
              : 'border-white/[0.10]'
          }`}
        >
          {isSpeaking ? (
            <div className="flex items-center gap-1">
              <MicIcon size={11} className="text-[#11ff99]" />
              {!isCompact && (
                <span className="flex items-center gap-0.5">
                  <span className="w-0.5 h-2 bg-[#11ff99] rounded-full animate-pulse" />
                  <span className="w-0.5 h-3 bg-[#11ff99] rounded-full animate-pulse delay-75" />
                  <span className="w-0.5 h-1.5 bg-[#11ff99] rounded-full animate-pulse delay-150" />
                </span>
              )}
            </div>
          ) : (
            <MicOffIcon size={11} className="text-[#ff2047]" />
          )}
          <span className="text-[11px] truncate max-w-[90px] sm:max-w-[120px]">{p.name}</span>
          {isOtherHost && (
            <span className="text-[8px] font-mono bg-white/10 text-[#fcfdff] px-1 py-0.2 rounded uppercase tracking-wider font-semibold">
              HOST
            </span>
          )}
        </div>
      </div>
    );
  };

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

      <main
        className={`flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center ${
          isAnyoneScreenSharing ? 'p-1.5 sm:p-2.5' : 'p-3 sm:p-5'
        }`}
      >
        {isAnyoneScreenSharing ? (
          <div className="w-full h-full min-h-0 flex flex-col lg:flex-row gap-2 sm:gap-3 items-stretch">
            {/* Big Spotlight Presentation Stage (Google Meet style) */}
            <div
              className="flex-1 min-h-0 min-w-0 w-full h-full bg-[#050508] rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/[0.14] shadow-2xl group"
            >
              {isScreenSharing ? (
                <LocalVideo
                  stream={webrtc.localStream}
                  isActive={true}
                  isMirrored={false}
                  className="w-full h-full object-contain absolute inset-0 z-0 bg-[#050508]"
                />
              ) : remotePresenter ? (
                <RemoteVideo
                  stream={webrtc.remoteStreams.get(remotePresenter.userId)}
                  isVideoActive={true}
                  className="w-full h-full object-contain absolute inset-0 z-0 bg-[#050508]"
                />
              ) : null}

              {/* Top Presentation Bar: Unified Header for Presenter Info & Controls */}
              <div className="absolute top-2.5 sm:top-3.5 inset-x-2.5 sm:inset-x-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
                {/* Left: Presenter Status Pill */}
                <div className="flex items-center gap-2 bg-[#0a0a0c]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/[0.12] shadow-xl text-xs font-medium text-[#fcfdff] pointer-events-auto min-w-0 max-w-[55%] sm:max-w-none">
                  <span className="h-2 w-2 rounded-full bg-[#11ff99] animate-pulse shrink-0" />
                  <MonitorIcon size={14} className="text-[#ff7a1a] shrink-0" />
                  <span className="font-mono text-[11px] font-semibold tracking-wide truncate">
                    {isScreenSharing ? 'You are presenting' : `${remotePresenter?.name || 'Participant'} is presenting`}
                  </span>
                </div>

                {/* Right: Controls (Tiles toggle, Fullscreen, Stop) */}
                <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
                  {/* Toggle Filmstrip Tiles */}
                  <button
                    type="button"
                    onClick={() => setFilmstripCollapsed(!filmstripCollapsed)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0a0a0c]/85 hover:bg-[#141418] text-[#fcfdff] border border-white/[0.14] text-xs font-medium transition-colors shadow-xl active:scale-95 cursor-pointer backdrop-blur-md"
                    title={filmstripCollapsed ? 'Show participant tiles' : 'Hide participant tiles'}
                  >
                    {filmstripCollapsed ? (
                      <>
                        <UsersIcon size={13} className="text-[#ff7a1a]" />
                        <span className="text-[11px] font-mono">Show Tiles ({Math.max(1, participants.length)})</span>
                      </>
                    ) : (
                      <>
                        <UsersIcon size={13} className="text-[#888e90]" />
                        <span className="text-[11px] font-mono hidden sm:inline">Hide Tiles</span>
                      </>
                    )}
                  </button>

                  {/* Fullscreen toggle button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors shadow-xl active:scale-95 cursor-pointer backdrop-blur-md ${
                      isFullscreen
                        ? 'bg-orange-500/20 text-[#ff7a1a] border-orange-500/40 shadow-sm'
                        : 'bg-[#0a0a0c]/85 hover:bg-[#141418] text-[#fcfdff] border-white/[0.14]'
                    }`}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 size={13} className="text-[#ff7a1a]" />
                        <span className="text-[11px] font-mono">Exit Fullscreen</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 size={13} />
                        <span className="text-[11px] font-mono hidden sm:inline">Fullscreen</span>
                      </>
                    )}
                  </button>

                  {/* Quick Stop Sharing Button (for Local Presenter) */}
                  {isScreenSharing && (
                    <button
                      type="button"
                      onClick={handleToggleScreenShare}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/40 text-xs font-medium transition-colors shadow-xl active:scale-95 cursor-pointer backdrop-blur-md"
                    >
                      <XIcon size={13} />
                      <span className="text-[11px] font-mono">Stop Presenting</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Filmstrip of Participant Tiles */}
            {!filmstripCollapsed && (
              <div className="w-full lg:w-44 xl:w-52 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden shrink-0 max-h-full pb-2 lg:pb-0 scrollbar-thin">
                {renderLocalTile(true)}
                {otherParticipants.map((p) => renderParticipantTile(p, true))}
              </div>
            )}
          </div>
        ) : (
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
            {renderLocalTile(false)}
            {otherParticipants.map((p) => renderParticipantTile(p, false))}

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
        )}
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
                  ? 'bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/50 ring-1 ring-[#FF9933]/40 shadow-[0_0_20px_rgba(255,153,51,0.2)]'
                  : 'bg-[#FF9933]/12 hover:bg-[#FF9933]/18 text-[#FF9933] border border-[#FF9933]/35 hover:border-[#FF9933]/50 shadow-[0_0_12px_rgba(255,153,51,0.15)]'
                : audioMenuOpen
                ? 'bg-gradient-to-r from-[#ff2047] to-[#e61239] text-white ring-2 ring-[#FF9933]/60 shadow-[0_0_20px_rgba(255,32,71,0.5)] border border-red-400/50'
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
                isMicOn ? (audioMenuOpen ? 'bg-[#FF9933]/40' : 'bg-[#FF9933]/30') : 'bg-white/20'
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
                  audioMenuOpen
                    ? 'bg-white/[0.12] text-[#FF9933]'
                    : isMicOn
                    ? 'text-[#FF9933]/80 hover:text-[#FF9933]'
                    : 'text-white/80 hover:text-white'
                }`}
                title="Microphone & Speaker Settings"
              >
                <ChevronUpIcon
                  size={14}
                  className={`transition-transform duration-200 pointer-events-none ${
                    audioMenuOpen ? 'rotate-180 text-[#FF9933]' : isMicOn ? 'text-[#FF9933]' : ''
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
            type="button"
            onClick={handleToggleScreenShare}
            disabled={!isScreenShareAllowed && !isScreenSharing}
            className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              !isScreenShareAllowed && !isScreenSharing
                ? 'opacity-40 cursor-not-allowed bg-[#101012] text-[#888e90]'
                : isScreenSharing
                ? 'bg-orange-500/20 text-[#ff7a1a] border border-orange-500/40 shadow-sm'
                : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08]'
            }`}
            title={
              !isScreenShareAllowed && !isScreenSharing
                ? 'Screen sharing disabled by host'
                : isScreenSharing
                ? 'Stop Presenting Screen'
                : 'Share Screen'
            }
          >
            <MonitorIcon size={17} />
          </button>

          {/* Universal Raise Hand Button */}
          <button
            type="button"
            onClick={handleToggleHandRaise}
            disabled={!isRaiseHandAllowed && !handRaised}
            className={`h-10 px-3 rounded-xl flex items-center gap-1.5 font-medium text-xs transition-all cursor-pointer ${
              !isRaiseHandAllowed && !handRaised
                ? 'opacity-40 cursor-not-allowed bg-[#121216] text-[#888e90] border border-white/[0.06]'
                : handRaised
                ? 'bg-[#FF9933]/15 hover:bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/40 shadow-[0_0_14px_rgba(255,153,51,0.18)] font-semibold active:scale-95'
                : 'bg-[#121216] hover:bg-[#18181f] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.10] hover:border-white/[0.16]'
            }`}
            title={handRaised ? 'Lower Hand' : 'Raise Hand (Show presence / ask question)'}
          >
            <span className="text-base leading-none">✋</span>
            <span className="hidden sm:inline">{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
          </button>

          {/* Emoji Reactions Picker */}
          <ReactionPicker
            onSelectReaction={handleSendReaction}
            accentColor="orange"
          />

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
        roomType="meet"
        showVideoStatus={true}
        onCopyLink={handleCopyLink}
        copied={copied}
        onMuteUser={isHost ? handleRemoteMute : undefined}
        onUnmuteUser={isHost ? handleRequestUnmute : undefined}
        onKickUser={isHost ? handleKickUser : undefined}
        onTransferHost={isHost ? requestTransferHost : undefined}
        localVolume={localAudio.volume}
        localFrequencyBands={localAudio.frequencyBands}
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

      {/* Permanent Audio Sinks for all remote participants */}
      {/* Mounted continuously so audio never cuts out regardless of presentation mode, fullscreen, or collapse */}
      <div className="sr-only pointer-events-none" aria-hidden="true">
        {otherParticipants.map((p) => {
          const stream = webrtc.remoteStreams.get(p.userId);
          return (
            <RemoteAudio
              key={`permanent-audio-${p.userId}`}
              stream={stream}
              audioOutputId={mediaDevices.selectedAudioOutputId}
            />
          );
        })}
      </div>

      {/* Floating Reactions Stream */}
      <FloatingReactions reactions={floatingReactions} />
    </div>
  );
}
