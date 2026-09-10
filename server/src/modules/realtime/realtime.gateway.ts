import crypto from 'node:crypto';
import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClient, redis } from '../../config/redis.js';
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
import { ROOM_CAPACITY } from '../rooms/rooms.constants.js';

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

const getParticipantsRedisKey = (roomCode: string) =>
  `room:${normalizeRoomCode(roomCode)}:participants`;

export const saveParticipantToRedis = async (roomCode: string, participant: RoomParticipant) => {
  try {
    const key = getParticipantsRedisKey(roomCode);
    await redis.hset(key, participant.userId, JSON.stringify(participant));
    await redis.expire(key, 86400); // 24 hours TTL
  } catch (err) {
    logger.warn({ err, roomCode, userId: participant.userId }, 'Failed to save participant to Redis');
  }
};

export const updateParticipantInRedis = async (
  roomCode: string,
  userId: string,
  updates: Partial<RoomParticipant>
) => {
  try {
    const key = getParticipantsRedisKey(roomCode);
    const raw = await redis.hget(key, userId);
    if (raw) {
      const p = JSON.parse(raw) as RoomParticipant;
      Object.assign(p, updates);
      await redis.hset(key, userId, JSON.stringify(p));
    }
  } catch (err) {
    logger.warn({ err, roomCode, userId }, 'Failed to update participant in Redis');
  }
};

export const removeParticipantFromRedis = async (roomCode: string, userId: string) => {
  try {
    const key = getParticipantsRedisKey(roomCode);
    await redis.hdel(key, userId);
  } catch (err) {
    logger.warn({ err, roomCode, userId }, 'Failed to remove participant from Redis');
  }
};

export const getActiveRoomParticipantsCount = async (roomCode: string): Promise<number> => {
  const normalized = normalizeRoomCode(roomCode);
  try {
    const count = await redis.hlen(getParticipantsRedisKey(normalized));
    if (typeof count === 'number' && count > 0) {
      return count;
    }
  } catch (err) {
    logger.warn({ err, roomCode: normalized }, 'Redis hlen failed in getActiveRoomParticipantsCount');
  }

  if (!ioInstance) return 0;
  try {
    const localSockets = await ioInstance.local.in(`room:${normalized}`).fetchSockets();
    const userIds = new Set<string>();
    for (const s of localSockets) {
      if (s.data?.user?.id) {
        userIds.add(s.data.user.id);
      }
    }
    return userIds.size;
  } catch {
    return 0;
  }
};

export const getActiveRoomUserIds = async (roomCode: string): Promise<Set<string>> => {
  const normalized = normalizeRoomCode(roomCode);
  try {
    const userIds = await redis.hkeys(getParticipantsRedisKey(normalized));
    if (userIds && userIds.length > 0) {
      return new Set(userIds);
    }
  } catch (err) {
    logger.warn({ err, roomCode: normalized }, 'Redis hkeys failed in getActiveRoomUserIds');
  }

  if (!ioInstance) return new Set<string>();
  try {
    const localSockets = await ioInstance.local.in(`room:${normalized}`).fetchSockets();
    const userIds = new Set<string>();
    for (const s of localSockets) {
      if (s.data?.user?.id) {
        userIds.add(s.data.user.id);
      }
    }
    return userIds;
  } catch {
    return new Set<string>();
  }
};

const fetchRoomParticipants = async (
  io: RealtimeServer,
  roomCode: string,
  excludeUserId?: string
): Promise<RoomParticipant[]> => {
  const normalized = normalizeRoomCode(roomCode);
  const roomChannel = `room:${normalized}`;

  // 1. Primary: Fast O(1) Redis hash lookup (works across cluster without pub/sub timeouts)
  try {
    const rawMap = await redis.hgetall(getParticipantsRedisKey(normalized));
    if (rawMap && Object.keys(rawMap).length > 0) {
      const result: RoomParticipant[] = [];
      for (const [uid, rawData] of Object.entries(rawMap)) {
        if (excludeUserId && uid === excludeUserId) continue;
        try {
          const parsed = JSON.parse(rawData) as RoomParticipant;
          result.push(parsed);
        } catch {}
      }
      if (result.length > 0) {
        return result;
      }
    }
  } catch (err) {
    logger.warn({ err, roomCode: normalized }, 'Redis hgetall failed in fetchRoomParticipants');
  }

  // 2. Fallback: Query sockets across cluster with a tight timeout, fallback to local sockets
  try {
    const sockets = await Promise.race([
      io.in(roomChannel).fetchSockets(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('fetchSockets timeout fallback')), 1000)
      ),
    ]);

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
          isScreenSharing: data.isScreenSharing ?? false,
          handRaised: data.handRaised ?? false,
          canSpeak: data.canSpeak ?? false,
        });
      }
    }
    return Array.from(map.values());
  } catch {
    // 3. Fallback to local sockets on this instance (instant, never hangs)
    try {
      const localSockets = await io.local.in(roomChannel).fetchSockets();
      const map = new Map<string, RoomParticipant>();
      for (const s of localSockets) {
        const data = s.data;
        const u = data?.user;
        if (u?.id && u.id !== excludeUserId && !map.has(u.id)) {
          map.set(u.id, {
            userId: u.id,
            name: u.name,
            image: u.image,
            isMuted: data.isMuted ?? false,
            isVideoOn: data.isVideoOn ?? true,
            isScreenSharing: data.isScreenSharing ?? false,
            handRaised: data.handRaised ?? false,
            canSpeak: data.canSpeak ?? false,
          });
        }
      }
      return Array.from(map.values());
    } catch {
      return [];
    }
  }
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
  const normalized = normalizeRoomCode(roomCode);
  await removeParticipantFromRedis(normalized, userId);
  const roomChannel = `room:${normalized}`;
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data?.user?.id === userId) {
      socket.emit('room:kicked', { message });
      socket.data.currentRoomCode = undefined;
      await socket.leave(roomChannel);
    }
  }
  io.serverSideEmit('participant:kick', userId, normalized, message);
};

