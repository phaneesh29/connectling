import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { socketAuthMiddleware, type AuthenticatedSocket } from './realtime.auth.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  RoomParticipant,
} from './realtime.types.js';
import { buildChatMessage } from './realtime.utils.js';
import { db } from '../../db/index.js';
import { room } from '../../db/room-schema.js';
import { eq } from 'drizzle-orm';
import { normalizeRoomCode } from '../rooms/room.utils.js';

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

const fetchRoomParticipants = async (
  io: RealtimeServer,
  roomCode: string,
  excludeUserId?: string
): Promise<RoomParticipant[]> => {
  const roomChannel = `room:${roomCode}`;
  const sockets = await io.in(roomChannel).fetchSockets();
  const map = new Map<string, RoomParticipant>();

  for (const s of sockets) {
    const data = s.data;
    const u = data?.user;
    if (u?.id && u.id !== excludeUserId && !map.has(u.id)) {
      map.set(u.id, {
        userId: u.id,
        name: u.name,
        image: u.image,
        isMuted: data.isMuted ?? false,
        isVideoOn: data.isVideoOn ?? true,
        handRaised: data.handRaised ?? false,
        canSpeak: data.canSpeak ?? false,
      });
    }
  }

  return Array.from(map.values());
};

const updateParticipantStateAcrossCluster = (
  io: RealtimeServer,
  userId: string,
  updates: Partial<SocketData>
) => {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data?.user?.id === userId) {
      Object.assign(socket.data, updates);
    }
  }
  io.serverSideEmit('participant:update', userId, updates);
};

const kickParticipantAcrossCluster = async (
  io: RealtimeServer,
  userId: string,
  roomCode: string,
  message: string
) => {
  const roomChannel = `room:${roomCode}`;
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data?.user?.id === userId) {
      socket.emit('room:kicked', { message });
      socket.data.currentRoomCode = undefined;
      await socket.leave(roomChannel);
    }
  }
  io.serverSideEmit('participant:kick', userId, roomCode, message);
};

export const notifyUserLeftRoom = async (
  userId: string,
  roomCode: string,
  userName?: string
): Promise<void> => {
  if (!ioInstance) return;
  const roomChannel = `room:${roomCode}`;

  let departingName = userName || 'Participant';
  for (const socket of ioInstance.sockets.sockets.values()) {
    if (socket.data?.user?.id === userId) {
      if (socket.data?.user?.name) {
        departingName = socket.data.user.name;
      }
      socket.data.currentRoomCode = undefined;
      await socket.leave(roomChannel);
      socket.disconnect(true);
    }
  }

  ioInstance.serverSideEmit('participant:leave', userId, roomCode);

  ioInstance.to(roomChannel).emit('room:user-left', {
    userId,
    name: departingName,
  });

  const participants = await fetchRoomParticipants(ioInstance, roomCode, userId);
  ioInstance.in(roomChannel).emit('room:roster', { participants });

  logger.info(
    { userId, roomCode, remaining: participants.length },
    'User departed space via instant HTTP leave signal'
  );
};

