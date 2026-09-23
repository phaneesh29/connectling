import { z } from 'zod';

export const reportCategoryValues = ['bug', 'audio_video', 'feature', 'other'] as const;

export const createReportSchema = z.object({
  category: z
    .enum(reportCategoryValues)
    .default('bug'),
  content: z
    .string()
    .min(5, 'Report or feedback must be at least 5 characters')
    .max(3000, 'Report cannot exceed 3000 characters')
    .trim(),
  roomCode: z
    .string()
    .max(64)
    .trim()
    .optional()
    .nullable(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
