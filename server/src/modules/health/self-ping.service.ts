import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../../utils/logger.js';

let cronTask: ScheduledTask | null = null;
let isPinging = false;

export const startSelfPing = (port: number | string): void => {
  if (cronTask) {
    logger.warn('Self-ping cron task is already scheduled');
    return;
  }

  const baseUrl = process.env.RENDER_EXTERNAL_URL
    ? process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')
    : `http://localhost:${port}`;
  const healthUrl = `${baseUrl}/api/v1/health`;

  cronTask = cron.schedule('*/30 * * * * *', async () => {
    if (isPinging) {
      return;
    }

    isPinging = true;
    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Connectling-SelfPing/1.0',
        },
      });

      if (!response.ok) {
        logger.warn(
          { status: response.status, url: healthUrl },
          'Self-ping health check returned non-200 status'
        );
      }
    } catch (err) {
      logger.warn(
        { error: (err as Error).message, url: healthUrl },
        'Self-ping health check failed'
      );
    } finally {
      isPinging = false;
    }
  });

  logger.info({ healthUrl, schedule: 'every 30 seconds' }, 'Self-ping keep-alive task started via node-cron');
};

export const stopSelfPing = (): void => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    isPinging = false;
    logger.info('Self-ping keep-alive cron stopped');
  }
};
