import crypto from 'node:crypto';
import { eq, and, count } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { room, roomSettings, roomUser, type Room, type RoomSettings } from '../../db/room-schema.js';
import { user } from '../../db/auth-schema.js';
import { presenceService } from './presence.service.js';
import { generateRoomCode, normalizeRoomCode } from './room.utils.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../utils/app-error.js';
import type {
  CreateRoomInput,
  JoinRoomInput,
  UpdateRoomSettingsInput,
} from './room.validation.js';

export const roomService = {
  createRoom: async (userId: string, input: CreateRoomInput) => {
    const activeRoomId = await presenceService.getUserActiveRoom(userId);
    if (activeRoomId) {
      throw new ConflictError(
        'You are already active in another meeting. Please leave it before creating a new one.'
      );
    }

    let code = generateRoomCode();
    let existingRoom = await db.query.room.findFirst({
      where: eq(room.code, code),
    });

    while (existingRoom) {
      code = generateRoomCode();
      existingRoom = await db.query.room.findFirst({
        where: eq(room.code, code),
      });
    }

    const roomId = crypto.randomUUID();
    const settingsId = crypto.randomUUID();
    const roomUserId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60 * 1000);

    const isAudio = input.type === 'audio';
    const defaultSettings = {
      micForAll: isAudio ? false : true,
      videoForAll: isAudio ? false : true,
      screenShareForAll: isAudio ? false : true,
      allowChat: true,
      allowRaiseHand: true,
      maxParticipants: 50,
      isPrivate: false,
    };

    const mergedSettings = {
      ...defaultSettings,
      ...input.settings,
    };

    const [createdRoom] = await db
      .insert(room)
      .values({
        id: roomId,
        code,
        title: input.title,
        description: input.description,
        type: input.type,
        status: 'active',
        hostId: userId,
        expiresAt,
      })
      .returning();

    const [createdSettings] = await db
      .insert(roomSettings)
      .values({
        id: settingsId,
        roomId,
        ...mergedSettings,
      })
      .returning();

    await db.insert(roomUser).values({
      id: roomUserId,
      roomId,
      userId,
      role: 'host',
      status: 'active',
      isMuted: false,
      isVideoOn: false,
      isHandRaised: false,
    });

    const ttlSeconds = Math.max(60, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    await presenceService.setUserActiveRoom(userId, roomId, ttlSeconds);

    return {
      room: createdRoom,
      settings: createdSettings,
    };
  },

  getRoomByCode: async (code: string) => {
    const normalized = normalizeRoomCode(code);
    const foundRoom = await db.query.room.findFirst({
      where: eq(room.code, normalized),
      with: {
        settings: true,
        host: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!foundRoom) {
      throw new NotFoundError('Room not found');
    }

    if (foundRoom.status === 'active' && foundRoom.expiresAt < new Date()) {
      await db
        .update(room)
        .set({ status: 'ended', endedAt: new Date() })
        .where(eq(room.id, foundRoom.id));

      await presenceService.clearRoomPresence(foundRoom.id);
      foundRoom.status = 'ended';
      foundRoom.endedAt = new Date();
    }

    const [activeCountResult] = await db
      .select({ count: count() })
      .from(roomUser)
      .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.status, 'active')));

    return {
      ...foundRoom,
      activeParticipantsCount: activeCountResult?.count ?? 0,
    };
  },

  joinRoom: async (userId: string, code: string, input: JoinRoomInput) => {
    const normalized = normalizeRoomCode(code);
    const foundRoom = await db.query.room.findFirst({
      where: eq(room.code, normalized),
      with: {
        settings: true,
      },
    });

    if (!foundRoom) {
      throw new NotFoundError('Room not found');
    }

    if (foundRoom.status !== 'active' || foundRoom.expiresAt < new Date()) {
      throw new BadRequestError('This room has ended or expired.');
    }

    const settings = foundRoom.settings;

    if (settings?.isPrivate && foundRoom.hostId !== userId) {
      if (!input.passcode || input.passcode !== settings.passcode) {
        throw new ForbiddenError('Incorrect or missing room passcode.');
      }
    }

    const activeRoomId = await presenceService.getUserActiveRoom(userId);
    if (activeRoomId && activeRoomId !== foundRoom.id) {
      throw new ConflictError(
        'You are already active in another meeting. Please leave it before joining.'
      );
    }

    const [activeCountResult] = await db
      .select({ count: count() })
      .from(roomUser)
      .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.status, 'active')));

    const activeCount = activeCountResult?.count ?? 0;
    if (settings?.maxParticipants && activeCount >= settings.maxParticipants && foundRoom.hostId !== userId) {
      throw new ForbiddenError('This room has reached maximum capacity.');
    }

    const role =
      foundRoom.hostId === userId
        ? 'host'
        : foundRoom.type === 'audio'
          ? 'listener'
          : 'participant';

    const existingParticipant = await db.query.roomUser.findFirst({
      where: and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.userId, userId)),
    });

    let participant;

    if (existingParticipant) {
      const [updated] = await db
        .update(roomUser)
        .set({
          status: 'active',
          role: existingParticipant.role === 'host' ? 'host' : role,
          joinedAt: new Date(),
          leftAt: null,
        })
        .where(eq(roomUser.id, existingParticipant.id))
        .returning();
      participant = updated;
    } else {
      const [created] = await db
        .insert(roomUser)
        .values({
          id: crypto.randomUUID(),
          roomId: foundRoom.id,
          userId,
          role,
          status: 'active',
          isMuted: false,
          isVideoOn: false,
          isHandRaised: false,
        })
        .returning();
      participant = created;
    }

    const ttlSeconds = Math.max(60, Math.ceil((foundRoom.expiresAt.getTime() - Date.now()) / 1000));
    await presenceService.setUserActiveRoom(userId, foundRoom.id, ttlSeconds);

    return {
      room: foundRoom,
      settings: foundRoom.settings,
      participant,
    };
  },

  leaveRoom: async (userId: string, code: string) => {
    const normalized = normalizeRoomCode(code);
    const foundRoom = await db.query.room.findFirst({
      where: eq(room.code, normalized),
    });

    if (!foundRoom) {
      throw new NotFoundError('Room not found');
    }

    await db
      .update(roomUser)
      .set({
        status: 'left',
        leftAt: new Date(),
      })
      .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.userId, userId)));

    await presenceService.clearUserActiveRoom(userId, foundRoom.id);

    return { success: true };
  },

  updateRoomSettings: async (userId: string, code: string, input: UpdateRoomSettingsInput) => {
    const normalized = normalizeRoomCode(code);
    const foundRoom = await db.query.room.findFirst({
      where: eq(room.code, normalized),
      with: {
        settings: true,
      },
    });

    if (!foundRoom) {
      throw new NotFoundError('Room not found');
    }

    if (foundRoom.hostId !== userId) {
      throw new ForbiddenError('Only the room host can update room settings.');
    }

    const [updatedSettings] = await db
      .update(roomSettings)
      .set({
        ...input,
      })
      .where(eq(roomSettings.roomId, foundRoom.id))
      .returning();

    return updatedSettings;
  },

  endRoom: async (userId: string, code: string) => {
    const normalized = normalizeRoomCode(code);
    const foundRoom = await db.query.room.findFirst({
      where: eq(room.code, normalized),
    });

    if (!foundRoom) {
      throw new NotFoundError('Room not found');
    }

    if (foundRoom.hostId !== userId) {
      throw new ForbiddenError('Only the room host can end this room.');
    }

    const now = new Date();

    await db
      .update(room)
      .set({
        status: 'ended',
        endedAt: now,
      })
      .where(eq(room.id, foundRoom.id));

    await db
      .update(roomUser)
      .set({
        status: 'left',
        leftAt: now,
      })
      .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.status, 'active')));

    await presenceService.clearRoomPresence(foundRoom.id);

    return { success: true };
  },

  getUserPresence: async (userId: string) => {
    const activeRoomId = await presenceService.getUserActiveRoom(userId);
    if (!activeRoomId) {
      return {
        isActive: false,
        activeRoom: null,
      };
    }

    const foundRoom = await db.query.room.findFirst({
      where: eq(room.id, activeRoomId),
      with: {
        settings: true,
      },
    });

    if (!foundRoom || foundRoom.status !== 'active' || foundRoom.expiresAt < new Date()) {
      await presenceService.clearUserActiveRoom(userId, activeRoomId);
      return {
        isActive: false,
        activeRoom: null,
      };
    }

    return {
      isActive: true,
      activeRoom: foundRoom,
    };
  },
};
