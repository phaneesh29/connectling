import { db } from '../../db/index.js';
import { room, roomUser } from '../../db/room-schema.js';
import { eq, and } from 'drizzle-orm';
import { roomService } from '../rooms/room.service.js';
import { redis } from '../../config/redis.js';
import type { PeerState } from './realtime.types.js';

export class RealtimeService {
  async getRoomAndParticipants(roomCode: string, userId: string) {
    const foundRoom = await db.query.room.findFirst({
      where: eq(room.code, roomCode),
    });

    if (!foundRoom) {
      return null;
    }

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

    const myParticipant = participants.find((p) => p.userId === userId);
    const myRole = (myParticipant?.role as PeerState['role']) || (foundRoom.hostId === userId ? 'host' : 'participant');

    await redis.sadd(`room:${roomCode}:presence`, userId);
    await redis.expire(`room:${roomCode}:presence`, 86400);

    return {
      room: foundRoom,
      participants,
      myRole,
    };
  }

  async updateStageRole(roomCode: string, hostUserId: string, targetUserId: string, role: 'speaker' | 'listener') {
    const foundRoom = await db.query.room.findFirst({
      where: eq(room.code, roomCode),
    });

    if (!foundRoom || foundRoom.hostId !== hostUserId) {
      return { success: false, error: 'Only the host can change participant roles.' };
    }

    await db
      .update(roomUser)
      .set({ role })
      .where(and(eq(roomUser.roomId, foundRoom.id), eq(roomUser.userId, targetUserId)));

    await this.publishEvent(roomCode, {
      type: 'stage:role-updated',
      userId: targetUserId,
      role,
    });

    return { success: true };
  }

  async processLeave(roomCode: string, userId: string) {
    await redis.srem(`room:${roomCode}:presence`, userId);
    const result = await roomService.leaveRoom(userId, roomCode);

    const newHostId = result.transferredHost ? result.newHostId : undefined;
    await this.publishEvent(roomCode, {
      type: 'user:left',
      userId,
      newHostId,
    });

    return { newHostId };
  }

  async publishEvent(roomCode: string, payload: Record<string, unknown>) {
    try {
      await redis.publish(`room:${roomCode}:events`, JSON.stringify(payload));
    } catch {
      // Best-effort publish over Upstash REST
    }
  }
}

export const realtimeService = new RealtimeService();
