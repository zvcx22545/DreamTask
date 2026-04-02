// ============================================================================
// Invites Router — เส้นทาง API ระบบเชิญสมาชิก
// ============================================================================
// ไฟล์นี้เป็น "สารบัญ" ของ API ทั้งหมดที่เกี่ยวกับ Team Invites
// Logic ทั้งหมดอยู่ใน models/invite.model.ts
//
// เส้นทาง API:
//   POST /invites          → สร้างคำเชิญ (ส่ง invite link)
//   POST /invites/accept   → ยอมรับคำเชิญ (เข้าร่วมทีม)
// ============================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createInvite, acceptInvite, acceptInvitePublic } from '../models/invite.model.js';

export const invitesRouter: Router = Router();

// ── สร้างคำเชิญสมาชิกเข้าทีม ────────────────────────────────────────────────
invitesRouter.post('/', requireAuth, sendInvite);

// ── ยอมรับคำเชิญ (user ต้อง login ก่อน) ─────────────────────────────────────
invitesRouter.post('/accept', requireAuth, acceptTeamInvite);

// ── ยอมรับคำเชิญสำหรับ user ใหม่ (Auto-Register + Auto-Login) ──────────────────
invitesRouter.post('/accept-public', acceptPublicInvite);

// ── Handler Functions ─────────────────────────────────────────────────────────

/** สร้างคำเชิญ — ตรวจสิทธิ์ ADMIN/OWNER แล้วสร้าง invite link */
async function sendInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await createInvite(req.body, req.user!.sub);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/** ยอมรับคำเชิญ — verify token แล้วเพิ่ม user เข้าทีม */
async function acceptTeamInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await acceptInvite(req.body, req.user!.sub);
    res.json({ message: 'Successfully joined team', teamId: result.teamId });
  } catch (err) {
    next(err);
  }
}

/** ยอมรับคำเชิญสำหรับ user ใหม่ — สร้าง user และ login ให้อัตโนมัติ */
async function acceptPublicInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await acceptInvitePublic(req.body);
    res.cookie('refreshToken', result.rawToken, result.cookieOpts);
    res.json({
      accessToken: result.accessToken,
      user: result.user,
      teamId: result.teamId,
    });
  } catch (err) {
    next(err);
  }
}
