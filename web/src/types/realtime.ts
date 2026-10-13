export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  image?: string | null;
  text: string;
  timestamp: number;
}

export interface RoomParticipant {
  peerId?: string;
  userId: string;
  name: string;
  image?: string | null;
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  handRaised?: boolean;
  canSpeak?: boolean;
  isMirrored?: boolean;
}

export interface ClientToServerEvents {
  'room:join': (payload: { roomCode: string; peerId: string; isMuted?: boolean; isVideoOn?: boolean; isScreenSharing?: boolean; handRaised?: boolean; isMirrored?: boolean }) => void;
  'room:sync': (payload: { roomCode: string; peerId: string }) => void;
  'room:leave': (payload: { roomCode: string }) => void;
  'room:media-toggle': (payload: { roomCode: string; isMuted?: boolean; isVideoOn?: boolean; isScreenSharing?: boolean; handRaised?: boolean; isMirrored?: boolean }) => void;
  'room:raise-hand': (payload: { roomCode: string; handRaised: boolean }) => void;
  'room:grant-mic': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:revoke-mic': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:mute-user': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:request-unmute': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:kick-user': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:transfer-host': (payload: { roomCode: string; newHostUserId: string }) => void;
  'room:switch-mode': (payload: { roomCode: string; newRoomCode: string; newType: 'meet' | 'audio'; title?: string }) => void;
  'whiteboard:toggle': (payload: { roomCode: string; isOpen: boolean }) => void;
  'whiteboard:update': (payload: WhiteboardScenePayload) => void;
  'whiteboard:sync': (payload: { roomCode: string }) => void;
  'chat:message': (payload: { roomCode: string; text: string }) => void;
  'room:reaction': (payload: { roomCode: string; emoji: string }) => void;
  'webrtc:signal': (payload: WebRTCSignalPayload) => void;
  'webinar:join': (payload: { webinarCode: string }) => void;
  'webinar:leave': (payload: { webinarCode: string }) => void;
  'webinar:chat': (payload: { webinarCode: string; text: string }) => void;
  'webinar:reaction': (payload: { webinarCode: string; emoji: string }) => void;
  'webinar:whiteboard:toggle': (payload: { webinarCode: string; isOpen: boolean }) => void;
  'webinar:whiteboard:update': (payload: { webinarCode: string; elements: readonly unknown[]; appState?: Record<string, unknown> }) => void;
  'webinar:whiteboard:sync': (payload: { webinarCode: string }) => void;
  'webinar:qa:ask': (payload: { webinarCode: string; text: string }) => void;
  'webinar:qa:upvote': (payload: { webinarCode: string; questionId: string }) => void;
  'webinar:qa:answer': (payload: { webinarCode: string; questionId: string }) => void;
}

export interface WebRTCSignalData {
  type: 'offer' | 'answer' | 'candidate';
  connectionId: string;
  targetConnectionId?: string;
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
  targetPeerId: string;
  signal: WebRTCSignalData;
}

export interface WebRTCIncomingSignalPayload {
  roomCode: string;
  fromPeerId: string;
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
  hasPasscode?: boolean;
}

export interface RoomSwitchedPayload {
  fromRoomCode: string;
  newRoomCode: string;
  newType: 'meet' | 'audio';
  title?: string;
  hostName: string;
}

export interface WhiteboardScenePayload {
  roomCode: string;
  elements: readonly unknown[];
  appState?: Record<string, unknown>;
}

export interface WhiteboardTogglePayload {
  roomCode: string;
  isOpen: boolean;
  elements?: readonly unknown[];
  appState?: Record<string, unknown>;
}

export interface WebinarQuestion {
  id: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  text: string;
  upvotes: number;
  upvotedBy: string[];
  isAnswered: boolean;
  timestamp: number;
}

export interface ServerToClientEvents {
  'chat:new-message': (payload: ChatMessage) => void;
  'room:roster': (payload: { roomCode: string; participants: RoomParticipant[] }) => void;
  'room:user-joined': (payload: { userId: string; name: string; image?: string | null }) => void;
  'room:peer-left': (payload: { roomCode: string; peerId: string }) => void;
  'room:user-left': (payload: { roomCode: string; userId: string; name: string }) => void;
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
  'room:switched': (payload: RoomSwitchedPayload) => void;
  'whiteboard:toggled': (payload: WhiteboardTogglePayload) => void;
  'whiteboard:updated': (payload: WhiteboardScenePayload) => void;
  'room:reaction': (payload: RoomReaction) => void;
  'webrtc:signal': (payload: WebRTCIncomingSignalPayload) => void;
  'error:message': (payload: { message: string }) => void;
  'webinar:status:changed': (payload: { status: 'scheduled' | 'live' | 'ended'; startedAt?: Date | null; endedAt?: Date | null }) => void;
  'webinar:updated': (payload: { title?: string; description?: string | null; youtubeVideoId?: string | null; allowChat?: boolean; allowQa?: boolean; allowWhiteboard?: boolean; allowReactions?: boolean }) => void;
  'webinar:stats': (payload: { viewerCount: number }) => void;
  'webinar:chat:new': (payload: ChatMessage) => void;
  'webinar:reaction:fly': (payload: RoomReaction) => void;
  'webinar:whiteboard:toggled': (payload: { webinarCode: string; isOpen: boolean; elements?: readonly unknown[]; appState?: Record<string, unknown> }) => void;
  'webinar:whiteboard:updated': (payload: { webinarCode: string; elements: readonly unknown[]; appState?: Record<string, unknown> }) => void;
  'webinar:qa:list': (payload: { questions: WebinarQuestion[] }) => void;
  'webinar:qa:new': (payload: WebinarQuestion) => void;
  'webinar:qa:updated': (payload: WebinarQuestion) => void;
}
