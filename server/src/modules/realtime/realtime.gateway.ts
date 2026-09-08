import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { socketAuthMiddleware, type AuthenticatedSocket } from './realtime.auth.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './realtime.types.js';
import { realtimeService } from './realtime.service.js';
import { buildChatMessage } from './realtime.utils.js';

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let ioInstance: RealtimeServer | null = null;

export const getRealtimeServer = (): RealtimeServer => {
  if (!ioInstance) {
    throw new Error('RealtimeServer has not been initialized yet.');
  }
  return ioInstance;
};

export const initRealtimeGateway = (httpServer: HttpServer): RealtimeServer => {
  const corsOrigin = env.CORS_ORIGIN.includes(',')
    ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : env.CORS_ORIGIN;

  const io: RealtimeServer = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
    transports: ['websocket'],
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    logger.info({ userId: user.id, socketId: socket.id }, 'Realtime socket connected');

    socket.on('room:join', async ({ roomCode }) => {
      try {
        const roomChannel = `room:${roomCode}`;
        await socket.join(roomChannel);
        socket.data.currentRoomCode = roomCode;

        socket.to(roomChannel).emit('room:user-joined', {
          userId: user.id,
          name: user.name,
        });

        logger.info({ userId: user.id, roomCode }, 'User joined chat room');
      } catch (err) {
        logger.error({ err, userId: user.id, roomCode }, 'Error joining chat room');
        socket.emit('error:message', { message: 'Failed to join chat room' });
      }
    });

    socket.on('chat:message', ({ roomCode, text }) => {
      if (!text || !text.trim()) return;
      const message = buildChatMessage(user.id, user.name, user.image, text);
      io.in(`room:${roomCode}`).emit('chat:new-message', message);
      void realtimeService.publishEvent(roomCode, { type: 'chat:new-message', ...message });
    });

    const handleLeave = async (roomCode: string) => {
      if (!socket.data.currentRoomCode) return;
      socket.data.currentRoomCode = undefined;

      try {
        const roomChannel = `room:${roomCode}`;
        socket.to(roomChannel).emit('room:user-left', {
          userId: user.id,
          name: user.name,
        });

        await socket.leave(roomChannel);
        logger.info({ userId: user.id, roomCode }, 'User departed chat room');
      } catch (err) {
        logger.error({ err, userId: user.id, roomCode }, 'Error handling socket leave');
      }
    };

    socket.on('room:leave', ({ roomCode }) => {
      void handleLeave(roomCode);
    });

    socket.on('disconnecting', () => {
      const roomCode = socket.data.currentRoomCode;
      if (roomCode) {
        void handleLeave(roomCode);
      }
    });

    socket.on('disconnect', () => {
      logger.info({ userId: user.id, socketId: socket.id }, 'Socket disconnected');
    });
  });

  ioInstance = io;
  return io;
};
