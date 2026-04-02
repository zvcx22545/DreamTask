// ============================================================================
// User Model — Business Logic สำหรับจัดการข้อมูลผู้ใช้
// ============================================================================
// ไฟล์นี้รวม logic ทั้งหมดที่เกี่ยวกับ User:
//   - ดึงรายชื่อ user ทั้งหมด (สำหรับ dropdown เลือก assignee)
//   - ดึงข้อมูลตัวเอง (me)
//   - แก้ไขโปรไฟล์ (update profile)
// ============================================================================

import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

// ── Validation Schema ─────────────────────────────────────────────────────────

/** Schema สำหรับ validate ข้อมูลแก้ไขโปรไฟล์ */
const updateProfileSchema = z.object({
  name: z.string().min(1, 'ชื่อไม่สามารถเป็นค่าว่างได้').optional(),
  avatar: z.string().url('URL รูปแบบไม่ถูกต้อง').optional().or(z.literal('')),
});

// ── ค่าคงที่: Field ที่ปลอดภัยสำหรับ return กลับไป ──────────────────────────
// ❌ ไม่ส่ง passwordHash, googleId, refreshToken กลับไป Frontend
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
} as const;

// ── Model Functions ───────────────────────────────────────────────────────────

/**
 * ดึงรายชื่อ User ทั้งหมดในระบบ (เรียงตามชื่อ A-Z)
 *
 * ⚠️ หมายเหตุ: ดึงทุกคนในระบบ ไม่ได้กรองตามทีม
 *    ใช้สำหรับ dropdown เลือก assignee ตอนสร้าง/แก้ไข task
 */
export async function getAllUsers() {
  return prisma.user.findMany({
    select: SAFE_USER_SELECT,
    orderBy: { name: 'asc' },
  });
}

/**
 * ดึงข้อมูลของ user ที่ login อยู่ (ใช้สำหรับ Frontend โหลดโปรไฟล์)
 */
export async function getCurrentUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT,
  });
}

/**
 * แก้ไขโปรไฟล์ — อัปเดตชื่อ และ/หรือ รูปโปรไฟล์
 *
 * ⚡ ใช้ prisma.update ตรงๆ ได้เพราะแก้ข้อมูลตัวเอง ไม่มี race condition
 */
export async function updateProfile(userId: string, body: unknown) {
  const { name, avatar } = updateProfileSchema.parse(body);

  return prisma.user.update({
    where: { id: userId },
    data: { name, avatar },
    select: SAFE_USER_SELECT,
  });
}
