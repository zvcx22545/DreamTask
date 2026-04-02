// ============================================================================
// Tasks Router — เส้นทาง API ระบบจัดการงาน
// ============================================================================
// ไฟล์นี้เป็น "สารบัญ" ของ API ทั้งหมดที่เกี่ยวกับ Task
// Logic ทั้งหมดอยู่ใน models/task.model.ts
//
// เส้นทาง API:
//   GET    /tasks                        → ดึงรายการงานทั้งหมดของทีม
//   GET    /tasks/:id                    → ดึงรายละเอียดงานเดี่ยว
//   POST   /tasks                        → สร้างงานใหม่
//   PATCH  /tasks/:id                    → แก้ไขงาน
//   DELETE /tasks/:id                    → ลบงาน
//   GET    /tasks/:id/comments           → ดึงคอมเมนต์ของงาน
//   POST   /tasks/:id/comments           → เพิ่มคอมเมนต์
//   DELETE /tasks/:id/comments/:commentId → ลบคอมเมนต์
// ============================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getTasksByTeam,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getComments,
  createComment,
  deleteComment,
} from '../models/task.model.js';

export const tasksRouter: Router = Router();

// ทุก route ใน /tasks ต้อง login ก่อน
tasksRouter.use(requireAuth);

// ── ดึงรายการงานทั้งหมด (รองรับ filter, sort, pagination) ────────────────────
tasksRouter.get('/', listTasks);

// ── ดึงรายละเอียดงานเดี่ยว ───────────────────────────────────────────────────
tasksRouter.get('/:id', getTask);

// ── สร้างงานใหม่ ────────────────────────────────────────────────────────────
tasksRouter.post('/', addTask);

// ── แก้ไขงาน (รองรับแก้บางส่วน) ─────────────────────────────────────────────
tasksRouter.patch('/:id', editTask);

// ── ลบงาน ───────────────────────────────────────────────────────────────────
tasksRouter.delete('/:id', removeTask);

// ── ดึงคอมเมนต์ของงาน ───────────────────────────────────────────────────────
tasksRouter.get('/:id/comments', listComments);

// ── เพิ่มคอมเมนต์ในงาน ──────────────────────────────────────────────────────
tasksRouter.post('/:id/comments', addComment);

// ── ลบคอมเมนต์ ──────────────────────────────────────────────────────────────
tasksRouter.delete('/:id/comments/:commentId', removeComment);

// ── Handler Functions ─────────────────────────────────────────────────────────

/** ดึงรายการงานทั้งหมดของทีม — ส่ง query params ไปให้ model จัดการ */
async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getTasksByTeam(req.query, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** ดึงรายละเอียดงานเดี่ยว — ส่ง task id + user id ไปเช็คสิทธิ์ */
async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await getTaskById(req.params.id, req.user!.sub);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

/** สร้างงานใหม่ — ส่ง body ไปให้ model validate + สร้าง */
async function addTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await createTask(req.body, req.user!.sub);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

/** แก้ไขงาน — ส่ง task id + body ไปให้ model validate + update */
async function editTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await updateTask(req.params.id, req.body, req.user!.sub);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

/** ลบงาน — ส่ง task id ไปให้ model เช็คสิทธิ์ + ลบ */
async function removeTask(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteTask(req.params.id, req.user!.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** ดึงคอมเมนต์ของงาน — ส่ง task id ไปเช็คสิทธิ์ + ดึง comments */
async function listComments(req: Request, res: Response, next: NextFunction) {
  try {
    const comments = await getComments(req.params.id, req.user!.sub);
    res.json(comments);
  } catch (err) {
    next(err);
  }
}

/** เพิ่มคอมเมนต์ — ส่ง task id + content ไปสร้าง comment */
async function addComment(req: Request, res: Response, next: NextFunction) {
  try {
    const comment = await createComment(req.params.id, req.body, req.user!.sub);
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

/** ลบคอมเมนต์ — ส่ง task id + comment id ไปเช็คสิทธิ์ + ลบ */
async function removeComment(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteComment(req.params.id, req.params.commentId, req.user!.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
