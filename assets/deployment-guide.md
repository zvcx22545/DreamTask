# คู่มือการนำ Project Dream ขึ้นระบบ (Deployment Guide)

คู่มือนี้จะอธิบายขั้นตอนการนำโปรเจกต์ (Next.js + Express + Prisma) ขึ้นระบบระดับ Production โดยใช้บริการสายฟรี ได้แก่ **Supabase** (ฐานข้อมูล), **Render.com** (ฝั่ง API) และ **Vercel** (ฝั่ง Web)

---

## 🚀 สรุปสถาปัตยกรรม
- **Database:** Supabase (PostgreSQL ฟรี 500MB)
- **Backend API:** Render.com (ฟรี Web Service สำหรับ Node.js)
- **Frontend Web:** Vercel (ฟรี โฮสติ้งสุดเร็วสำหรับ Next.js)

---

## ขั้นตอนที่ 1: เตรียมโค้ดให้พร้อมและ Push ขึ้น GitHub
สิ่งที่ต้องทำเป็นอันดับแรกคือ นำโปรเจกต์นี้ทั้งหมด (ที่เป็น Monorepo) ผลักขึ้นไปเก็บบน GitHub ของคุณให้เรียบร้อย (ถ้าทำแล้ว ข้ามไปขั้นตอนที่ 2 ได้เลย)

```bash
git add .
git commit -m "เตรียมพร้อมสำหรับการ Deploy"
git push origin main
```

---

## ขั้นตอนที่ 2: ตั้งค่า Database บน Supabase
1. ไปที่ [Supabase](https://supabase.com) แล้วสมัครสมาชิก/เข้าสู่ระบบ
2. กดปุ่ม **New Project** ตั้งชื่อว่า `project-dream-db` (หรือชื่ออื่นตามต้องการ)
3. ระบบจะให้คุณตั้ง **Database Password** (จดรหัสผ่านนี้ไว้ให้ดี สำคัญมาก!)
4. เลือก Region (แนะนำ **Singapore** จะเร็วที่สุดสำหรับเมืองไทย)
5. รอระบบสร้าง Database ประมาณ 2-3 นาที
6. เมื่อเสร็จแล้ว ไปที่เมนู **Project Settings** (รูปเฟืองซ้ายล่าง) > **Database**
7. เลื่อนลงมาที่หัวข้อ **Connection string**
8. เลือกแท็บ **URI** และนำรหัสผ่านที่คุณตั้งไว้มาใส่แทนที่คำว่า `[YOUR-PASSWORD]`
9. Copy URL เส้นนี้เตรียมไว้ (จะมีหน้าตาคล้ายๆ `postgresql://postgres.[id]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`)

---

## ขั้นตอนที่ 3: นำ API ขึ้น Render.com
เนื่องจากเป็น PNPM Monorepo การตั้งค่าใน Render จะมีความซับซ้อนเล็กน้อย แต่สามารถทำตามขั้นตอนนี้ได้เลย:

1. สมัครสมาชิก / เข้าสู่ระบบ [Render.com](https://render.com) (เชื่อมด้วย GitHub สะดวกสุด)
2. กด **New +** ที่มุมขวาบน เลือก **Web Service**
3. เลือก **Build and deploy from a Git repository** และเลือก Repository ของคุณจาก GitHub
4. กรอกข้อมูลตั้งค่าดังนี้:
   - **Name:** `project-dream-api`
   - **Region:** `Singapore` (เพื่อให้ใกล้กับ Database)
   - **Branch:** `main`
   - **Root Directory:** *(ปล่อยว่างไว้)*
   - **Runtime:** `Node`
   - **Build Command:** 
     ```bash
     npm install -g pnpm && pnpm install && pnpm build --filter api && npx prisma db push --schema=packages/db/prisma/schema.prisma
     ```
   - **Start Command:**
     ```bash
     pnpm --filter api start
     ```
   - **Instance Type:** เลือก **Free** (ฟรี)

> [!TIP]
> **ทางลัด: บริการ Redis ฟรีแบบไม่ยุ่งยาก**
> เลี่ยงการไปตั้ง Server Redis เองให้ยุ่งยาก โดยแนะนำให้ใช้ **[Upstash](https://upstash.com/)** เป็น Redis Serverless ฟรี 100% สไตล์คนขี้เกียจ Deploy ครับ สมัครปุ๊บกด Create Database ได้ `REDIS_URL` มาเสียบใส่ Render ทันที! *(ส่วน Meilisearch ถ้ายังไม่ได้ใช้ระบบค้นหาจริงจังในเฟสแรกลองละเว้นตัวแปรไว้ก่อนได้ครับ เผื่อลดภาระการตั้งค่าข้ามระบบ)*

5. เลื่อนลงมากดหัวข้อ **Environment Variables** และคลิก `Add Environment Variable` เพื่อใส่ค่าเหล่านี้:
   - `DATABASE_URL` = ก๊อปปี้ URL จาก Supabase (ระวังอย่าให้มีช่องว่าง)
   - `NODE_ENV` = `production`
   - `JWT_ACCESS_SECRET` = ตั้งรหัสลับสำหรับ Access Token เป็นอะไรก็ได้ยาวๆ 
   - `JWT_REFRESH_SECRET` = ตั้งรหัสลับสำหรับ Refresh Token (ห้ามซ้ำกับข้างบน)
   - `REDIS_URL` = URL ที่ได้จาก Upstash (เช่น `rediss://...`)
   - `ALLOWED_ORIGINS` = URL ของ Vercel (ถ้ายังไม่ได้ Deploy Web ให้ใส่ `*` ขัดตาทัพไว้ก่อน แล้วค่อยกลับมาเปลี่ยนเพื่อความปลอดภัย)
   - `FRONTEND_URL` = URL ของ Vercel (เผื่อสำหรับใช้ส่งลิงก์ใน Email)
6. กดปุ่ม **Create Web Service**
7. รอประมาณ 2-5 นาที Render จะทำการ Build และ Deploy ถ้าเสร็จคุณจะได้ URL ของ API มา (เช่น `https://project-dream-api.onrender.com`) ให้ก๊อปปี้มาไว้ก่อน!

---

## ขั้นตอนที่ 4: นำ Web ขึ้น Vercel
อันนี้จะง่ายที่สุดเพราะ Vercel เก่งเรื่อง Next.js อยู่แล้ว:

1. สมัครสมาชิก / เข้าสู่ระบบ [Vercel](https://vercel.com) (เชื่อมด้วย GitHub)
2. กดปุ่ม **Add New...** > **Project**
3. ค้นหา Repository `project-dream` ของคุณแล้วกด **Import**
4. ในหน้าตั้งค่าโปรเจกต์ Vercel:
   - **Project Name:** `project-dream`
   - **Framework Preset:** `Next.js` (ปกติมันจะเลือกให้อัตโนมัติ)
   - **Root Directory:** กด `Edit` เลือกโฟลเดอร์ `apps/web` แล้วกด Continue
5. เลื่อนลงมาที่หัวข้อ **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = ใส่ URL จาก Render ของคุณ (เช่น `https://project-dream-api.onrender.com`)
6. กดปุ่ม **Deploy**
7. รอให้ Vercel โยนโค้ดขึ้นระบบ เมื่อเสร็จแล้ว คุณจะได้หน้าเว็บที่ใช้งานได้เรียบร้อย!

🎉 **ยินดีด้วย!** ตอนนี้โปรเจกต์ของคุณทั้งเรื่องของฝั่ง Frontend, Backend และ Database ทำงานร่วมกันบน Production แบบฟรีตลอดการตั้งค่าแล้วครับ!
