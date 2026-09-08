import { redis } from '../../config/redis.js';

export class RealtimeService {
  async publishEvent(roomCode: string, payload: Record<string, unknown>) {
    try {
      await redis.publish(`room:${roomCode}:events`, JSON.stringify(payload));
    } catch {
    }
  }
}

export const realtimeService = new RealtimeService();
