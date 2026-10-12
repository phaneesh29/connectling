'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getRoomPeerId, getSocket } from '@/lib/socket';
import { createWebRTCMesh, type WebRTCMesh, type PeerConnectionStatus } from '@/lib/webrtc-mesh';
import type { RoomParticipant, WebRTCIncomingSignalPayload } from '@/types/realtime';

export interface UseWebRTCOptions {
  roomCode: string;
  currentUserId?: string;
  enabled: boolean;
  mediaType: 'meet' | 'talk';
  isMicOn: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  selectedVideoInputId: string;
  onScreenShareEnded?: () => void;
  onError?: (message: string) => void;
}

export interface PeerAudioLevel { volume: number; isSpeaking: boolean }

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  remoteAudioLevels: Record<string, PeerAudioLevel>;
  peerConnectionStatuses: Record<string, PeerConnectionStatus>;
  isReconnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;
  attachMediaElement: (peerId: string, el: HTMLMediaElement | null) => void;
  attachLocalVideo: (el: HTMLVideoElement | null) => void;
  refreshLocalMedia: () => Promise<void>;
  stopMediaTracks: () => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

interface LocalMediaState {
  mesh: WebRTCMesh;
  stream: MediaStream;
  ownedTracks: Set<MediaStreamTrack>;
  ownedMixers: Set<AudioContext>;
  stopped: boolean;
  revision: number;
  screenRevision: number;
  queue: Promise<void>;
  mic: MediaStreamTrack | null;
  camera: MediaStreamTrack | null;
  screen: MediaStreamTrack | null;
  displayAudio: MediaStreamTrack | null;
  mixedAudio: MediaStreamTrack | null;
  mixer: AudioContext | null;
  mixerMic: MediaStreamTrack | null;
  mixerDisplayAudio: MediaStreamTrack | null;
  audioDevice: string;
  videoDevice: string;
}

const stopTrack = (track: MediaStreamTrack | null) => {
  if (track) { track.onended = null; track.stop(); }
};

const releaseTrack = (session: LocalMediaState, track: MediaStreamTrack | null) => {
  stopTrack(track);
  if (track) session.ownedTracks.delete(track);
};

