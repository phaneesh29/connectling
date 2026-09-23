import { Router } from 'express';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { createReportSchema } from './report.validation.js';
import { createReportHandler } from './report.controller.js';

export const reportRouter = Router();

reportRouter.post(
  '/',
  requireAuth,
  validateRequest({ body: createReportSchema }),
  createReportHandler
);
