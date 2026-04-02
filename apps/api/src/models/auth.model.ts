// ============================================================================
// Auth Model — Business Logic สำหรับระบบ Authentication
// ============================================================================
// ไฟล์นี้รวม logic ทั้งหมดที่เกี่ยวกับการยืนยันตัวตน:
//   - สมัครสมาชิก (register)
//   - เข้าสู่ระบบ (login)
//   - ต่ออายุ Token (refresh)
//   - ออกจากระบบ (logout)
//   - เข้าสู่ระบบด้วย Google (googleLogin)
//
// 📌 ทุกฟังก์ชันที่สร้าง/แก้ไข/ลบข้อมูล จะถูกครอบด้วย prisma.$transaction
//    เพื่อป้องกันปัญหา "ทำครึ่งๆกลางๆ" (เช่น สร้าง user สำเร็จ แต่สร้าง token ไม่ได้)
// ============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, setPasswordSchema } from '../lib/schemas.js';
import { AppError } from '../middleware/error.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';

// ── ค่าคงที่ ──────────────────────────────────────────────────────────────────

/** Google OAuth2 Client สำหรับ verify token จาก Google */
const googleClient = new OAuth2Client(config.google.clientId);

/** ตั้งค่า Cookie สำหรับเก็บ Refresh Token (เข้าถึงได้แค่ฝั่ง Server เท่านั้น) */
export const COOKIE_OPTS = {
  httpOnly: true, // JavaScript ฝั่ง Browser อ่านไม่ได้ → ป้องกัน XSS
  secure: config.app.env === 'production', // Production บังคับ HTTPS
  sameSite: 'strict' as const, // ป้องกัน CSRF
  maxAge: 7 * 24 * 60 * 60 * 1_000, // หมดอายุ 7 วัน (มิลลิวินาที)
};

/** ระยะเวลา Refresh Token หมดอายุ (7 วัน เป็น millisecond) */
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1_000;

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * สร้าง Access Token (JWT) สำหรับส่งกลับให้ Frontend
 * - sub: userId  เพื่อระบุว่าเป็นใคร
 * - email, role: ข้อมูลเสริมที่ Frontend ใช้แสดงผล
 */
export function signAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign({ sub: userId, email, role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * สร้าง Refresh Token (random bytes) + hash สำหรับเก็บใน DB
 * - rawToken: ค่าเดิมที่จะเก็บใน Cookie (ส่งให้ browser)
 * - tokenHash: ค่า hash ที่จะเก็บใน DB (ป้องกันกรณี DB หลุด จะไม่เห็นค่า token จริง)
 */
export function generateRefreshToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

// ── Model Functions ───────────────────────────────────────────────────────────

/**
 * สมัครสมาชิก — สร้าง User ใหม่ + ออก Token
 *
 * ขั้นตอน:
 *   1. Validate ข้อมูลจาก Zod schema
 *   2. เช็คว่า email ซ้ำไหม
 *   3. Hash รหัสผ่าน (bcrypt 12 rounds)
 *   4. Transaction: สร้าง user + สร้าง refreshToken พร้อมกัน
 *   5. Return ข้อมูลสำหรับส่งกลับ Frontend
 */
export async function registerUser(body: unknown) {
  // 1. Validate ข้อมูลที่ส่งมาจาก Frontend (ถ้าไม่ผ่าน Zod จะ throw error อัตโนมัติ)
  const data = registerSchema.parse(body);

  // 2. เช็คว่ามี email นี้ในระบบแล้วหรือยัง
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) {
    throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  // 3. Hash รหัสผ่าน (ยิ่ง round สูง ยิ่งปลอดภัย แต่ช้าขึ้น; 12 เป็นค่ามาตรฐาน)
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 4. สร้าง Refresh Token
  const { rawToken, tokenHash } = generateRefreshToken();

  // 5. ⚡ Transaction: สร้าง user + refreshToken พร้อมกัน
  //    ถ้าอันใดอันนึง fail ทั้งหมดจะถูก rollback (ไม่มีข้อมูลค้าง)
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: { id: true, name: true, email: true, role: true },
    });

    await tx.refreshToken.create({
      data: {
        tokenHash,
        userId: newUser.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    return newUser;
  });

  // 6. สร้าง Access Token สำหรับส่งกลับ
  const accessToken = signAccessToken(user.id, user.email, user.role);

  return { accessToken, user, rawToken, cookieOpts: COOKIE_OPTS };
}

/**
 * เข้าสู่ระบบ — ตรวจสอบรหัสผ่าน + ออก Token
 *
 * ขั้นตอน:
 *   1. Validate ข้อมูล
 *   2. หา user จาก email
 *   3. เทียบรหัสผ่านกับ hash ใน DB
 *   4. Transaction: สร้าง refreshToken
 *   5. Return ข้อมูลสำหรับส่งกลับ Frontend
 */
export async function loginUser(body: unknown) {
  // 1. Validate
  const data = loginSchema.parse(body);

  // 2. หา user จาก email
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // ถ้า user สมัครผ่าน Google จะไม่มีรหัสผ่าน → บอกให้ login ด้วย Google แทน
  if (!user.passwordHash) {
    throw new AppError(401, 'Please sign in with Google', 'INVALID_CREDENTIALS');
  }

  // 3. เทียบรหัสผ่าน
  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // 4. สร้าง Refresh Token
  const { rawToken, tokenHash } = generateRefreshToken();

  // 5. ⚡ Transaction: สร้าง refreshToken ใน DB
  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });
  });

  // 6. สร้าง Access Token
  const accessToken = signAccessToken(user.id, user.email, user.role);

  return {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    rawToken,
    cookieOpts: COOKIE_OPTS,
  };
}