const releaseMixer = (session: LocalMediaState, context: AudioContext | null) => {
  if (!context) return;
  session.ownedMixers.delete(context);
  if (context.state !== 'closed') void context.close().catch(() => {});
};

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCReturn {
  const { enabled, currentUserId, roomCode, mediaType, isMicOn, isVideoOn = false,
    isScreenSharing = false, selectedAudioInputId, selectedVideoInputId, selectedAudioOutputId } = options;
  const latest = useRef(options);
  useEffect(() => { latest.current = options; });
  const sessionRef = useRef<LocalMediaState | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef(new Map<string, MediaStream>());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaElements = useRef(new Map<string, HTMLMediaElement>());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteAudioLevels, setRemoteAudioLevels] = useState<Record<string, PeerAudioLevel>>({});
  const [peerConnectionStatuses, setPeerConnectionStatuses] = useState<Record<string, PeerConnectionStatus>>({});
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const reportError = useCallback((message: string) => {
    setConnectionError(message);
    latest.current.onError?.(message);
  }, []);

  const publishMedia = useCallback(async (session: LocalMediaState) => {
    if (session.stopped || sessionRef.current !== session) return;
    const video = session.screen ?? session.camera;
    const tracks = [session.mic, video].filter((track): track is MediaStreamTrack => track !== null);

    let preview = localRef.current;
    if (!preview) {
      preview = new MediaStream();
      localRef.current = preview;
      setLocalStream(preview);
    }
    const currentTracks = preview.getTracks();
    const tracksChanged = currentTracks.length !== tracks.length ||
      tracks.some(track => !currentTracks.includes(track));

    if (tracksChanged) {
      for (const old of preview.getTracks()) {
        if (!tracks.includes(old)) preview.removeTrack(old);
      }
      for (const track of tracks) {
        if (!preview.getTracks().includes(track)) preview.addTrack(track);
      }
      const updatedPreview = new MediaStream(preview.getTracks());
      localRef.current = updatedPreview;
      setLocalStream(updatedPreview);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = updatedPreview;
        localVideoRef.current.muted = true;
        void localVideoRef.current.play().catch(() => {});
      }
    }

    const displayAudio = session.displayAudio?.readyState === 'live' ? session.displayAudio : null;
    const mixerChanged = session.mixerMic !== session.mic || session.mixerDisplayAudio !== displayAudio ||
      session.mixedAudio?.readyState === 'ended';
    if (!tracksChanged && !mixerChanged) return;

    let previousMixer: AudioContext | null = null;
    let previousMixedTrack: MediaStreamTrack | null = null;
    if (mixerChanged) {
      previousMixer = session.mixer;
      previousMixedTrack = session.mixedAudio;
      session.mixer = null;
      session.mixedAudio = null;
      session.mixerMic = session.mic;
      session.mixerDisplayAudio = displayAudio;
      if (displayAudio) {
        try {
          const context = new AudioContext();
          session.mixer = context;
          session.ownedMixers.add(context);
          const destination = context.createMediaStreamDestination();
          if (session.mic?.readyState === 'live') context.createMediaStreamSource(new MediaStream([session.mic])).connect(destination);
          context.createMediaStreamSource(new MediaStream([displayAudio])).connect(destination);
          session.mixedAudio = destination.stream.getAudioTracks()[0];
          session.ownedTracks.add(session.mixedAudio);
          void context.resume().catch(() => {});
        } catch { /* Send the available raw audio if mixing is unavailable. */ }
      }
    }
    const audio = session.mixedAudio ?? session.mic ?? displayAudio;
    // Keep raw mic in the local stream for speaking detection and avoid tab audio feedback.
    for (const old of session.stream.getTracks()) if (!tracks.includes(old)) session.stream.removeTrack(old);
    for (const track of tracks) if (!session.stream.getTracks().includes(track)) session.stream.addTrack(track);
    await session.mesh.setTracks(audio, video, session.stream);
    releaseTrack(session, previousMixedTrack);
    releaseMixer(session, previousMixer);
  }, []);

  const refreshLocalMedia = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || session.stopped) return;
    const revision = ++session.revision;
    // Muting must release an existing device even while a different input prompt is pending.
    if (!latest.current.isMicOn && session.mic) { releaseTrack(session, session.mic); session.mic = null; }
    if ((!latest.current.isVideoOn || latest.current.isScreenSharing) && session.camera) { releaseTrack(session, session.camera); session.camera = null; }
    session.queue = session.queue.then(async () => {
      if (session.stopped || session.revision !== revision) return;
      const desired = latest.current;
      if (!desired.enabled) return;
      const needsMic = desired.isMicOn;
      const needsCamera = desired.mediaType === 'meet' && desired.isVideoOn && !desired.isScreenSharing;
      const audioDevice = desired.selectedAudioInputId;
      const videoDevice = desired.selectedVideoInputId;
      const audioChanged = needsMic
        ? session.mic?.readyState !== 'live' || session.audioDevice !== audioDevice
        : Boolean(session.mic);
      const videoChanged = needsCamera
        ? session.camera?.readyState !== 'live' || session.videoDevice !== videoDevice
        : Boolean(session.camera);
      if (!audioChanged && !videoChanged) { await publishMedia(session); return; }
      // Release muted devices immediately; acquire only the input that actually changed.
      if (audioChanged && !needsMic) { releaseTrack(session, session.mic); session.mic = null; }
      if (videoChanged && !needsCamera) { releaseTrack(session, session.camera); session.camera = null; }
      const acquire = async (kind: 'audio' | 'video', deviceId: string) => {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera and microphone access requires a supported browser and HTTPS.');
        }
        const constraints: MediaTrackConstraints = kind === 'audio'
          ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: { ideal: 1 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
        if (deviceId && deviceId !== 'default') constraints.deviceId = { exact: deviceId };
        let stream: MediaStream;
        try { stream = await navigator.mediaDevices.getUserMedia({ [kind]: constraints }); }
        catch (error) {
          // Retry only an unavailable selected device, not a denied permission prompt.
          if (!(error instanceof DOMException) || !['NotFoundError', 'OverconstrainedError'].includes(error.name) || !constraints.deviceId) throw error;
          delete constraints.deviceId;
          stream = await navigator.mediaDevices.getUserMedia({ [kind]: constraints });
        }
        if (session.stopped || session.revision !== revision || sessionRef.current !== session) {
          stream.getTracks().forEach(track => stopTrack(track));
          return null;
        }
        const [track, ...extraTracks] = stream.getTracks();
        extraTracks.forEach(stopTrack);
        if (track) session.ownedTracks.add(track);
        return track ?? null;
      };
      const results = await Promise.allSettled([
        audioChanged && needsMic ? acquire('audio', audioDevice) : Promise.resolve(null),
        videoChanged && needsCamera ? acquire('video', videoDevice) : Promise.resolve(null),
      ]);
      if (session.stopped || session.revision !== revision || sessionRef.current !== session) {
        for (const result of results) if (result.status === 'fulfilled') releaseTrack(session, result.value);
        return;
      }
      const oldMic = session.mic;
      const oldCamera = session.camera;
      const [audioResult, videoResult] = results;
      if (audioResult.status === 'fulfilled' && audioResult.value) {
        session.mic = audioResult.value;
        session.audioDevice = audioDevice;
      }
      if (videoResult.status === 'fulfilled' && videoResult.value) {
        session.camera = videoResult.value;
        session.camera.contentHint = 'motion';
        session.videoDevice = videoDevice;
      }
      for (const result of results) if (result.status === 'rejected') reportError(result.reason instanceof Error ? result.reason.message : 'Could not access media device');
      await publishMedia(session);
      if (oldMic !== session.mic) releaseTrack(session, oldMic);
      if (oldCamera !== session.camera) releaseTrack(session, oldCamera);
    }).catch((error: unknown) => {
      if (!session.stopped) reportError(error instanceof Error ? error.message : 'Could not update media');
    });
    await session.queue;
  }, [publishMedia, reportError]);

  const stopMediaTracks = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.stopped) return;
    session.stopped = true;
    session.revision += 1;
    session.screenRevision += 1;
    session.mesh.stop();
    // Include tracks already acquired by a queued request waiting on another device.
    // Include the previous mixer until every sender has finished switching tracks.
    for (const track of session.ownedTracks) stopTrack(track);
    session.ownedTracks.clear();
    for (const context of session.ownedMixers) releaseMixer(session, context);
    session.mic = session.camera = session.screen = session.displayAudio = session.mixedAudio = null;
    session.mixer = null;
    session.mixerMic = session.mixerDisplayAudio = null;
    if (localRef.current) {
      for (const track of localRef.current.getTracks()) localRef.current.removeTrack(track);
      localRef.current = null;
    }
    remoteRef.current = new Map();
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    for (const element of mediaElements.current.values()) element.srcObject = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
    setRemoteAudioLevels({});
    setPeerConnectionStatuses({});
    setIsReconnecting(false);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!enabled || !currentUserId || !roomCode) return;
    const socket = getSocket();
    const normalizedRoomCode = roomCode.trim().toLowerCase();
    const outgoingStream = new MediaStream();
    const mesh = createWebRTCMesh({
      roomCode: normalizedRoomCode, peerId: getRoomPeerId(normalizedRoomCode),
      video: mediaType === 'meet', iceServers: ICE_SERVERS, initialStream: outgoingStream,
      send: (targetPeerId, signal) => {
        if (!socket.connected) return false;
        socket.emit('webrtc:signal', { roomCode: normalizedRoomCode, targetPeerId, signal });
        return true;
      },
      onStreams: streams => {
        remoteRef.current = streams;
        setRemoteStreams(streams);
        for (const [id, element] of mediaElements.current) {
          element.srcObject = streams.get(id) ?? null;
          if (element.srcObject) void element.play().catch(() => {});
        }
      },
      onPeerConnectionStatuses: statuses => {
        const obj: Record<string, PeerConnectionStatus> = {};
        let anyReconnecting = false;
        for (const [id, status] of statuses) {
          obj[id] = status;
          if (status === 'reconnecting') anyReconnecting = true;
        }
        setPeerConnectionStatuses(obj);
        setIsReconnecting(anyReconnecting);
      },
      onConnected: connected => { setIsConnected(connected); if (connected) setConnectionError(null); },
      onError: reportError,
    });
    const session: LocalMediaState = { mesh, stream: outgoingStream, ownedTracks: new Set(), ownedMixers: new Set(), stopped: false, revision: 0, screenRevision: 0,
      queue: Promise.resolve(), mic: null, camera: null, screen: null, displayAudio: null,
      mixedAudio: null, mixer: null, mixerMic: null, mixerDisplayAudio: null, audioDevice: '', videoDevice: '' };
    sessionRef.current = session;
    let rejoining = false;
    const onRoster = ({ roomCode: rosterRoomCode, participants }: { roomCode: string; participants: RoomParticipant[] }) => {
      if (rosterRoomCode !== normalizedRoomCode) return;
      mesh.syncRoster(participants);
      if (rejoining) { mesh.signalingRejoined(); rejoining = false; }
    };
    const onSignal = (payload: WebRTCIncomingSignalPayload) => { void mesh.receive(payload); };
    const onLeft = ({ roomCode: leftRoomCode, peerId }: { roomCode: string; peerId: string }) => {
      if (leftRoomCode === normalizedRoomCode) mesh.removePeer(peerId);
    };
    const onDisconnect = () => { mesh.signalingDisconnected(); rejoining = true; };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const desired = latest.current;
        const micEnded = desired.isMicOn && session.mic?.readyState === 'ended';
        const cameraEnded = desired.isVideoOn && !desired.isScreenSharing && session.camera?.readyState === 'ended';
        if (micEnded || cameraEnded) void refreshLocalMedia();
        if (session.mixer?.state === 'suspended') void session.mixer.resume().catch(() => {});
      }
    };
    socket.on('room:roster', onRoster);
    socket.on('webrtc:signal', onSignal);
    socket.on('room:peer-left', onLeft);
    socket.on('disconnect', onDisconnect);
    const requestRoster = () => {
      if (socket.connected) socket.emit('room:sync', { roomCode: normalizedRoomCode, peerId: getRoomPeerId(normalizedRoomCode) });
    };
    socket.on('connect', requestRoster);
    requestRoster();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      socket.off('room:roster', onRoster);
      socket.off('webrtc:signal', onSignal);
      socket.off('room:peer-left', onLeft);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', requestRoster);
      document.removeEventListener('visibilitychange', onVisible);
      stopMediaTracks();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [enabled, currentUserId, roomCode, mediaType, reportError, refreshLocalMedia, stopMediaTracks]);

  // One queue handles startup, toggles, device changes and camera recovery.
  useEffect(() => {
    if (enabled) void refreshLocalMedia();
  }, [enabled, currentUserId, roomCode, mediaType, isMicOn, isVideoOn, isScreenSharing,
    selectedAudioInputId, selectedVideoInputId, refreshLocalMedia]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session || session.stopped || !enabled || mediaType !== 'meet') return;
    const revision = ++session.screenRevision;
    let cancelled = false;
    if (!isScreenSharing) {
      if (!session.screen && !session.displayAudio) return;
      releaseTrack(session, session.screen);
      releaseTrack(session, session.displayAudio);
      session.screen = session.displayAudio = null;
      session.queue = session.queue.then(() => publishMedia(session));
      void refreshLocalMedia();
      return;
    }
    const start = async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              frameRate: { ideal: 15, max: 30 },
              width: { ideal: 1920, max: 3840 },
              height: { ideal: 1080, max: 2160 },
            },
            audio: true,
          });
        } catch (displayError) {
          if (displayError instanceof DOMException && displayError.name === 'NotAllowedError') throw displayError;
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 15, max: 30 } },
            audio: true,
          });
        }
        if (cancelled || session.stopped || session.screenRevision !== revision || !latest.current.isScreenSharing) {
          stream.getTracks().forEach(track => stopTrack(track));
          return;
        }
        const track = stream.getVideoTracks()[0];
        if (!track) { stream.getTracks().forEach(track => stopTrack(track)); latest.current.onScreenShareEnded?.(); return; }
        stream.getTracks().forEach(track => session.ownedTracks.add(track));
        track.contentHint = 'detail';
        session.screen = track;
        session.displayAudio = stream.getAudioTracks()[0] ?? null;
        track.onended = () => { if (!session.stopped && session.screen === track) latest.current.onScreenShareEnded?.(); };
        if (session.displayAudio) {
          const displayAudio = session.displayAudio;
          displayAudio.onended = () => {
            if (session.stopped || session.displayAudio !== displayAudio) return;
            releaseTrack(session, displayAudio);
            session.displayAudio = null;
            session.queue = session.queue.then(() => publishMedia(session));
          };
        }
        session.queue = session.queue.then(() => publishMedia(session));
        await session.queue;
      } catch (error) {
        if (cancelled || session.stopped) return;
        if (!(error instanceof DOMException && error.name === 'NotAllowedError')) reportError('Could not share your screen');
        latest.current.onScreenShareEnded?.();
      }
    };
    void start();
    return () => { cancelled = true; };
  }, [enabled, currentUserId, roomCode, isScreenSharing, mediaType, publishMedia, refreshLocalMedia, reportError]);

  // One AudioContext and one sampling loop serve all remote speakers.
  useEffect(() => {
    if (!enabled) return;
    let context: AudioContext;
    try { context = new AudioContext(); } catch { return; }
    const analysers = new Map<string, { track: MediaStreamTrack; source: MediaStreamAudioSourceNode; analyser: AnalyserNode; lastSpeaking: number }>();
    const unlock = () => { if (context.state === 'suspended') void context.resume().catch(() => {}); };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    const data = new Uint8Array(32);
    const timer = setInterval(() => {
      const levels: Record<string, PeerAudioLevel> = {};
      for (const [id, entry] of analysers) {
        if (remoteRef.current.get(id)?.getAudioTracks()[0] !== entry.track) {
          entry.source.disconnect(); entry.analyser.disconnect(); analysers.delete(id);
        }
      }
      for (const [id, stream] of remoteRef.current) {
        const track = stream.getAudioTracks()[0];
        if (!track || track.readyState !== 'live') continue;
        let entry = analysers.get(id);
        if (!entry) {
          try {
            const source = context.createMediaStreamSource(new MediaStream([track]));
            const analyser = context.createAnalyser(); analyser.fftSize = 64; analyser.smoothingTimeConstant = 0.35;
            source.connect(analyser);
            entry = { track, source, analyser, lastSpeaking: 0 };
            analysers.set(id, entry);
          } catch { continue; }
        }
        entry.analyser.getByteFrequencyData(data);
        let sum = 0; for (let i = 1; i <= 16; i++) sum += data[i];
        const volume = track.muted ? 0 : Math.min(100, Math.round(sum / 16 / 90 * 100));
        if (volume > 7) entry.lastSpeaking = performance.now();
        levels[id] = { volume, isSpeaking: volume > 7 || performance.now() - entry.lastSpeaking < 350 };
      }
      setRemoteAudioLevels(previous => {
        const ids = Object.keys(levels);
        return ids.length === Object.keys(previous).length && ids.every(id => previous[id]?.volume === levels[id].volume && previous[id]?.isSpeaking === levels[id].isSpeaking) ? previous : levels;
      });
    }, 100);
    return () => {
      clearInterval(timer);
      window.removeEventListener('click', unlock); window.removeEventListener('keydown', unlock);
      for (const entry of analysers.values()) { entry.source.disconnect(); entry.analyser.disconnect(); }
      void context.close().catch(() => {});
    };
  }, [enabled, currentUserId, roomCode]);

  const attachMediaElement = useCallback((peerId: string, element: HTMLMediaElement | null) => {
    if (!element) { mediaElements.current.delete(peerId); return; }
    mediaElements.current.set(peerId, element);
    element.srcObject = remoteRef.current.get(peerId) ?? null;
    if (element.srcObject) void element.play().catch(() => {});
    if ('setSinkId' in element) void (element as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(latest.current.selectedAudioOutputId === 'default' ? '' : latest.current.selectedAudioOutputId).catch(() => {});
  }, []);
  const attachLocalVideo = useCallback((element: HTMLVideoElement | null) => {
    localVideoRef.current = element;
    if (element) { element.srcObject = localRef.current; element.muted = true; void element.play().catch(() => {}); }
  }, []);
  useEffect(() => {
    for (const element of mediaElements.current.values()) {
      if ('setSinkId' in element) void (element as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(selectedAudioOutputId === 'default' ? '' : selectedAudioOutputId).catch(() => {});
    }
  }, [selectedAudioOutputId]);

  return { localStream, remoteStreams, remoteAudioLevels, peerConnectionStatuses, isReconnecting, isConnected, connectionError,
    attachMediaElement, attachLocalVideo, refreshLocalMedia, stopMediaTracks };
}
