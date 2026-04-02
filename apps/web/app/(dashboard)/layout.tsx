'use client';

// ── Dashboard Layout ──────────────────────────────────────────────────────────
// layout.tsx นี้จะครอบทุกหน้าที่อยู่ใน (dashboard) group
// เพิ่ม useSessionTimeout เพื่อ Auto-Logout ผู้ใช้หลัง 1 วันโดยอัตโนมัติ

import { Sidebar } from '@/components/Sidebar';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function DashboardInner({ children }: { children: React.ReactNode }) {
  // Hook นี้จะนับเวลา Session ในพื้นหลัง และ Logout อัตโนมัติถ้าเกิน 24 ชั่วโมง
  useSessionTimeout();

  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    if (accessToken && user) {
      setIsAuth(true);
      return;
    }

    // If data is absent in memory, check localStorage in case of page refresh (F5).
    // This prevents Next.js from prematurely logging out before Zustand hydrates.
    const stored = localStorage.getItem('auth-store');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.accessToken && parsed?.state?.user) {
          // Data exists in localStorage; wait for Zustand hydration.
          return;
        }
      } catch (e) {
        // Parse error, ignore and logout
      }
    }

    // If no data exists in memory or localStorage, the user is truly logged out. Redirect to login.
    useAuthStore.getState().logout();
    router.replace('/login');
  }, [accessToken, user, router]);

  // ซ่อน UI ไว้ก่อนจนกว่าจะยืนยันตัวตนเสร็จ ป้องกัน Dashboard กระพริบแสดงข้อมูล
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pointer-events-none">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 w-full overflow-y-auto">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardInner>{children}</DashboardInner>;
}
