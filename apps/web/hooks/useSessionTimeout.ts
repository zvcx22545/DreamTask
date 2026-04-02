'use client';

// ============================================================================
// useSessionTimeout - Hook สำหรับ Auto-Logout หลังผ่านไป 1 วัน
// ============================================================================
// วิธีทำงาน:
//   1. ตรวจสอบทุกครั้งที่ Component ที่ใช้ Hook นี้ Mount
//   2. ถ้าเวลา login เกิน SESSION_DURATION → Logout อัตโนมัติ
//   3. แสดง Toast แจ้งเตือนให้ผู้ใช้รู้
//
// การใช้งาน: ใส่ Hook นี้ใน Layout หลักของ Dashboard

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';

// กำหนดระยะเวลา Session = 1 วัน (24 ชั่วโมง หน่วยเป็น MS)
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function useSessionTimeout() {
  const router = useRouter();
  const loginAt = useAuthStore((s) => s.loginAt);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // ถ้าไม่ได้ login อยู่ ไม่ต้องทำอะไร
    if (!user || !loginAt) return;

    const now = Date.now();
    const elapsed = now - loginAt; // ms ที่ผ่านไปตั้งแต่ Login

    if (elapsed >= SESSION_DURATION_MS) {
      // เกิน 1 วันแล้ว → Logout ทันที
      toast({
        title: 'Session หมดอายุ',
        description: 'คุณถูก Logout เพื่อความปลอดภัย กรุณา Login ใหม่',
        variant: 'warning',
      });
      logout();
      router.push('/login');
      return;
    }

    // ตั้ง Timer เพื่อนับเวลาที่เหลือก่อนจะ Logout
    const remaining = SESSION_DURATION_MS - elapsed;
    const timerId = setTimeout(() => {
      toast({
        title: 'Session หมดอายุ',
        description: 'คุณถูก Logout เพื่อความปลอดภัย กรุณา Login ใหม่',
        variant: 'warning',
      });
      logout();
      router.push('/login');
    }, remaining);

    // Cleanup: ยกเลิก Timer ถ้า Component Unmount
    return () => clearTimeout(timerId);
  }, [loginAt, user, logout, router]);
}