export const initRealtimeGateway = (httpServer: HttpServer): RealtimeServer => {
  const corsOrigin = env.CORS_ORIGIN.includes(',')
    ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : env.CORS_ORIGIN;

  const pubClient = createRedisClient('socketio:pub');
  const subClient = pubClient.duplicate();
  subClient.on('error', (err) => {
    logger.warn({ err: err.message, client: 'socketio:sub' }, 'Redis broker connection error');
  });
  subClient.on('connect', () => {
    logger.info({ client: 'socketio:sub' }, 'Redis broker client connected');
  });

  const io: RealtimeServer = new Server(httpServer, {
    adapter: createAdapter(pubClient, subClient),
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
    transports: ['websocket'],
    pingTimeout: 5000,
    pingInterval: 3000,
  });

  io.on('participant:update', (userId, updates) => {
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data?.user?.id === userId) {
        Object.assign(socket.data, updates);
      }
    }
  });

  io.on('participant:kick', async (userId, roomCode, message) => {
    const roomChannel = `room:${roomCode}`;
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data?.user?.id === userId) {
        socket.emit('room:kicked', { message });
        socket.data.currentRoomCode = undefined;
        await socket.leave(roomChannel);
      }
    }
  });

  io.on('participant:leave', async (userId, roomCode) => {
    const roomChannel = `room:${roomCode}`;
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data?.user?.id === userId) {
        socket.data.currentRoomCode = undefined;
        await socket.leave(roomChannel);
        socket.disconnect(true);
      }
    }
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    logger.info({ userId: user.id, socketId: socket.id }, 'Realtime socket connected');

    socket.on('room:join', async ({ roomCode, isMuted, isVideoOn, handRaised }) => {
      try {
        const roomChannel = `room:${roomCode}`;
        await socket.join(roomChannel);
        socket.data.currentRoomCode = roomCode;
        if (typeof isMuted === 'boolean') socket.data.isMuted = isMuted;
        if (typeof isVideoOn === 'boolean') socket.data.isVideoOn = isVideoOn;
        if (typeof handRaised === 'boolean') socket.data.handRaised = handRaised;

        socket.to(roomChannel).emit('room:user-joined', {
          userId: user.id,
          name: user.name,
          image: user.image,
        });

        const participants = await fetchRoomParticipants(io, roomCode);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info(
          { userId: user.id, roomCode, participantCount: participants.length },
          'User joined chat room'
        );
      } catch (err) {
        logger.error({ err, userId: user.id, roomCode }, 'Error joining chat room');
        socket.emit('error:message', { message: 'Failed to join chat room' });
      }
    });

    socket.on('room:media-toggle', async ({ roomCode, isMuted, isVideoOn, handRaised }) => {
      if (typeof isMuted === 'boolean') socket.data.isMuted = isMuted;
      if (typeof isVideoOn === 'boolean') socket.data.isVideoOn = isVideoOn;
      if (typeof handRaised === 'boolean') socket.data.handRaised = handRaised;

      const participants = await fetchRoomParticipants(io, roomCode);
      io.in(`room:${roomCode}`).emit('room:roster', { participants });
    });

    socket.on('room:raise-hand', async ({ roomCode, handRaised }) => {
      socket.data.handRaised = handRaised;
      const roomChannel = `room:${roomCode}`;

      io.in(roomChannel).emit('room:hand-raised', {
        userId: user.id,
        name: user.name,
        handRaised,
      });

      const participants = await fetchRoomParticipants(io, roomCode);
      io.in(roomChannel).emit('room:roster', { participants });

      logger.info({ userId: user.id, roomCode, handRaised }, 'User toggled hand raise');
    });

    socket.on('room:grant-mic', async ({ roomCode, targetUserId }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, normalized),
          columns: { hostId: true },
        });

        if (!foundRoom || foundRoom.hostId !== user.id) {
          socket.emit('error:message', { message: 'Only the host can grant speaking permission.' });
          return;
        }

        const roomChannel = `room:${roomCode}`;
        updateParticipantStateAcrossCluster(io, targetUserId, {
          canSpeak: true,
          handRaised: false,
          isMuted: false,
        });

        io.in(roomChannel).emit('room:mic-granted', {
          targetUserId,
          byUserId: user.id,
        });

        const participants = await fetchRoomParticipants(io, roomCode);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ hostId: user.id, targetUserId, roomCode }, 'Host granted mic permission');
      } catch (err) {
        logger.error({ err, hostId: user.id, targetUserId, roomCode }, 'Error granting mic permission');
      }
    });

    socket.on('room:revoke-mic', async ({ roomCode, targetUserId }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, normalized),
          columns: { hostId: true },
        });

        if (!foundRoom || foundRoom.hostId !== user.id) {
          socket.emit('error:message', { message: 'Only the host can revoke speaking permission.' });
          return;
        }

        const roomChannel = `room:${roomCode}`;
        updateParticipantStateAcrossCluster(io, targetUserId, {
          canSpeak: false,
          isMuted: true,
        });

        io.in(roomChannel).emit('room:mic-revoked', {
          targetUserId,
        });

        const participants = await fetchRoomParticipants(io, roomCode);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ hostId: user.id, targetUserId, roomCode }, 'Host revoked mic permission');
      } catch (err) {
        logger.error({ err, hostId: user.id, targetUserId, roomCode }, 'Error revoking mic permission');
      }
    });

    socket.on('room:mute-user', async ({ roomCode, targetUserId }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, normalized),
          columns: { hostId: true },
        });

        if (!foundRoom || foundRoom.hostId !== user.id) {
          socket.emit('error:message', { message: 'Only the host can mute participants.' });
          return;
        }

        const roomChannel = `room:${roomCode}`;
        updateParticipantStateAcrossCluster(io, targetUserId, {
          isMuted: true,
        });

        io.in(roomChannel).emit('room:user-muted', {
          targetUserId,
          byHost: true,
        });

        const participants = await fetchRoomParticipants(io, roomCode);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ hostId: user.id, targetUserId, roomCode }, 'Host remotely muted user');
      } catch (err) {
        logger.error({ err, hostId: user.id, targetUserId, roomCode }, 'Error remotely muting user');
      }
    });

    socket.on('room:kick-user', async ({ roomCode, targetUserId }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, normalized),
          columns: { hostId: true },
        });

        if (!foundRoom || foundRoom.hostId !== user.id) {
          socket.emit('error:message', { message: 'Only the host can remove participants.' });
          return;
        }

        const roomChannel = `room:${roomCode}`;
        const sockets = await io.in(roomChannel).fetchSockets();
        let targetName = 'Participant';

        for (const s of sockets) {
          if (s.data?.user?.id === targetUserId) {
            targetName = s.data.user.name || 'Participant';
            break;
          }
        }

        await kickParticipantAcrossCluster(
          io,
          targetUserId,
          roomCode,
          'You have been removed from this space by the host.'
        );

        io.in(roomChannel).emit('room:user-kicked', {
          targetUserId,
          targetName,
        });

        const participants = await fetchRoomParticipants(io, roomCode);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ hostId: user.id, targetUserId, roomCode }, 'Host removed participant from space');
      } catch (err) {
        logger.error({ err, hostId: user.id, targetUserId, roomCode }, 'Error removing participant');
      }
    });

    socket.on('room:transfer-host', async ({ roomCode, newHostUserId }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, normalized),
          columns: { id: true, hostId: true },
        });

        if (!foundRoom || (foundRoom.hostId !== user.id && foundRoom.hostId !== newHostUserId)) {
          socket.emit('error:message', { message: 'Only the current host can transfer host permissions.' });
          return;
        }

        if (foundRoom.hostId !== newHostUserId) {
          await db.update(room).set({ hostId: newHostUserId }).where(eq(room.id, foundRoom.id));
        }

        const roomChannel = `room:${roomCode}`;
        const sockets = await io.in(roomChannel).fetchSockets();
        let newHostName = 'Participant';

        for (const s of sockets) {
          if (s.data?.user?.id === newHostUserId) {
            newHostName = s.data.user.name || 'Participant';
            break;
          }
        }

        updateParticipantStateAcrossCluster(io, newHostUserId, {
          canSpeak: true,
        });

        io.in(roomChannel).emit('room:host-transferred', {
          previousHostId: user.id,
          newHostId: newHostUserId,
          newHostName,
        });

        const participants = await fetchRoomParticipants(io, roomCode);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ previousHostId: user.id, newHostId: newHostUserId, roomCode }, 'Host transferred space ownership');
      } catch (err) {
        logger.error({ err, previousHostId: user.id, newHostId: newHostUserId, roomCode }, 'Error transferring host');
      }
    });

    socket.on('chat:message', ({ roomCode, text }) => {
      if (!text || !text.trim()) return;
      const message = buildChatMessage(user.id, user.name, user.image, text);
      io.in(`room:${roomCode}`).emit('chat:new-message', message);
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

        const participants = await fetchRoomParticipants(io, roomCode, user.id);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info(
          { userId: user.id, roomCode, remaining: participants.length },
          'User departed chat room'
        );
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
      } else {
        for (const r of socket.rooms) {
          if (r.startsWith('room:')) {
            const extracted = r.slice(5);
            void handleLeave(extracted);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      logger.info({ userId: user.id, socketId: socket.id }, 'Socket disconnected');
    });
  });

  ioInstance = io;
  return io;
};
