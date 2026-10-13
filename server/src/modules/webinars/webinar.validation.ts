import { z } from 'zod';

export const extractYouTubeVideoId = (input?: string | null): string | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // If it's already an 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    // youtu.be/VIDEO_ID
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.slice(1).split('/')[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    // youtube.com/watch?v=VIDEO_ID
    const vParam = url.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }
    // youtube.com/live/VIDEO_ID or youtube.com/embed/VIDEO_ID
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && /^[a-zA-Z0-9_-]{11}$/.test(lastPart)) {
      return lastPart;
    }
  } catch {
    // If invalid URL, return trimmed string as fallback
  }

  return trimmed;
};

export const createWebinarSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),
  youtubeVideoId: z.string().max(255).trim().optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
  allowChat: z.boolean().optional(),
  allowQa: z.boolean().optional(),
  allowWhiteboard: z.boolean().optional(),
  allowReactions: z.boolean().optional(),
});

export const updateWebinarSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title cannot exceed 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),
  youtubeVideoId: z.string().max(255).trim().optional().nullable(),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
  allowChat: z.boolean().optional(),
  allowQa: z.boolean().optional(),
  allowWhiteboard: z.boolean().optional(),
  allowReactions: z.boolean().optional(),
});

export const updateWebinarStatusSchema = z.object({
  status: z.enum(['scheduled', 'live', 'ended']),
});

export const webinarCodeParamSchema = z.object({
  code: z
    .string()
    .min(3, 'Invalid webinar code')
    .max(32, 'Invalid webinar code')
    .trim(),
});

export type CreateWebinarInput = z.infer<typeof createWebinarSchema>;
export type UpdateWebinarInput = z.infer<typeof updateWebinarSchema>;
export type UpdateWebinarStatusInput = z.infer<typeof updateWebinarStatusSchema>;
export type WebinarCodeParam = z.infer<typeof webinarCodeParamSchema>;
