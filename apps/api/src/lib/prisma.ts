import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { config } from '../config.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    datasourceUrl: config.db.url,
    log: config.app.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.app.env !== 'production') {
  globalThis.__prisma = prisma;
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
});
