/**
 * ============================================================================
 * cache.ts — ระบบ Cache อ่านง่ายสำหรับ Junior Developer
 * ============================================================================
 *
 * 🧠 Cache คืออะไร?
 *   สมมติคุณถามเพื่อนว่า "เมืองหลวงของไทยคืออะไร?"
 *   เพื่อนตอบ "กรุงเทพ" แล้วคุณจำไว้
 *   ถัดไปถ้าใครถามอีก คุณก็ตอบทันทีโดยไม่ต้องถามเพื่อนซ้ำ
 *   นั่นคือ Cache — เก็บคำตอบไว้ตอบเร็วๆ โดยไม่ต้อง "ถาม DB" ซ้ำทุกครั้ง
 *
 * 🏗️ โครงสร้างของไฟล์นี้:
 *   1. cache.get(key)      — ดึงข้อมูลจาก Redis
 *   2. cache.set(key, val) — บันทึกข้อมูลลง Redis พร้อมกำหนดอายุ (TTL)
 *   3. cache.del(key)      — ลบ cache (เช่น หลังแก้ไขข้อมูล)
 *   4. cache.wrap(...)     — ฟังก์ชันสะดวกสุด: เช็ค cache ก่อน ถ้าไม่มีค่อยยิง DB
 *
 * 📦 TTL (Time To Live) คือ?
 *   เวลาที่ข้อมูลจะ "หมดอายุ" ใน Cache
 *   เช่น TTL = 60 วินาที = หลังจาก 60 วินาที ข้อมูลจะถูกลบจาก Redis อัตโนมัติ
 *   แล้ว Request ถัดไปจะดึงจาก DB ใหม่ (ข้อมูลจะ "สด" ขึ้น)
 */

import { redis } from './redis.js';
import { logger } from './logger.js';

// ── กำหนดอายุ Cache แต่ละประเภท (หน่วยเป็นวินาที) ────────────────────────────
export const TTL = {
  TEAMS:        5 * 60,  // 5 นาที  - ทีม (เปลี่ยนน้อย)
  TEAM_MEMBERS: 2 * 60,  // 2 นาที  - สมาชิกทีม
  USERS:        5 * 60,  // 5 นาที  - รายชื่อ user
  TASKS:        30,       // 30 วิ   - งาน (เปลี่ยนบ่อย)
} as const;

// ── Helper สร้าง Cache Key อย่างเป็นระบบ ──────────────────────────────────────
// ใช้ prefix "pd:" (project-dream) เพื่อไม่ชนกับ Key อื่นใน Redis
//
// ตัวอย่าง key:
//   pd:teams:user:abc123          — ทีมของ user abc123
//   pd:tasks:team:xyz456          — งานในทีม xyz456
//   pd:members:team:xyz456        — สมาชิกในทีม xyz456
export const cacheKey = {
  teamsByUser:    (userId: string)  => `pd:teams:user:${userId}`,
  tasksByTeam:    (teamId: string)  => `pd:tasks:team:${teamId}`,
  membersByTeam:  (teamId: string)  => `pd:members:team:${teamId}`,
  userDetail:     (userId: string)  => `pd:user:${userId}`,
};

// ── ฟังก์ชันหลัก ───────────────────────────────────────────────────────────────

/**
 * 📖 ดึงข้อมูลจาก Cache
 *
 * @param key - ชื่อ Key ที่ต้องการดึง (เช่น cacheKey.teamsByUser('abc123'))
 * @returns  ข้อมูลที่เก็บไว้ หรือ null ถ้าไม่มีใน Cache
 *
 * ตัวอย่าง:
 *   const data = await cache.get(cacheKey.teamsByUser(userId));
 *   if (data) return res.json(data); // ตอบทันทีจาก Cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;                    // ไม่มีใน Cache = Cache Miss
    return JSON.parse(raw) as T;              // มีใน Cache = Cache Hit ✓
  } catch {
    return null;  // ถ้า Redis มีปัญหา ไม่ต้อง crash — ให้แอปทำงานต่อได้
  }
}

/**
 * 💾 บันทึกข้อมูลลง Cache
 *
 * @param key     - ชื่อ Key
 * @param value   - ข้อมูลที่อยากเก็บ (อะไรก็ได้ที่ JSON ได้)
 * @param ttlSecs - อายุ Cache (วินาที) — ถ้าไม่ระบุ จะใช้ 60 วิ
 *
 * ตัวอย่าง:
 *   await cache.set(cacheKey.teamsByUser(userId), teams, TTL.TEAMS);
 */
export async function cacheSet(key: string, value: unknown, ttlSecs = 60): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSecs);
  } catch {
    // ถ้า Redis มีปัญหา ไม่ต้อง crash — ข้อมูลจะแค่ไม่ถูก Cache เท่านั้น
  }
}

/**
 * 🗑️ ลบ Cache ออก — ใช้หลังแก้ไขหรือเพิ่มข้อมูล
 *
 * @param keys - Key หรือหลาย Key ที่ต้องการลบ
 *
 * ตัวอย่าง:
 *   await cacheDel(cacheKey.tasksByTeam(teamId));
 *   await cacheDel(cacheKey.tasksByTeam(teamId), cacheKey.membersByTeam(teamId));
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    await redis.del(...keys);
    logger.debug({ keys }, '🗑️ Cache cleared');
  } catch {
    // ไม่สำคัญถ้า del ล้มเหลว — ข้อมูลจะ expire เองตาม TTL
  }
}

/**
 * ⚡ wrap — ฟังก์ชันสะดวก: เช็ค Cache ก่อน ถ้าไม่มีค่อยยิง DB แล้วเก็บไว้
 *
 * วิธีทำงาน:
 *   1. เช็ค Cache ก่อน → ถ้าเจอ คืนทันที (เร็วมาก ไม่แตะ DB)
 *   2. ถ้าไม่เจอ → เรียก fetchFn() เพื่อดึงจาก DB
 *   3. เก็บผลลัพธ์ใน Cache เพื่อคนถัดไปจะได้เร็ว
 *   4. คืนค่ากลับ
 *
 * @param key      - Cache Key
 * @param fetchFn  - ฟังก์ชันที่ดึงข้อมูลจาก DB (จะเรียกก็ต่อเมื่อ Cache Miss)
 * @param ttlSecs  - อายุ Cache (วินาที)
 *
 * ตัวอย่าง:
 *   const teams = await cacheWrap(
 *     cacheKey.teamsByUser(userId),
 *     () => prisma.team.findMany({ where: { userId } }),  // ยิง DB เฉพาะตอน Cache Miss
 *     TTL.TEAMS
 *   );
 */
export async function cacheWrap<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSecs = 60,
): Promise<T> {
  // ขั้นที่ 1: ลองดึงจาก Cache ก่อน
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    logger.debug({ key }, '✅ Cache HIT');
    return cached;                          // คืนเร็วมาก ไม่แตะ DB เลย!
  }

  // ขั้นที่ 2: Cache Miss → ดึงจาก DB
  logger.debug({ key }, '🔍 Cache MISS → fetch from DB');
  const fresh = await fetchFn();

  // ขั้นที่ 3: เก็บผลลัพธ์ใน Cache (ไม่ await เพื่อไม่ให้ Response ช้า)
  cacheSet(key, fresh, ttlSecs).catch(() => {});

  return fresh;
}
