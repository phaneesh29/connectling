import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, integer, index, pgEnum } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const roomTypeEnum = pgEnum('room_type', ['meet', 'audio']);
export const roomStatusEnum = pgEnum('room_status', ['active', 'ended', 'scheduled']);

export const room = pgTable(
  'room',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    type: roomTypeEnum('type').notNull().default('meet'),
    status: roomStatusEnum('status').notNull().default('active'),
    hostId: text('host_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('room_hostId_idx').on(table.hostId),
    index('room_code_idx').on(table.code),
    index('room_status_idx').on(table.status),
  ]
);

export const roomSettings = pgTable(
  'room_settings',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .unique()
      .references(() => room.id, { onDelete: 'cascade' }),
    micForAll: boolean('mic_for_all').default(true).notNull(),
    videoForAll: boolean('video_for_all').default(true).notNull(),
    screenShareForAll: boolean('screen_share_for_all').default(true).notNull(),
    allowChat: boolean('allow_chat').default(true).notNull(),
    allowRaiseHand: boolean('allow_raise_hand').default(true).notNull(),
    maxParticipants: integer('max_participants').default(50).notNull(),
    isPrivate: boolean('is_private').default(false).notNull(),
    passcode: text('passcode'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('room_settings_roomId_idx').on(table.roomId)]
);

export const roomRelations = relations(room, ({ one }) => ({
  host: one(user, {
    fields: [room.hostId],
    references: [user.id],
  }),
  settings: one(roomSettings, {
    fields: [room.id],
    references: [roomSettings.roomId],
  }),
}));

export const roomSettingsRelations = relations(roomSettings, ({ one }) => ({
  room: one(room, {
    fields: [roomSettings.roomId],
    references: [room.id],
  }),
}));

export type Room = typeof room.$inferSelect;
export type NewRoom = typeof room.$inferInsert;
export type RoomSettings = typeof roomSettings.$inferSelect;
export type NewRoomSettings = typeof roomSettings.$inferInsert;
