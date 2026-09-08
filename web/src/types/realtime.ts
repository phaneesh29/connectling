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
}

export interface ClientToServerEvents {
  'room:join': (payload: { roomCode: string; isMuted?: boolean; isVideoOn?: boolean }) => void;
  'room:leave': (payload: { roomCode: string }) => void;
  'room:media-toggle': (payload: { roomCode: string; isMuted?: boolean; isVideoOn?: boolean }) => void;
  'chat:message': (payload: { roomCode: string; text: string }) => void;
}

export interface ServerToClientEvents {
  'chat:new-message': (payload: ChatMessage) => void;
  'room:roster': (payload: { participants: RoomParticipant[] }) => void;
  'room:user-joined': (payload: { userId: string; name: string; image?: string | null }) => void;
  'room:user-left': (payload: { userId: string; name: string }) => void;
  'room:ended': (payload: { message: string }) => void;
  'error:message': (payload: { message: string }) => void;
}
