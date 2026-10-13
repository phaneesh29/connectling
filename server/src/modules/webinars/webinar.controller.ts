import type { Request, Response } from 'express';
import { webinarService } from './webinar.service.js';
import { getRealtimeServer } from '../realtime/realtime.gateway.js';
import type {
  CreateWebinarInput,
  UpdateWebinarInput,
  UpdateWebinarStatusInput,
  WebinarCodeParam,
} from './webinar.validation.js';

export const createWebinarHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const body = req.body as CreateWebinarInput;
  const result = await webinarService.createWebinar(userId, body);

  res.status(201).json({
    success: true,
    data: result,
  });
};

export const getWebinarHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { code } = req.params as WebinarCodeParam;
  const result = await webinarService.getWebinarByCode(code, userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const updateWebinarHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { code } = req.params as WebinarCodeParam;
  const body = req.body as UpdateWebinarInput;
  const result = await webinarService.updateWebinar(userId, code, body);

  const io = getRealtimeServer();
  if (io) {
    io.to(`webinar:${code}`).emit('webinar:updated', {
      title: result.title,
      description: result.description,
      youtubeVideoId: result.youtubeVideoId,
      allowChat: result.allowChat,
      allowQa: result.allowQa,
      allowWhiteboard: result.allowWhiteboard,
      allowReactions: result.allowReactions,
    });
  }

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const updateWebinarStatusHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { code } = req.params as WebinarCodeParam;
  const { status } = req.body as UpdateWebinarStatusInput;
  const result = await webinarService.updateWebinarStatus(userId, code, status);

  const io = getRealtimeServer();
  if (io) {
    io.to(`webinar:${code}`).emit('webinar:status:changed', {
      status: result.status,
      startedAt: result.startedAt,
      endedAt: result.endedAt,
    });
  }

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const listMyWebinarsHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const result = await webinarService.listHostWebinars(userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const listUpcomingWebinarsHandler = async (_req: Request, res: Response): Promise<void> => {
  const result = await webinarService.listUpcomingWebinars();

  res.status(200).json({
    success: true,
    data: result,
  });
};
