import { Router } from 'express';
import { validateRequest } from '../../middleware/validate.js';
import { optionalAuth } from '../../middleware/auth.js';
import { createReportSchema } from './report.validation.js';
import { createReportHandler } from './report.controller.js';

export const reportRouter = Router();

reportRouter.post(
  '/',
  optionalAuth,
  validateRequest({ body: createReportSchema }),
  createReportHandler
);
