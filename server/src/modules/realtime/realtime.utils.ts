import crypto from 'node:crypto';
import type { RemoteSocket } from 'socket.io';
import type { RealtimeServer } from './realtime.gateway.js';
import type { ChatMessage, PeerState, ServerToClientEvents, SocketData } from './realtime.types.js';

export const buildChatMessage = (
  userId: string,
  name: string,
  image: string | null | undefined,
  text: string
): ChatMessage => ({
  id: crypto.randomUUID(),
  userId,
  name,
  image,
  text: text.trim().slice(0, 1000),
  timestamp: Date.now(),
});

export const forwardSignal = async <EventName extends keyof ServerToClientEvents>(
  io: RealtimeServer,
  roomCode: string,
  targetUserId: string,
  event: EventName,
  payload: Parameters<ServerToClientEvents[EventName]>[0]
) => {
  const sockets = await io.in(`room:${roomCode}`).fetchSockets();
  const targetSocket = sockets.find((s) => s.data.user?.id === targetUserId);
  if (targetSocket) {
    (targetSocket.emit as (e: string, p: unknown) => void)(event, payload);
  }
};

export const buildActivePeers = (
  socketsInRoom: RemoteSocket<Record<string, unknown>, SocketData>[],
  currentSocketId: string,
  participants: Array<{ userId: string; role: string }>,
  hostId: string
): PeerState[] => {
  const peers: PeerState[] = [];

  for (const peerSocket of socketsInRoom) {
    if (peerSocket.id !== currentSocketId && peerSocket.data.user) {
      const peerUserId = peerSocket.data.user.id;
      const peerDbData = participants.find((p) => p.userId === peerUserId);

      peers.push({
        userId: peerUserId,
        name: peerSocket.data.user.name,
        image: peerSocket.data.user.image,
        role: (peerDbData?.role as PeerState['role']) || (hostId === peerUserId ? 'host' : 'participant'),
        isMuted: peerSocket.data.isMuted ?? false,
        isVideoOn: peerSocket.data.isVideoOn ?? false,
        isScreenSharing: peerSocket.data.isScreenSharing ?? false,
        isHandRaised: peerSocket.data.isHandRaised ?? false,
      });
    }
  }

  return peers;
};
