import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const reportCategoryEnum = pgEnum('report_category', [
  'bug',
  'audio_video',
  'feature',
  'other',
]);

export const report = pgTable(
  'report',
  {
    id: text('id').primaryKey(),
    category: reportCategoryEnum('category').notNull().default('bug'),
    content: text('content').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    roomCode: text('room_code'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('report_category_idx').on(table.category),
    index('report_userId_idx').on(table.userId),
    index('report_roomCode_idx').on(table.roomCode),
    index('report_createdAt_idx').on(table.createdAt),
  ]
);

export const reportRelations = relations(report, ({ one }) => ({
  user: one(user, {
    fields: [report.userId],
    references: [user.id],
  }),
}));

export type Report = typeof report.$inferSelect;
export type NewReport = typeof report.$inferInsert;
export type ReportCategory = (typeof reportCategoryEnum.enumValues)[number];
