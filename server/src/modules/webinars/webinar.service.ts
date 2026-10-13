import crypto from 'node:crypto';
import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { webinar, user, type Webinar } from '../../db/schema.js';
import { generateRoomCode, normalizeRoomCode } from '../rooms/room.utils.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../utils/app-error.js';
import {
  extractYouTubeVideoId,
  type CreateWebinarInput,
  type UpdateWebinarInput,
} from './webinar.validation.js';

export const webinarService = {
  createWebinar: async (hostId: string, input: CreateWebinarInput) => {
    let code = generateRoomCode();
    let existing = await db.query.webinar.findFirst({
      where: eq(webinar.code, code),
    });

    while (existing) {
      code = generateRoomCode();
      existing = await db.query.webinar.findFirst({
        where: eq(webinar.code, code),
      });
    }

    const webinarId = crypto.randomUUID();
    const parsedVideoId = extractYouTubeVideoId(input.youtubeVideoId);
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

    const [created] = await db
      .insert(webinar)
      .values({
        id: webinarId,
        code,
        title: input.title,
        description: input.description ?? null,
        hostId,
        youtubeVideoId: parsedVideoId,
        status: 'scheduled',
        scheduledAt,
        allowChat: input.allowChat ?? true,
        allowQa: input.allowQa ?? true,
        allowWhiteboard: input.allowWhiteboard ?? true,
        allowReactions: input.allowReactions ?? true,
      })
      .returning();

    return created;
  },

  getWebinarByCode: async (code: string, currentUserId?: string) => {
    const normalized = normalizeRoomCode(code);
    const found = await db.query.webinar.findFirst({
      where: eq(webinar.code, normalized),
      with: {
        host: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!found) {
      throw new NotFoundError('Webinar not found');
    }

    const isHost = Boolean(currentUserId && currentUserId === found.hostId);

    return {
      ...found,
      isHost,
    };
  },

  updateWebinar: async (hostId: string, code: string, input: UpdateWebinarInput) => {
    const normalized = normalizeRoomCode(code);
    const existing = await db.query.webinar.findFirst({
      where: eq(webinar.code, normalized),
    });

    if (!existing) {
      throw new NotFoundError('Webinar not found');
    }

    if (existing.hostId !== hostId) {
      throw new ForbiddenError('Only the host can modify webinar settings');
    }

    const updateData: Partial<typeof webinar.$inferInsert> = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.youtubeVideoId !== undefined) {
      updateData.youtubeVideoId = extractYouTubeVideoId(input.youtubeVideoId);
    }
    if (input.scheduledAt !== undefined) {
      updateData.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    }
    if (input.allowChat !== undefined) updateData.allowChat = input.allowChat;
    if (input.allowQa !== undefined) updateData.allowQa = input.allowQa;
    if (input.allowWhiteboard !== undefined) updateData.allowWhiteboard = input.allowWhiteboard;
    if (input.allowReactions !== undefined) updateData.allowReactions = input.allowReactions;

    const [updated] = await db
      .update(webinar)
      .set(updateData)
      .where(eq(webinar.id, existing.id))
      .returning();

    return updated;
  },

  updateWebinarStatus: async (
    hostId: string,
    code: string,
    status: 'scheduled' | 'live' | 'ended'
  ) => {
    const normalized = normalizeRoomCode(code);
    const existing = await db.query.webinar.findFirst({
      where: eq(webinar.code, normalized),
    });

    if (!existing) {
      throw new NotFoundError('Webinar not found');
    }

    if (existing.hostId !== hostId) {
      throw new ForbiddenError('Only the host can change webinar broadcast status');
    }

    const updateData: Partial<typeof webinar.$inferInsert> = { status };

    if (status === 'live' && !existing.startedAt) {
      updateData.startedAt = new Date();
    } else if (status === 'ended') {
      updateData.endedAt = new Date();
    }

    const [updated] = await db
      .update(webinar)
      .set(updateData)
      .where(eq(webinar.id, existing.id))
      .returning();

    return updated;
  },

  listHostWebinars: async (hostId: string) => {
    return db.query.webinar.findMany({
      where: eq(webinar.hostId, hostId),
      orderBy: [desc(webinar.createdAt)],
    });
  },

  listUpcomingWebinars: async () => {
    return db.query.webinar.findMany({
      where: inArray(webinar.status, ['scheduled', 'live']),
      with: {
        host: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [desc(webinar.status), desc(webinar.createdAt)],
      limit: 20,
    });
  },
};
