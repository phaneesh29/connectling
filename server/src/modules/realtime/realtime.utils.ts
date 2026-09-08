import crypto from 'node:crypto';
import type { ChatMessage } from './realtime.types.js';

export const buildChatMessage = (
  userId: string,
  name: string,
  image: string | null | undefined,
  text: string
): ChatMessage => ({
  id: crypto.randomUUID(),
  userId,
  name,
  image,
  text: text.trim().slice(0, 1000),
  timestamp: Date.now(),
});
