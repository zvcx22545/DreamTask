import { createActivityWorker } from './activityWorker.js';
import { logger } from '../../lib/logger.js';

export function setupWorkers() {
  const activityWorker = createActivityWorker();
  logger.info('BullMQ workers started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await activityWorker.close();
    logger.info('Workers gracefully shut down');
  });
}
