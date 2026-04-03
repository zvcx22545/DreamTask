// ============================================================================
// Task Model — Business Logic สำหรับระบบจัดการงาน (Tasks)
// ============================================================================
// ไฟล์นี้รวม logic ทั้งหมดที่เกี่ยวกับ Task:
//   - ดึงรายการงาน (list) + Cache
//   - ดึงงานเดี่ยว (get by id)
//   - สร้างงาน (create)
//   - แก้ไขงาน (update)
//   - ลบงาน (delete)
//   - จัดการ Comment ของงาน
//
// 📌 ทุก CUD operation ใช้ prisma.$transaction เพื่อความปลอดภัย
// 🚀 ระบบ Cache: ใช้ Redis cache สำหรับ query ง่ายๆ เพื่อลดภาระ DB
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { createTaskSchema, updateTaskSchema, taskQuerySchema, createCommentSchema } from '../lib/schemas.js';
import { cacheWrap, cacheDel, cacheKey, TTL } from '../lib/cache.js';
import { publishTaskEvent } from '../services/pubsub.js';
import { taskQueue } from '../queue/taskQueue.js';
import { logger } from '../lib/logger.js';
import { searchService } from '../services/search.service.js';

// ── Helper: ตรวจสิทธิ์สมาชิกทีม ──────────────────────────────────────────────

/**
 * ตรวจว่า user เป็นสมาชิกของทีมนี้หรือไม่
 * ถ้าไม่ใช่ → throw 403 Forbidden
 */
async function assertTeamMember(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!membership) {
    throw new AppError(403, 'Permission denied', 'FORBIDDEN');
  }
  return membership;
}

/**
 * ดึง Task พร้อมเช็คว่า user มีสิทธิ์เข้าถึงไหม
 * ใช้ร่วมกับ update, delete, comments เพื่อลดโค้ดซ้ำ
 */
async function findTaskWithAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      team: { include: { members: { where: { userId } } } },
    },
  });
  if (!task) throw new AppError(404, 'งานไม่พบ', 'TASK_NOT_FOUND');
  if (!task.team?.members.length) throw new AppError(403, 'Permission denied', 'FORBIDDEN');
  return task;
}

// ── Model Functions ───────────────────────────────────────────────────────────

/**
 * ดึงรายการงานทั้งหมดของทีม (รองรับ filter, sort, pagination)
 *
 * 🚀 Cache Strategy:
 *   - Query ง่ายๆ (หน้าแรก ไม่ filter) → ดึงจาก Cache ก่อน
 *   - Query ซับซ้อน (มี filter/sort พิเศษ) → ดึง DB ตรงๆ
 */
export async function getTasksByTeam(queryParams: unknown, userId: string) {
  const query = taskQuerySchema.parse(queryParams);

  // ตรวจสิทธิ์: user ต้องเป็นสมาชิกของทีมนี้
  await assertTeamMember(query.teamId, userId);

  // ── เช็คว่าเป็น query ง่ายๆ ไหม (เพื่อใช้ cache) ──
  const isSimpleQuery = !query.status && !query.priority && !query.assigneeId
    && query.page === 1 && query.limit === 20;

  if (isSimpleQuery) {
    // 🚀 Cache Hit → ตอบเร็วมาก (~1ms) ไม่แตะ DB เลย
    return cacheWrap(
      cacheKey.tasksByTeam(query.teamId),
      async () => {
        const [tasks, total] = await Promise.all([
          prisma.task.findMany({
            where: { teamId: query.teamId },
            orderBy: { [query.sortBy]: query.order },
            skip: 0,
            take: 20,
            include: {
              assignee: { select: { id: true, name: true, email: true, avatar: true } },
            },
          }),
          prisma.task.count({ where: { teamId: query.teamId } }),
        ]);
        return { tasks, total, page: 1, limit: 20 };
      },
      TTL.TASKS,
    );
  }

  // ── Query ซับซ้อน → ดึง DB ตรงๆ (Cache ช่วยไม่ได้เพราะ key ไม่คงที่) ──
  const where = {
    teamId: query.teamId,
    ...(query.status     && { status: query.status }),
    ...(query.priority   && { priority: query.priority }),
    ...(query.assigneeId && { assigneeId: query.assigneeId }),
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { [query.sortBy]: query.order },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page: query.page, limit: query.limit };
}

