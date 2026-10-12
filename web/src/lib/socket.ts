import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/realtime';
import { SERVER_URL } from './config';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: AppSocket | null = null;

export const getSocket = (): AppSocket => {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket'],
    });
  }

  return socketInstance;
};

// Stable across transport reconnects, different for every browser tab/page lifetime.
const roomPeers = new Map<string, string>();
export const getRoomPeerId = (roomCode: string): string => {
  const normalized = roomCode.trim().toLowerCase();
  let id = roomPeers.get(normalized);
  if (!id) { id = crypto.randomUUID(); roomPeers.set(normalized, id); }
  return id;
};
