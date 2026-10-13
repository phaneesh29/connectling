import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, index, pgEnum } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const webinarStatusEnum = pgEnum('webinar_status', ['scheduled', 'live', 'ended']);

export const webinar = pgTable(
  'webinar',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    hostId: text('host_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    youtubeVideoId: text('youtube_video_id'),
    status: webinarStatusEnum('status').notNull().default('scheduled'),
    scheduledAt: timestamp('scheduled_at'),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    allowChat: boolean('allow_chat').default(true).notNull(),
    allowQa: boolean('allow_qa').default(true).notNull(),
    allowWhiteboard: boolean('allow_whiteboard').default(true).notNull(),
    allowReactions: boolean('allow_reactions').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('webinar_hostId_idx').on(table.hostId),
    index('webinar_code_idx').on(table.code),
    index('webinar_status_idx').on(table.status),
  ]
);

export const webinarRelations = relations(webinar, ({ one }) => ({
  host: one(user, {
    fields: [webinar.hostId],
    references: [user.id],
  }),
}));

export type Webinar = typeof webinar.$inferSelect;
export type NewWebinar = typeof webinar.$inferInsert;
