import { db } from '../../db/index.js';
import { room, roomUser } from '../../db/room-schema.js';
import { eq, and } from 'drizzle-orm';
import { roomService } from '../rooms/room.service.js';
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

    return { success: true };
  }

  async processLeave(roomCode: string, userId: string) {
    const result = await roomService.leaveRoom(userId, roomCode);
    return {
      newHostId: result.transferredHost ? result.newHostId : undefined,
    };
  }
}

export const realtimeService = new RealtimeService();
