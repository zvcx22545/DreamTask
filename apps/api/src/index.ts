import dotenv from 'dotenv';
// โหลดค่า Environment Variables (เช่น รหัสผ่านแยก, พอร์ต) จากไฟล์ .env มาใช้งาน
dotenv.config({ path: '../../.env' });

import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import http from 'http';
import { setupSecurity } from './middleware/security.js';
import { errorHandler } from './middleware/error.js';
import { autoRouter } from './lib/autoRouter.js';
import { setupWebSocket } from './services/ws.js';
import { setupWorkers } from './queue/workers/index.js';
import { logger } from './lib/logger.js';
import { config } from './config.js';

// สร้างตัวแปรแอปพลิเคชัน Express (เสมือนเป็นหัวใจของ Server)
const app: Express = express();
// นำ Express app ไปครอบด้วย http.createServer เพื่อให้รองรับ WebSocket ในอนาคตได้ง่ายขึ้น
const server = http.createServer(app);

// ── 1. Security & Protection (ความปลอดภัย) ──────────────────────────────────
// ใส่เพื่อป้องกันการโดนแฮกเบื้องต้น (เช่น จำกัดจำนวนคนเข้าใช้, กัน Cross-Origin)
setupSecurity(app);

// ── 2. Body & Cookie Parsing (การอ่านข้อมูลที่ส่งมา) ─────────────────────────
// Middleware คือด่านตรวจก่อนที่ request จะเข้าไปถึง Route จริงๆ
// express.json() ทำให้ Backend อ่านข้อมูลประเภท JSON ที่ Frontend ส่งมาได้ (เช่น req.body.username)
app.use(express.json({ limit: '1mb' }));
// urlencoded ช่วยให้อ่านข้อมูลจาก HTML Form ธรรมดาได้
app.use(express.urlencoded({ extended: true }));
// อ่าน Cookie ที่ติดมากับบราวเซอร์
app.use(cookieParser());

// ── 3. Health Check (เช็คว่า Server ยังไม่ตุยใช่ไหม) ──────────────────────────
// ลองเข้าบราวเซอร์พิมพ์ http://localhost:(port)/health ดูก็ได้ จะได้คำตอบกลับไป
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ============================================================================
// bootstrap - ฟังก์ชันหลักตอนเริ่มเปิด Server
// ============================================================================
async function bootstrap() {
  // ── Auto-register Routes (ระบบลงทะเบียน API อัตโนมัติ) ─────────────────────
  // ไม่ต้องมานั่งเขียน app.use('/users', usersRoute) ทีละบรรทัด แค่เอาไฟล์ไปวางใน src/routes/ ก็พอ
  await autoRouter(app);

  // ── Error handler (ด่านสุดท้าย) ─────────────────────────────────────────────
  // ต้องเอาไว้ "ท้ายสุด" เสมอ ถ้ามี Error อะไรหลุดรอดมาจาก Route ข้างบน จะโดนดักจับที่นี่
  app.use(errorHandler);

  // ── เปิดระบบ WebSocket (สำหรับตอบสนองแบบ Realtime) ─────────────────────────
  setupWebSocket(server);

  // ── เปิดระบบ Background Worker (สำหรับงานเบื้องหลังที่ใช้เวลานานๆ) ───────────────
  setupWorkers();

  // สั่งให้ Server เริ่มทำงาน และระบุหมายเลข Port (ช่องทางเข้า)
  const PORT = config.app.port;
  server.listen(PORT, () => {
    logger.info(`🚀 API server listening on http://localhost:${PORT}`);
  });
}

// เรียกฟังก์ชัน bootstrap() เพื่อเริ่มทำงานจริง
// ถ้าเปิดไม่ขึ้น (เช่น Port ซ้ำชนกัน) ให้จับ Error แล้วปิดโปรแกรม
bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

// ส่งออกเผื่อนำไปใช้ในการเขียน Automated Test
export { app, server };
