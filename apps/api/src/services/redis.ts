import { redis, TASK_CACHE_KEY, TASK_CACHE_TTL } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

/** Get cached task list. Returns null on miss. */
export async function getCachedTasks(): Promise<unknown | null> {
  try {
    const raw = await redis.get(TASK_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: unknown; cachedAt: number };
    const ageMs = Date.now() - parsed.cachedAt;

    logger.debug({ ageMs }, 'Redis cache hit');
    return parsed.data;
  } catch (err) {
    logger.warn({ err }, 'Redis cache read error');
    return null;
  }
}

/**
 * Write data to Redis or bust the cache.
 * Pass `null` to bust (e.g., after mutation).
 */
export async function invalidateTaskCache(data: unknown | null): Promise<void> {
  try {
    if (data === null) {
      await redis.del(TASK_CACHE_KEY);
      logger.debug('Task cache busted');
    } else {
      const payload = JSON.stringify({ data, cachedAt: Date.now() });
      await redis.set(TASK_CACHE_KEY, payload, 'EX', TASK_CACHE_TTL);
      logger.debug({ ttl: TASK_CACHE_TTL }, 'Task cache updated');
    }
  } catch (err) {
    logger.warn({ err }, 'Redis cache write error');
  }
}
