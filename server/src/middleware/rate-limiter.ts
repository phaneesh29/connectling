import type { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const MAX_POINTS = 100;
const DURATION_SECONDS = 300; 

const limiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ratelimit:global',
  points: MAX_POINTS,
  duration: DURATION_SECONDS,
});

export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  try {
    const rateLimiterRes = await limiter.consume(ip);

    res.setHeader('X-RateLimit-Limit', MAX_POINTS.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints.toString());
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
    );

    next();
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      const retryAfter = Math.max(1, Math.ceil(error.msBeforeNext / 1000));

      res.setHeader('X-RateLimit-Limit', MAX_POINTS.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext).toISOString());
      res.setHeader('Retry-After', retryAfter.toString());

      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Maximum 100 requests per 5 minutes allowed.',
        retryAfter,
      });
      return;
    }

    logger.error({ err: error, ip }, 'Rate limiter encountered an error; failing open');
    next();
  }
};
