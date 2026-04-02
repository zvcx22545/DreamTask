// ============================================================================
// Auth Router — เส้นทาง API ระบบยืนยันตัวตน
// ============================================================================
// ไฟล์นี้เป็น "สารบัญ" ของ API ทั้งหมดที่เกี่ยวกับ Auth
// Logic ทั้งหมดอยู่ใน models/auth.model.ts
//
// เส้นทาง API:
//   POST /auth/register   → สมัครสมาชิก
//   POST /auth/login      → เข้าสู่ระบบ
//   POST /auth/refresh    → ต่ออายุ Token
//   POST /auth/logout     → ออกจากระบบ
//   POST /auth/google     → เข้าสู่ระบบด้วย Google
// ============================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  refreshUserToken,
  logoutUser,
  googleLoginUser,
  forgotPassword,
  resetPassword,
  setPassword,
  changePassword,
} from '../models/auth.model.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter: Router = Router();

// ── สมัครสมาชิก ─────────────────────────────────────────────────────────────
authRouter.post('/register', register);

// ── เข้าสู่ระบบ ─────────────────────────────────────────────────────────────
authRouter.post('/login', login);

// ── ต่ออายุ Token ────────────────────────────────────────────────────────────
authRouter.post('/refresh', refresh);

// ── ออกจากระบบ ───────────────────────────────────────────────────────────────
authRouter.post('/logout', logout);

// ── เข้าสู่ระบบด้วย Google ──────────────────────────────────────────────────
authRouter.post('/google', googleLogin);

// ── ลืมและตั้งรหัสผ่าน ───────────────────────────────────────────────────────
authRouter.post('/forgot-password', forgotPasswordHandler);
authRouter.post('/reset-password', resetPasswordHandler);
authRouter.post('/set-password', requireAuth, setPasswordHandler);
authRouter.post('/change-password', requireAuth, changePasswordHandler);

// ── Handler Functions ─────────────────────────────────────────────────────────
// แต่ละ handler ทำหน้าที่แค่:
//   1. เรียก model function (ส่งข้อมูลจาก request ไป)
//   2. ส่ง response กลับ
//   3. จับ error ส่งต่อให้ error handler

/** สมัครสมาชิก — รับ name, email, password แล้วสร้าง user ใหม่ */
async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await registerUser(req.body);
    res.cookie('refreshToken', result.rawToken, result.cookieOpts);
    res.status(201).json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

/** เข้าสู่ระบบ — รับ email, password แล้วส่ง token กลับ */
async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await loginUser(req.body);
    res.cookie('refreshToken', result.rawToken, result.cookieOpts);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

/** ต่ออายุ Token — อ่าน refresh token จาก Cookie แล้วออกอันใหม่ */
async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refreshUserToken(req.cookies.refreshToken);
    res.cookie('refreshToken', result.rawToken, result.cookieOpts);
    res.json({ accessToken: result.accessToken });
  } catch (err) {
    // ถ้า token ไม่ valid → ล้าง cookie ทิ้ง
    res.clearCookie('refreshToken');
    next(err);
  }
}

/** ออกจากระบบ — ลบ refresh token ออกจาก DB + ล้าง cookie */
async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await logoutUser(req.cookies.refreshToken);
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

/** เข้าสู่ระบบด้วย Google — รับ Google credential แล้ว verify + สร้าง/หา user */
async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await googleLoginUser(req.body.credential);
    res.cookie('refreshToken', result.rawToken, result.cookieOpts);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

/** ขอรีเซ็ตรหัสผ่าน — ส่ง email มาเพื่อสร้าง reset token */
async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await forgotPassword(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** รีเซ็ตรหัสผ่านใหม่ — รับ token และ password ใหม่ */
async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await resetPassword(req.body);
    res.cookie('refreshToken', result.rawToken, result.cookieOpts);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

/** ตั้งรหัสผ่านครั้งแรก — สำหรับ user ที่สมัครจาก invite */
async function setPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await setPassword(req.user!.sub, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** เปลี่ยนรหัสผ่าน — ต้อง login และส่งรหัสผ่านเดิมมาเช็ค */
async function changePasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await changePassword(req.user!.sub, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