export const notifyUserLeftRoom = async (
  userId: string,
  roomCode: string,
  userName?: string
): Promise<void> => {
  const normalized = normalizeRoomCode(roomCode);
  await removeParticipantFromRedis(normalized, userId);

  if (!ioInstance) return;
  const roomChannel = `room:${normalized}`;

  let departingName = userName || 'Participant';
  for (const socket of ioInstance.sockets.sockets.values()) {
    if (socket.data?.user?.id === userId) {
      if (socket.data?.user?.name) {
        departingName = socket.data.user.name;
      }
      socket.data.currentRoomCode = undefined;
      await socket.leave(roomChannel);
      await socket.leave(`room:${normalized}:user:${userId}`);
      socket.disconnect(true);
    }
  }

  ioInstance.serverSideEmit('participant:leave', userId, normalized);

  ioInstance.to(roomChannel).emit('room:user-left', {
    userId,
    name: departingName,
  });

  const participants = await fetchRoomParticipants(ioInstance, normalized, userId);
  ioInstance.in(roomChannel).emit('room:roster', { participants });

  logger.info(
    { userId, roomCode: normalized, remaining: participants.length },
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
    adapter: createAdapter(pubClient, subClient, {
      requestsTimeout: 1500,
    }),
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
        await socket.leave(`room:${roomCode}:user:${userId}`);
      }
    }
  });

  io.on('participant:leave', async (userId, roomCode) => {
    const roomChannel = `room:${roomCode}`;
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data?.user?.id === userId) {
        socket.data.currentRoomCode = undefined;
        await socket.leave(roomChannel);
        await socket.leave(`room:${roomCode}:user:${userId}`);
        socket.disconnect(true);
      }
    }
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    logger.info({ userId: user.id, socketId: socket.id }, 'Realtime socket connected');

    socket.on('room:join', async ({ roomCode, isMuted, isVideoOn, isScreenSharing, handRaised }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        const roomChannel = `room:${normalized}`;

        const activeUserIds = await getActiveRoomUserIds(normalized);
        const isAlreadyInRoom = activeUserIds.has(user.id);

        if (!isAlreadyInRoom) {
          const foundRoom = await db.query.room.findFirst({
            where: eq(room.code, normalized),
            with: {
              settings: true,
            },
          });

          if (foundRoom) {
            const isHost = foundRoom.hostId === user.id;
            const maxCapacity =
              foundRoom.settings?.maxParticipants ||
              (foundRoom.type === 'meet' ? ROOM_CAPACITY.meet : ROOM_CAPACITY.audio);

            if (!isHost && activeUserIds.size >= maxCapacity) {
              logger.warn(
                { userId: user.id, roomCode: normalized, currentCount: activeUserIds.size, maxCapacity },
                'User blocked from joining full room via socket'
              );
              socket.emit('error:message', {
                message: `This room has reached its maximum capacity of ${maxCapacity} participants.`,
              });
              socket.emit('room:kicked', {
                message: `This room has reached its maximum capacity of ${maxCapacity} participants.`,
              });
              return;
            }
          }
        }

        await socket.join(roomChannel);
        await socket.join(`room:${normalized}:user:${user.id}`);
        socket.data.currentRoomCode = normalized;
        if (typeof isMuted === 'boolean') socket.data.isMuted = isMuted;
        if (typeof isVideoOn === 'boolean') socket.data.isVideoOn = isVideoOn;
        if (typeof isScreenSharing === 'boolean') socket.data.isScreenSharing = isScreenSharing;
        if (typeof handRaised === 'boolean') socket.data.handRaised = handRaised;

        const participantData: RoomParticipant = {
          userId: user.id,
          name: user.name,
          image: user.image,
          isMuted: typeof isMuted === 'boolean' ? isMuted : false,
          isVideoOn: typeof isVideoOn === 'boolean' ? isVideoOn : true,
          isScreenSharing: typeof isScreenSharing === 'boolean' ? isScreenSharing : false,
          handRaised: typeof handRaised === 'boolean' ? handRaised : false,
          canSpeak: false,
        };
        await saveParticipantToRedis(normalized, participantData);

        socket.to(roomChannel).emit('room:user-joined', {
          userId: user.id,
          name: user.name,
          image: user.image,
        });

        const participants = await fetchRoomParticipants(io, normalized);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info(
          { userId: user.id, roomCode: normalized, participantCount: participants.length },
          'User joined chat room'
        );
      } catch (err) {
        logger.error({ err, userId: user.id, roomCode }, 'Error joining chat room');
        socket.emit('error:message', { message: 'Failed to join chat room' });
      }
    });

    socket.on('room:media-toggle', async ({ roomCode, isMuted, isVideoOn, isScreenSharing, handRaised }) => {
      const normalized = normalizeRoomCode(roomCode);
      if (typeof isMuted === 'boolean') socket.data.isMuted = isMuted;
      if (typeof isVideoOn === 'boolean') socket.data.isVideoOn = isVideoOn;
      if (typeof isScreenSharing === 'boolean') socket.data.isScreenSharing = isScreenSharing;
      if (typeof handRaised === 'boolean') socket.data.handRaised = handRaised;

      await updateParticipantInRedis(normalized, user.id, {
        ...(typeof isMuted === 'boolean' ? { isMuted } : {}),
        ...(typeof isVideoOn === 'boolean' ? { isVideoOn } : {}),
        ...(typeof isScreenSharing === 'boolean' ? { isScreenSharing } : {}),
        ...(typeof handRaised === 'boolean' ? { handRaised } : {}),
      });

      const participants = await fetchRoomParticipants(io, normalized);
      io.in(`room:${normalized}`).emit('room:roster', { participants });
    });

    socket.on('room:raise-hand', async ({ roomCode, handRaised }) => {
      const normalized = normalizeRoomCode(roomCode);
      socket.data.handRaised = handRaised;
      const roomChannel = `room:${normalized}`;

      await updateParticipantInRedis(normalized, user.id, { handRaised });

      io.in(roomChannel).emit('room:hand-raised', {
        userId: user.id,
        name: user.name,
        handRaised,
      });

      const participants = await fetchRoomParticipants(io, normalized);
      io.in(roomChannel).emit('room:roster', { participants });

      logger.info({ userId: user.id, roomCode: normalized, handRaised }, 'User toggled hand raise');
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

        const roomChannel = `room:${normalized}`;
        updateParticipantStateAcrossCluster(io, targetUserId, {
          canSpeak: true,
          handRaised: false,
          isMuted: false,
        });
        await updateParticipantInRedis(normalized, targetUserId, {
          canSpeak: true,
          handRaised: false,
          isMuted: false,
        });

        io.in(roomChannel).emit('room:mic-granted', {
          targetUserId,
          byUserId: user.id,
        });

        const participants = await fetchRoomParticipants(io, normalized);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ hostId: user.id, targetUserId, roomCode: normalized }, 'Host granted mic permission');
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

        const roomChannel = `room:${normalized}`;
        updateParticipantStateAcrossCluster(io, targetUserId, {
          canSpeak: false,
          isMuted: true,
        });
        await updateParticipantInRedis(normalized, targetUserId, {
          canSpeak: false,
          isMuted: true,
        });

        io.in(roomChannel).emit('room:mic-revoked', {
          targetUserId,
        });

        const participants = await fetchRoomParticipants(io, normalized);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ hostId: user.id, targetUserId, roomCode: normalized }, 'Host revoked mic permission');
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

        const roomChannel = `room:${normalized}`;
        updateParticipantStateAcrossCluster(io, targetUserId, {
          isMuted: true,
        });
        await updateParticipantInRedis(normalized, targetUserId, {
          isMuted: true,
        });

        io.in(roomChannel).emit('room:user-muted', {
          targetUserId,
          byHost: true,
        });

        const participants = await fetchRoomParticipants(io, normalized);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ hostId: user.id, targetUserId, roomCode: normalized }, 'Host remotely muted user');
      } catch (err) {
        logger.error({ err, hostId: user.id, targetUserId, roomCode }, 'Error remotely muting user');
      }
    });

    socket.on('room:request-unmute', async ({ roomCode, targetUserId }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, normalized),
          columns: { hostId: true },
        });

        if (!foundRoom || foundRoom.hostId !== user.id) {
          socket.emit('error:message', { message: 'Only the host can ask participants to unmute.' });
          return;
        }

        const roomChannel = `room:${normalized}`;
        // Ensure user has speaking permission across the cluster if on a stage
        updateParticipantStateAcrossCluster(io, targetUserId, {
          canSpeak: true,
          handRaised: false,
        });
        await updateParticipantInRedis(normalized, targetUserId, {
          canSpeak: true,
          handRaised: false,
        });

        io.in(roomChannel).emit('room:unmute-requested', {
          targetUserId,
          hostName: user.name || 'Host',
        });

        const participants = await fetchRoomParticipants(io, normalized);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ hostId: user.id, targetUserId, roomCode: normalized }, 'Host requested user to unmute');
      } catch (err) {
        logger.error({ err, hostId: user.id, targetUserId, roomCode }, 'Error requesting user unmute');
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

        const roomChannel = `room:${normalized}`;
        let targetName = 'Participant';

        try {
          const raw = await redis.hget(getParticipantsRedisKey(normalized), targetUserId);
          if (raw) {
            targetName = (JSON.parse(raw) as RoomParticipant).name || 'Participant';
          }
        } catch {}

        await kickParticipantAcrossCluster(
          io,
          targetUserId,
          normalized,
          'You have been removed from this space by the host.'
        );

        io.in(roomChannel).emit('room:user-kicked', {
          targetUserId,
          targetName,
        });

        const participants = await fetchRoomParticipants(io, normalized);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ hostId: user.id, targetUserId, roomCode: normalized }, 'Host removed participant from space');
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

        const roomChannel = `room:${normalized}`;
        let newHostName = 'Participant';

        try {
          const raw = await redis.hget(getParticipantsRedisKey(normalized), newHostUserId);
          if (raw) {
            newHostName = (JSON.parse(raw) as RoomParticipant).name || 'Participant';
          }
        } catch {}

        updateParticipantStateAcrossCluster(io, newHostUserId, {
          canSpeak: true,
        });
        await updateParticipantInRedis(normalized, newHostUserId, { canSpeak: true });

        io.in(roomChannel).emit('room:host-transferred', {
          previousHostId: user.id,
          newHostId: newHostUserId,
          newHostName,
        });

        const participants = await fetchRoomParticipants(io, normalized);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info({ previousHostId: user.id, newHostId: newHostUserId, roomCode: normalized }, 'Host transferred space ownership');
      } catch (err) {
        logger.error({ err, previousHostId: user.id, newHostId: newHostUserId, roomCode }, 'Error transferring host');
      }
    });

    socket.on('chat:message', ({ roomCode, text }) => {
      if (!text || !text.trim()) return;
      const normalized = normalizeRoomCode(roomCode);
      const message = buildChatMessage(user.id, user.name, user.image, text);
      io.in(`room:${normalized}`).emit('chat:new-message', message);
    });

    socket.on('room:reaction', ({ roomCode, emoji }) => {
      if (!emoji || typeof emoji !== 'string') return;
      const normalized = normalizeRoomCode(roomCode);
      const roomChannel = `room:${normalized}`;
      const reactionPayload = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: user.name,
        emoji,
        timestamp: Date.now(),
      };
      io.in(roomChannel).emit('room:reaction', reactionPayload);
    });

    socket.on('webrtc:signal', async ({ roomCode, targetUserId, signal }) => {
      if (!targetUserId || !signal) return;
      try {
        const normalized = normalizeRoomCode(roomCode);
        const targetUserChannel = `room:${normalized}:user:${targetUserId}`;
        io.to(targetUserChannel).emit('webrtc:signal', {
          fromUserId: user.id,
          signal,
        });
      } catch (err) {
        logger.error({ err, fromUserId: user.id, targetUserId, roomCode }, 'Error relaying WebRTC signal');
      }
    });

    const handleLeave = async (roomCode: string) => {
      if (!socket.data.currentRoomCode) return;
      socket.data.currentRoomCode = undefined;

      try {
        const normalized = normalizeRoomCode(roomCode);
        await removeParticipantFromRedis(normalized, user.id);
        const roomChannel = `room:${normalized}`;
        socket.to(roomChannel).emit('room:user-left', {
          userId: user.id,
          name: user.name,
        });

        await socket.leave(roomChannel);
        await socket.leave(`room:${normalized}:user:${user.id}`);

        const participants = await fetchRoomParticipants(io, normalized, user.id);
        io.in(roomChannel).emit('room:roster', { participants });

        logger.info(
          { userId: user.id, roomCode: normalized, remaining: participants.length },
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
