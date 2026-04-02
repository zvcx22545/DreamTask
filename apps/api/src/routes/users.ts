// ============================================================================
// Users Router — เส้นทาง API จัดการข้อมูลผู้ใช้
// ============================================================================
// ไฟล์นี้เป็น "สารบัญ" ของ API ทั้งหมดที่เกี่ยวกับ User
// Logic ทั้งหมดอยู่ใน models/user.model.ts
//
// เส้นทาง API:
//   GET   /users       → ดึงรายชื่อ user ทั้งหมด (สำหรับ dropdown)
//   GET   /users/me    → ดึงข้อมูลตัวเอง
//   PATCH /users/me    → แก้ไขโปรไฟล์ตัวเอง
// ============================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAllUsers, getCurrentUser, updateProfile } from '../models/user.model.js';

export const usersRouter: Router = Router();

// ทุก route ใน /users ต้อง login ก่อน
usersRouter.use(requireAuth);

// ── ดึงรายชื่อ user ทั้งหมด (สำหรับ dropdown เลือก assignee) ─────────────────
usersRouter.get('/', listUsers);

// ── ดึงข้อมูลตัวเอง ─────────────────────────────────────────────────────────
usersRouter.get('/me', getMe);

// ── แก้ไขโปรไฟล์ตัวเอง ──────────────────────────────────────────────────────
usersRouter.patch('/me', editMe);

// ── Handler Functions ─────────────────────────────────────────────────────────

/** ดึงรายชื่อ user ทั้งหมดในระบบ */
async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/** ดึงข้อมูลของ user ที่ login อยู่ */
async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getCurrentUser(req.user!.sub);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** แก้ไขโปรไฟล์ — อัปเดตชื่อ และ/หรือ avatar */
async function editMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await updateProfile(req.user!.sub, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
