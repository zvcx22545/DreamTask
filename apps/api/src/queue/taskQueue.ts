import { Queue } from 'bullmq';
import { redis } from '../lib/redis.js';

export const taskQueue = new Queue('task-activity', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