/**
 * ต่ออายุ Token — ลบ token เก่า + ออกอันใหม่ (Token Rotation)
 *
 * ทำไมต้อง Rotate? → ถ้า token เก่าถูกขโมย จะใช้ได้แค่ครั้งเดียว
 *
 * ขั้นตอน:
 *   1. Hash token ที่ส่งมาจาก Cookie
 *   2. หาใน DB ว่ามี token hash นี้ไหม + ยังไม่หมดอายุ
 *   3. Transaction: ลบ token เก่า + สร้างอันใหม่
 *   4. Return access token + refresh token ใหม่
 */
export async function refreshUserToken(rawCookieToken: string | undefined) {
  // 1. เช็คว่ามี cookie ส่งมาไหม
  if (!rawCookieToken) {
    throw new AppError(401, 'No refresh token', 'NO_REFRESH_TOKEN');
  }

  // 2. Hash แล้วหาใน DB
  const tokenHash = crypto.createHash('sha256').update(rawCookieToken).digest('hex');
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  // 3. เช็คว่า token ยังใช้ได้อยู่ไหม
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token invalid or expired', 'REFRESH_INVALID');
  }

  // 4. สร้าง token ใหม่
  const { rawToken: newRaw, tokenHash: newHash } = generateRefreshToken();

  // 5. ⚡ Transaction: ลบเก่า + สร้างใหม่ (atomic)
  //    ถ้าไม่ใช้ transaction → ลบเก่าสำเร็จ แต่สร้างใหม่ fail = user หลุดจากระบบ
  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.delete({ where: { id: stored.id } });
    await tx.refreshToken.create({
      data: {
        tokenHash: newHash,
        userId: stored.userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });
  });

  // 6. สร้าง Access Token ใหม่
  const accessToken = signAccessToken(stored.userId, stored.user.email, stored.user.role);

  logger.debug({ userId: stored.userId }, 'Refresh token rotated');

  return { accessToken, rawToken: newRaw, cookieOpts: COOKIE_OPTS };
}

/**
 * ออกจากระบบ — ลบ Refresh Token ออกจาก DB
 *
 * ถ้าไม่มี cookie ก็ไม่ต้องทำอะไร (อาจจะหมดอายุไปแล้ว)
 */
export async function logoutUser(rawCookieToken: string | undefined) {
  if (rawCookieToken) {
    const tokenHash = crypto.createHash('sha256').update(rawCookieToken).digest('hex');
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }
}

/**
 * เข้าสู่ระบบด้วย Google — Verify token จาก Google + สร้าง/หา user
 *
 * กรณีที่เป็นไปได้:
 *   A) User เคยสมัครด้วย Google มาก่อน → login ปกติ
 *   B) User เคยสมัครด้วย email/password แต่ email ตรงกับ Google → Link บัญชีเข้าด้วยกัน
 *   C) User ใหม่ที่ไม่เคยมีในระบบ → สร้างบัญชีให้อัตโนมัติ
 */
