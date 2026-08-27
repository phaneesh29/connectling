'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import type { PeerState, ChatMessage } from '@/types/realtime';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseWebRTCOptions {
  roomCode: string;
  currentUserId?: string;
  isMeetMode?: boolean; // true for Video Meet, false for Audio Stage
  initialMuted?: boolean;
  initialVideo?: boolean;
}

export function useWebRTC({
  roomCode,
  currentUserId,
  isMeetMode = true,
  initialMuted = false,
  initialVideo = true,
}: UseWebRTCOptions) {
  const socket = getSocket();

  const [peers, setPeers] = useState<PeerState[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Local media state
  const [isMicOn, setIsMicOn] = useState(!initialMuted);
  const [isVideoOn, setIsVideoOn] = useState(isMeetMode && initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Media streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<Record<string, MediaStream>>({});

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  // 1. Initialize Local Media Stream
  const initLocalStream = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isMeetMode
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Apply initial track states
      stream.getAudioTracks().forEach((t) => (t.enabled = !initialMuted));
      if (isMeetMode) {
        stream.getVideoTracks().forEach((t) => (t.enabled = initialVideo));
      }

      return stream;
    } catch (err) {
      console.warn('Could not access microphone/camera:', err);
      return null;
    }
  }, [isMeetMode, initialMuted, initialVideo]);

  // 2. Create and Configure a Peer Connection
  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      if (peerConnections.current.has(targetUserId)) {
        return peerConnections.current.get(targetUserId)!;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(targetUserId, pc);

      // Add local tracks to this connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal:ice-candidate', {
            roomCode,
            toUserId: targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle incoming remote media tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          setPeerStreams((prev) => ({
            ...prev,
            [targetUserId]: remoteStream,
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          pc.close();
          peerConnections.current.delete(targetUserId);
          setPeerStreams((prev) => {
            const next = { ...prev };
            delete next[targetUserId];
            return next;
          });
        }
      };

      return pc;
    },
    [roomCode, socket]
  );

  // 3. Setup Socket Connection & WebRTC Signal Listeners
  useEffect(() => {
    if (!roomCode || !currentUserId) return;

    void (async () => {
      await initLocalStream();

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit('room:join', {
        roomCode,
        isMuted: !isMicOn,
        isVideoOn,
      });

      setIsConnected(true);
    })();

    // EVENT: Received list of existing peers in the room
    const handleRoomPeers = async ({ peers: currentPeers, hostId: currentHostId }: { peers: PeerState[]; hostId: string }) => {
      setPeers(currentPeers);
      setHostId(currentHostId);

      // Create offers to all existing peers (as the newly joined client)
      for (const peer of currentPeers) {
        if (peer.userId === currentUserId) continue;
        const pc = createPeerConnection(peer.userId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal:offer', {
            roomCode,
            toUserId: peer.userId,
            offer,
          });
        } catch (err) {
          console.error('Error creating SDP offer to peer:', peer.userId, err);
        }
      }
    };

    // EVENT: New user joined
    const handleUserJoined = (newPeer: PeerState) => {
      setPeers((prev) => {
        if (prev.some((p) => p.userId === newPeer.userId)) return prev;
        return [...prev, newPeer];
      });
    };

    // EVENT: User left
    const handleUserLeft = ({ userId, newHostId }: { userId: string; newHostId?: string }) => {
      setPeers((prev) => prev.filter((p) => p.userId !== userId));
      if (newHostId) {
        setHostId(newHostId);
      }

      const pc = peerConnections.current.get(userId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(userId);
      }

      setPeerStreams((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    // EVENT: Received SDP Offer
    const handleSignalOffer = async ({ fromUserId, offer }: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(fromUserId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal:answer', {
          roomCode,
          toUserId: fromUserId,
          answer,
        });
      } catch (err) {
        console.error('Error handling SDP offer from:', fromUserId, err);
      }
    };

    // EVENT: Received SDP Answer
    const handleSignalAnswer = async ({ fromUserId, answer }: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(fromUserId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error setting remote description for answer:', err);
        }
      }
    };

    // EVENT: Received ICE Candidate
    const handleSignalIceCandidate = async ({ fromUserId, candidate }: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(fromUserId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    };

    // EVENT: Media State Updated
    const handleMediaStateUpdated = ({
      userId,
      isMuted,
      isVideoOn: peerVideo,
      isScreenSharing: peerScreen,
    }: {
      userId: string;
      isMuted: boolean;
      isVideoOn: boolean;
      isScreenSharing: boolean;
    }) => {
      setPeers((prev) =>
        prev.map((p) =>
          p.userId === userId
            ? { ...p, isMuted, isVideoOn: peerVideo, isScreenSharing: peerScreen }
            : p
        )
      );
    };

    // EVENT: Hand-raising update
    const handleStageHandUpdated = ({ userId, isHandRaised: raised }: { userId: string; isHandRaised: boolean }) => {
      setPeers((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, isHandRaised: raised } : p))
      );
    };

    // EVENT: Role update (speaker/listener)
    const handleStageRoleUpdated = ({ userId, role }: { userId: string; role: 'host' | 'speaker' | 'listener' }) => {
      setPeers((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, role } : p))
      );
    };

    // EVENT: In-room chat message
    const handleNewChatMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on('room:peers', handleRoomPeers);
    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);
    socket.on('signal:offer', handleSignalOffer);
    socket.on('signal:answer', handleSignalAnswer);
    socket.on('signal:ice-candidate', handleSignalIceCandidate);
    socket.on('media:state-updated', handleMediaStateUpdated);
    socket.on('stage:hand-updated', handleStageHandUpdated);
    socket.on('stage:role-updated', handleStageRoleUpdated);
    socket.on('chat:new-message', handleNewChatMessage);

    const pcs = peerConnections.current;

    return () => {
      socket.off('room:peers', handleRoomPeers);
      socket.off('user:joined', handleUserJoined);
      socket.off('user:left', handleUserLeft);
      socket.off('signal:offer', handleSignalOffer);
      socket.off('signal:answer', handleSignalAnswer);
      socket.off('signal:ice-candidate', handleSignalIceCandidate);
      socket.off('media:state-updated', handleMediaStateUpdated);
      socket.off('stage:hand-updated', handleStageHandUpdated);
      socket.off('stage:role-updated', handleStageRoleUpdated);
      socket.off('chat:new-message', handleNewChatMessage);

      // Clean up peer connections
      pcs.forEach((pc) => pc.close());
      pcs.clear();

      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }

      socket.emit('room:leave', { roomCode });
    };
  }, [roomCode, currentUserId, initLocalStream, createPeerConnection, socket, isMicOn, isVideoOn]);

  // 4. Toggle Local Microphone
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const newMicState = !isMicOn;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = newMicState));
    setIsMicOn(newMicState);

    socket.emit('media:state', {
      roomCode,
      isMuted: !newMicState,
      isVideoOn,
      isScreenSharing,
    });
  }, [isMicOn, isVideoOn, isScreenSharing, roomCode, socket]);

  // 5. Toggle Local Camera
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current || !isMeetMode) return;
    const newVideoState = !isVideoOn;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = newVideoState));
    setIsVideoOn(newVideoState);

    socket.emit('media:state', {
      roomCode,
      isMuted: !isMicOn,
      isVideoOn: newVideoState,
      isScreenSharing,
    });
  }, [isMeetMode, isVideoOn, isMicOn, isScreenSharing, roomCode, socket]);

  // 6. Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      setIsScreenSharing(false);
      socket.emit('media:state', {
        roomCode,
        isMuted: !isMicOn,
        isVideoOn,
        isScreenSharing: false,
      });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const screenVideoTrack = screenStream.getVideoTracks()[0];
        if (!screenVideoTrack) return;

        screenTrackRef.current = screenVideoTrack;
        setIsScreenSharing(true);

        // Replace video track in all peer connections
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            void sender.replaceTrack(screenVideoTrack);
          }
        });

        screenVideoTrack.onended = () => {
          setIsScreenSharing(false);
          if (localStreamRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            peerConnections.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
              if (sender && camTrack) {
                void sender.replaceTrack(camTrack);
              }
            });
          }
        };

        socket.emit('media:state', {
          roomCode,
          isMuted: !isMicOn,
          isVideoOn,
          isScreenSharing: true,
        });
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  }, [isScreenSharing, isMicOn, isVideoOn, roomCode, socket]);

  // 7. Toggle Hand Raise (Audio Stage)
  const toggleHandRaise = useCallback(() => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    socket.emit('stage:raise-hand', {
      roomCode,
      isHandRaised: nextState,
    });
  }, [isHandRaised, roomCode, socket]);

  // 8. Promote Speaker (Host only)
  const promoteSpeaker = useCallback(
    (targetUserId: string) => {
      socket.emit('stage:promote', {
        roomCode,
        targetUserId,
      });
    },
    [roomCode, socket]
  );

  // 9. Demote Speaker (Host only)
  const demoteSpeaker = useCallback(
    (targetUserId: string) => {
      socket.emit('stage:demote', {
        roomCode,
        targetUserId,
      });
    },
    [roomCode, socket]
  );

  // 10. Send Chat Message
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      socket.emit('chat:message', {
        roomCode,
        text,
      });
    },
    [roomCode, socket]
  );

  return {
    isConnected,
    peers,
    hostId,
    messages,
    localStream,
    peerStreams,
    isMicOn,
    isVideoOn,
    isScreenSharing,
    isHandRaised,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    toggleHandRaise,
    promoteSpeaker,
    demoteSpeaker,
    sendMessage,
  };
}
