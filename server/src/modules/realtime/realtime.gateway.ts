import crypto from 'node:crypto';
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

const roomParticipants = new Map<string, Map<string, RoomParticipant>>();

export const saveParticipant = (roomCode: string, participant: RoomParticipant): void => {
  const normalized = normalizeRoomCode(roomCode);
  let participantsMap = roomParticipants.get(normalized);
  if (!participantsMap) {
    participantsMap = new Map();
    roomParticipants.set(normalized, participantsMap);
  }
  participantsMap.set(participant.userId, { ...participant });
};

export const updateParticipant = (
  roomCode: string,
  userId: string,
  updates: Partial<RoomParticipant>
): void => {
  const normalized = normalizeRoomCode(roomCode);
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap) {
    const existing = participantsMap.get(userId);
    if (existing) {
      Object.assign(existing, updates);
    }
  }
};

export const removeParticipant = (roomCode: string, userId: string): void => {
  const normalized = normalizeRoomCode(roomCode);
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap) {
    participantsMap.delete(userId);
    if (participantsMap.size === 0) {
      roomParticipants.delete(normalized);
    }
  }
};

export const getActiveRoomParticipantsCount = async (roomCode: string): Promise<number> => {
  const normalized = normalizeRoomCode(roomCode);
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap) {
    return participantsMap.size;
  }

  if (!ioInstance) return 0;
  try {
    const sockets = await ioInstance.in(`room:${normalized}`).fetchSockets();
    const userIds = new Set<string>();
    for (const s of sockets) {
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
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap && participantsMap.size > 0) {
    return new Set(participantsMap.keys());
  }

  if (!ioInstance) return new Set<string>();
  try {
    const sockets = await ioInstance.in(`room:${normalized}`).fetchSockets();
    const userIds = new Set<string>();
    for (const s of sockets) {
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
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap && participantsMap.size > 0) {
    const result: RoomParticipant[] = [];
    for (const [uid, p] of participantsMap.entries()) {
      if (excludeUserId && uid === excludeUserId) continue;
      result.push({ ...p });
    }
    return result;
  }

  try {
    const sockets = await io.in(`room:${normalized}`).fetchSockets();
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
    return [];
  }
};

const updateParticipantSocketState = (
  io: RealtimeServer,
  userId: string,
  updates: Partial<SocketData>
) => {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data?.user?.id === userId) {
      Object.assign(socket.data, updates);
    }
  }
};

const kickParticipant = async (
  io: RealtimeServer,
  userId: string,
  roomCode: string,
  message: string
) => {
  const normalized = normalizeRoomCode(roomCode);
  removeParticipant(normalized, userId);
  const roomChannel = `room:${normalized}`;
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data?.user?.id === userId) {
      socket.emit('room:kicked', { message });
      socket.data.currentRoomCode = undefined;
      await socket.leave(roomChannel);
      await socket.leave(`room:${normalized}:user:${userId}`);
    }
  }
};

export const notifyUserLeftRoom = async (
  userId: string,
  roomCode: string,
  userName?: string
): Promise<void> => {
  const normalized = normalizeRoomCode(roomCode);
  removeParticipant(normalized, userId);

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

  const io: RealtimeServer = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
    transports: ['websocket'],
    pingTimeout: 30000,
    pingInterval: 25000,
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
        saveParticipant(normalized, participantData);

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

      updateParticipant(normalized, user.id, {
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

      updateParticipant(normalized, user.id, { handRaised });

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
        updateParticipantSocketState(io, targetUserId, {
          canSpeak: true,
          handRaised: false,
          isMuted: false,
        });
        updateParticipant(normalized, targetUserId, {
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
        updateParticipantSocketState(io, targetUserId, {
          canSpeak: false,
          isMuted: true,
        });
        updateParticipant(normalized, targetUserId, {
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
        updateParticipantSocketState(io, targetUserId, {
          isMuted: true,
        });
        updateParticipant(normalized, targetUserId, {
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
        updateParticipantSocketState(io, targetUserId, {
          canSpeak: true,
          handRaised: false,
        });
        updateParticipant(normalized, targetUserId, {
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
        const targetParticipant = roomParticipants.get(normalized)?.get(targetUserId);
        const targetName = targetParticipant?.name || 'Participant';

        await kickParticipant(
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
        const newHostParticipant = roomParticipants.get(normalized)?.get(newHostUserId);
        const newHostName = newHostParticipant?.name || 'Participant';

        updateParticipantSocketState(io, newHostUserId, {
          canSpeak: true,
        });
        updateParticipant(normalized, newHostUserId, { canSpeak: true });

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
        removeParticipant(normalized, user.id);
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
