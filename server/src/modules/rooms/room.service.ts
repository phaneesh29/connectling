import crypto from 'node:crypto';
import { eq, and, ne, count, asc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { room, roomSettings, roomUser, type Room, type RoomSettings } from '../../db/room-schema.js';
import { user } from '../../db/auth-schema.js';
import { presenceService, PRESENCE_HEARTBEAT_TTL } from './presence.service.js';
import { generateRoomCode, normalizeRoomCode } from './room.utils.js';
import { ROOM_CAPACITY, ROOM_CONSTANTS } from './rooms.constants.js';
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
    const expiresAt = new Date(Date.now() + ROOM_CONSTANTS.ROOM_DURATION_MINUTES * 60 * 1000);

    const isAudio = input.type === 'audio';
    const maxCapacity = ROOM_CAPACITY[input.type];

    const defaultSettings = {
      micForAll: isAudio ? false : true,
      videoForAll: isAudio ? false : true,
      screenShareForAll: isAudio ? false : true,
      allowChat: true,
      allowRaiseHand: true,
      maxParticipants: maxCapacity,
      isPrivate: false,
    };

    const mergedSettings = {
      ...defaultSettings,
      ...input.settings,
      maxParticipants: maxCapacity,
    };

    let createdRoom: Room;
    let createdSettings: RoomSettings;

    try {
      const [newRoom] = await db
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
      createdRoom = newRoom;

      const [newSettings] = await db
        .insert(roomSettings)
        .values({
          id: settingsId,
          roomId,
          ...mergedSettings,
        })
        .returning();
      createdSettings = newSettings;

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
    } catch (error) {
      await db.delete(room).where(eq(room.id, roomId)).catch(() => {});
      throw error;
    }

    await presenceService.setUserActiveRoom(userId, roomId, PRESENCE_HEARTBEAT_TTL);

    return {
      room: createdRoom,
      settings: createdSettings,
    };
  },

  getRoomByCode: async (code: string, userId?: string) => {
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

    if (foundRoom.expiresAt < new Date()) {
      await db.delete(room).where(eq(room.id, foundRoom.id));
      await presenceService.clearRoomPresence(foundRoom.id);
      throw new NotFoundError('Room has expired and is no longer available.');
    }

    const [activeCountResult] = await db
      .select({ count: count() })
      .from(roomUser)
      .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.status, 'active')));

    // Self-healing check: If the registered host has left or gone inactive, auto-promote the earliest active participant
    const hostUserEntry = await db.query.roomUser.findFirst({
      where: and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.userId, foundRoom.hostId)),
    });

    if (!hostUserEntry || hostUserEntry.status !== 'active') {
      const nextActiveHost = await db.query.roomUser.findFirst({
        where: and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.status, 'active')),
        orderBy: [asc(roomUser.joinedAt)],
      });

      if (nextActiveHost) {
        await db
          .update(room)
          .set({ hostId: nextActiveHost.userId })
          .where(eq(room.id, foundRoom.id));

        await db
          .update(roomUser)
          .set({ role: 'host' })
          .where(eq(roomUser.id, nextActiveHost.id));

        foundRoom.hostId = nextActiveHost.userId;

        const newHostRecord = await db.query.user.findFirst({
          where: eq(user.id, nextActiveHost.userId),
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });
        if (newHostRecord) {
          foundRoom.host = newHostRecord;
        }
      }
    }

    const isHost = foundRoom.hostId === userId;
    const settings = foundRoom.settings
      ? isHost
        ? foundRoom.settings
        : (({ passcode: _passcode, ...rest }) => ({
            ...rest,
            hasPasscode: Boolean(_passcode),
          }))(foundRoom.settings)
      : null;

    return {
      ...foundRoom,
      settings,
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

    if (foundRoom.expiresAt < new Date()) {
      await db.delete(room).where(eq(room.id, foundRoom.id));
      await presenceService.clearRoomPresence(foundRoom.id);
      throw new BadRequestError('This room has expired and has been closed.');
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
    const maxCapacity = settings?.maxParticipants || ROOM_CAPACITY[foundRoom.type];
    if (activeCount >= maxCapacity && foundRoom.hostId !== userId) {
      throw new ForbiddenError(
        `This ${foundRoom.type === 'meet' ? 'video meeting' : 'audio room'} has reached its maximum capacity (${maxCapacity} participants).`
      );
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

    await presenceService.setUserActiveRoom(userId, foundRoom.id, PRESENCE_HEARTBEAT_TTL);

    const isHost = foundRoom.hostId === userId;
    const sanitizedSettings = foundRoom.settings
      ? isHost
        ? foundRoom.settings
        : (({ passcode: _passcode, ...rest }) => ({
            ...rest,
            hasPasscode: Boolean(_passcode),
          }))(foundRoom.settings)
      : null;

    return {
      room: foundRoom,
      settings: sanitizedSettings,
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

    // 1. Mark this user as left in roomUser
    await db
      .update(roomUser)
      .set({
        status: 'left',
        leftAt: new Date(),
      })
      .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.userId, userId)));

    await presenceService.clearUserActiveRoom(userId, foundRoom.id);

    // 2. Host Succession Logic: if the departing user is the host
    const isHostLeaving = foundRoom.hostId === userId;

    if (isHostLeaving) {
      // Find the next active participant who joined earliest (First-In, Next-Host)
      const nextHostUser = await db.query.roomUser.findFirst({
        where: and(
          eq(roomUser.roomId, foundRoom.id),
          eq(roomUser.status, 'active'),
          ne(roomUser.userId, userId)
        ),
        orderBy: [asc(roomUser.joinedAt)],
      });

      if (nextHostUser) {
        // Transfer host privileges to the successor
        await db
          .update(room)
          .set({ hostId: nextHostUser.userId })
          .where(eq(room.id, foundRoom.id));

        await db
          .update(roomUser)
          .set({ role: 'host' })
          .where(eq(roomUser.id, nextHostUser.id));

        return {
          success: true,
          transferredHost: true,
          newHostId: nextHostUser.userId,
        };
      } else {
        // No remaining active participants -> delete the room immediately
        await db.delete(room).where(eq(room.id, foundRoom.id));
        await presenceService.clearRoomPresence(foundRoom.id);

        return {
          success: true,
          roomDeleted: true,
        };
      }
    } else {
      // Non-host leaving: Check if any active participants remain
      const [remainingActive] = await db
        .select({ count: count() })
        .from(roomUser)
        .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.status, 'active')));

      if ((remainingActive?.count ?? 0) === 0) {
        // No participants left -> delete empty room
        await db.delete(room).where(eq(room.id, foundRoom.id));
        await presenceService.clearRoomPresence(foundRoom.id);

        return {
          success: true,
          roomDeleted: true,
        };
      }
    }

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

    await db.delete(room).where(eq(room.id, foundRoom.id));
    await presenceService.clearRoomPresence(foundRoom.id);

    return { success: true, message: 'Room ended and deleted successfully' };
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

    if (!foundRoom || foundRoom.expiresAt < new Date()) {
      if (foundRoom) {
        await db.delete(room).where(eq(room.id, foundRoom.id));
        await presenceService.clearRoomPresence(foundRoom.id);
      }
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

  heartbeat: async (userId: string, code: string) => {
    const normalized = normalizeRoomCode(code);
    const foundRoom = await db.query.room.findFirst({
      where: eq(room.code, normalized),
      columns: {
        id: true,
        expiresAt: true,
      },
    });

    if (!foundRoom) {
      await presenceService.clearUserActiveRoom(userId);
      throw new NotFoundError('Room not found');
    }

    if (foundRoom.expiresAt < new Date()) {
      await db.delete(room).where(eq(room.id, foundRoom.id));
      await presenceService.clearRoomPresence(foundRoom.id);
      await presenceService.clearUserActiveRoom(userId, foundRoom.id);
      throw new BadRequestError('This room has expired and has been closed.');
    }

    await presenceService.refreshHeartbeat(userId, foundRoom.id, PRESENCE_HEARTBEAT_TTL);

    return {
      success: true,
      ttl: PRESENCE_HEARTBEAT_TTL,
    };
  },
};