export async function googleLoginUser(credential: string | undefined) {
  // 1. ตรวจสอบว่ามี credential ส่งมาไหม
  if (!credential) {
    throw new AppError(400, 'Missing Google credential', 'MISSING_CREDENTIAL');
  }

  // 2. Verify token กับ Google (เช็คว่าของจริงไม่ใช่ปลอม)
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: config.google.clientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new AppError(401, 'Invalid Google token', 'INVALID_GOOGLE_TOKEN');
  }

  const { sub: googleId, email, name, picture } = payload;

  // 3. สร้าง Refresh Token
  const { rawToken, tokenHash } = generateRefreshToken();

  // 4. ⚡ Transaction: หา/สร้าง user + สร้าง refreshToken
  const user = await prisma.$transaction(async (tx) => {
    // หา user จาก googleId หรือ email
    let existingUser = await tx.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (existingUser) {
      // กรณี B: user มีอยู่แล้วแต่ยังไม่ผูก Google → Link เข้าด้วยกัน
      if (!existingUser.googleId) {
        existingUser = await tx.user.update({
          where: { id: existingUser.id },
          data: { googleId, avatar: existingUser.avatar || picture },
        });
      }
    } else {
      // กรณี C: user ใหม่ → สร้างบัญชีให้
      existingUser = await tx.user.create({
        data: {
          email,
          name: name || 'Google User',
          googleId,
          avatar: picture,
          role: 'MEMBER',
        },
      });
    }

    // สร้าง Refresh Token ใน DB
    await tx.refreshToken.create({
      data: {
        tokenHash,
        userId: existingUser.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    return existingUser;
  });

  // 5. สร้าง Access Token
  const accessToken = signAccessToken(user.id, user.email, user.role);

  return {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    rawToken,
    cookieOpts: COOKIE_OPTS,
  };
}

/**
 * ขอรีเซ็ตรหัสผ่าน — สร้าง Reset Token และแสดงลิงก์
 */
export async function forgotPassword(body: unknown) {
  const { email } = forgotPasswordSchema.parse(body);

  const user = await prisma.user.findUnique({ where: { email } });
  
  // เพื่อความปลอดภัย: ไม่บอกว่า email นี้มีในระบบหรือไม่
  if (!user) {
    return { success: true }; 
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 ชั่วโมง

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  // ในอนาคตจะส่ง email แต่ตอนนี้ return link ให้ console/dev
  const resetLink = `${config.app.url}/reset-password?token=${token}`;
  logger.info({ email, resetLink }, 'Password reset link generated');

  return { success: true, resetLink };
}

/**
 * รีเซ็ตรหัสผ่านใหม่ — ตรวจสอบ token และอัปเดต password + auto-login
 */
export async function resetPassword(body: unknown) {
  const data = resetPasswordSchema.parse(body);
  const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

  const storedToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken || storedToken.expiresAt < new Date() || storedToken.usedAt) {
    throw new AppError(401, 'Invalid or expired reset token', 'INVALID_TOKEN');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const { rawToken: newRefresh, tokenHash: newRefreshHash } = generateRefreshToken();

  const user = await prisma.$transaction(async (tx) => {
    // 1. Update password
    const updatedUser = await tx.user.update({
      where: { id: storedToken.userId },
      data: { passwordHash },
      select: { id: true, name: true, email: true, role: true },
    });

    // 2. Mark token as used
    await tx.passwordResetToken.update({
      where: { id: storedToken.id },
      data: { usedAt: new Date() },
    });

    // 3. Clear all refresh tokens (Security: force logout all devices)
    await tx.refreshToken.deleteMany({
      where: { userId: updatedUser.id },
    });

    // 4. Create new refresh token
    await tx.refreshToken.create({
      data: {
        tokenHash: newRefreshHash,
        userId: updatedUser.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    return updatedUser;
  });

  const accessToken = signAccessToken(user.id, user.email, user.role);

  return {
    accessToken,
    user,
    rawToken: newRefresh,
    cookieOpts: COOKIE_OPTS,
  };
}

/**
 * ตั้งรหัสผ่านครั้งแรก — สำหรับ User ที่ไม่มี password (เช่น สมัครผ่าน invite)
 */
export async function setPassword(userId: string, body: unknown) {
  const { password } = setPasswordSchema.parse(body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (user.passwordHash) {
    throw new AppError(400, 'Password already set', 'ALREADY_SET');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}

/**
 * เปลี่ยนรหัสผ่าน (สำหรับ user ที่ login ปกติ)
 * - ต้องระบุรหัสผ่านเดิมเพื่อความปลอดภัย
 */
import { changePasswordSchema } from '../lib/schemas.js';

export async function changePassword(userId: string, body: unknown) {
  const { oldPassword, newPassword } = changePasswordSchema.parse(body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.passwordHash) {
    throw new AppError(400, 'User not eligible for password change', 'NOT_ELIGIBLE');
  }

  // 1. ตรวจสอบรหัสผ่านเดิม
  const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, 'รหัสผ่านเดิมไม่ถูกต้อง', 'INVALID_OLD_PASSWORD');
  }

  // 2. Hash และบันทึกรหัสผ่านใหม่
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}
