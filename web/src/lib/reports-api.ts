import { z } from 'zod';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const reportCategoryValues = ['bug', 'audio_video', 'feature', 'other'] as const;
export type ReportCategory = (typeof reportCategoryValues)[number];

export const createReportSchema = z.object({
  category: z.enum(reportCategoryValues, {
    message: 'Please select a valid category',
  }).default('bug'),
  content: z
    .string()
    .min(5, 'Report or feedback must be at least 5 characters')
    .max(3000, 'Content cannot exceed 3000 characters')
    .trim(),
  roomCode: z
    .string()
    .max(64)
    .trim()
    .optional()
    .nullable(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export interface ReportRecord {
  id: string;
  category: ReportCategory;
  content: string;
  userId: string | null;
  roomCode: string | null;
  createdAt: string;
}

export interface ReportApiResponse {
  success: boolean;
  message: string;
  data?: {
    report: ReportRecord;
    contactEmail: string;
  };
}

export const reportsApi = {
  async submitReport(payload: CreateReportInput): Promise<ReportApiResponse> {
    // Validate with zod before sending
    const validated = createReportSchema.parse(payload);

    const res = await fetch(`${API_BASE_URL}/api/v1/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(validated),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to submit report');
    }

    return data;
  },
};