/**
 * ดึงรายละเอียดงานเดี่ยว พร้อม Activity Log
 */
export async function getTaskById(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      team: { include: { members: { where: { userId } } } },
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!task) throw new AppError(404, 'งานไม่พบ', 'TASK_NOT_FOUND');
  if (!task.team?.members.length) throw new AppError(403, 'Permission denied', 'FORBIDDEN');

  return task;
}

/**
 * สร้างงานใหม่
 *
 * ⚡ Transaction: เช็คสิทธิ์ + สร้าง task เป็น atomic
 * หลังสร้างสำเร็จ → ล้าง cache + แจ้ง WebSocket + บันทึก Activity Log
 */
export async function createTask(body: unknown, userId: string) {
  const data = createTaskSchema.parse(body);

  // ⚡ Transaction: ตรวจสิทธิ์ + สร้าง task ในขั้นตอนเดียว
  const task = await prisma.$transaction(async (tx) => {
    // เช็คว่า user เป็นสมาชิกทีมนี้ไหม
    const membership = await tx.teamMember.findUnique({
      where: { teamId_userId: { teamId: data.teamId, userId } },
    });
    if (!membership) throw new AppError(403, 'Permission denied', 'FORBIDDEN');

    // สร้าง task
    return tx.task.create({
      data,
      include: { assignee: { select: { id: true, name: true, email: true, avatar: true } } },
    });
  });

  // ── หลัง Transaction สำเร็จ → ทำงานเสริม (ไม่ต้องอยู่ใน tx) ──
  await Promise.all([
    cacheDel(cacheKey.tasksByTeam(data.teamId)),                     // 🗑️ ล้าง Cache
    publishTaskEvent({ type: 'TASK_CREATED', task }),                 // 📡 แจ้ง WebSocket
    searchService.syncTask(task),                                     // 🔍 Sync Search
    taskQueue.add('log-activity', { taskId: task.id, userId, action: 'created' }), // 📝 Activity Log
  ]);

  logger.info({ taskId: task.id }, 'สร้างงานใหม่แล้ว');
  return task;
}

/**
 * แก้ไขข้อมูลงาน (รองรับแก้บางส่วน — Partial Update)
 *
 * ⚡ Transaction: find + update เป็น atomic → ป้องกัน race condition
 *    (เช่น 2 คนแก้พร้อมกัน จะไม่เกิดปัญหาข้อมูลทับกัน)
 */
