import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

// ============================================================================
// SearchService - Fallback to Database Search (Replaced Meilisearch)
// ============================================================================

class SearchService {
  constructor() {
    logger.info('Initialized Database Search service (fallback from Meilisearch)');
  }

  /**
   * Sync Task (No-op since we query the DB directly)
   */
  async syncTask(task: any) {
    // 
  }

  /**
   * ลบ Task (No-op since DB handles it)
   */
  async removeFromIndex(taskId: string) {
    // 
  }

  /**
   * ค้นหา Task ตามคำค้นหา (Query) และ Filter ตาม Team โดยใช้ Prisma ILIKE/contains
   */
  async searchTasks(query: string, teamId: string, limit: number = 20) {
    try {
      if (!query.trim()) return [];
      
      const results = await prisma.task.findMany({
        where: {
          teamId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        include: {
          assignee: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { updatedAt: 'desc' }
      });
      
      return results;
    } catch (error) {
      logger.error({ error, query }, 'Database search failed');
      return [];
    }
  }
}

export const searchService = new SearchService();
