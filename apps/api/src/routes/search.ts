import { Router } from 'express';
import { searchService } from '../services/search.service.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { z } from 'zod';

const router: Router = Router();

// ... (schema remains the same)
const searchSchema = z.object({
  q: z.string().min(1),
  teamId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { q, teamId, limit } = searchSchema.parse(req.query);

    // TODO: เพิ่มการตรวจสอบสิทธิ์ว่า User อยู่ในทีมนี้จริงๆ ไหม
    // (ตอนนี้ใช้ authenticate เบื้องต้นไปก่อน)

    const hits = await searchService.searchTasks(q, teamId, limit);
    
    res.json({
      success: true,
      data: hits,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