export async function updateTask(taskId: string, body: unknown, userId: string) {
  const data = updateTaskSchema.parse(body);

  // ⚡ Transaction: เช็คสิทธิ์ + update ในขั้นตอนเดียว
  const { task, action } = await prisma.$transaction(async (tx) => {
    // หา task เดิม (ต้องมีอยู่ + user มีสิทธิ์)
    const existing = await tx.task.findUnique({
      where: { id: taskId },
      include: { team: { include: { members: { where: { userId } } } } },
    });
    if (!existing) throw new AppError(404, 'งานไม่พบ', 'TASK_NOT_FOUND');
    if (!existing.team?.members.length) throw new AppError(403, 'Permission denied', 'FORBIDDEN');

    // Update task
    const updated = await tx.task.update({
      where: { id: taskId },
      data,
      include: { assignee: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    // คำนวณ action สำหรับ Activity Log
    const logAction = data.status && data.status !== existing.status
      ? `status_changed:${existing.status}->${data.status}`
      : 'updated';

    return { task: updated, action: logAction, teamId: existing.teamId };
  });

  // ── หลัง Transaction สำเร็จ ──
  await Promise.all([
    cacheDel(cacheKey.tasksByTeam(task.teamId!)),                    // 🗑️ ล้าง Cache
    publishTaskEvent({ type: 'TASK_UPDATED', task }),                 // 📡 แจ้ง WebSocket
    searchService.syncTask(task),                                     // 🔍 Sync Search
    taskQueue.add('log-activity', { taskId: task.id, userId, action }), // 📝 Activity Log
  ]);

  return task;
}

/**
 * ลบงาน
 *
 * ⚡ Transaction: เช็คสิทธิ์ + ลบ เป็น atomic
 */
export async function deleteTask(taskId: string, userId: string) {
  // ⚡ Transaction: เช็คสิทธิ์ + ลบในขั้นตอนเดียว
  const teamId = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findUnique({
      where: { id: taskId },
      include: { team: { include: { members: { where: { userId } } } } },
    });
    if (!existing) throw new AppError(404, 'งานไม่พบ', 'TASK_NOT_FOUND');
    if (!existing.team?.members.length) throw new AppError(403, 'Permission denied', 'FORBIDDEN');

    await tx.task.delete({ where: { id: taskId } });
    return existing.teamId;
  });

  // ── หลัง Transaction สำเร็จ ──
  await Promise.all([
    cacheDel(cacheKey.tasksByTeam(teamId!)),                         // 🗑️ ล้าง Cache
    publishTaskEvent({ type: 'TASK_DELETED', taskId }),               // 📡 แจ้ง WebSocket
    searchService.removeFromIndex(taskId),                           // 🔍 Remove from Search
  ]);
}

// ── Comment Functions ─────────────────────────────────────────────────────────

/**
 * ดึงคอมเมนต์ทั้งหมดของงาน (เรียงตาม เก่า → ใหม่)
 */
export async function getComments(taskId: string, userId: string) {
  // เช็คสิทธิ์เข้าถึง task ก่อน
  await findTaskWithAccess(taskId, userId);

  return prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
}

/**
 * เพิ่มคอมเมนต์ในงาน
 *
 * ⚡ Transaction: เช็คสิทธิ์ + สร้าง comment พร้อมกัน
 */
export async function createComment(taskId: string, body: unknown, userId: string) {
  const data = createCommentSchema.parse(body);

  // ⚡ Transaction: เช็คสิทธิ์ + สร้าง comment
  const { comment, task } = await prisma.$transaction(async (tx) => {
    const taskRecord = await tx.task.findUnique({
      where: { id: taskId },
      include: { team: { include: { members: { where: { userId } } } } },
    });
    if (!taskRecord) throw new AppError(404, 'งานไม่พบ', 'TASK_NOT_FOUND');
    if (!taskRecord.team?.members.length) throw new AppError(403, 'Permission denied', 'FORBIDDEN');

    const newComment = await tx.taskComment.create({
      data: { content: data.content, taskId, userId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    return { comment: newComment, task: taskRecord };
  });

  // 📡 แจ้ง WebSocket
  publishTaskEvent({ type: 'TASK_UPDATED', task });

  return comment;
}

/**
 * ลบคอมเมนต์ — ต้องเป็นเจ้าของ Comment หรือ Admin/Owner ของทีม
 */
export async function deleteComment(taskId: string, commentId: string, userId: string) {
  // ⚡ Transaction: เช็คสิทธิ์ + ลบ comment
  await prisma.$transaction(async (tx) => {
    const comment = await tx.taskComment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: { team: { include: { members: { where: { userId } } } } },
        },
      },
    });

    if (!comment) throw new AppError(404, 'Comment ไม่พบ', 'COMMENT_NOT_FOUND');
    if (comment.taskId !== taskId) throw new AppError(400, 'Invalid task reference', 'BAD_REQUEST');

    // ตรวจสิทธิ์ลบ: ต้องเป็นเจ้าของ Comment หรือ Admin/Owner ของทีม
    const isOwner = comment.userId === userId;
    const teamMember = comment.task.team?.members[0];
    const isAdmin = teamMember?.role === 'ADMIN' || teamMember?.role === 'OWNER';

    if (!isOwner && !isAdmin) {
      throw new AppError(403, 'Permission denied', 'FORBIDDEN');
    }

    await tx.taskComment.delete({ where: { id: comment.id } });
  });
}
