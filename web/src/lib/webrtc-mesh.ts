import type { RoomParticipant, WebRTCIncomingSignalPayload, WebRTCSignalData } from '../types/realtime';
import { meshVideoBudget, nextVideoProfile, profileForBitrate, VIDEO_PROFILES } from './webrtc-quality';

interface Peer {
  peerId: string;
  connectionId: string;
  remoteConnectionId?: string;
  pc: RTCPeerConnection;
  stream: MediaStream;
  queue: Promise<void>;
  makingOffer: boolean;
  ignoreOffer: boolean;
  needsNegotiation: boolean;
  candidates: { connectionId: string; candidate: RTCIceCandidateInit }[];
  recoveryTimer?: ReturnType<typeof setTimeout>;
  recoveryAttempts: number;
  recoveryExhausted: boolean;
  profile: number;
  videoBudget: number;
  healthySamples: number;
  lastPackets?: { sent: number; lost: number };
}

export type PeerConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'disconnected';

interface MeshOptions {
  peerId: string;
  roomCode: string;
  video: boolean;
  iceServers: RTCIceServer[];
  initialStream?: MediaStream;
  send: (targetPeerId: string, signal: WebRTCSignalData) => boolean;
  onStreams: (streams: Map<string, MediaStream>) => void;
  onConnected: (connected: boolean) => void;
  onPeerConnectionStatuses?: (statuses: Map<string, PeerConnectionStatus>) => void;
  onError: (message: string) => void;
}

