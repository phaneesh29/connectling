import type { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '5 m'),
  prefix: 'ratelimit:global',
  ephemeralCache: new Map(),
  timeout: 1500,
  analytics: false,
});

export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  try {
    const { success, limit, remaining, reset, pending } = await ratelimit.limit(ip);

    if (pending) {
      pending.catch((err) => logger.warn({ err }, 'Rate limiter background task warning'));
    }

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', reset.toString());

    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Maximum 100 requests per 5 minutes allowed.',
        retryAfter,
      });
      return;
    }

    next();
  } catch (error) {
    logger.error({ err: error, ip }, 'Rate limiter encountered an error; failing open');
    next();
  }
};
