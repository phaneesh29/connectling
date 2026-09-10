'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import type { WebRTCSignalData, RoomParticipant } from '@/types/realtime';

export interface UseWebRTCOptions {
  roomCode: string;
  currentUserId?: string;
  enabled: boolean;
  mediaType: 'meet' | 'talk'; // 'meet' = audio + video + screen-share; 'talk' = audio-only stage
  isMicOn: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  selectedVideoInputId: string;
  onScreenShareEnded?: () => void;
  onError?: (message: string) => void;
}

export interface PeerAudioLevel {
  volume: number; // 0-100
  isSpeaking: boolean;
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  remoteAudioLevels: Record<string, PeerAudioLevel>;
  isConnected: boolean;
  connectionError: string | null;
  attachMediaElement: (userId: string, el: HTMLMediaElement | null) => void;
  attachLocalVideo: (el: HTMLVideoElement | null) => void;
  refreshLocalMedia: () => Promise<void>;
  stopMediaTracks: () => void;
}

// Production-ready public STUN servers
const STUN_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

function getVideoSender(pc: RTCPeerConnection): RTCRtpSender | null {
  const transceiver = pc.getTransceivers?.().find(
    (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
  );
  if (transceiver) return transceiver.sender;
  return pc.getSenders().find((s) => s.track?.kind === 'video') ?? null;
}

function getAudioSender(pc: RTCPeerConnection): RTCRtpSender | null {
  const transceiver = pc.getTransceivers?.().find(
    (t) => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio'
  );
  if (transceiver) return transceiver.sender;
  return pc.getSenders().find((s) => s.track?.kind === 'audio') ?? null;
}


interface PeerConnectionEntry {
  userId: string;
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
  isPolite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  analyserCleanup?: () => void;
}

export function useWebRTC({
  roomCode,
  currentUserId,
  enabled,
  mediaType,
  isMicOn,
  isVideoOn = false,
  isScreenSharing = false,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId,
  onScreenShareEnded,
  onError,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreamsMap, setRemoteStreamsMap] = useState<Map<string, MediaStream>>(new Map());
  const [remoteAudioLevels, setRemoteAudioLevels] = useState<Record<string, PeerAudioLevel>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // References for live media & active peers
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const displayAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioMixerContextRef = useRef<AudioContext | null>(null);
  const peersRef = useRef<Map<string, PeerConnectionEntry>>(new Map());
  const mediaElementsRef = useRef<Map<string, HTMLMediaElement>>(new Map());
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);

  // Keep latest prop values in refs for async event callbacks
  const isMicOnRef = useRef(isMicOn);
  const isVideoOnRef = useRef(isVideoOn);
  const isScreenSharingRef = useRef(isScreenSharing);
  const selectedAudioInputIdRef = useRef(selectedAudioInputId);
  const selectedVideoInputIdRef = useRef(selectedVideoInputId);
  const selectedAudioOutputIdRef = useRef(selectedAudioOutputId);
  const roomCodeRef = useRef(roomCode);
  const currentUserIdRef = useRef(currentUserId);
  const mediaTypeRef = useRef(mediaType);
  const onScreenShareEndedRef = useRef(onScreenShareEnded);
  const onErrorRef = useRef(onError);
  const enabledRef = useRef(enabled);
  const isDestroyedRef = useRef(false);
  const isMicInitialRef = useRef(true);
  const isVideoInitialRef = useRef(true);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);
  useEffect(() => {
    isVideoOnRef.current = isVideoOn;
  }, [isVideoOn]);
  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);
  useEffect(() => {
    selectedAudioInputIdRef.current = selectedAudioInputId;
  }, [selectedAudioInputId]);
  useEffect(() => {
    selectedVideoInputIdRef.current = selectedVideoInputId;
  }, [selectedVideoInputId]);
  useEffect(() => {
    selectedAudioOutputIdRef.current = selectedAudioOutputId;
  }, [selectedAudioOutputId]);
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);
  useEffect(() => {
    mediaTypeRef.current = mediaType;
  }, [mediaType]);
  useEffect(() => {
    onScreenShareEndedRef.current = onScreenShareEnded;
  }, [onScreenShareEnded]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const updateRemoteStreamsState = useCallback(() => {
    const nextMap = new Map<string, MediaStream>();
    for (const [uid, entry] of peersRef.current.entries()) {
      nextMap.set(uid, entry.remoteStream);
    }
    setRemoteStreamsMap(nextMap);
  }, []);

  // Set up Web Audio API volume analysis on remote audio track
  const setupPeerAudioAnalysis = useCallback((userId: string, track: MediaStreamTrack) => {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        const unlock = () => {
          if (audioCtx.state === 'suspended') void audioCtx.resume();
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
      }

      const stream = new MediaStream([track]);
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let animId: number | null = null;
      let isCancelled = false;
      let lastSpeaking = 0;

      const checkVolume = () => {
        if (isCancelled) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 1; i <= 16; i++) {
          sum += dataArray[i];
        }
        const avg = sum / 16;
        const normalized = Math.min(100, Math.round((avg / 90) * 100));
        const now = Date.now();
        const speakingNow = normalized > 5;

        if (speakingNow) {
          lastSpeaking = now;
        }
        const isSpeaking = speakingNow || now - lastSpeaking < 350;

        setRemoteAudioLevels((prev) => {
          const current = prev[userId];
          if (current?.volume === normalized && current?.isSpeaking === isSpeaking) {
            return prev;
          }
          return {
            ...prev,
            [userId]: { volume: normalized, isSpeaking },
          };
        });

        animId = requestAnimationFrame(checkVolume);
      };

      animId = requestAnimationFrame(checkVolume);

      return () => {
        isCancelled = true;
        if (animId) cancelAnimationFrame(animId);
        source.disconnect();
        analyser.disconnect();
        if (audioCtx.state !== 'closed') {
          void audioCtx.close().catch(() => {});
        }
        setRemoteAudioLevels((prev) => {
          if (!(userId in prev)) return prev;
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      };
    } catch (err) {
      console.warn(`Audio analysis setup failed for ${userId}:`, err);
      return undefined;
    }
  }, []);

  // Bind a remote media element (audio or video) and apply setSinkId
  const attachMediaElement = useCallback(
    (userId: string, el: HTMLMediaElement | null) => {
      if (!el) {
        mediaElementsRef.current.delete(userId);
        return;
      }
      mediaElementsRef.current.set(userId, el);
      const stream = peersRef.current.get(userId)?.remoteStream;
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
        el.play().catch(() => {
          // Autoplay unlock handler on user gesture
          const playOnGesture = () => {
            el.play().catch(() => {});
            window.removeEventListener('click', playOnGesture);
            window.removeEventListener('keydown', playOnGesture);
          };
          window.addEventListener('click', playOnGesture, { once: true });
          window.addEventListener('keydown', playOnGesture, { once: true });
        });
      }

      // Route to selected speaker / headphones device
      const outputId = selectedAudioOutputIdRef.current;
      if (outputId && outputId !== 'default' && 'setSinkId' in el) {
        (el as unknown as { setSinkId: (id: string) => Promise<void> })
          .setSinkId(outputId)
          .catch((err) => console.warn(`Failed to setSinkId on ${userId} media element:`, err));
      }
    },
    []
  );

  // Bind local video element
  const attachLocalVideo = useCallback((el: HTMLVideoElement | null) => {
    localVideoElRef.current = el;
    if (el) {
      if (localStreamRef.current && el.srcObject !== localStreamRef.current) {
        el.srcObject = localStreamRef.current;
      }
      el.muted = true; // Always mute local video preview to prevent audio feedback
      el.play().catch(() => {});
    }
  }, []);

  // Update setSinkId on all remote media elements when output device changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    for (const [, el] of mediaElementsRef.current.entries()) {
      if (
        selectedAudioOutputId &&
        selectedAudioOutputId !== 'default' &&
        'setSinkId' in el
      ) {
        (el as unknown as { setSinkId: (id: string) => Promise<void> })
          .setSinkId(selectedAudioOutputId)
          .catch((err) => console.warn('Failed to update setSinkId on audio output change:', err));
      }
    }
  }, [selectedAudioOutputId]);

  // Create or get Peer Connection
  const getOrCreatePeer = useCallback(
    (targetUserId: string): PeerConnectionEntry => {
      const existing = peersRef.current.get(targetUserId);
      if (existing) return existing;

      const myId = currentUserIdRef.current || '';
      const isPolite = myId < targetUserId;
      const iceServers = STUN_ICE_SERVERS;

      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
      });

      const remoteStream = new MediaStream();

      const entry: PeerConnectionEntry = {
        userId: targetUserId,
        pc,
        remoteStream,
        isPolite,
        makingOffer: false,
        ignoreOffer: false,
        pendingCandidates: [],
      };

      // Add local tracks to peer connection
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current);
        }
      }

      // Ensure audio transceiver is present so audio can be sent and received
      const audioSender = getAudioSender(pc);
      if (!audioSender) {
        try {
          pc.addTransceiver('audio', { direction: 'sendrecv' });
        } catch {
          // Ignored if unsupported
        }
      }

      // In meet spaces, ensure video transceiver is present even if starting with video muted
      if (mediaTypeRef.current === 'meet') {
        const videoSender = getVideoSender(pc);
        if (!videoSender) {
          try {
            pc.addTransceiver('video', { direction: 'sendrecv' });
          } catch {
            // Ignored if unsupported
          }
        }
      }

      // Send local ICE candidates to remote peer via signaling server
      pc.onicecandidate = ({ candidate }) => {
        if (candidate && candidate.candidate) {
          const socket = getSocket();
          socket.emit('webrtc:signal', {
            roomCode: roomCodeRef.current,
            targetUserId,
            signal: {
              type: 'candidate',
              candidate: candidate.toJSON(),
            },
          });
        }
      };

      // Handle receiving tracks from remote peer
      pc.ontrack = (event) => {
        const currentEntry = peersRef.current.get(targetUserId);
        if (!currentEntry) return;

        if (event.track.kind === 'video') {
          currentEntry.remoteStream.getVideoTracks().forEach((oldTrack) => {
            if (oldTrack.id !== event.track.id) {
              try {
                oldTrack.stop();
              } catch {}
              currentEntry.remoteStream.removeTrack(oldTrack);
            }
          });
        } else if (event.track.kind === 'audio') {
          currentEntry.remoteStream.getAudioTracks().forEach((oldTrack) => {
            if (oldTrack.id !== event.track.id) {
              try {
                oldTrack.stop();
              } catch {}
              currentEntry.remoteStream.removeTrack(oldTrack);
            }
          });
        }

        currentEntry.remoteStream.addTrack(event.track);

        // Attach to DOM element if already registered
        const mediaEl = mediaElementsRef.current.get(targetUserId);
        if (mediaEl) {
          mediaEl.srcObject = currentEntry.remoteStream;
          mediaEl.play().catch(() => {});
        }

        // Set up audio analysis for speech detection
        if (event.track.kind === 'audio') {
          if (currentEntry.analyserCleanup) {
            currentEntry.analyserCleanup();
          }
          currentEntry.analyserCleanup = setupPeerAudioAnalysis(targetUserId, event.track);
        }

        event.track.onended = () => {
          updateRemoteStreamsState();
        };

        event.track.onmute = () => {
          updateRemoteStreamsState();
        };

        event.track.onunmute = () => {
          updateRemoteStreamsState();
        };

        updateRemoteStreamsState();
      };

      // Monitor connection state & restart ICE if needed
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
        } else if (pc.connectionState === 'failed') {
          try {
            pc.restartIce();
          } catch {
            // Ignored
          }
        }
      };

      // Perfect Negotiation pattern: negotiationneeded handler
      pc.onnegotiationneeded = async () => {
        try {
          entry.makingOffer = true;
          await pc.setLocalDescription();
          const socket = getSocket();
          socket.emit('webrtc:signal', {
            roomCode: roomCodeRef.current,
            targetUserId,
            signal: {
              type: pc.localDescription?.type === 'answer' ? 'answer' : 'offer',
              sdp: pc.localDescription?.sdp,
            },
          });
        } catch (err) {
          console.warn(`Negotiation error for peer ${targetUserId}:`, err);
        } finally {
          entry.makingOffer = false;
        }
      };

      peersRef.current.set(targetUserId, entry);
      updateRemoteStreamsState();
      return entry;
    },
    [setupPeerAudioAnalysis, updateRemoteStreamsState]
  );

  // Close and clean up a peer connection
  const closePeer = useCallback(
    (targetUserId: string) => {
      const entry = peersRef.current.get(targetUserId);
      if (!entry) return;

      if (entry.analyserCleanup) {
        entry.analyserCleanup();
      }

      entry.pc.onicecandidate = null;
      entry.pc.ontrack = null;
      entry.pc.onnegotiationneeded = null;
      entry.pc.onconnectionstatechange = null;

      try {
        entry.pc.close();
      } catch {
        // Ignored
      }

      entry.remoteStream.getTracks().forEach((track) => track.stop());
      peersRef.current.delete(targetUserId);
      mediaElementsRef.current.delete(targetUserId);
      updateRemoteStreamsState();
    },
    [updateRemoteStreamsState]
  );

  // Synchronously stop all local media tracks (camera, mic, screen share, tab audio) and clean up
  const stopAllMediaTracks = useCallback(() => {
    isDestroyedRef.current = true;

    // Stop screen share track and shared audio track if active
    if (screenTrackRef.current) {
      try {
        screenTrackRef.current.stop();
      } catch {}
      screenTrackRef.current = null;
    }
    if (displayAudioTrackRef.current) {
      try {
        displayAudioTrackRef.current.stop();
      } catch {}
      displayAudioTrackRef.current = null;
    }
    if (audioMixerContextRef.current) {
      try {
        audioMixerContextRef.current.close().catch(() => {});
      } catch {}
      audioMixerContextRef.current = null;
    }

    // Stop camera track if preserved separately from localStream
    if (cameraVideoTrackRef.current) {
      try {
        cameraVideoTrackRef.current.stop();
      } catch {}
      cameraVideoTrackRef.current = null;
    }

    // Stop local tracks & release devices
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    if (localVideoElRef.current) {
      localVideoElRef.current.srcObject = null;
    }

    // Clean up all active peers
    for (const [uid] of peersRef.current.entries()) {
      closePeer(uid);
    }

    setLocalStream(null);
    setIsConnected(false);
  }, [closePeer]);

  // Explicit renegotiation helper for Perfect Negotiation
  const triggerRenegotiation = useCallback(async (entry: PeerConnectionEntry) => {
    if (entry.pc.signalingState !== 'stable') return;
    try {
      entry.makingOffer = true;
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      const socket = getSocket();
      socket.emit('webrtc:signal', {
        roomCode: roomCodeRef.current,
        targetUserId: entry.userId,
        signal: {
          type: 'offer',
          sdp: entry.pc.localDescription?.sdp,
        },
      });
    } catch (err) {
      console.warn(`Renegotiation error for peer ${entry.userId}:`, err);
    } finally {
      entry.makingOffer = false;
    }
  }, []);

  // Update video sender across all connected peers with transceiver direction and renegotiation support
  const setLocalVideoTrackOnPeers = useCallback(
    async (track: MediaStreamTrack | null) => {
      for (const [, entry] of peersRef.current.entries()) {
        try {
          const transceiver = entry.pc.getTransceivers().find(
            (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
          );

          if (transceiver) {
            if (track) {
              if (transceiver.direction !== 'sendrecv') {
                transceiver.direction = 'sendrecv';
              }
              await transceiver.sender.replaceTrack(track);
              if (transceiver.currentDirection !== 'sendrecv' && entry.pc.signalingState === 'stable') {
                void triggerRenegotiation(entry);
              }
            } else {
              await transceiver.sender.replaceTrack(null);
            }
          } else if (track) {
            entry.pc.addTrack(track, localStreamRef.current || new MediaStream());
          }
        } catch (err) {
          console.warn(`Error setting video track on peer ${entry.userId}:`, err);
        }
      }
    },
    [triggerRenegotiation]
  );

  // Update audio sender across all connected peers with transceiver direction and renegotiation support
  const setLocalAudioTrackOnPeers = useCallback(
    async (track: MediaStreamTrack | null) => {
      for (const [, entry] of peersRef.current.entries()) {
        try {
          const transceiver = entry.pc.getTransceivers().find(
            (t) => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio'
          );

          if (transceiver) {
            if (track) {
              if (transceiver.direction !== 'sendrecv') {
                transceiver.direction = 'sendrecv';
              }
              await transceiver.sender.replaceTrack(track);
              if (transceiver.currentDirection !== 'sendrecv' && entry.pc.signalingState === 'stable') {
                void triggerRenegotiation(entry);
              }
            } else {
              await transceiver.sender.replaceTrack(null);
            }
          } else if (track) {
            entry.pc.addTrack(track, localStreamRef.current || new MediaStream());
          }
        } catch (err) {
          console.warn(`Error setting audio track on peer ${entry.userId}:`, err);
        }
      }
    },
    [triggerRenegotiation]
  );

  // Acquire or refresh local media stream
  const acquireLocalMedia = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }
    if (isDestroyedRef.current || !enabledRef.current) {
      return;
    }

    try {
      const audioInputId = selectedAudioInputIdRef.current;
      const videoInputId = selectedVideoInputIdRef.current;
      const currentType = mediaTypeRef.current;
      const micDesired = isMicOnRef.current;
      const videoDesired = currentType === 'meet' && isVideoOnRef.current && !isScreenSharingRef.current;

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(audioInputId && audioInputId !== 'default'
          ? { deviceId: { exact: audioInputId } }
          : {}),
      };

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30 },
        ...(videoInputId && videoInputId !== 'default'
          ? { deviceId: { exact: videoInputId } }
          : {}),
      };

      let stream: MediaStream;

      if (!micDesired && !videoDesired) {
        stream = new MediaStream();
      } else if (micDesired && !videoDesired) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            stream = new MediaStream();
          }
        }
      } else if (!micDesired && videoDesired) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            });
          } catch {
            stream = new MediaStream();
          }
        }
      } else {
        // Both micDesired and videoDesired
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: videoConstraints,
          });
        } catch {
          // If strict device constraints failed, retry with generic audio & video
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            });
          } catch {
            // If video still failed (e.g. no camera), fallback to audio only
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch {
              stream = new MediaStream();
            }
          }
        }
      }

      // Sync track enabled states with current user toggles
      const audioTrack = stream.getAudioTracks()[0] || null;
      if (audioTrack) {
        audioTrack.enabled = true;
      }

      const videoTrack = stream.getVideoTracks()[0] || null;
      if (videoTrack) {
        videoTrack.enabled = true;
        if ('contentHint' in videoTrack) {
          videoTrack.contentHint = 'motion';
        }
        cameraVideoTrackRef.current = videoTrack;
      } else {
        cameraVideoTrackRef.current = null;
      }

      // If hook was destroyed or disabled while getUserMedia was awaiting, stop all newly acquired tracks immediately
      if (isDestroyedRef.current || !enabledRef.current) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        return;
      }

      // If an existing localStream had tracks, stop old tracks before replacing
      if (localStreamRef.current && localStreamRef.current !== stream) {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Attach to local video element if rendered
      if (localVideoElRef.current) {
        if (videoTrack) {
          localVideoElRef.current.srcObject = stream;
          localVideoElRef.current.muted = true;
          void localVideoElRef.current.play().catch(() => {});
        } else {
          localVideoElRef.current.srcObject = null;
        }
      }

      // Update all existing peer connections with the newly acquired tracks
      await setLocalAudioTrackOnPeers(audioTrack);
      if (currentType === 'meet') {
        await setLocalVideoTrackOnPeers(videoTrack);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to access camera or microphone';
      console.warn('WebRTC getUserMedia failed:', msg);
      setConnectionError(msg);
      onErrorRef.current?.(msg);
    }
  }, [setLocalAudioTrackOnPeers, setLocalVideoTrackOnPeers]);

  // Main lifecycle: Initialize WebRTC and subscribe to socket signaling
  useEffect(() => {
    if (!enabled || !currentUserId || !roomCode) {
      return;
    }

    isDestroyedRef.current = false;
    let isMounted = true;

    void acquireLocalMedia();

    const socket = getSocket();

    // Handle incoming WebRTC signals
    const handleSignal = async ({
      fromUserId,
      signal,
    }: {
      fromUserId: string;
      signal: WebRTCSignalData;
    }) => {
      if (!isMounted || !fromUserId || fromUserId === currentUserIdRef.current) return;

      const entry = getOrCreatePeer(fromUserId);
      const pc = entry.pc;

      try {
        if (signal.type === 'offer' && signal.sdp) {
          const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';
          entry.ignoreOffer = !entry.isPolite && offerCollision;

          if (entry.ignoreOffer) {
            return;
          }

          if (offerCollision) {
            await pc.setLocalDescription({ type: 'rollback' });
          }

          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'offer', sdp: signal.sdp })
          );
          entry.ignoreOffer = false;

          // Flush queued ICE candidates
          while (entry.pendingCandidates.length > 0) {
            const cand = entry.pendingCandidates.shift();
            if (cand) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (candErr) {
                console.warn(`Error flushing ICE candidate for ${fromUserId}:`, candErr);
              }
            }
          }

          await pc.setLocalDescription();
          socket.emit('webrtc:signal', {
            roomCode: roomCodeRef.current,
            targetUserId: fromUserId,
            signal: {
              type: 'answer',
              sdp: pc.localDescription?.sdp,
            },
          });
        } else if (signal.type === 'answer' && signal.sdp) {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: 'answer', sdp: signal.sdp })
            );
            entry.ignoreOffer = false;

            // Flush queued ICE candidates
            while (entry.pendingCandidates.length > 0) {
              const cand = entry.pendingCandidates.shift();
              if (cand) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (candErr) {
                  console.warn(`Error flushing ICE candidate for ${fromUserId}:`, candErr);
                }
              }
            }
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } else {
              entry.pendingCandidates.push(signal.candidate);
            }
          } catch (candErr) {
            if (!entry.ignoreOffer) {
              console.warn(`Error adding ICE candidate from ${fromUserId}:`, candErr);
            }
          }
        }
      } catch (err) {
        console.warn(`Error processing WebRTC signal from ${fromUserId}:`, err);
      }
    };

    // When a new participant joins, connect with them
    const handleUserJoined = ({ userId }: { userId: string; name: string }) => {
      if (!isMounted || userId === currentUserIdRef.current) return;
      getOrCreatePeer(userId);
    };

    // When roster updates, ensure all active participants have peer connections
    const handleRoster = ({ participants }: { participants: RoomParticipant[] }) => {
      if (!isMounted) return;
      const activeIds = new Set<string>();

      participants.forEach((p) => {
        if (p.userId !== currentUserIdRef.current) {
          activeIds.add(p.userId);
          getOrCreatePeer(p.userId);
        }
      });

      // Cleanup peers that left the roster
      for (const [peerId] of peersRef.current.entries()) {
        if (!activeIds.has(peerId)) {
          closePeer(peerId);
        }
      }
    };

    // When a participant leaves, close their connection
    const handleUserLeft = ({ userId }: { userId: string }) => {
      if (!isMounted) return;
      closePeer(userId);
    };

    socket.on('webrtc:signal', handleSignal);
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:roster', handleRoster);
    socket.on('room:user-left', handleUserLeft);

    return () => {
      isMounted = false;
      socket.off('webrtc:signal', handleSignal);
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:roster', handleRoster);
      socket.off('room:user-left', handleUserLeft);

      stopAllMediaTracks();
    };
  }, [enabled, currentUserId, roomCode, acquireLocalMedia, getOrCreatePeer, closePeer, stopAllMediaTracks]);

  // Handle selected audio input (microphone) switching
  useEffect(() => {
    if (!localStreamRef.current || !selectedAudioInputId) return;
    if (!isMicOnRef.current || localStreamRef.current.getAudioTracks().length === 0) return;

    let isCancelled = false;

    const switchAudioDevice = async () => {
      try {
        const constraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(selectedAudioInputId !== 'default'
            ? { deviceId: { exact: selectedAudioInputId } }
            : {}),
        };

        const newStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
        if (isCancelled || isDestroyedRef.current || !enabledRef.current || !isMicOnRef.current) {
          newStream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
          return;
        }

        const newAudioTrack = newStream.getAudioTracks()[0];
        if (!newAudioTrack) return;

        newAudioTrack.enabled = true;

        // Replace track across all peer connections
        await setLocalAudioTrackOnPeers(newAudioTrack);

        // Replace track in localStream
        const oldAudioTracks = localStreamRef.current?.getAudioTracks() || [];
        oldAudioTracks.forEach((track) => {
          localStreamRef.current?.removeTrack(track);
          try {
            track.stop();
          } catch {}
        });
        localStreamRef.current?.addTrack(newAudioTrack);

        setLocalStream(new MediaStream(localStreamRef.current?.getTracks() || []));
      } catch (err) {
        console.warn('Failed to switch audio input device:', err);
      }
    };

    void switchAudioDevice();

    return () => {
      isCancelled = true;
    };
  }, [selectedAudioInputId, setLocalAudioTrackOnPeers]);

  // Handle selected video input (camera) switching
  useEffect(() => {
    if (!localStreamRef.current || !selectedVideoInputId || isScreenSharingRef.current) return;
    if (mediaType !== 'meet') return;
    if (!isVideoOnRef.current || localStreamRef.current.getVideoTracks().length === 0) return;

    let isCancelled = false;

    const switchVideoDevice = async () => {
      try {
        const constraints: MediaTrackConstraints = {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
          ...(selectedVideoInputId !== 'default'
            ? { deviceId: { exact: selectedVideoInputId } }
            : {}),
        };

        const newStream = await navigator.mediaDevices.getUserMedia({ video: constraints });
        if (isCancelled || isDestroyedRef.current || !enabledRef.current || !isVideoOnRef.current) {
          newStream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
          return;
        }

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (!newVideoTrack) return;

        newVideoTrack.enabled = true;
        cameraVideoTrackRef.current = newVideoTrack;

        // Replace track across all peer connections
        await setLocalVideoTrackOnPeers(newVideoTrack);

        // Replace track in localStream
        const oldVideoTracks = localStreamRef.current?.getVideoTracks() || [];
        oldVideoTracks.forEach((track) => {
          localStreamRef.current?.removeTrack(track);
          try {
            track.stop();
          } catch {}
        });
        localStreamRef.current?.addTrack(newVideoTrack);

        const updatedStream = new MediaStream(localStreamRef.current?.getTracks() || []);
        setLocalStream(updatedStream);

        if (localVideoElRef.current) {
          localVideoElRef.current.srcObject = updatedStream;
          void localVideoElRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Failed to switch video input device:', err);
      }
    };

    void switchVideoDevice();

    return () => {
      isCancelled = true;
    };
  }, [selectedVideoInputId, mediaType, setLocalVideoTrackOnPeers]);

  // Handle local microphone toggle (mute/unmute)
  useEffect(() => {
    if (isMicInitialRef.current) {
      isMicInitialRef.current = false;
      return;
    }

    if (!isMicOn) {
      // Mute: physically stop all audio tracks to release microphone hardware sensor
      const audioTracks = localStreamRef.current?.getAudioTracks() || [];
      audioTracks.forEach((track) => {
        try {
          track.stop();
        } catch {}
        localStreamRef.current?.removeTrack(track);
      });

      // Clear audio track from all peer connections
      void setLocalAudioTrackOnPeers(null);

      const updatedStream = new MediaStream(localStreamRef.current?.getTracks() || []);
      localStreamRef.current = updatedStream;
      setLocalStream(updatedStream);
      return;
    }

    // Unmute: acquire fresh audio track from microphone
    let isCancelled = false;

    const acquireMic = async () => {
      try {
        const audioInputId = selectedAudioInputIdRef.current;
        const constraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(audioInputId && audioInputId !== 'default'
            ? { deviceId: { exact: audioInputId } }
            : {}),
        };

        let tempStream: MediaStream;
        try {
          tempStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
        } catch {
          try {
            tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            return;
          }
        }

        if (isCancelled || isDestroyedRef.current || !enabledRef.current || !isMicOnRef.current) {
          tempStream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
          return;
        }

        const newTrack = tempStream.getAudioTracks()[0];
        if (!newTrack) return;
        newTrack.enabled = true;

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }

        // Clean up any stale audio tracks
        localStreamRef.current.getAudioTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
          localStreamRef.current?.removeTrack(t);
        });

        localStreamRef.current.addTrack(newTrack);

        // Mix or send over peers
        if (isScreenSharingRef.current && displayAudioTrackRef.current && audioMixerContextRef.current) {
          try {
            const ctx = audioMixerContextRef.current;
            if (ctx.state === 'suspended') void ctx.resume();
            const dest = ctx.createMediaStreamDestination();
            const micSource = ctx.createMediaStreamSource(new MediaStream([newTrack]));
            micSource.connect(dest);
            const displaySource = ctx.createMediaStreamSource(new MediaStream([displayAudioTrackRef.current]));
            displaySource.connect(dest);
            const mixedTrack = dest.stream.getAudioTracks()[0];
            if (mixedTrack) {
              await setLocalAudioTrackOnPeers(mixedTrack);
            }
          } catch (mixErr) {
            console.warn('Could not mix mic into screen share audio:', mixErr);
            await setLocalAudioTrackOnPeers(newTrack);
          }
        } else {
          await setLocalAudioTrackOnPeers(newTrack);
        }

        const updatedStream = new MediaStream(localStreamRef.current.getTracks());
        localStreamRef.current = updatedStream;
        setLocalStream(updatedStream);
      } catch (err) {
        console.warn('Could not turn on microphone:', err);
        onErrorRef.current?.('Could not access microphone');
      }
    };

    void acquireMic();

    return () => {
      isCancelled = true;
    };
  }, [isMicOn, setLocalAudioTrackOnPeers]);

  // Handle local video toggle (camera on/off)
  useEffect(() => {
    if (mediaType !== 'meet') return;

    if (isVideoInitialRef.current) {
      isVideoInitialRef.current = false;
      return;
    }

    if (isScreenSharingRef.current) return;

    if (!isVideoOn) {
      // Turn off camera: physically stop track so hardware light turns off
      if (cameraVideoTrackRef.current) {
        try {
          cameraVideoTrackRef.current.stop();
        } catch {}
        cameraVideoTrackRef.current = null;
      }

      const videoTracks = localStreamRef.current?.getVideoTracks() || [];
      videoTracks.forEach((track) => {
        try {
          track.stop();
        } catch {}
        localStreamRef.current?.removeTrack(track);
      });

      // Clear video from peer senders so remote peers show avatar
      void setLocalVideoTrackOnPeers(null);

      if (localVideoElRef.current) {
        localVideoElRef.current.srcObject = null;
      }

      const updatedStream = new MediaStream(localStreamRef.current?.getTracks() || []);
      localStreamRef.current = updatedStream;
      setLocalStream(updatedStream);
      return;
    }

    // Turn on camera: acquire camera track fresh
    let isCancelled = false;

    const acquireCamera = async () => {
      try {
        const videoInputId = selectedVideoInputIdRef.current;
        const constraints: MediaTrackConstraints = {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
          ...(videoInputId && videoInputId !== 'default'
            ? { deviceId: { exact: videoInputId } }
            : {}),
        };

        let tempStream: MediaStream;
        try {
          tempStream = await navigator.mediaDevices.getUserMedia({ video: constraints });
        } catch {
          try {
            tempStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            });
          } catch {
            return;
          }
        }

        if (
          isCancelled ||
          isDestroyedRef.current ||
          !enabledRef.current ||
          !isVideoOnRef.current ||
          isScreenSharingRef.current
        ) {
          tempStream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
          return;
        }

        const newTrack = tempStream.getVideoTracks()[0];
        if (!newTrack) return;

        newTrack.enabled = true;
        if ('contentHint' in newTrack) {
          newTrack.contentHint = 'motion';
        }
        cameraVideoTrackRef.current = newTrack;

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }
        // Remove any old video tracks first
        localStreamRef.current.getVideoTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
          localStreamRef.current?.removeTrack(t);
        });
        localStreamRef.current.addTrack(newTrack);

        await setLocalVideoTrackOnPeers(newTrack);

        const updatedStream = new MediaStream(localStreamRef.current.getTracks());
        localStreamRef.current = updatedStream;
        setLocalStream(updatedStream);

        if (localVideoElRef.current) {
          localVideoElRef.current.srcObject = updatedStream;
          localVideoElRef.current.muted = true;
          void localVideoElRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Could not turn on camera track:', err);
        onErrorRef.current?.('Could not access camera');
      }
    };

    void acquireCamera();

    return () => {
      isCancelled = true;
    };
  }, [isVideoOn, mediaType, setLocalVideoTrackOnPeers]);

  // Handle screen sharing toggle with audio support (microphone + tab/system audio mixing)
  useEffect(() => {
    if (mediaType !== 'meet') return;

    if (isScreenSharing) {
      void (async () => {
        try {
          if (!navigator.mediaDevices?.getDisplayMedia) {
            throw new Error('Screen sharing not supported in this browser');
          }

          let displayStream: MediaStream;
          try {
            displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: { cursor: 'always' } as MediaTrackConstraints,
              audio: true,
            });
          } catch {
            displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: { cursor: 'always' } as MediaTrackConstraints,
            });
          }

          if (isDestroyedRef.current || !enabledRef.current || !isScreenSharingRef.current) {
            displayStream.getTracks().forEach((t) => {
              try {
                t.stop();
              } catch {}
            });
            return;
          }

          const screenTrack = displayStream.getVideoTracks()[0];
          if (!screenTrack) return;

          screenTrackRef.current = screenTrack;
          if ('contentHint' in screenTrack) {
            screenTrack.contentHint = 'detail';
          }

          // Check if system or tab audio was shared
          const displayAudioTrack = displayStream.getAudioTracks()[0] || null;
          displayAudioTrackRef.current = displayAudioTrack;

          // When user clicks the browser's native "Stop Sharing" floating button
          screenTrack.onended = () => {
            onScreenShareEndedRef.current?.();
          };

          // Turn off camera track to free hardware sensor while screen sharing
          if (cameraVideoTrackRef.current) {
            try {
              cameraVideoTrackRef.current.stop();
            } catch {}
            cameraVideoTrackRef.current = null;
          }

          // Update local preview and sync localStreamRef
          const audioTracks = localStreamRef.current?.getAudioTracks() || [];
          const previewStream = new MediaStream([...audioTracks, screenTrack]);
          localStreamRef.current = previewStream;
          setLocalStream(previewStream);

          // Replace video track across all peer connections
          await setLocalVideoTrackOnPeers(screenTrack);

          // Handle audio: mix mic + tab audio if display audio was captured, otherwise ensure mic is active
          const micTrack = localStreamRef.current?.getAudioTracks()[0];
          let audioTrackToSend: MediaStreamTrack | null = micTrack ?? null;

          if (displayAudioTrack) {
            displayAudioTrack.onended = () => {
              if (displayAudioTrackRef.current === displayAudioTrack) {
                displayAudioTrackRef.current = null;
              }
              if (audioMixerContextRef.current) {
                audioMixerContextRef.current.close().catch(() => {});
                audioMixerContextRef.current = null;
              }
              const currentMic = localStreamRef.current?.getAudioTracks()[0];
              if (currentMic && isMicOnRef.current) {
                void setLocalAudioTrackOnPeers(currentMic);
              }
            };

            try {
              const AudioCtx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              const ctx = new AudioCtx();
              audioMixerContextRef.current = ctx;
              if (ctx.state === 'suspended') void ctx.resume();

              const dest = ctx.createMediaStreamDestination();
              if (micTrack && micTrack.readyState === 'live' && isMicOnRef.current) {
                const micSource = ctx.createMediaStreamSource(new MediaStream([micTrack]));
                micSource.connect(dest);
              }
              const displaySource = ctx.createMediaStreamSource(new MediaStream([displayAudioTrack]));
              displaySource.connect(dest);

              const mixedTrack = dest.stream.getAudioTracks()[0];
              if (mixedTrack) {
                audioTrackToSend = mixedTrack;
              }
            } catch (mixErr) {
              console.warn('Could not mix display audio, transmitting display audio track directly:', mixErr);
              audioTrackToSend = displayAudioTrack;
            }
          }

          // Ensure all active peer connections send audio
          if (audioTrackToSend) {
            await setLocalAudioTrackOnPeers(audioTrackToSend);
          }

          if (localVideoElRef.current) {
            localVideoElRef.current.srcObject = previewStream;
            void localVideoElRef.current.play().catch(() => {});
          }
        } catch (err) {
          console.warn('Screen share cancelled or failed:', err);
          onScreenShareEndedRef.current?.();
        }
      })();
    } else {
      // Revert back to camera track or stop video transmission if camera was off
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      if (displayAudioTrackRef.current) {
        displayAudioTrackRef.current.stop();
        displayAudioTrackRef.current = null;
      }
      if (audioMixerContextRef.current) {
        audioMixerContextRef.current.close().catch(() => {});
        audioMixerContextRef.current = null;
      }

      // Restore original mic track on all audio senders
      const originalMicTrack = localStreamRef.current?.getAudioTracks()[0];
      if (originalMicTrack && isMicOnRef.current) {
        originalMicTrack.enabled = true;
        void setLocalAudioTrackOnPeers(originalMicTrack);
      } else {
        void setLocalAudioTrackOnPeers(null);
      }

      if (isVideoOnRef.current) {
        // Re-acquire camera track
        void (async () => {
          try {
            const videoInputId = selectedVideoInputIdRef.current;
            const constraints: MediaTrackConstraints = {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30 },
              ...(videoInputId && videoInputId !== 'default'
                ? { deviceId: { exact: videoInputId } }
                : {}),
            };
            let stream: MediaStream;
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
            } catch {
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                });
              } catch {
                return;
              }
            }

            if (isDestroyedRef.current || !enabledRef.current || !isVideoOnRef.current || isScreenSharingRef.current) {
              stream.getTracks().forEach((t) => {
                try {
                  t.stop();
                } catch {}
              });
              return;
            }

            const newCamTrack = stream.getVideoTracks()[0];
            if (!newCamTrack) return;
            newCamTrack.enabled = true;
            if ('contentHint' in newCamTrack) {
              newCamTrack.contentHint = 'motion';
            }
            cameraVideoTrackRef.current = newCamTrack;

            await setLocalVideoTrackOnPeers(newCamTrack);

            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach((t) => {
                try {
                  t.stop();
                } catch {}
                localStreamRef.current?.removeTrack(t);
              });
              localStreamRef.current.addTrack(newCamTrack);
              const restoredStream = new MediaStream(localStreamRef.current.getTracks());
              localStreamRef.current = restoredStream;
              setLocalStream(restoredStream);

              if (localVideoElRef.current) {
                localVideoElRef.current.srcObject = restoredStream;
                localVideoElRef.current.muted = true;
                void localVideoElRef.current.play().catch(() => {});
              }
            }
          } catch (err) {
            console.warn('Could not re-acquire camera after screen share:', err);
          }
        })();
      } else {
        // Camera was off: clear video sender track so remote peers display avatar
        void setLocalVideoTrackOnPeers(null);

        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
            localStreamRef.current?.removeTrack(t);
          });
          const restoredStream = new MediaStream(localStreamRef.current.getTracks());
          localStreamRef.current = restoredStream;
          setLocalStream(restoredStream);

          if (localVideoElRef.current) {
            localVideoElRef.current.srcObject = null;
          }
        }
      }
    }
  }, [isScreenSharing, mediaType, setLocalAudioTrackOnPeers, setLocalVideoTrackOnPeers]);

  return {
    localStream,
    remoteStreams: remoteStreamsMap,
    remoteAudioLevels,
    isConnected,
    connectionError,
    attachMediaElement,
    attachLocalVideo,
    refreshLocalMedia: acquireLocalMedia,
    stopMediaTracks: stopAllMediaTracks,
  };
}
