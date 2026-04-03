'use client';

// ============================================================================
// Sidebar.tsx - แถบนำทางด้านซ้ายพร้อมข้อมูลโปรไฟล์ผู้ใช้
// ============================================================================

import { TeamSwitcher } from '@/components/TeamSwitcher';
import { Home, Users, Settings, LogOut, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { openDialog, toast } from '@/store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Collapse State (Persisted in Store & LocalStorage)
  const isCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) setSidebarCollapsed(JSON.parse(saved));
  }, [setSidebarCollapsed]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };
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
    return cn(
      "relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 group overflow-hidden",
      isActive
        ? 'text-white bg-white/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] border border-white/10'
        : 'text-white/60 hover:text-white hover:bg-white/5',
      isCollapsed && "justify-center px-0"
    );
  };

  return (
    <>
      {/* ── Mobile Toggle Button ── */}
      <div className="lg:hidden fixed top-4 left-4 z-[100]">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="h-10 w-10 rounded-xl bg-dream-indigo/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Sidebar Component ── */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 256,
          x: isMobileOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -300 : 0)
        }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "glass-panel px-4 py-8 flex flex-col fixed inset-y-0 left-0 z-50 overflow-hidden group/sidebar",
          "max-lg:shadow-2xl max-lg:bg-dream-indigo/95",
          className
        )}
      >
        {/* ── Desktop Toggle Button ── */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-dream-indigo border border-white/20 hidden lg:flex items-center justify-center text-white/50 hover:text-white hover:border-dream-cyan transition-all opacity-0 group-hover/sidebar:opacity-100 z-[60] shadow-xl shadow-black/50"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo */}
        <div className={cn("mb-10 px-2 transition-all", isCollapsed && "px-0 flex justify-center")}>
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <h2 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-dream-cyan via-dream-violet to-dream-cyan bg-[length:200%_auto] animate-pulse-slow bg-clip-text text-transparent italic">
                  DREAM TASK
                </h2>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: 48 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-1 bg-dream-cyan rounded-full mt-1 neon-glow-cyan" 
                />
              </motion.div>
            ) : (
              <motion.div
                key="mini-logo"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="h-10 w-10 rounded-xl bg-gradient-to-br from-dream-cyan to-dream-violet flex items-center justify-center text-white font-black text-xl italic shadow-lg shadow-dream-cyan/20"
              >
                D
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Team Switcher */}
        <div className={cn("mb-6 transition-all", isCollapsed && "scale-90")}>
          <TeamSwitcher collapsed={isCollapsed} />
        </div>

        {/* Profile Section */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "mb-8 flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group/profile cursor-default overflow-hidden ring-1 ring-white/5",
              isCollapsed && "px-1.5 justify-center"
            )}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-dream-cyan to-dream-violet rounded-full blur opacity-20 group-hover/profile:opacity-50 transition duration-500"></div>
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={40}
                  height={40}
                  className="relative h-10 w-10 rounded-full object-cover border border-white/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-dream-indigo to-dream-purple flex items-center justify-center text-sm font-bold text-white">
                  {user.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-bold text-white/90 truncate">{user.name}</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest truncate">{user.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.nav 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
              }
            }
          }}
          className="flex flex-col gap-2 flex-grow overflow-y-auto custom-scrollbar pr-1"
        >
          {!isCollapsed && (
            <motion.div 
              variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 0.5, x: 0 } }}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1 px-2"
            >
              Navigation
            </motion.div>
          )}

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <Link href="/" onClick={() => setIsMobileOpen(false)} className={getLinkStyle('/')} title="Dashboard">
              <Home className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>กระดานงาน</span>}
              {pathname === '/' && <motion.div layoutId="active-pill" className="absolute inset-0 bg-white/5 rounded-xl -z-10 shadow-[0_0_20px_rgba(0,210,255,0.1)]" />}
            </Link>
          </motion.div>
          
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <Link href="/team" onClick={() => setIsMobileOpen(false)} className={getLinkStyle('/team')} title="Team">
              <Users className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>สมาชิกทีม</span>}
              {pathname === '/team' && <motion.div layoutId="active-pill" className="absolute inset-0 bg-white/5 rounded-xl -z-10 shadow-[0_0_20px_rgba(0,210,255,0.1)]" />}
            </Link>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <Link href="/settings" onClick={() => setIsMobileOpen(false)} className={getLinkStyle('/settings')} title="Settings">
              <Settings className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>ตั้งค่า</span>}
              {pathname === '/settings' && <motion.div layoutId="active-pill" className="absolute inset-0 bg-white/5 rounded-xl -z-10 shadow-[0_0_20px_rgba(0,210,255,0.1)]" />}
            </Link>
          </motion.div>
        </motion.nav>

        {/* Footer / Logout */}
        <div className="mt-auto border-t border-white/5 pt-4">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all",
              isCollapsed && "justify-center"
            )}
            title="Logout"
          >
            <LogOut className={cn("h-5 w-5 shrink-0", !isCollapsed && "mr-1")} />
            {!isCollapsed && <span>ออกจากระบบ</span>}
          </button>
        </div>

      </motion.aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </>
  );
}
