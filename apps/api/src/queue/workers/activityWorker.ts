import { Worker } from 'bullmq';
import { redis } from '../../lib/redis.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

export function createActivityWorker() {
  const worker = new Worker(
    'task-activity',
    async (job) => {
      const { taskId, userId, action } = job.data as {
        taskId: string;
        userId: string;
        action: string;
      };

      await prisma.taskActivityLog.create({
        data: { taskId, userId, action },
      });

      logger.debug({ taskId, userId, action }, 'Activity logged');
    },
    {
      connection: redis,
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Activity worker job failed');
  });

  return worker;
}
