import { Router } from 'express';
import { healthRouter } from '../modules/health/health.router.js';
import { roomRouter } from '../modules/rooms/room.router.js';
import { reportRouter } from '../modules/reports/report.router.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/rooms', roomRouter);
apiRouter.use('/reports', reportRouter);
