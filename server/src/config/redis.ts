import { Redis, type RedisOptions } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const upstashHost = new URL(env.UPSTASH_REDIS_REST_URL).host;
const redisUrl = `rediss://default:${env.UPSTASH_REDIS_REST_TOKEN}@${upstashHost}:6379`;

export const createRedisClient = (name = 'default', options?: RedisOptions): Redis => {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 10000,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    ...options,
  });

  client.on('error', (err) => {
    logger.warn({ err: err.message, client: name }, 'Redis connection warning');
  });

  client.on('connect', () => {
    logger.info({ client: name }, 'Redis client connected');
  });

  return client;
};

export const redis = createRedisClient('app:default');
