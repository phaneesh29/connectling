import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/favicon.ico' || req.url === '/health' || req.url === '/api/v1/health',
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: (err) => ({
      message: err.message,
    }),
  },
});
