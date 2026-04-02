// ============================================================================
// Invite Model — Business Logic สำหรับระบบเชิญสมาชิกเข้าทีม
// ============================================================================
// ไฟล์นี้รวม logic ทั้งหมดที่เกี่ยวกับ Team Invites:
//   - สร้างลิงก์เชิญ (create invite)
//   - ยอมรับคำเชิญ (accept invite)
//
// 📌 ทุก CUD operation ใช้ prisma.$transaction เพื่อความปลอดภัย
// ============================================================================

import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { REFRESH_TOKEN_EXPIRY_MS, signAccessToken, generateRefreshToken, COOKIE_OPTS } from './auth.model.js';
import { cacheDel, cacheKey } from '../lib/cache.js';

// ── Validation Schemas ────────────────────────────────────────────────────────

/** Schema สำหรับ validate ข้อมูลการเชิญ */
const createInviteSchema = z.object({
  teamId: z.string(),
  email: z.string().email('Invalid email address'),
});

/** Schema สำหรับ validate token ตอน accept */
const acceptQuerySchema = z.object({
  token: z.string(),
});

// ── Model Functions ───────────────────────────────────────────────────────────

/**
 * สร้างคำเชิญสมาชิกเข้าทีม
 *
 * ขั้นตอน:
 *   1. ตรวจสิทธิ์ — ต้องเป็น ADMIN หรือ OWNER
 *   2. เช็คว่า email นั้นเป็นสมาชิกอยู่แล้วหรือยัง
 *   3. สร้าง invite token (random 32 bytes)
 *   4. Upsert invite (ถ้าเคยเชิญ email เดิมแล้ว → อัปเดต token ใหม่)
 *   5. Return invite + inviteLink
 *
 * ⚡ Transaction: ครอบทุกขั้นตอนเพื่อความ atomic
 */
export async function createInvite(body: unknown, userId: string) {
  const data = createInviteSchema.parse(body);

  // สร้าง token สำหรับลิงก์เชิญ
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 วัน

  // ⚡ Transaction: ตรวจสิทธิ์ + เช็คซ้ำ + สร้าง invite
  const invite = await prisma.$transaction(async (tx) => {
    // 1. ตรวจสิทธิ์ — ต้องเป็น ADMIN หรือ OWNER
    const membership = await tx.teamMember.findUnique({
      where: { teamId_userId: { teamId: data.teamId, userId } },
    });
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new AppError(403, 'Insufficient permissions to invite members', 'FORBIDDEN');
    }

    // 2. เช็คว่า email นี้เป็นสมาชิกอยู่แล้วหรือยัง
    const existingUser = await tx.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      const isAlreadyMember = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId: data.teamId, userId: existingUser.id } },
      });
      if (isAlreadyMember) {
        throw new AppError(400, 'User is already a member of this team', 'ALREADY_MEMBER');
      }
    }

    // 3. Upsert: ถ้าเคยเชิญ email เดิมแล้ว → อัปเดต token ใหม่
    return tx.teamInvite.upsert({
      where: {
        teamId_email: { teamId: data.teamId, email: data.email },
      },
      update: {
        token,
        expiresAt,
        status: 'PENDING',
        invitedById: userId,
      },
      create: {
        teamId: data.teamId,
        email: data.email,
        token,
        expiresAt,
        invitedById: userId,
      },
    });
  });

  // สร้างลิงก์เชิญ (ยังไม่มีระบบส่ง email จริง จึง return ลิงก์กลับไปแทน)
  // ใช้ allowedOrigins ตัวแรกเป็น URL ของ Frontend (เช่น http://localhost:8000)
  const frontendUrl = config.app.allowedOrigins[0] || 'http://localhost:8000';
  const inviteLink = `${frontendUrl}/invites/accept?token=${token}`;
  logger.info(`Invite link generated: ${inviteLink}`);

  return { invite, inviteLink };
}

/**
 * ยอมรับคำเชิญเข้าทีม
 *
 * ขั้นตอน:
 *   1. Validate token
 *   2. หา invite จาก token
 *   3. เช็คว่ายังไม่หมดอายุ + ยังเป็น PENDING
 *   4. เช็คว่า email ของ user ตรงกับ invite
 *   5. Transaction: เพิ่มเป็นสมาชิก + อัปเดต invite status
 *
 * ⚡ Transaction: เพิ่มสมาชิก + update invite status เป็น atomic
 *    (ใช้ sequential transaction ที่มีอยู่เดิม เพราะเป็นรูปแบบที่ชัดเจน)
 */
