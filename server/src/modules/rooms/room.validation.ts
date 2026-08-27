import { z } from 'zod';

export const createRoomSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
  type: z.enum(['meet', 'audio']).default('meet'),
  settings: z
    .object({
      micForAll: z.boolean().optional(),
      videoForAll: z.boolean().optional(),
      screenShareForAll: z.boolean().optional(),
      allowChat: z.boolean().optional(),
      allowRaiseHand: z.boolean().optional(),
      isPrivate: z.boolean().optional(),
      passcode: z.string().min(4, 'Passcode must be at least 4 characters').max(32).optional(),
    })
    .optional(),
});

export const joinRoomSchema = z.object({
  passcode: z.string().optional(),
});

export const updateRoomSettingsSchema = z.object({
  micForAll: z.boolean().optional(),
  videoForAll: z.boolean().optional(),
  screenShareForAll: z.boolean().optional(),
  allowChat: z.boolean().optional(),
  allowRaiseHand: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  passcode: z.string().min(4, 'Passcode must be at least 4 characters').max(32).nullable().optional(),
});

export const roomCodeParamSchema = z.object({
  code: z
    .string()
    .min(3, 'Invalid room code')
    .max(32, 'Invalid room code')
    .trim(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type UpdateRoomSettingsInput = z.infer<typeof updateRoomSettingsSchema>;
export type RoomCodeParam = z.infer<typeof roomCodeParamSchema>;
