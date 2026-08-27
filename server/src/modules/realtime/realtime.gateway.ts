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
import { roomService } from '../rooms/room.service.js';
import { db } from '../../db/index.js';
import { room, roomUser } from '../../db/room-schema.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

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
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, roomCode),
        });

        if (!foundRoom) {
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

        const participants = await db.query.roomUser.findMany({
          where: and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.status, 'active')),
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });

        const myParticipant = participants.find((p) => p.userId === user.id);
        const myRole = (myParticipant?.role as PeerState['role']) || (foundRoom.hostId === user.id ? 'host' : 'participant');

        const newPeerState: PeerState = {
          userId: user.id,
          name: user.name,
          image: user.image,
          role: myRole,
          isMuted,
          isVideoOn,
          isScreenSharing: false,
          isHandRaised: false,
        };

        socket.to(roomChannel).emit('user:joined', newPeerState);

        const socketsInRoom = await io.in(roomChannel).fetchSockets();
        const activePeers: PeerState[] = [];

        for (const peerSocket of socketsInRoom) {
          if (peerSocket.id !== socket.id && peerSocket.data.user) {
            const peerUserId = peerSocket.data.user.id;
            const peerDbData = participants.find((p) => p.userId === peerUserId);
            activePeers.push({
              userId: peerUserId,
              name: peerSocket.data.user.name,
              image: peerSocket.data.user.image,
              role: (peerDbData?.role as PeerState['role']) || (foundRoom.hostId === peerUserId ? 'host' : 'participant'),
              isMuted: peerSocket.data.isMuted ?? false,
              isVideoOn: peerSocket.data.isVideoOn ?? false,
              isScreenSharing: peerSocket.data.isScreenSharing ?? false,
              isHandRaised: peerSocket.data.isHandRaised ?? false,
            });
          }
        }

        socket.emit('room:peers', {
          peers: activePeers,
          hostId: foundRoom.hostId,
        });

        logger.info({ userId: user.id, roomCode }, 'User joined realtime room');
      } catch (err) {
        logger.error({ err, userId: user.id, roomCode }, 'Error joining realtime room');
        socket.emit('error:message', { message: 'Failed to join room' });
      }
    });

    socket.on('signal:offer', ({ roomCode, toUserId, offer }) => {
      io.in(`room:${roomCode}`).fetchSockets().then((sockets) => {
        const targetSocket = sockets.find((s) => s.data.user?.id === toUserId);
        if (targetSocket) {
          targetSocket.emit('signal:offer', {
            fromUserId: user.id,
            offer,
          });
        }
      });
    });

    socket.on('signal:answer', ({ roomCode, toUserId, answer }) => {
      io.in(`room:${roomCode}`).fetchSockets().then((sockets) => {
        const targetSocket = sockets.find((s) => s.data.user?.id === toUserId);
        if (targetSocket) {
          targetSocket.emit('signal:answer', {
            fromUserId: user.id,
            answer,
          });
        }
      });
    });

    socket.on('signal:ice-candidate', ({ roomCode, toUserId, candidate }) => {
      io.in(`room:${roomCode}`).fetchSockets().then((sockets) => {
        const targetSocket = sockets.find((s) => s.data.user?.id === toUserId);
        if (targetSocket) {
          targetSocket.emit('signal:ice-candidate', {
            fromUserId: user.id,
            candidate,
          });
        }
      });
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
      try {
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, roomCode),
        });

        if (!foundRoom || foundRoom.hostId !== user.id) {
          socket.emit('error:message', { message: 'Only the host can promote speakers.' });
          return;
        }

        await db
          .update(roomUser)
          .set({ role: 'speaker' })
          .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.userId, targetUserId)));

        io.in(`room:${roomCode}`).emit('stage:role-updated', {
          userId: targetUserId,
          role: 'speaker',
        });
      } catch (err) {
        logger.error({ err }, 'Error promoting speaker');
      }
    });

    socket.on('stage:demote', async ({ roomCode, targetUserId }) => {
      try {
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, roomCode),
        });

        if (!foundRoom || foundRoom.hostId !== user.id) {
          socket.emit('error:message', { message: 'Only the host can demote speakers.' });
          return;
        }

        await db
          .update(roomUser)
          .set({ role: 'listener' })
          .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.userId, targetUserId)));

        io.in(`room:${roomCode}`).emit('stage:role-updated', {
          userId: targetUserId,
          role: 'listener',
        });
      } catch (err) {
        logger.error({ err }, 'Error demoting speaker');
      }
    });

    socket.on('chat:message', ({ roomCode, text }) => {
      if (!text || !text.trim()) return;

      const messagePayload = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: user.name,
        image: user.image,
        text: text.trim().slice(0, 1000),
        timestamp: Date.now(),
      };

      io.in(`room:${roomCode}`).emit('chat:new-message', messagePayload);
    });

    const handleLeave = async (roomCode: string) => {
      try {
        const result = await roomService.leaveRoom(user.id, roomCode);
        const newHostId = result.transferredHost ? result.newHostId : undefined;

        socket.to(`room:${roomCode}`).emit('user:left', {
          userId: user.id,
          newHostId,
        });

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
