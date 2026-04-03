import { createRequire } from 'module';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';

const require = createRequire(import.meta.url);
const { MeiliSearch } = require('meilisearch');

// ============================================================================
// SearchService - Singleton สำหรับจัดการระบบค้นหา (Meilisearch)
// ============================================================================

const MEILI_URL = config.melli.MEILI_URL;
const MEILI_MASTER_KEY = config.melli.MEILI_MASTER_KEY;

class SearchService {
  private client: any; 
  private taskIndex: string = 'tasks';

  constructor() {
    try {
      this.client = new MeiliSearch({
        host: MEILI_URL,
        apiKey: MEILI_MASTER_KEY,
      });
      this.initIndex();
    } catch (error: any) {
      logger.error({ 
        message: error.message, 
        stack: error.stack,
        url: MEILI_URL 
      }, 'Failed to initialize Meilisearch client - Check if MEILI_URL is valid');
    }
  }

  /**
   * ตั้งค่าตั้งต้นสำหรับ Index (Settings)
   */
  private async initIndex() {
    try {
      if (!this.client) return;
      const index = this.client.index(this.taskIndex);
      await index.updateSettings({
        searchableAttributes: ['title', 'description'],
        filterableAttributes: ['teamId', 'status', 'priority', 'assigneeId'],
        sortableAttributes: ['createdAt', 'updatedAt'],
      });
      logger.info('Meilisearch settings updated successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Meilisearch');
    }
  }

  /**
   * Sync Task ไปยัง Meilisearch (Add or Update)
   */
  async syncTask(task: any) {
    try {
      if (!this.client) return;
      const index = this.client.index(this.taskIndex);
      await index.addDocuments([{
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        teamId: task.teamId,
        assigneeId: task.assigneeId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }]);
      logger.debug({ taskId: task.id }, 'Synced task to Meilisearch');
    } catch (error) {
      logger.error({ error, taskId: task.id }, 'Failed to sync task to Meilisearch');
    }
  }

  /**
   * ลบ Task ออกจาก Index
   */
  async removeFromIndex(taskId: string) {
    try {
      if (!this.client) return;
      const index = this.client.index(this.taskIndex);
      await index.deleteDocument(taskId);
      logger.debug({ taskId }, 'Removed task from Meilisearch index');
    } catch (error) {
      logger.error({ error, taskId }, 'Failed to remove task from Meilisearch');
    }
  }

  /**
   * ค้นหา Task ตามคำค้นหา (Query) และ Filter ตาม Team
   */
  async searchTasks(query: string, teamId: string, limit: number = 20) {
    try {
      if (!this.client) return [];
      const index = this.client.index(this.taskIndex);
      const results = await index.search(query, {
        filter: `teamId = ${teamId}`,
        limit,
      });
      return results.hits;
    } catch (error) {
      logger.error({ error, query }, 'Meilisearch search failed');
      return [];
    }
  }
}

export const searchService = new SearchService();
