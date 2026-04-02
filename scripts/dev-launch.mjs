#!/usr/bin/env node
/**
 * dev-launch.mjs
 * ──────────────────────────────────────────────────────────────────────────
 * สคริปต์นี้ทำหน้าที่เปิด Next.js dev server และซ่อน URL จนกว่า
 * การ Pre-compile หน้าทั้งหมดจะเสร็จสมบูรณ์
 *
 * ลำดับการทำงาน:
 *  1. เริ่ม Next.js (next dev -p 8000) โดยซ่อน output ไว้ก่อน
 *  2. รอจนกว่า server จะตอบสนอง (polling)
 *  3. ยิง request ไปทุกหน้าเพื่อ Pre-compile
 *  4. พอทุกหน้าเสร็จ ค่อยพิมพ์ URL ออกมาให้ผู้ใช้เห็น
 * ──────────────────────────────────────────────────────────────────────────
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8000;
const BASE_URL = `http://localhost:${PORT}`;
const MAX_WAIT_MS = 90_000; // รอ server สูงสุด 90 วินาที
const POLL_INTERVAL_MS = 500;
const APP_DIR = path.join(process.cwd(), 'apps', 'web', 'app');

// ──────────────────────────────────────────────────────────────────────────
// ฟังก์ชันที่ 1: หา Route ทุกเส้นทางในแอป Next.js อัตโนมัติ
// ──────────────────────────────────────────────────────────────────────────
function getAutoRoutes() {
  if (!fs.existsSync(APP_DIR)) return ['/'];
  const routes = new Set();
  const files = fs.readdirSync(APP_DIR, { recursive: true });
  for (const file of files) {
    if (typeof file !== 'string') continue;
    if (file.endsWith('page.tsx') || file.endsWith('page.jsx')) {
      let routePath = file.split(path.sep).join('/');
      routePath = routePath.replace(/\/page\.[tj]sx$/, '').replace(/^page\.[tj]sx$/, '');
      routePath = routePath.split('/').filter(s => !(s.startsWith('(') && s.endsWith(')'))).join('/');
      if (routePath.includes('[')) continue;
      routePath = routePath ? '/' + routePath : '/';
      routes.add(routePath);
    }
  }
  return Array.from(routes);
}

// ──────────────────────────────────────────────────────────────────────────
// ฟังก์ชันที่ 2: รอจนกว่า Next.js Server จะตื่น (Polling)
// ──────────────────────────────────────────────────────────────────────────
async function waitForServer() {
  const start = Date.now();
  process.stdout.write('\n⏳ กำลังรอ Next.js server พร้อมใช้งาน');
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      await fetch(`${BASE_URL}/`);
      console.log(' ✓\n');
      return true;
    } catch {
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
  console.log('\n❌ Server ไม่ตอบสนองภายในเวลาที่กำหนด\n');
  return false;
}

// ──────────────────────────────────────────────────────────────────────────
// ฟังก์ชันที่ 3: ยิง request ไปทุกหน้า เพื่อบังคับ Next.js ให้ Compile รอไว้
// ──────────────────────────────────────────────────────────────────────────
async function precompile() {
  const routes = getAutoRoutes();
  console.log(`🔥 กำลัง Pre-compile ${routes.length} หน้า...`);
  for (const route of routes) {
    try {
      process.stdout.write(`   ${route} ...`);
      const t = Date.now();
      await fetch(`${BASE_URL}${route}`);
      console.log(` ✓ ${Date.now() - t}ms`);
    } catch {
      console.log(` ✗ ข้ามไป`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main: รัน Next.js แล้วเริ่มกระบวนการทั้งหมด
// ──────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Project Dream - กำลังเปิด Dev Server...\n');

  // เริ่ม next dev โดยซ่อน stdout/stderr ระหว่าง compile
  const nextProcess = spawn(
    'npx', ['next', 'dev', '-p', String(PORT)],
    {
      cwd: path.join(process.cwd(), 'apps', 'web'),
      // stderr: 'inherit' ทำให้ Error สำคัญๆ ยังแสดงผล
      // stdout: 'ignore' ซ่อน log ปกติในช่วง Compile
      stdio: ['ignore', 'ignore', 'pipe'],
      shell: true,
    }
  );

  // ยังคงส่ง Error จาก Next.js ออกมา เผื่อมีปัญหา
  nextProcess.stderr?.pipe(process.stderr);

  // ถ้า process ตายกลางคัน ให้บอก user
  nextProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n⛔ Next.js หยุดทำงาน (exit code ${code})`);
      process.exit(code ?? 1);
    }
  });

  // Ctrl+C ให้ปิด Next.js ด้วย
  process.on('SIGINT', () => { nextProcess.kill(); process.exit(0); });
  process.on('SIGTERM', () => { nextProcess.kill(); process.exit(0); });

  // รอ Server พร้อม แล้ว Pre-compile
  const ready = await waitForServer();
  if (!ready) { nextProcess.kill(); process.exit(1); }

  await precompile();

  // ── ตอนนี้ทุกอย่างพร้อมแล้ว แสดง URL ──
  console.log('\n' + '─'.repeat(50));
  console.log(`\n  ✅ พร้อมใช้งาน!\n`);
  console.log(`  ➜  Local:    \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`  ➜  Network:  \x1b[36mhttp://0.0.0.0:${PORT}\x1b[0m`);
  console.log('\n' + '─'.repeat(50) + '\n');
}

main();
