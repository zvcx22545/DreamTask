import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Express, Router } from 'express';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// autoRouter - ระบบ Auto-Register Routes อัตโนมัติตามโครงสร้างโฟลเดอร์
// ============================================================================
//
// หลักการทำงาน:
//   1. สแกนทุกไฟล์ใน /routes/**/*.ts (ยกเว้น __tests__ และ *.test.ts)
//   2. import ไฟล์แต่ละไฟล์ และหา export ที่ชื่อ `router`
//   3. คำนวณ URL path จาก path โฟลเดอร์
//   4. ลงทะเบียนกับ Express app ด้วย app.use(routePath, router)
//
// ตัวอย่างโครงสร้างโฟลเดอร์ → URL path:
//   routes/auth.ts            → /auth
//   routes/tasks.ts           → /tasks
//   routes/teams/members.ts   → /teams/members
//   routes/admin/reports.ts   → /admin/reports
//
// วิธีสร้าง Route ใหม่:
//   1. สร้างไฟล์ใน routes/ (หรือโฟลเดอร์ย่อย)
//   2. export const router = Router(); และเพิ่ม routes ได้เลย
//   3. ไม่ต้อง import ใน index.ts อีกต่อไป!

export async function autoRouter(app: Express, routesDir?: string): Promise<void> {
  // โฟลเดอร์ routes เริ่มต้นอยู่ที่ src/routes/
  const dir = routesDir ?? path.join(__dirname, '..', 'routes');

  if (!fs.existsSync(dir)) {
    logger.warn(`autoRouter: routes directory not found at ${dir}`);
    return;
  }

  // รวบรวมไฟล์ทั้งหมดในโฟลเดอร์ (recursive)
  const files = getRouteFiles(dir);

  // sort เพื่อให้ลำดับ register สม่ำเสมอ
  files.sort();

  for (const file of files) {
    try {
      // Import ไฟล์ route
      const mod = await import(pathToFileURL(file).href) as Record<string, unknown>;

      // ค้นหา Express Router จาก export ทั้งหมด
      // ไม่ได้บังคับชื่อ 'router' - จะตรวจสอบแบบ duck typing
      // (ถ้าไฟล์มีหลาย Router export ก็จะใช้ตัวแรก)
      const routerExport = Object.values(mod).find(isExpressRouter);

      if (!routerExport) {
        logger.warn(`autoRouter: no Router export found in ${path.relative(dir, file)} — skipping`);
        continue;
      }

      // คำนวณ URL path จาก path ของไฟล์
      const routePath = fileToUrlPath(file, dir);

      app.use(routePath, routerExport as Router);
      logger.info(`📍 Route registered: ${routePath} ← ${path.relative(dir, file)}`);
    } catch (err) {
      logger.error(`autoRouter: failed to load ${file}: ${(err as Error).message}`);
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * วนหาไฟล์ทั้งหมดในโฟลเดอร์แบบ recursive
 * กรองเฉพาะไฟล์ .ts หรือ .js และข้าม test files
 */
function getRouteFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // ข้าม __tests__ และ node_modules
      if (entry.name.startsWith('_') || entry.name === 'node_modules') continue;
      results.push(...getRouteFiles(fullPath));
    } else if (entry.isFile()) {
      // เอาเฉพาะ .ts .js และข้าม test files
      if (/\.(ts|js)$/.test(entry.name) && !entry.name.includes('.test.')) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * แปลงพาธไฟล์เป็น URL path
 * ตัวอย่าง:
 *   /routes/teams/members.ts  →  /teams/members
 *   /routes/auth.ts           →  /auth
 */
function fileToUrlPath(file: string, baseDir: string): string {
  const relative = path.relative(baseDir, file);
  // ลบ extension (.ts/.js) ออก
  const withoutExt = relative.replace(/\.(ts|js)$/, '');
  // แปลง Windows path separator เป็น /
  const unixPath = withoutExt.split(path.sep).join('/');
  // เพิ่ม leading slash
  return '/' + unixPath;
}

/**
 * ตรวจสอบว่า value ที่รับมาเป็น Express Router หรือไม่
 * (duck typing: เช็ค property ที่ Router ต้องมี)
 */
function isExpressRouter(value: unknown): boolean {
  return (
    typeof value === 'function' &&
    typeof (value as unknown as Record<string, unknown>).use === 'function' &&
    typeof (value as unknown as Record<string, unknown>).get === 'function'
  );
}
