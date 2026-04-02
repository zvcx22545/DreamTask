import { redis, TASK_PUBSUB_CHANNEL } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

/** Publish a task event to the Redis pub/sub channel */
export async function publishTaskEvent(payload: Record<string, unknown>): Promise<void> {
  try {
    await redis.publish(TASK_PUBSUB_CHANNEL, JSON.stringify(payload));
    logger.debug({ type: payload['type'] }, 'Task event published');
  } catch (err) {
    logger.error({ err }, 'Failed to publish task event');
  }
}
