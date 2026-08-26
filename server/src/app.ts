import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import { env } from './config/env.js';
import { httpLogger } from './utils/logger.js';
import { healthRouter } from './modules/health/health.router.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());

  const corsOrigins = env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );

  app.use(compression());
  app.use(hpp());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(httpLogger);


  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);


  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;
