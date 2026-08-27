import { redis } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

const USER_PRESENCE_PREFIX = 'user:presence:';
const ROOM_USERS_PREFIX = 'room:active_users:';
export const PRESENCE_HEARTBEAT_TTL = 45;

export const presenceService = {
  getUserActiveRoom: async (userId: string): Promise<string | null> => {
    try {
      return await redis.get<string>(`${USER_PRESENCE_PREFIX}${userId}`);
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get user active room from Redis');
      return null;
    }
  },

  setUserActiveRoom: async (userId: string, roomId: string, ttl = PRESENCE_HEARTBEAT_TTL): Promise<void> => {
    try {
      await redis.set(`${USER_PRESENCE_PREFIX}${userId}`, roomId, { ex: ttl });
      await redis.sadd(`${ROOM_USERS_PREFIX}${roomId}`, userId);
    } catch (error) {
      logger.error({ err: error, userId, roomId }, 'Failed to set user active room in Redis');
    }
  },

  refreshHeartbeat: async (userId: string, roomId: string, ttl = PRESENCE_HEARTBEAT_TTL): Promise<void> => {
    try {
      await redis.set(`${USER_PRESENCE_PREFIX}${userId}`, roomId, { ex: ttl });
      await redis.sadd(`${ROOM_USERS_PREFIX}${roomId}`, userId);
    } catch (error) {
      logger.error({ err: error, userId, roomId }, 'Failed to refresh room heartbeat in Redis');
    }
  },

  clearUserActiveRoom: async (userId: string, roomId?: string): Promise<void> => {
    try {
      const currentRoomId = roomId || (await redis.get<string>(`${USER_PRESENCE_PREFIX}${userId}`));
      await redis.del(`${USER_PRESENCE_PREFIX}${userId}`);
      if (currentRoomId) {
        await redis.srem(`${ROOM_USERS_PREFIX}${currentRoomId}`, userId);
      }
    } catch (error) {
      logger.error({ err: error, userId, roomId }, 'Failed to clear user active room in Redis');
    }
  },

  getRoomActiveUserIds: async (roomId: string): Promise<string[]> => {
    try {
      return await redis.smembers(`${ROOM_USERS_PREFIX}${roomId}`);
    } catch (error) {
      logger.error({ err: error, roomId }, 'Failed to get room active users from Redis');
      return [];
    }
  },

  clearRoomPresence: async (roomId: string): Promise<void> => {
    try {
      const userIds = await redis.smembers(`${ROOM_USERS_PREFIX}${roomId}`);
      if (userIds.length > 0) {
        const pipeline = redis.pipeline();
        for (const userId of userIds) {
          pipeline.del(`${USER_PRESENCE_PREFIX}${userId}`);
        }
        pipeline.del(`${ROOM_USERS_PREFIX}${roomId}`);
        await pipeline.exec();
      } else {
        await redis.del(`${ROOM_USERS_PREFIX}${roomId}`);
      }
    } catch (error) {
      logger.error({ err: error, roomId }, 'Failed to clear room presence in Redis');
    }
  },
};
