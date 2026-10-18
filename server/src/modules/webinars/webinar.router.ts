import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  createWebinarSchema,
  updateWebinarSchema,
  updateWebinarStatusSchema,
  webinarCodeParamSchema,
} from './webinar.validation.js';
import {
  createWebinarHandler,
  getWebinarHandler,
  updateWebinarHandler,
  updateWebinarStatusHandler,
  listMyWebinarsHandler,
  listUpcomingWebinarsHandler,
  deleteWebinarHandler,
} from './webinar.controller.js';

export const webinarRouter = Router();

// Strictly enforce authentication for all webinar endpoints
webinarRouter.use(requireAuth);

// List upcoming webinars
webinarRouter.get('/', listUpcomingWebinarsHandler);

// List host's own webinars
webinarRouter.get('/me', listMyWebinarsHandler);

// Create new webinar
webinarRouter.post(
  '/',
  validateRequest({ body: createWebinarSchema }),
  createWebinarHandler
);

// Get webinar details by code
webinarRouter.get(
  '/:code',
  validateRequest({ params: webinarCodeParamSchema }),
  getWebinarHandler
);

// Update webinar details (host only)
webinarRouter.patch(
  '/:code',
  validateRequest({ params: webinarCodeParamSchema, body: updateWebinarSchema }),
  updateWebinarHandler
);

// Update broadcast status (host only)
webinarRouter.patch(
  '/:code/status',
  validateRequest({ params: webinarCodeParamSchema, body: updateWebinarStatusSchema }),
  updateWebinarStatusHandler
);

// Delete webinar (host only)
webinarRouter.delete(
  '/:code',
  validateRequest({ params: webinarCodeParamSchema }),
  deleteWebinarHandler
);
