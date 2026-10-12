export const ROOM_CAPACITY = {
  meet: 6,
  audio: 16,
} as const;

export const ROOM_CONSTANTS = {
  MEET: {
    MAX_PARTICIPANTS: 6,
    MIN_PARTICIPANTS: 2,
  },
  AUDIO: {
    MAX_PARTICIPANTS: 16,
    MIN_PARTICIPANTS: 2,
  },
  MAX_ROOM_DURATION_HOURS: 24,
  ROOM_DURATION_MINUTES: 24 * 60,
  HEARTBEAT_INTERVAL_SECONDS: 15,
} as const;

export type RoomType = keyof typeof ROOM_CAPACITY;
