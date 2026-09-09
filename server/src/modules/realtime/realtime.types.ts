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
  handRaised?: boolean;
  canSpeak?: boolean;
}

export interface ClientToServerEvents {
  'room:join': (payload: { roomCode: string; isMuted?: boolean; isVideoOn?: boolean; handRaised?: boolean }) => void;
  'room:leave': (payload: { roomCode: string }) => void;
  'room:media-toggle': (payload: { roomCode: string; isMuted?: boolean; isVideoOn?: boolean; handRaised?: boolean }) => void;
  'room:raise-hand': (payload: { roomCode: string; handRaised: boolean }) => void;
  'room:grant-mic': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:revoke-mic': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:mute-user': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:kick-user': (payload: { roomCode: string; targetUserId: string }) => void;
  'room:transfer-host': (payload: { roomCode: string; newHostUserId: string }) => void;
  'chat:message': (payload: { roomCode: string; text: string }) => void;
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
  'room:kicked': (payload: { message: string }) => void;
  'room:user-kicked': (payload: { targetUserId: string; targetName: string }) => void;
  'room:host-transferred': (payload: { previousHostId: string; newHostId: string; newHostName: string }) => void;
  'error:message': (payload: { message: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
  'participant:update': (userId: string, data: Partial<SocketData>) => void;
  'participant:kick': (userId: string, roomCode: string, message: string) => void;
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
  handRaised?: boolean;
  canSpeak?: boolean;
}
