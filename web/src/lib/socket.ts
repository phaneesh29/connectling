import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/realtime';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: AppSocket | null = null;

export const getSocket = (): AppSocket => {
  if (!socketInstance) {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

    socketInstance = io(serverUrl, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });
  }

  return socketInstance;
};
