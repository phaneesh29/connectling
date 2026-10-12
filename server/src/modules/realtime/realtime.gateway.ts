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
import { createRoomConnections } from './room-connections.js';

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
const roomConnections = createRoomConnections();
interface RoomWhiteboardState {
  isOpen: boolean;
  elements: readonly unknown[];
  appState?: Record<string, unknown>;
  hostId?: string;
}
const roomWhiteboards = new Map<string, RoomWhiteboardState>();

export const clearRoomWhiteboard = (roomCode: string): void => {
  const normalized = normalizeRoomCode(roomCode);
  roomWhiteboards.delete(normalized);
};
const roomTasks = new Map<string, Promise<void>>();
const serializeRoom = (roomCode: string, operation: () => Promise<void>) => {
  const task = (roomTasks.get(roomCode) ?? Promise.resolve()).then(operation).catch(err => {
    logger.error({ err, roomCode }, 'Room operation failed');
  });
  roomTasks.set(roomCode, task);
  void task.then(() => { if (roomTasks.get(roomCode) === task) roomTasks.delete(roomCode); });
  return task;
};

export const saveParticipant = (roomCode: string, participant: RoomParticipant): void => {
  const normalized = normalizeRoomCode(roomCode);
  let participantsMap = roomParticipants.get(normalized);
  if (!participantsMap) {
    participantsMap = new Map();
    roomParticipants.set(normalized, participantsMap);
  }
  participantsMap.set(participant.peerId ?? participant.userId, { ...participant });
};

export const updateParticipant = (
  roomCode: string,
  userId: string,
  updates: Partial<RoomParticipant>
): void => {
  const normalized = normalizeRoomCode(roomCode);
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap) {
    for (const participant of participantsMap.values()) {
      if (participant.userId === userId) Object.assign(participant, updates);
    }
  }
};

export const removeParticipant = (roomCode: string, userId: string): void => {
  const normalized = normalizeRoomCode(roomCode);
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap) {
    for (const [peerId, participant] of participantsMap) {
      if (participant.userId === userId) participantsMap.delete(peerId);
    }
    if (participantsMap.size === 0) {
      roomParticipants.delete(normalized);
    }
  }
};

export const getActiveRoomParticipants = async (
  roomCode: string,
  excludeUserId?: string
): Promise<RoomParticipant[]> => {
  const normalized = normalizeRoomCode(roomCode);
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap && participantsMap.size > 0) {
    const result: RoomParticipant[] = [];
    for (const p of participantsMap.values()) {
      if (excludeUserId && p.userId === excludeUserId) continue;
      result.push({ ...p });
    }
    return result;
  }

  if (!ioInstance) return [];

  try {
    const sockets = await ioInstance.in(`room:${normalized}`).fetchSockets();
    const map = new Map<string, RoomParticipant>();
    for (const s of sockets) {
      const data = s.data;
      const u = data?.user;
      if (u?.id && u.id !== excludeUserId && data.peerId && !map.has(data.peerId)) {
        map.set(data.peerId, {
          peerId: data.peerId,
          userId: u.id,
          name: u.name,
          image: u.image,
          isMuted: data.isMuted ?? false,
          isVideoOn: data.isVideoOn ?? true,
          isScreenSharing: data.isScreenSharing ?? false,
          handRaised: data.handRaised ?? false,
          canSpeak: data.canSpeak ?? false,
          isMirrored: data.isMirrored ?? false,
        });
      }
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
};

export const getActiveRoomParticipantsCount = async (roomCode: string): Promise<number> => {
  const normalized = normalizeRoomCode(roomCode);
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap) {
    return participantsMap.size;
  }
  return (await getActiveRoomParticipants(normalized)).length;
};

export const getActiveRoomUserIds = async (roomCode: string): Promise<Set<string>> => {
  const normalized = normalizeRoomCode(roomCode);
  const participantsMap = roomParticipants.get(normalized);
  if (participantsMap && participantsMap.size > 0) {
    return new Set(Array.from(participantsMap.values(), participant => participant.userId));
  }
  const participants = await getActiveRoomParticipants(normalized);
  return new Set(participants.map((p) => p.userId));
};

const removePeerParticipant = (roomCode: string, peerId: string) => {
  const participants = roomParticipants.get(roomCode);
  participants?.delete(peerId);
  if (participants?.size === 0) roomParticipants.delete(roomCode);
};

