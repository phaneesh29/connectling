export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  image?: string | null;
  text: string;
  timestamp: number;
}

export interface ClientToServerEvents {
  'room:join': (payload: { roomCode: string; isMuted?: boolean; isVideoOn?: boolean }) => void;
  'room:leave': (payload: { roomCode: string }) => void;
  'chat:message': (payload: { roomCode: string; text: string }) => void;
}

export interface ServerToClientEvents {
  'chat:new-message': (payload: ChatMessage) => void;
  'room:user-joined': (payload: { userId: string; name: string }) => void;
  'room:user-left': (payload: { userId: string; name: string }) => void;
  'room:ended': (payload: { message: string }) => void;
  'error:message': (payload: { message: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  currentRoomCode?: string;
}
