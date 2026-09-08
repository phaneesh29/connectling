import crypto from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { room, roomSettings, type Room, type RoomSettings } from '../../db/room-schema.js';
import { generateRoomCode, normalizeRoomCode } from './room.utils.js';
import { ROOM_CAPACITY, ROOM_CONSTANTS } from './rooms.constants.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../utils/app-error.js';
import type {
  CreateRoomInput,
  JoinRoomInput,
  UpdateRoomSettingsInput,
} from './room.validation.js';

export const roomService = {
  createRoom: async (userId: string, input: CreateRoomInput) => {
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
    } catch (error) {
      await db.delete(room).where(eq(room.id, roomId)).catch(() => {});
      throw error;
    }

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
      throw new NotFoundError('Room has expired and is no longer available.');
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
      activeParticipantsCount: 0,
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
      throw new BadRequestError('This room has expired and has been closed.');
    }

    const settings = foundRoom.settings;

    if (settings?.isPrivate && foundRoom.hostId !== userId) {
      if (!input.passcode || input.passcode !== settings.passcode) {
        throw new ForbiddenError('Incorrect or missing room passcode.');
      }
    }

    const role =
      foundRoom.hostId === userId
        ? 'host'
        : foundRoom.type === 'audio'
          ? 'listener'
          : 'participant';

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
      participant: {
        roomId: foundRoom.id,
        userId,
        role,
      },
    };
  },

  leaveRoom: async (_userId: string, _code: string) => {
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

    return { success: true, message: 'Room ended and deleted successfully' };
  },

  heartbeat: async (_userId: string, code: string) => {
    const normalized = normalizeRoomCode(code);
    const foundRoom = await db.query.room.findFirst({
      where: eq(room.code, normalized),
      columns: {
        id: true,
        expiresAt: true,
      },
    });

    if (!foundRoom) {
      throw new NotFoundError('Room not found');
    }

    if (foundRoom.expiresAt < new Date()) {
      await db.delete(room).where(eq(room.id, foundRoom.id));
      throw new BadRequestError('This room has expired and has been closed.');
    }

    return {
      success: true,
    };
  },

  listMyRooms: async (userId: string, type?: 'meet' | 'audio') => {
    const now = new Date();
    const whereClause = and(
      eq(room.hostId, userId),
      eq(room.status, 'active'),
      type ? eq(room.type, type) : undefined
    );

    const roomsList = await db.query.room.findMany({
      where: whereClause,
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
      orderBy: [desc(room.createdAt)],
      limit: 20,
    });

    const activeRooms = roomsList.filter((r) => r.expiresAt > now);

    return activeRooms.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      description: r.description,
      type: r.type,
      status: r.status,
      hasPasscode: !!r.settings?.passcode,
      host: r.host,
      participantCount: 0,
      maxParticipants: r.settings?.maxParticipants || (r.type === 'meet' ? 4 : 10),
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));
  },
};
