import { createServer } from 'node:http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { httpLogger } from './utils/logger.js';
import { auth } from './auth.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { initRealtimeGateway } from './modules/realtime/realtime.gateway.js';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());

  const corsOrigin = env.CORS_ORIGIN.includes(',')
    ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : env.CORS_ORIGIN;

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );

  app.use(compression());
  app.use(hpp());

  app.use(rateLimiter);

  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(httpLogger);

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const app = createApp();
const server = createServer(app);

export const io = initRealtimeGateway(server);

export default server;