const announcePeerLeft = async (io: RealtimeServer, roomCode: string, peerId: string, userId: string, name: string) => {
  const channel = `room:${roomCode}`;
  io.to(channel).emit('room:peer-left', { roomCode, peerId });
  if (roomConnections.forUser(roomCode, userId).length === 0) {
    io.to(channel).emit('room:user-left', { roomCode, userId, name });
  }
  const participants = await getActiveRoomParticipants(roomCode);
  io.in(channel).emit('room:roster', { roomCode, participants });
};

const updateParticipantSocketState = (
  io: RealtimeServer,
  roomCode: string,
  userId: string,
  updates: Partial<SocketData>
) => {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data?.user?.id === userId && socket.data.currentRoomCode === roomCode) {
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
  for (const connection of roomConnections.forUser(normalized, userId)) {
    roomConnections.remove(normalized, connection.peerId);
    io.to(`room:${normalized}`).emit('room:peer-left', { roomCode: normalized, peerId: connection.peerId });
  }
  removeParticipant(normalized, userId);
  const roomChannel = `room:${normalized}`;
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data?.user?.id === userId && socket.data.currentRoomCode === normalized) {
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
  userName?: string,
  peerId?: string,
): Promise<void> => {
  const normalized = normalizeRoomCode(roomCode);
  await serializeRoom(normalized, async () => {
    const connections = roomConnections.forUser(normalized, userId)
      .filter(connection => !peerId || connection.peerId === peerId);
    for (const connection of connections) {
      roomConnections.remove(normalized, connection.peerId);
      removePeerParticipant(normalized, connection.peerId);
      if (!ioInstance) continue;
      const socket = ioInstance.sockets.sockets.get(connection.socketId);
      if (socket) {
        socket.data.currentRoomCode = undefined;
        socket.data.peerId = undefined;
        await socket.leave(`room:${normalized}`);
        await socket.leave(`room:${normalized}:user:${userId}`);
      }
      await announcePeerLeft(ioInstance, normalized, connection.peerId, userId, userName || 'Participant');
    }
  });
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

    socket.on('room:join', ({ roomCode, peerId, isMuted, isVideoOn, isScreenSharing, handRaised, isMirrored }) => {
      if (typeof roomCode !== 'string' || typeof peerId !== 'string' || !peerId || peerId.length > 100) return;
      const normalized = normalizeRoomCode(roomCode);
      void serializeRoom(normalized, async () => {
        try {
          if (!socket.connected) return;
          const previousRoom = socket.data.currentRoomCode;
          if (previousRoom && (previousRoom !== normalized || socket.data.peerId !== peerId)) await handleLeave(previousRoom);
          const foundRoom = await db.query.room.findFirst({ where: eq(room.code, normalized), with: { settings: true } });
          if (!socket.connected) return;
          if (!foundRoom || foundRoom.expiresAt < new Date()) {
            socket.emit('room:kicked', { message: 'This room has ended or expired.' });
            return;
          }
          const connection = roomConnections.get(normalized, peerId);
          if (connection && connection.userId !== user.id) return;
          const activeParticipants = await getActiveRoomParticipants(normalized);
          const maxCapacity = foundRoom.settings?.maxParticipants || (foundRoom.type === 'meet' ? ROOM_CAPACITY.meet : ROOM_CAPACITY.audio);
          if (!connection && activeParticipants.length >= maxCapacity) {
            socket.emit('room:kicked', { message: `This room has reached its maximum capacity of ${maxCapacity} participants.` });
            return;
          }
          const existing = roomParticipants.get(normalized)?.get(peerId);
          const knownUser = activeParticipants.some(participant => participant.userId === user.id);
          const previous = roomConnections.connect(normalized, peerId, user.id, socket.id);
          socket.data.currentRoomCode = normalized;
          socket.data.peerId = peerId;
          if (previous && previous.socketId !== socket.id) {
            // Only replace the previous transport of this endpoint, never another device.
            const oldSocket = io.sockets.sockets.get(previous.socketId);
            if (oldSocket) {
              oldSocket.data.currentRoomCode = undefined;
              oldSocket.data.peerId = undefined;
              await oldSocket.leave(`room:${normalized}`);
              await oldSocket.leave(`room:${normalized}:user:${user.id}`);
            }
          }
          const roomChannel = `room:${normalized}`;
          await socket.join(roomChannel);
          await socket.join(`room:${normalized}:user:${user.id}`);
          if (!socket.connected) return;
          socket.data.isMuted = typeof isMuted === 'boolean' ? isMuted : existing?.isMuted ?? true;
          socket.data.isVideoOn = typeof isVideoOn === 'boolean' ? isVideoOn : existing?.isVideoOn ?? false;
          socket.data.isScreenSharing = typeof isScreenSharing === 'boolean' ? isScreenSharing : existing?.isScreenSharing ?? false;
          socket.data.handRaised = typeof handRaised === 'boolean' ? handRaised : existing?.handRaised ?? false;
          socket.data.canSpeak = foundRoom.hostId === user.id || activeParticipants.some(participant => participant.userId === user.id && participant.canSpeak);
          if (foundRoom.type === 'audio' && !socket.data.canSpeak && !foundRoom.settings?.micForAll) socket.data.isMuted = true;
          socket.data.isMirrored = typeof isMirrored === 'boolean' ? isMirrored : existing?.isMirrored ?? false;
          saveParticipant(normalized, {
            userId: user.id, peerId, name: user.name, image: user.image,
            isMuted: socket.data.isMuted, isVideoOn: socket.data.isVideoOn,
            isScreenSharing: socket.data.isScreenSharing, handRaised: socket.data.handRaised, canSpeak: socket.data.canSpeak,
            isMirrored: socket.data.isMirrored,
          });
          if (!knownUser) socket.to(roomChannel).emit('room:user-joined', { userId: user.id, name: user.name, image: user.image });
          const participants = await getActiveRoomParticipants(normalized);
          io.in(roomChannel).emit('room:roster', { roomCode: normalized, participants });
          const wb = roomWhiteboards.get(normalized);
          if (wb?.isOpen) {
            socket.emit('whiteboard:toggled', {
              roomCode: normalized,
              isOpen: true,
              elements: wb.elements,
              appState: wb.appState,
            });
          }
        } catch (err) {
          logger.error({ err, userId: user.id, roomCode }, 'Error joining chat room');
          socket.emit('error:message', { message: 'Failed to join chat room' });
        }
      });
    });

    // Queue behind join so a late-mounted media hook gets an authoritative roster.
    socket.on('room:sync', ({ roomCode, peerId }) => {
      if (typeof roomCode !== 'string') return;
      const normalized = normalizeRoomCode(roomCode);
      void serializeRoom(normalized, async () => {
        const connection = roomConnections.get(normalized, peerId);
        if (!socket.connected || connection?.socketId !== socket.id || connection.userId !== user.id) return;
        const participants = await getActiveRoomParticipants(normalized);
        socket.emit('room:roster', { roomCode: normalized, participants });
      });
    });

    socket.on('room:media-toggle', async ({ roomCode, isMuted, isVideoOn, isScreenSharing, handRaised, isMirrored }) => {
      const normalized = normalizeRoomCode(roomCode);
      if (!socket.data.peerId || roomConnections.get(normalized, socket.data.peerId)?.socketId !== socket.id) return;
      if (typeof isMuted === 'boolean') socket.data.isMuted = isMuted;
      if (typeof isVideoOn === 'boolean') socket.data.isVideoOn = isVideoOn;
      if (typeof isScreenSharing === 'boolean') socket.data.isScreenSharing = isScreenSharing;
      if (typeof handRaised === 'boolean') socket.data.handRaised = handRaised;
      if (typeof isMirrored === 'boolean') socket.data.isMirrored = isMirrored;

      const participant = roomParticipants.get(normalized)?.get(socket.data.peerId);
      if (participant) Object.assign(participant, {
        ...(typeof isMuted === 'boolean' ? { isMuted } : {}),
        ...(typeof isVideoOn === 'boolean' ? { isVideoOn } : {}),
        ...(typeof isScreenSharing === 'boolean' ? { isScreenSharing } : {}),
        ...(typeof handRaised === 'boolean' ? { handRaised } : {}),
        ...(typeof isMirrored === 'boolean' ? { isMirrored } : {}),
      });

      const participants = await getActiveRoomParticipants(normalized);
      io.in(`room:${normalized}`).emit('room:roster', { roomCode: normalized, participants });
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

      const participants = await getActiveRoomParticipants(normalized);
      io.in(roomChannel).emit('room:roster', { roomCode: normalized, participants });

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
        updateParticipantSocketState(io, normalized, targetUserId, {
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

        const participants = await getActiveRoomParticipants(normalized);
        io.in(roomChannel).emit('room:roster', { roomCode: normalized, participants });

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
        updateParticipantSocketState(io, normalized, targetUserId, {
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

        const participants = await getActiveRoomParticipants(normalized);
        io.in(roomChannel).emit('room:roster', { roomCode: normalized, participants });

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
        updateParticipantSocketState(io, normalized, targetUserId, {
          isMuted: true,
        });
        updateParticipant(normalized, targetUserId, {
          isMuted: true,
        });

        io.in(roomChannel).emit('room:user-muted', {
          targetUserId,
          byHost: true,
        });

        const participants = await getActiveRoomParticipants(normalized);
        io.in(roomChannel).emit('room:roster', { roomCode: normalized, participants });

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
        updateParticipantSocketState(io, normalized, targetUserId, {
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

        const participants = await getActiveRoomParticipants(normalized);
        io.in(roomChannel).emit('room:roster', { roomCode: normalized, participants });

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
        const targetParticipant = Array.from(roomParticipants.get(normalized)?.values() ?? []).find(participant => participant.userId === targetUserId);
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

        const participants = await getActiveRoomParticipants(normalized);
        io.in(roomChannel).emit('room:roster', { roomCode: normalized, participants });

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

        updateParticipantSocketState(io, normalized, newHostUserId, {
          canSpeak: true,
        });
        updateParticipant(normalized, newHostUserId, { canSpeak: true });

        io.in(roomChannel).emit('room:host-transferred', {
          previousHostId: user.id,
          newHostId: newHostUserId,
          newHostName,
        });

        const participants = await getActiveRoomParticipants(normalized);
        io.in(roomChannel).emit('room:roster', { roomCode: normalized, participants });

        logger.info({ previousHostId: user.id, newHostId: newHostUserId, roomCode: normalized }, 'Host transferred space ownership');
      } catch (err) {
        logger.error({ err, previousHostId: user.id, newHostId: newHostUserId, roomCode }, 'Error transferring host');
      }
    });

    socket.on('room:switch-mode', async ({ roomCode, newRoomCode, newType, title }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        const normalizedNew = normalizeRoomCode(newRoomCode);
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, normalized),
          columns: { id: true, hostId: true, title: true, type: true },
        });

        if (!foundRoom || foundRoom.hostId !== user.id) {
          socket.emit('error:message', { message: 'Only the space host can switch room mode.' });
          return;
        }

        const roomChannel = `room:${normalized}`;
        io.in(roomChannel).emit('room:switched', {
          fromRoomCode: normalized,
          newRoomCode: normalizedNew,
          newType,
          title: title || foundRoom.title,
          hostName: user.name || 'The host',
        });

        logger.info({ hostId: user.id, fromRoom: normalized, toRoom: normalizedNew, newType }, 'Host switched room mode');
      } catch (err) {
        logger.error({ err, hostId: user.id, roomCode }, 'Error switching room mode');
      }
    });

    socket.on('whiteboard:toggle', async ({ roomCode, isOpen }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        const foundRoom = await db.query.room.findFirst({
          where: eq(room.code, normalized),
          columns: { id: true, hostId: true },
        });

        if (!foundRoom || foundRoom.hostId !== user.id) {
          socket.emit('error:message', { message: 'Only the space host can toggle the whiteboard.' });
          return;
        }

        let state = roomWhiteboards.get(normalized);
        if (!state) {
          state = { isOpen: false, elements: [], hostId: foundRoom.hostId };
          roomWhiteboards.set(normalized, state);
        }
        state.isOpen = isOpen;
        state.hostId = foundRoom.hostId;

        const roomChannel = `room:${normalized}`;
        io.in(roomChannel).emit('whiteboard:toggled', {
          roomCode: normalized,
          isOpen,
          elements: state.elements,
          appState: state.appState,
        });

        logger.info({ hostId: user.id, roomCode: normalized, isOpen }, 'Host toggled whiteboard');
      } catch (err) {
        logger.error({ err, hostId: user.id, roomCode }, 'Error toggling whiteboard');
      }
    });

    socket.on('whiteboard:update', async ({ roomCode, elements, appState }) => {
      try {
        const normalized = normalizeRoomCode(roomCode);
        let state = roomWhiteboards.get(normalized);
        let hostId = state?.hostId;
        if (!hostId) {
          const foundRoom = await db.query.room.findFirst({
            where: eq(room.code, normalized),
            columns: { id: true, hostId: true },
          });
          if (!foundRoom) return;
          hostId = foundRoom.hostId;
        }

        if (hostId !== user.id) return;

        if (!state) {
          state = { isOpen: true, elements: [], hostId };
          roomWhiteboards.set(normalized, state);
        } else {
          state.hostId = hostId;
        }
        state.elements = elements || [];
        state.appState = appState;

        const roomChannel = `room:${normalized}`;
        socket.to(roomChannel).emit('whiteboard:updated', {
          roomCode: normalized,
          elements: state.elements,
          appState,
        });
      } catch (err) {
        logger.error({ err, hostId: user.id, roomCode }, 'Error updating whiteboard');
      }
    });

    socket.on('whiteboard:sync', ({ roomCode }) => {
      const normalized = normalizeRoomCode(roomCode);
      const state = roomWhiteboards.get(normalized);
      if (state && state.isOpen) {
        socket.emit('whiteboard:toggled', {
          roomCode: normalized,
          isOpen: state.isOpen,
          elements: state.elements,
          appState: state.appState,
        });
        socket.emit('whiteboard:updated', {
          roomCode: normalized,
          elements: state.elements,
          appState: state.appState,
        });
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

    socket.on('webrtc:signal', ({ roomCode, targetPeerId, signal }) => {
      const peerId = socket.data.peerId;
      if (typeof roomCode !== 'string' || !peerId || !targetPeerId || targetPeerId === peerId || !signal || !signal.connectionId) return;
      const normalized = normalizeRoomCode(roomCode);
      const sender = roomConnections.get(normalized, peerId);
      const target = roomConnections.get(normalized, targetPeerId);
      if (sender?.socketId !== socket.id || !target) return;
      if (!['offer', 'answer', 'candidate'].includes(signal.type)) return;
      if (signal.sdp && (typeof signal.sdp !== 'string' || signal.sdp.length > 100_000)) return;
      if (signal.candidate?.candidate && signal.candidate.candidate.length > 4096) return;
      io.to(target.socketId).emit('webrtc:signal', { roomCode: normalized, fromUserId: user.id, fromPeerId: peerId, signal });
    });

    const handleLeave = async (roomCode: string) => {
      const normalized = normalizeRoomCode(roomCode);
      const peerId = socket.data.peerId;
      if (!peerId || !roomConnections.remove(normalized, peerId, socket.id)) return;
      socket.data.currentRoomCode = undefined;
      socket.data.peerId = undefined;
      removePeerParticipant(normalized, peerId);
      await socket.leave(`room:${normalized}`);
      await socket.leave(`room:${normalized}:user:${user.id}`);
      await announcePeerLeft(io, normalized, peerId, user.id, user.name);
    };

    socket.on('room:leave', ({ roomCode }) => {
      if (typeof roomCode !== 'string') return;
      const normalized = normalizeRoomCode(roomCode);
      void serializeRoom(normalized, () => handleLeave(normalized));
    });

    socket.on('disconnecting', () => {
      const roomCode = socket.data.currentRoomCode;
      const peerId = socket.data.peerId;
      socket.data.currentRoomCode = undefined;
      socket.data.peerId = undefined;
      if (!roomCode || !peerId) return;
      roomConnections.disconnect(roomCode, peerId, socket.id, () => {
        void serializeRoom(roomCode, async () => {
          if (roomConnections.get(roomCode, peerId)) return;
          removePeerParticipant(roomCode, peerId);
          await announcePeerLeft(io, roomCode, peerId, user.id, user.name);
        });
      });
    });

    socket.on('disconnect', () => {
      logger.info({ userId: user.id, socketId: socket.id }, 'Socket disconnected');
    });
  });

  ioInstance = io;
  return io;
};
