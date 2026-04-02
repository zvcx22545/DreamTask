'use client';

// ============================================================================
// Sidebar.tsx - แถบนำทางด้านซ้ายพร้อมข้อมูลโปรไฟล์ผู้ใช้
// ============================================================================

import { TeamSwitcher } from '@/components/TeamSwitcher';
import { Home, Users, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { openDialog } from '@/store/uiStore';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // ดึงข้อมูลผู้ใช้และฟังก์ชัน logout จาก Store
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    openDialog({
      title: 'ออกจากระบบ',
      description: 'คุณต้องการออกจากระบบใช่หรือไม่?',
      variant: 'destructive',
      confirmLabel: 'ออกจากระบบ',
      cancelLabel: 'ยกเลิก',
      onConfirm: () => {
        logout();
        router.push('/login');
      },
    });
  };

  const getLinkStyle = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
        ? 'text-foreground bg-accent/50'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`;
  };

  return (
    <aside className="w-64 border-r border-border bg-card/50 px-4 py-6 flex flex-col h-full sticky top-0">
      {/* Logo */}
      <div className="mb-8">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent px-2">
          DreamTask
        </h2>
      </div>

      {/* Team Switcher */}
      <div className="mb-6">
        <TeamSwitcher />
      </div>

      {/* ── User Profile Section ──────────────────────────────────────────── */}
      {/* แสดงข้อมูลผู้ใช้ที่ login อยู่ อยู่ด้านบนสุดของ menu ให้มองเห็นได้ง่าย */}
      {user && (
        <div className="mb-4 flex items-center gap-3 px-2 py-2 rounded-lg bg-accent/20 border border-border/50">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-9 w-9 rounded-full object-cover border-2 border-primary/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          {/* Name & Email */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex flex-col gap-2 flex-grow">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
          เมนูหลัก
        </div>

        <Link href="/" className={getLinkStyle('/')}>
          <Home className="h-4 w-4" />
          กระดานงาน
        </Link>
        <Link href="/team" className={getLinkStyle('/team')}>
          <Users className="h-4 w-4" />
          สมาชิกทีม
        </Link>
        <Link href="/settings" className={getLinkStyle('/settings')}>
          <Settings className="h-4 w-4" />
          ตั้งค่า
        </Link>
      </nav>

      {/* ── User Profile Section ──────────────────────────────────────────── */}
      {/* แสดงข้อมูลผู้ใช้ที่ login อยู่ ให้รู้ว่าใช้ Account ไหน */}
      <div className="mt-auto border-t border-border/50 pt-4 space-y-3">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
