import type { Request, Response } from 'express';
import { getSystemHealth } from './health.service.js';

export const getHealth = (_req: Request, res: Response): void => {
  const health = getSystemHealth();
  res.status(200).json({
    success: true,
    data: health,
  });
};