export function createWebRTCMesh(options: MeshOptions) {
  const state = {
    peers: new Map<string, Peer>(),
    roster: new Map<string, RoomParticipant>(),
    retiredConnections: new Map<string, Set<string>>(),
    audio: null as MediaStreamTrack | null,
    video: null as MediaStreamTrack | null,
    mediaStream: (options.initialStream ?? null) as MediaStream | null,
    stopped: false,
    signalingReady: false,
    sampling: false,
  };

  function alive(peer: Peer) {
    return !state.stopped && state.peers.get(peer.peerId) === peer && peer.pc.signalingState !== 'closed';
  }

  // SDP operations, sender changes and quality updates run serially per peer.
  function enqueue(peer: Peer, operation: () => Promise<void>) {
    peer.queue = peer.queue.then(async () => {
      if (alive(peer)) await operation();
    }).catch((error: unknown) => {
      if (alive(peer)) console.warn(`WebRTC operation failed for ${peer.peerId}:`, error);
    });
    return peer.queue;
  }

  function getPeerStatus(peer: Peer): PeerConnectionStatus {
    const ice = peer.pc.iceConnectionState;
    const conn = peer.pc.connectionState;

    if (conn === 'failed' || ice === 'failed') {
      return 'failed';
    }
    if (ice === 'disconnected' || conn === 'disconnected') {
      return 'reconnecting';
    }
    if (peer.recoveryAttempts > 0 && (ice === 'checking' || conn === 'connecting')) {
      return 'reconnecting';
    }
    if (conn === 'connected' || ice === 'connected' || ice === 'completed') {
      return 'connected';
    }
    if (conn === 'closed' || ice === 'closed') {
      return 'disconnected';
    }
    return 'connecting';
  }

  function publish() {
    if (state.stopped) return;
    options.onStreams(new Map(Array.from(state.peers, ([id, peer]) => [id, peer.stream])));
    options.onConnected(Array.from(state.peers.values()).some(peer => peer.pc.connectionState === 'connected'));
    if (options.onPeerConnectionStatuses) {
      const statuses = new Map<string, PeerConnectionStatus>();
      for (const [id, peer] of state.peers) {
        statuses.set(id, getPeerStatus(peer));
      }
      options.onPeerConnectionStatuses(statuses);
    }
  }

  function emit(peer: Peer, signal: Omit<WebRTCSignalData, 'connectionId'>) {
    if (!alive(peer) || !state.signalingReady) return false;
    return options.send(peer.peerId, {
      ...signal,
      connectionId: peer.connectionId,
      targetConnectionId: peer.remoteConnectionId,
    });
  }

  function negotiate(peer: Peer) {
    peer.needsNegotiation = true;
    return enqueue(peer, async () => {
      if (!peer.needsNegotiation || !state.signalingReady || peer.pc.signalingState !== 'stable') return;
      // Only one endpoint starts the initial offer. Later changes use perfect negotiation.
      if (!peer.pc.remoteDescription && options.peerId > peer.peerId) return;
      peer.needsNegotiation = false;
      peer.makingOffer = true;
      try {
        await peer.pc.setLocalDescription();
        if (!alive(peer)) return;
        const description = peer.pc.localDescription;
        if (description && !emit(peer, { type: description.type as 'offer' | 'answer', sdp: description.sdp })) {
          peer.needsNegotiation = true;
        }
      } finally {
        peer.makingOffer = false;
      }
    });
  }

  function scheduleRecovery(peer: Peer, delay = 3500) {
    if (!alive(peer) || peer.recoveryTimer || peer.recoveryExhausted) return;
    peer.recoveryTimer = setTimeout(() => {
      peer.recoveryTimer = undefined;
      if (!alive(peer) || peer.pc.connectionState === 'connected') return;
      if (!state.signalingReady) return;
      if (peer.recoveryAttempts >= 3) {
        peer.recoveryExhausted = true;
        options.onError('A participant could not reconnect. Please check your network or rejoin the call.');
        return;
      }
      peer.recoveryAttempts += 1;
      void enqueue(peer, async () => {
        // A lost answer can leave the old offer outstanding after a transport drop.
        if (peer.pc.signalingState === 'have-local-offer') await peer.pc.setLocalDescription({ type: 'rollback' });
        if (!alive(peer)) return;
        // restartIce schedules negotiationneeded; do not send a second offer here.
        peer.pc.restartIce();
        scheduleRecovery(peer, 10_000 * peer.recoveryAttempts);
      });
    }, delay);
  }

  function createPeer(peerId: string): Peer {
    const pc = new RTCPeerConnection({
      iceServers: options.iceServers,
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 0,
    });
    const peer: Peer = {
      peerId, pc, stream: new MediaStream(), connectionId: crypto.randomUUID(),
      queue: Promise.resolve(), makingOffer: false, ignoreOffer: false, needsNegotiation: false,
      candidates: [], recoveryAttempts: 0, recoveryExhausted: false, profile: 3, videoBudget: 1_400_000, healthySamples: 0,
    };
    // Register before installing handlers or adding tracks so concurrent roster/signals reuse it.
    state.peers.set(peerId, peer);
    // Only the initial offerer creates transceivers. On the answerer, JSEP creates
    // them from the offer; pre-creating with addTransceiver would duplicate m-lines.
    if (options.peerId < peerId) {
      const streams = state.mediaStream ? [state.mediaStream] : [];
      pc.addTransceiver(state.audio ?? 'audio', { direction: 'sendrecv', streams });
      if (options.video) pc.addTransceiver(state.video ?? 'video', { direction: 'sendrecv', streams });
    }
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) emit(peer, { type: 'candidate', candidate: candidate.toJSON() });
    };
    pc.ontrack = ({ track }) => {
      if (!alive(peer)) return;
      for (const old of peer.stream.getTracks()) {
        if (old.kind === track.kind && old.id !== track.id) peer.stream.removeTrack(old);
      }
      if (!peer.stream.getTracks().some(old => old.id === track.id)) peer.stream.addTrack(track);
      track.onended = () => { peer.stream.removeTrack(track); publish(); };
      track.onmute = track.onunmute = () => publish();
      publish();
    };
    pc.onnegotiationneeded = () => { void negotiate(peer); };
    pc.onsignalingstatechange = () => {
      if (pc.signalingState === 'stable' && peer.needsNegotiation) void negotiate(peer);
    };
    pc.oniceconnectionstatechange = () => {
      if (!alive(peer)) return;
      if (pc.iceConnectionState === 'disconnected') {
        scheduleRecovery(peer, 3500);
      } else if (pc.iceConnectionState === 'failed') {
        scheduleRecovery(peer, 1000);
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        if (peer.recoveryTimer && pc.connectionState === 'connected') {
          clearTimeout(peer.recoveryTimer);
          peer.recoveryTimer = undefined;
          peer.recoveryAttempts = 0;
          peer.recoveryExhausted = false;
        }
      }
      publish();
    };
    pc.onconnectionstatechange = () => {
      if (!alive(peer)) return;
      if (pc.connectionState === 'connected') {
        if (peer.recoveryTimer) clearTimeout(peer.recoveryTimer);
        peer.recoveryTimer = undefined;
        peer.recoveryAttempts = 0;
        peer.recoveryExhausted = false;
        void adaptQuality();
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        scheduleRecovery(peer, pc.connectionState === 'failed' ? 1000 : 3500);
      }
      publish();
    };
    publish();
    return peer;
  }

  function closePeer(peerId: string) {
    const peer = state.peers.get(peerId);
    if (!peer) return;
    state.peers.delete(peerId);
    if (peer.recoveryTimer) clearTimeout(peer.recoveryTimer);
    peer.pc.onicecandidate = peer.pc.ontrack = peer.pc.onnegotiationneeded = null;
    peer.pc.onsignalingstatechange = peer.pc.onconnectionstatechange = peer.pc.oniceconnectionstatechange = null;
    for (const track of peer.stream.getTracks()) {
      track.onended = track.onmute = track.onunmute = null;
      track.stop();
    }
    peer.pc.close();
    publish();
  }

  function syncRoster(participants: RoomParticipant[]) {
    if (state.stopped) return;
    const self = participants.find(participant => participant.peerId === options.peerId);
    state.signalingReady = Boolean(self);
    if (!self) return;
    state.roster = new Map(participants.filter(participant => participant.peerId && participant.peerId !== options.peerId)
      .map(participant => [participant.peerId!, participant]));
    for (const peerId of state.retiredConnections.keys()) {
      if (!state.roster.has(peerId)) state.retiredConnections.delete(peerId);
    }
    const canSendAudio = (participant: RoomParticipant) => participant.canSpeak || participant.isMuted === false;
    const wanted = new Set(Array.from(state.roster, ([peerId, participant]) =>
      options.video || canSendAudio(self) || canSendAudio(participant) ? peerId : null).filter((peerId): peerId is string => peerId !== null));
    for (const peerId of state.peers.keys()) {
      if (!wanted.has(peerId)) closePeer(peerId);
    }
    for (const peerId of wanted) {
      const peer = state.peers.get(peerId) ?? createPeer(peerId);
      if (peer.needsNegotiation || (!peer.pc.localDescription && options.peerId < peerId)) void negotiate(peer);
      if (peer.pc.connectionState === 'failed' || peer.pc.connectionState === 'disconnected') scheduleRecovery(peer);
    }
    void adaptQuality();
  }

  function removePeer(peerId: string) {
    state.roster.delete(peerId);
    state.retiredConnections.delete(peerId);
    closePeer(peerId);
  }

  function signalingDisconnected() { state.signalingReady = false; }

  // A dropped SDP/ICE message is not buffered into a later call.
  // Rejoin's roster triggers a single ICE restart for unfinished negotiations.
  function signalingRejoined() {
    if (!state.signalingReady) return;
    for (const peer of state.peers.values()) {
      if (peer.pc.connectionState !== 'connected') {
        if (peer.recoveryExhausted) { peer.recoveryExhausted = false; peer.recoveryAttempts = 0; }
        scheduleRecovery(peer, 1000);
      }
    }
  }

  async function receive(payload: WebRTCIncomingSignalPayload) {
    if (state.stopped || !state.signalingReady || payload.roomCode !== options.roomCode ||
        payload.fromPeerId === options.peerId || !state.roster.has(payload.fromPeerId)) return;
    const { fromPeerId, signal } = payload;
    let peer = state.peers.get(fromPeerId);
    if (!peer || !signal.connectionId || state.retiredConnections.get(fromPeerId)?.has(signal.connectionId)) return;
    if (signal.targetConnectionId && signal.targetConnectionId !== peer.connectionId) return;
    if (peer.remoteConnectionId && signal.connectionId !== peer.remoteConnectionId) {
      if (signal.type !== 'offer' || signal.targetConnectionId) return;
      const retired = state.retiredConnections.get(fromPeerId) ?? new Set<string>();
      retired.add(peer.remoteConnectionId);
      if (retired.size > 16) retired.delete(retired.values().next().value!);
      state.retiredConnections.set(fromPeerId, retired);
      closePeer(fromPeerId);
      peer = createPeer(fromPeerId);
    }
    const entry = peer;
    await enqueue(entry, async () => {
      const pc = entry.pc;
      if (signal.type === 'candidate' && signal.candidate) {
        const ufrag = signal.candidate.usernameFragment;
        if (entry.ignoreOffer || !pc.remoteDescription || entry.remoteConnectionId !== signal.connectionId ||
            (ufrag && !pc.remoteDescription.sdp.includes(`a=ice-ufrag:${ufrag}`))) {
          if (entry.candidates.length < 128) entry.candidates.push({ connectionId: signal.connectionId!, candidate: signal.candidate });
        } else {
          await addCandidate(entry, signal.candidate);
        }
        return;
      }
      if (!signal.sdp) return;
      if (signal.type === 'offer') {
        const collision = entry.makingOffer || pc.signalingState !== 'stable';
        entry.ignoreOffer = options.peerId < fromPeerId && collision;
        if (entry.ignoreOffer) return;
        // setRemoteDescription performs implicit rollback for the polite endpoint.
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        if (!alive(entry)) return;
        entry.remoteConnectionId = signal.connectionId;
        entry.ignoreOffer = false;
        for (const transceiver of pc.getTransceivers()) {
          const kind = transceiver.receiver.track.kind;
          if (kind !== 'audio' && (kind !== 'video' || !options.video)) continue;
          transceiver.direction = 'sendrecv';
          const track = kind === 'audio' ? state.audio : state.video;
          if (transceiver.sender.track !== track) await transceiver.sender.replaceTrack(track);
          if (state.mediaStream) transceiver.sender.setStreams(state.mediaStream);
        }
        // Answer covers the pending transceiver changes; don't immediately send another offer.
        entry.needsNegotiation = false;
        await flushCandidates(entry);
        await pc.setLocalDescription();
        if (!alive(entry)) return;
        emit(entry, { type: 'answer', sdp: pc.localDescription?.sdp });
      } else if (signal.type === 'answer' && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        if (!alive(entry)) return;
        entry.remoteConnectionId = signal.connectionId;
        entry.ignoreOffer = false;
        await flushCandidates(entry);
      }
      if (entry.needsNegotiation) void negotiate(entry);
    });
  }

  async function addCandidate(peer: Peer, candidate: RTCIceCandidateInit) {
    // Candidates from a rolled back offer or old ICE restart must not poison the current generation.
    const ufrag = candidate.usernameFragment;
    if (ufrag && !peer.pc.remoteDescription?.sdp.includes(`a=ice-ufrag:${ufrag}`)) return;
    try { await peer.pc.addIceCandidate(candidate); }
    catch (error) { if (!peer.ignoreOffer && alive(peer)) console.warn('Could not add ICE candidate:', error); }
  }

  async function flushCandidates(peer: Peer) {
    const candidates = peer.candidates;
    peer.candidates = [];
    for (const queued of candidates) {
      if (!alive(peer)) return;
      if (queued.connectionId === peer.remoteConnectionId) await addCandidate(peer, queued.candidate);
    }
  }

  async function setTracks(audio: MediaStreamTrack | null, video: MediaStreamTrack | null, stream: MediaStream) {
    if (state.stopped) return;
    state.audio = audio;
    state.video = video;
    state.mediaStream = stream;
    await Promise.all(Array.from(state.peers.values(), peer => enqueue(peer, async () => {
      for (const transceiver of peer.pc.getTransceivers()) {
        const kind = transceiver.receiver.track.kind;
        const track = kind === 'audio' ? state.audio : state.video;
        if (transceiver.sender.track !== track) await transceiver.sender.replaceTrack(track);
        // Bind a stable stream even for peers created before local media was acquired.
        transceiver.sender.setStreams(stream);
      }
    })));
    await adaptQuality();
  }

  async function adaptQuality() {
    if (state.stopped || state.sampling || !state.video) return;
    state.sampling = true;
    try {
      const peers = Array.from(state.peers.values());
      const reports = await Promise.all(peers.map(async peer => {
        try { return { peer, stats: await peer.pc.getStats() }; }
        catch { return { peer, stats: null }; }
      }));
      let uplink = Infinity;
      const network = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
      if (network?.saveData || network?.effectiveType === '2g' || network?.effectiveType === 'slow-2g') uplink = 400_000;
      else if (network?.effectiveType === '3g') uplink = 1_200_000;
      const pathCapacities = new Map<Peer, number>();
      let observedUplink = 0;
      for (const { peer, stats } of reports) {
        stats?.forEach(stat => {
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.nominated && stat.availableOutgoingBitrate > 0) {
            pathCapacities.set(peer, stat.availableOutgoingBitrate);
            observedUplink = Math.max(observedUplink, stat.availableOutgoingBitrate);
          }
        });
      }
      // A slow receiver limits its own copy. The strongest measured path gives a
      // conservative shared-uplink estimate; browser congestion control remains active.
      uplink = Math.min(uplink, observedUplink || 4_000_000);
      const sharedBudget = meshVideoBudget(peers.length, uplink);
      for (const { peer, stats } of reports) {
        if (!alive(peer)) continue;
        const pathCapacity = pathCapacities.get(peer);
        peer.videoBudget = Math.min(sharedBudget, pathCapacity ? meshVideoBudget(1, pathCapacity) : sharedBudget);
        let desired = profileForBitrate(peer.videoBudget);
        let congested = false;
        let sent = 0;
        let lost = 0;
        stats?.forEach(stat => {
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.nominated && stat.currentRoundTripTime > 0.5) congested = true;
          if (stat.type === 'outbound-rtp' && (stat.kind === 'video' || stat.mediaType === 'video')) {
            sent += stat.packetsSent ?? 0;
            if (stat.qualityLimitationReason === 'bandwidth' || stat.qualityLimitationReason === 'cpu') congested = true;
          }
          if (stat.type === 'remote-inbound-rtp' && (stat.kind === 'video' || stat.mediaType === 'video')) lost += stat.packetsLost ?? 0;
        });
        if (peer.lastPackets) {
          const sentDelta = sent - peer.lastPackets.sent;
          const lostDelta = Math.max(0, lost - peer.lastPackets.lost);
          if (sentDelta > 0 && lostDelta / sentDelta > 0.05) congested = true;
        }
        peer.lastPackets = { sent, lost };
        if (congested) desired = Math.max(0, Math.min(desired, peer.profile - 1));
        const next = nextVideoProfile(peer.profile, desired, peer.healthySamples);
        peer.profile = next.profile;
        peer.healthySamples = next.healthySamples;
      }
      await Promise.all(peers.map(peer => enqueue(peer, async () => {
        const sender = peer.pc.getSenders().find(s => s.track?.kind === 'video');
        if (!sender?.track) return;
        const params = sender.getParameters();
        if (!params.encodings?.length) return;
        const profile = VIDEO_PROFILES[peer.profile];
        const height = sender.track.getSettings().height ?? 720;
        const isScreenShare = sender.track.contentHint === 'detail';
        params.degradationPreference = isScreenShare ? 'maintain-resolution' : 'balanced';
        for (const encoding of params.encodings) {
          encoding.active = peer.videoBudget >= 80_000;
          encoding.maxBitrate = isScreenShare
            ? Math.max(250_000, Math.min(peer.videoBudget, 3_000_000))
            : Math.max(10_000, Math.min(peer.videoBudget, profile.bitrate));
          encoding.maxFramerate = isScreenShare ? Math.min(15, profile.frameRate) : profile.frameRate;
          encoding.scaleResolutionDownBy = isScreenShare ? 1 : Math.max(1, height / profile.height);
        }
        try { await sender.setParameters(params); }
        catch { /* Older browsers retain their built-in congestion controller. */ }
      })));
    } finally { state.sampling = false; }
  }

  function stop() {
    if (state.stopped) return;
    state.stopped = true;
    clearInterval(qualityTimer);
    for (const id of state.peers.keys()) closePeer(id);
    state.roster.clear();
    state.retiredConnections.clear();
    state.audio = state.video = null;
  }
  const qualityTimer = setInterval(() => { void adaptQuality(); }, 4000);
  return { syncRoster, removePeer, signalingDisconnected, signalingRejoined, receive, setTracks, stop };

}


export type WebRTCMesh = ReturnType<typeof createWebRTCMesh>;