export async function acceptInvite(body: unknown, userId: string) {
  const { token } = acceptQuerySchema.parse(body);

  // 1. หา invite จาก token
  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: true },
  });

  // 2. ตรวจสอบ invite
  if (!invite || invite.status !== 'PENDING') {
    throw new AppError(400, 'Invalid or expired invite token', 'INVALID_INVITE');
  }
  if (invite.expiresAt < new Date()) {
    throw new AppError(400, 'Invite token has expired', 'INVITE_EXPIRED');
  }

  // 3. เช็คว่า email ของ user ตรงกับ invite
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (currentUser?.email !== invite.email) {
    throw new AppError(403, 'This invite was sent to a different email address', 'EMAIL_MISMATCH');
  }

  // 4. ⚡ Transaction: เพิ่มสมาชิก + update invite status
  try {
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId,
          role: 'MEMBER',
        },
      }),
      prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    // 🗑️ [Senior Tip] เมื่อข้อมูลเปลี่ยน ต้องล้าง Cache ที่เกี่ยวข้องเสมอ!
    // เราต้องล้าง Cache "รายการทีมของ User" และ "รายชื่อสมาชิกในทีม" 
    // เพื่อให้การเรียก API ครั้งต่อไปได้ข้อมูลที่อัปเดตจาก Database จริงๆ
    await cacheDel(
      cacheKey.teamsByUser(userId),
      cacheKey.membersByTeam(invite.teamId)
    );

  } catch (err) {
    // Unique constraint → user เป็นสมาชิกอยู่แล้ว
    if (err instanceof Error && err.message.includes('Unique constraint failed')) {
      throw new AppError(400, 'You are already a member of this team', 'ALREADY_MEMBER');
    }
    throw err;
  }

  return { teamId: invite.teamId };
}

/**
 * ยอมรับคำเชิญสำหรับ User ใหม่ (Auto-Register + Auto-Login)
 */
export async function acceptInvitePublic(body: unknown) {
  const { token } = acceptQuerySchema.parse(body);

  // 1. หาและตรวจสอบ invite
  const invite = await prisma.teamInvite.findUnique({
    where: { token },
  });

  if (!invite || invite.status !== 'PENDING') {
    throw new AppError(400, 'Invalid or expired invite token', 'INVALID_INVITE');
  }
  if (invite.expiresAt < new Date()) {
    throw new AppError(400, 'Invite token has expired', 'INVITE_EXPIRED');
  }

  // 2. เช็คว่ามี user อยู่แล้วไหม
  const exists = await prisma.user.findUnique({ where: { email: invite.email } });
  if (exists) {
    // ถ้ามี user อยู่แล้ว ต้องให้ login ก่อน (ความปลอดภัย)
    throw new AppError(401, 'Please log in to accept this invitation', 'LOGIN_REQUIRED');
  }

  // 3. ⚡ Transaction: สร้าง User + Token + TeamMember + Status
  const { rawToken, tokenHash } = generateRefreshToken();

  const result = await prisma.$transaction(async (tx) => {
    // A) สร้าง User (passwordHash เป็น null จนกว่าจะตั้งใหม่)
    const newUser = await tx.user.create({
      data: {
        email: invite.email,
        name: invite.email.split('@')[0], // ใช้ prefix ของ email เป็นชื่อเริ่มต้น
        passwordHash: null,
      },
    });

    // B) สร้าง Refresh Token
    await tx.refreshToken.create({
      data: {
        tokenHash,
        userId: newUser.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    // C) เพิ่มเข้าทีม
    await tx.teamMember.create({
      data: {
        teamId: invite.teamId,
        userId: newUser.id,
        role: 'MEMBER',
      },
    });

    // D) อัปเดตสถานะ invite
    await tx.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });

    return newUser;
  });

  // 🗑️ [Senior Tip] เคลียร์ Cache สำหรับสมาชิกใหม่และทีมที่เข้าร่วม
  // แม้จะเป็น User ใหม่ แต่การล้าง Cache รายชื่อสมาชิกทีม (membersByTeam) 
  // จะช่วยให้คนอื่นๆ ในทีมเห็นสมาชิกใหม่เพิ่มเข้ามาในระบบทันทีครับ
  await cacheDel(
    cacheKey.teamsByUser(result.id),
    cacheKey.membersByTeam(invite.teamId)
  );

  // 4. ออก Access Token
  const accessToken = signAccessToken(result.id, result.email, result.role);

  return {
    accessToken,
    user: { id: result.id, name: result.name, email: result.email, role: result.role },
    rawToken,
    cookieOpts: COOKIE_OPTS,
    teamId: invite.teamId,
  };
}
