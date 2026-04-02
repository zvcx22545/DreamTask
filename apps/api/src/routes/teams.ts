// ============================================================================
// Teams Router — เส้นทาง API ระบบจัดการทีม
// ============================================================================
// ไฟล์นี้เป็น "สารบัญ" ของ API ทั้งหมดที่เกี่ยวกับ Team
// Logic ทั้งหมดอยู่ใน models/team.model.ts
//
// เส้นทาง API:
//   GET    /teams                        → ดึงทีมทั้งหมดของ user
//   POST   /teams                        → สร้างทีมใหม่
//   GET    /teams/:id                    → ดึงรายละเอียดทีม
//   DELETE /teams/:id/members/:memberId  → ลบสมาชิกออกจากทีม
// ============================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getTeamsByUser,
  createTeam,
  getTeamById,
  removeMember,
} from '../models/team.model.js';

export const teamsRouter: Router = Router();

// ทุก route ใน /teams ต้อง login ก่อน
teamsRouter.use(requireAuth);

// ── ดึงทีมทั้งหมดของ user ──────────────────────────────────────────────────
teamsRouter.get('/', listTeams);

// ── สร้างทีมใหม่ ────────────────────────────────────────────────────────────
teamsRouter.post('/', addTeam);

// ── ดึงรายละเอียดทีมเดียว (พร้อมสมาชิก + invites) ───────────────────────────
teamsRouter.get('/:id', getTeam);

// ── ลบสมาชิกออกจากทีม ────────────────────────────────────────────────────────
teamsRouter.delete('/:id/members/:memberId', kickMember);

// ── Handler Functions ─────────────────────────────────────────────────────────

/** ดึงทีมทั้งหมดของ user ที่ login อยู่ */
async function listTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getTeamsByUser(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** สร้างทีมใหม่ — user ที่สร้างจะเป็น OWNER */
async function addTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await createTeam(req.body, req.user!.sub);
    res.status(201).json({ team });
  } catch (err) {
    next(err);
  }
}

/** ดึงรายละเอียดทีมเดียว พร้อมสมาชิก */
async function getTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await getTeamById(req.params.id, req.user!.sub);
    res.json({ team });
  } catch (err) {
    next(err);
  }
}

/** ลบสมาชิกออกจากทีม — ต้องเป็น OWNER/ADMIN หรือลาออกเอง */
async function kickMember(req: Request, res: Response, next: NextFunction) {
  try {
    await removeMember(req.params.id, req.params.memberId, req.user!.sub);
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    next(err);
  }
}
