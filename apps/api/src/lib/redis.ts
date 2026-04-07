import { Redis } from 'ioredis';
import { logger } from './logger.js';
import { config } from '../config.js';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: null, // required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

// Separate connection for subscriber (can't share with publisher)
export const redisSub = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err: any) => logger.error({ err }, 'Redis error'));

export const TASK_CACHE_KEY = 'tasks:list';
export const TASK_CACHE_TTL = 60; // seconds
export const TASK_PUBSUB_CHANNEL = 'task-events';
