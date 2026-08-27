export const ROOM_CAPACITY = {
  meet: 4,
  audio: 10,
} as const;

export const ROOM_CONSTANTS = {
  MEET: {
    MAX_PARTICIPANTS: 4,
    MIN_PARTICIPANTS: 2,
  },
  AUDIO: {
    MAX_PARTICIPANTS: 10,
    MIN_PARTICIPANTS: 2,
  },
  HEARTBEAT_INTERVAL_SECONDS: 15,
  PRESENCE_TTL_SECONDS: 45,
} as const;

export type RoomType = keyof typeof ROOM_CAPACITY;
