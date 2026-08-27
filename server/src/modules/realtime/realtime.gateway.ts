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
  PeerState,
} from './realtime.types.js';
import { realtimeService } from './realtime.service.js';
import { buildChatMessage, forwardSignal, buildActivePeers } from './realtime.utils.js';

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

    socket.on('room:join', async ({ roomCode, isMuted = false, isVideoOn = false }) => {
      try {
        const data = await realtimeService.getRoomAndParticipants(roomCode, user.id);
        if (!data) {
          socket.emit('error:message', { message: 'Room not found' });
          return;
        }

        const roomChannel = `room:${roomCode}`;
        await socket.join(roomChannel);

        socket.data.currentRoomCode = roomCode;
        socket.data.isMuted = isMuted;
        socket.data.isVideoOn = isVideoOn;
        socket.data.isScreenSharing = false;
        socket.data.isHandRaised = false;

        const newPeerState: PeerState = {
          userId: user.id,
          name: user.name,
          image: user.image,
          role: data.myRole,
          isMuted,
          isVideoOn,
          isScreenSharing: false,
          isHandRaised: false,
        };

        socket.to(roomChannel).emit('user:joined', newPeerState);

        const socketsInRoom = await io.in(roomChannel).fetchSockets();
        const activePeers = buildActivePeers(socketsInRoom, socket.id, data.participants, data.room.hostId);

        socket.emit('room:peers', {
          peers: activePeers,
          hostId: data.room.hostId,
        });

        logger.info({ userId: user.id, roomCode }, 'User joined realtime room');
      } catch (err) {
        logger.error({ err, userId: user.id, roomCode }, 'Error joining realtime room');
        socket.emit('error:message', { message: 'Failed to join room' });
      }
    });

    socket.on('signal:offer', ({ roomCode, toUserId, offer }) => {
      void forwardSignal(io, roomCode, toUserId, 'signal:offer', { fromUserId: user.id, offer });
    });

    socket.on('signal:answer', ({ roomCode, toUserId, answer }) => {
      void forwardSignal(io, roomCode, toUserId, 'signal:answer', { fromUserId: user.id, answer });
    });

    socket.on('signal:ice-candidate', ({ roomCode, toUserId, candidate }) => {
      void forwardSignal(io, roomCode, toUserId, 'signal:ice-candidate', { fromUserId: user.id, candidate });
    });

    socket.on('media:state', ({ roomCode, isMuted, isVideoOn, isScreenSharing }) => {
      socket.data.isMuted = isMuted;
      socket.data.isVideoOn = isVideoOn;
      socket.data.isScreenSharing = isScreenSharing;

      socket.to(`room:${roomCode}`).emit('media:state-updated', {
        userId: user.id,
        isMuted,
        isVideoOn,
        isScreenSharing,
      });
    });

    socket.on('stage:raise-hand', ({ roomCode, isHandRaised }) => {
      socket.data.isHandRaised = isHandRaised;
      socket.to(`room:${roomCode}`).emit('stage:hand-updated', {
        userId: user.id,
        isHandRaised,
      });
    });

    socket.on('stage:promote', async ({ roomCode, targetUserId }) => {
      const res = await realtimeService.updateStageRole(roomCode, user.id, targetUserId, 'speaker');
      if (!res.success) {
        socket.emit('error:message', { message: res.error || 'Failed to promote' });
        return;
      }
      io.in(`room:${roomCode}`).emit('stage:role-updated', { userId: targetUserId, role: 'speaker' });
    });

    socket.on('stage:demote', async ({ roomCode, targetUserId }) => {
      const res = await realtimeService.updateStageRole(roomCode, user.id, targetUserId, 'listener');
      if (!res.success) {
        socket.emit('error:message', { message: res.error || 'Failed to demote' });
        return;
      }
      io.in(`room:${roomCode}`).emit('stage:role-updated', { userId: targetUserId, role: 'listener' });
    });

    socket.on('chat:message', ({ roomCode, text }) => {
      if (!text || !text.trim()) return;
      const message = buildChatMessage(user.id, user.name, user.image, text);
      io.in(`room:${roomCode}`).emit('chat:new-message', message);
    });

    const handleLeave = async (roomCode: string) => {
      try {
        const { newHostId } = await realtimeService.processLeave(roomCode, user.id);
        socket.to(`room:${roomCode}`).emit('user:left', { userId: user.id, newHostId });
        await socket.leave(`room:${roomCode}`);
        socket.data.currentRoomCode = undefined;
        logger.info({ userId: user.id, roomCode, newHostId }, 'User departed room');
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
