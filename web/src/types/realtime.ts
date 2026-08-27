export interface PeerState {
  userId: string;
  name: string;
  image?: string | null;
  role: 'host' | 'speaker' | 'listener' | 'participant';
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
}

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
  'signal:offer': (payload: { roomCode: string; toUserId: string; offer: RTCSessionDescriptionInit }) => void;
  'signal:answer': (payload: { roomCode: string; toUserId: string; answer: RTCSessionDescriptionInit }) => void;
  'signal:ice-candidate': (payload: { roomCode: string; toUserId: string; candidate: RTCIceCandidateInit }) => void;
  'media:state': (payload: {
    roomCode: string;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
  }) => void;
  'stage:raise-hand': (payload: { roomCode: string; isHandRaised: boolean }) => void;
  'stage:promote': (payload: { roomCode: string; targetUserId: string }) => void;
  'stage:demote': (payload: { roomCode: string; targetUserId: string }) => void;
  'chat:message': (payload: { roomCode: string; text: string }) => void;
}

export interface ServerToClientEvents {
  'room:peers': (payload: { peers: PeerState[]; hostId: string }) => void;
  'user:joined': (payload: PeerState) => void;
  'user:left': (payload: { userId: string; newHostId?: string }) => void;
  'signal:offer': (payload: { fromUserId: string; offer: RTCSessionDescriptionInit }) => void;
  'signal:answer': (payload: { fromUserId: string; answer: RTCSessionDescriptionInit }) => void;
  'signal:ice-candidate': (payload: { fromUserId: string; candidate: RTCIceCandidateInit }) => void;
  'media:state-updated': (payload: {
    userId: string;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
  }) => void;
  'stage:hand-updated': (payload: { userId: string; isHandRaised: boolean }) => void;
  'stage:role-updated': (payload: { userId: string; role: 'host' | 'speaker' | 'listener' }) => void;
  'chat:new-message': (payload: ChatMessage) => void;
  'room:ended': (payload: { message: string }) => void;
  'error:message': (payload: { message: string }) => void;
}
