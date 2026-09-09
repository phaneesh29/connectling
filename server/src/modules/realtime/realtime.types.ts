export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  image?: string | null;
  text: string;
  timestamp: number;
}

export interface RoomParticipant {
  userId: string;
  name: string;
  image?: string | null;
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  handRaised?: boolean;
  canSpeak?: boolean;
}

export interface ClientToServerEvents {
  'room:join': (payload: { roomCode: string; isMuted?: boolean; isVideoOn?: boolean; isScreenSharing?: boolean; handRaised?: boolean }) => void;
  'room:leave': (payload: { roomCode: string }) => void;
  'room:media-toggle': (payload: { roomCode: string; isMuted?: boolean; isVideoOn?: boolean; isScreenSharing?: boolean; handRaised?: boolean }) => void;
  'room:raise-hand': (payload: { roomCode: string; handRaised: boolean }) => void;
  'room:grant-mic': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:revoke-mic': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:mute-user': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:request-unmute': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:kick-user': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:transfer-host': (payload: { roomCode: string; newHostUserId: string }) => void;
  'chat:message': (payload: { roomCode: string; text: string }) => void;
  'room:reaction': (payload: { roomCode: string; emoji: string }) => void;
  'webrtc:signal': (payload: WebRTCSignalPayload) => void;
}

export interface WebRTCSignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  } | null;
}

export interface WebRTCSignalPayload {
  roomCode: string;
  targetUserId: string;
  signal: WebRTCSignalData;
}

export interface WebRTCIncomingSignalPayload {
  fromUserId: string;
  signal: WebRTCSignalData;
}

export interface RoomReaction {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  timestamp: number;
}

export interface RoomSettingsPayload {
  id: string;
  roomId: string;
  micForAll: boolean;
  videoForAll: boolean;
  screenShareForAll: boolean;
  allowChat: boolean;
  allowRaiseHand: boolean;
  maxParticipants: number;
  isPrivate: boolean;
  passcode?: string | null;
}

export interface ServerToClientEvents {
  'chat:new-message': (payload: ChatMessage) => void;
  'room:roster': (payload: { participants: RoomParticipant[] }) => void;
  'room:user-joined': (payload: { userId: string; name: string; image?: string | null }) => void;
  'room:user-left': (payload: { userId: string; name: string }) => void;
  'room:ended': (payload: { message: string }) => void;
  'room:settings-updated': (payload: RoomSettingsPayload) => void;
  'room:hand-raised': (payload: { userId: string; name: string; handRaised: boolean }) => void;
  'room:mic-granted': (payload: { targetUserId: string; byUserId: string }) => void;
  'room:mic-revoked': (payload: { targetUserId: string }) => void;
  'room:user-muted': (payload: { targetUserId: string; byHost: boolean }) => void;
  'room:unmute-requested': (payload: { targetUserId: string; hostName: string }) => void;
  'room:kicked': (payload: { message: string }) => void;
  'room:user-kicked': (payload: { targetUserId: string; targetName: string }) => void;
  'room:host-transferred': (payload: { previousHostId: string; newHostId: string; newHostName: string }) => void;
  'room:reaction': (payload: RoomReaction) => void;
  'webrtc:signal': (payload: WebRTCIncomingSignalPayload) => void;
  'error:message': (payload: { message: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
  'participant:update': (userId: string, data: Partial<SocketData>) => void;
  'participant:kick': (userId: string, roomCode: string, message: string) => void;
  'participant:leave': (userId: string, roomCode: string) => void;
}

export interface SocketData {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  currentRoomCode?: string;
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  handRaised?: boolean;
  canSpeak?: boolean;
}
