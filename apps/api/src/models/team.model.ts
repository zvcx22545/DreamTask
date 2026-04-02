// ============================================================================
// Team Model — Business Logic สำหรับระบบจัดการทีม
// ============================================================================
// ไฟล์นี้รวม logic ทั้งหมดที่เกี่ยวกับ Team:
//   - ดึงทีมทั้งหมดของ user (list)
//   - สร้างทีมใหม่ (create)
//   - ดึงรายละเอียดทีม (get by id)
//   - ลบสมาชิกออกจากทีม (remove member)
//
// 📌 ทุก CUD operation ใช้ prisma.$transaction เพื่อความปลอดภัย
// 🚀 ระบบ Cache: ใช้ Redis cache เพื่อลดภาระ DB
// ============================================================================

import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { cacheWrap, cacheDel, cacheKey, TTL } from '../lib/cache.js';

// ── Validation Schema ─────────────────────────────────────────────────────────

/** Schema สำหรับ validate ข้อมูลสร้างทีม */
const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// ── Model Functions ───────────────────────────────────────────────────────────

/**
 * ดึงทีมทั้งหมดของ user ที่ login อยู่
 *
 * 🚀 Cache Strategy:
 *   ถ้ามีใน Cache → ตอบเร็วมาก (~1ms) ไม่แตะ DB เลย
 *   ถ้าไม่มีใน Cache → ยิง DB แล้วเก็บผลลัพธ์ไว้ 5 นาที
 */
export async function getTeamsByUser(userId: string) {
  return cacheWrap(
    cacheKey.teamsByUser(userId),   // Key: "pd:teams:user:abc123"
    async () => {
      const teams = await prisma.team.findMany({
        where: {
          members: { some: { userId } },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { teams };
    },
    TTL.TEAMS,  // เก็บไว้ 5 นาที
  );
}

/**
 * สร้างทีมใหม่ — user ที่สร้างจะกลายเป็น OWNER อัตโนมัติ
 *
 * ⚡ Prisma nested create จัดการ team + member ใน query เดียว (atomic อยู่แล้ว)
 *    แต่เราครอบ $transaction เพิ่มเพื่อความชัดเจน
 */
export async function createTeam(body: unknown, userId: string) {
  const data = createTeamSchema.parse(body);

  // ⚡ Transaction: สร้าง Team + เพิ่มผู้สร้างเป็น OWNER
  const team = await prisma.$transaction(async (tx) => {
    return tx.team.create({
      data: {
        name: data.name,
        description: data.description,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    });
  });

  // 🗑️ ล้าง Cache ทีมของ user นี้ เพราะมีทีมใหม่
  await cacheDel(cacheKey.teamsByUser(userId));

  return team;
}

/**
 * ดึงรายละเอียดทีมเดียว พร้อมสมาชิกและ invites ที่รอยืนยัน
 *
 * 🚀 Cache: ถ้าใครอยู่ทีมเดียวกัน ก็ได้ข้อมูลจาก Cache เดียวกัน
 */
export async function getTeamById(teamId: string, userId: string) {
  const team = await cacheWrap(
    cacheKey.membersByTeam(teamId),  // Key: "pd:members:team:xyz456"
    async () => {
      return prisma.team.findFirst({
        where: {
          id: teamId,
          members: { some: { userId } }, // ตรวจว่า user มีสิทธิ์ดูทีมนี้ไหม
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
            },
          },
          invites: {
            where: { status: 'PENDING' },
            select: { id: true, email: true, status: true, expiresAt: true },
          },
        },
      });
    },
    TTL.TEAM_MEMBERS,  // เก็บไว้ 2 นาที
  );

  if (!team) {
    throw new AppError(404, 'Team not found or access denied', 'TEAM_NOT_FOUND');
  }

  return team;
}

/**
 * ลบสมาชิกออกจากทีม
 *
 * กฎ:
 *   - OWNER/ADMIN สามารถเตะคนอื่นได้
 *   - User ลาออกเองได้เสมอ (ยกเว้น OWNER)
 *   - ไม่ให้ลบ OWNER ออก (ต้องโอนสิทธิ์ก่อน)
 *
 * ⚡ Transaction: เช็คสิทธิ์ + ลบ เป็น atomic
 */
export async function removeMember(teamId: string, targetUserId: string, requesterId: string) {
  // ⚡ Transaction: ตรวจสิทธิ์ + ลบ สมาชิก
  await prisma.$transaction(async (tx) => {
    // ตรวจสิทธิ์ผู้ร้องขอ
    const requester = await tx.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: requesterId } },
    });

    // ถ้าไม่ใช่ OWNER/ADMIN → ได้แค่ลาออกเอง
    if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
      if (requesterId !== targetUserId) {
        throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
      }
    }

    // ป้องกัน Ghost Team: ไม่ให้ลบ OWNER ออก
    const target = await tx.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (target?.role === 'OWNER') {
      throw new AppError(400, 'ไม่สามารถเตะหรือลบเจ้าของทีม (OWNER) ออกได้ กรุณาโอนสิทธิ์ก่อน', 'CANNOT_REMOVE_OWNER');
    }

    // ลบสมาชิก
    await tx.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
  });

  // 🗑️ ล้าง Cache สมาชิกทีมนี้ + ทีมของ user ที่ถูกลบ
  await cacheDel(
    cacheKey.membersByTeam(teamId),
    cacheKey.teamsByUser(targetUserId),
  );
}
