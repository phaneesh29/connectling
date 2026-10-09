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
      reconnectionDelay: 200,
      reconnectionDelayMax: 1000,
      timeout: 10000,
      transports: ['websocket'],
    });
  }

  return socketInstance;
};
