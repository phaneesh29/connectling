import { randomUUID } from 'node:crypto';
import { db } from '../../db/index.js';
import { report } from '../../db/report-schema.js';
import type { CreateReportInput } from './report.validation.js';

export const reportService = {
  async createReport(input: CreateReportInput, userId?: string) {
    const id = randomUUID();

    const [created] = await db
      .insert(report)
      .values({
        id,
        category: input.category,
        content: input.content,
        userId: userId || null,
        roomCode: input.roomCode || null,
      })
      .returning();

    return created;
  },
};
