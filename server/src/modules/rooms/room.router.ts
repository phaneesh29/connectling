import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  createRoomSchema,
  joinRoomSchema,
  updateRoomSettingsSchema,
  roomCodeParamSchema,
} from './room.validation.js';
import {
  createRoomHandler,
  getRoomHandler,
  joinRoomHandler,
  leaveRoomHandler,
  updateSettingsHandler,
  endRoomHandler,
  getUserPresenceHandler,
} from './room.controller.js';

export const roomRouter = Router();

roomRouter.use(requireAuth);

roomRouter.post(
  '/',
  validateRequest({ body: createRoomSchema }),
  createRoomHandler
);

roomRouter.get('/my/presence', getUserPresenceHandler);

roomRouter.get(
  '/:code',
  validateRequest({ params: roomCodeParamSchema }),
  getRoomHandler
);

roomRouter.post(
  '/:code/join',
  validateRequest({ params: roomCodeParamSchema, body: joinRoomSchema }),
  joinRoomHandler
);

roomRouter.post(
  '/:code/leave',
  validateRequest({ params: roomCodeParamSchema }),
  leaveRoomHandler
);

roomRouter.patch(
  '/:code/settings',
  validateRequest({ params: roomCodeParamSchema, body: updateRoomSettingsSchema }),
  updateSettingsHandler
);

roomRouter.post(
  '/:code/end',
  validateRequest({ params: roomCodeParamSchema }),
  endRoomHandler
);
