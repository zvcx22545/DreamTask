'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Loader2, Users, ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const qc = useQueryClient(); // 🛠️ [Senior Tip] ใช้ QueryClient เพื่อจัดการ "สถานะข้อมูล" ใน Memory ของ Browser
  
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useUIStore((s) => s.toast);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('ไม่พบข้อมูล Token สำหรับการเชิญใน URL');
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    try {
      setStatus('loading');
      
      // กรณี 1: User Login อยู่แล้ว -> ใช้ /invites/accept
      if (accessToken) {
        await api.post('/invites/accept', { token });
        
        // 🔄 [Senior Tip] สั่งให้ React Query "ล้างข้อมูลเก่า" (Invalidate)
        // เพื่อให้ Sidebar หรือจุดอื่นๆ ที่แสดงรายการทีม ไปดึงข้อมูลใหม่มาทันที
        qc.invalidateQueries({ queryKey: ['teams'] });

        setStatus('success');
        addToast({
          title: 'สำเร็จ',
          description: 'คุณได้เข้าร่วมทีมเรียบร้อยแล้ว!',
          variant: 'success',
        });
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      // กรณี 2: User ไม่ได้ Login -> ใช้ /invites/accept-public
      try {
        const res = await api.post<{ 
          accessToken: string; 
          user: any; 
          teamId: string;
        }>('/invites/accept-public', { token });

        // 🔄 [Senior Tip] แม้จะเป็น User ใหม่ ก็ควรสั่งล้าง Cache เผื่อไว้
        // และเพื่อให้ระบบ React Query พร้อมโหลดข้อมูลทีมชุดใหม่ทันทีที่หน้าจอเปลี่ยนไป
        qc.invalidateQueries({ queryKey: ['teams'] });

        // Auto-login หลังจากสมัครสำเร็จ
        setAuth(res.data.user, res.data.accessToken);
        
        setStatus('success');
        addToast({
          title: 'ยินดีต้อนรับ!',
          description: 'สร้างบัญชีและเข้าร่วมทีมสำเร็จแล้ว',
          variant: 'success',
        });
        setTimeout(() => router.push('/'), 2000);
      } catch (err: any) {
        // ถ้าเบื้องหลังพบว่า email นี้มีบัญชีอยู่แล้ว ต้องให้ไป login ก่อน
        if (err.response?.data?.code === 'LOGIN_REQUIRED') {
          addToast({ 
            title: 'กรุณาเข้าสู่ระบบ', 
            description: 'พบอีเมลนี้ในระบบแล้ว กรุณาเข้าสู่ระบบเพื่อยอมรับคำเชิญ',
            variant: 'warning' 
          });
          router.push(`/login?redirect=/invites/accept?token=${token}`);
          return;
        }
        throw err;
      }

    } catch (err: any) {
      setStatus('error');
      const msg = err.response?.data?.error || err.message || 'เกิดข้อผิดพลาด';
      setErrorMessage(msg);
      addToast({ title: 'ข้อผิดพลาด', description: msg, variant: 'error' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-8 text-center space-y-6"
    >
      <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
        <Users className="h-10 w-10 text-primary" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">คำเชิญเข้าทีม</h1>
        <p className="text-sm text-muted-foreground">คุณได้รับคำเชิญเข้าร่วมพื้นที่ทำงานแบบทีม</p>
      </div>
      
      <AnimatePresence mode="wait">
        {!token ? (
          <motion.div 
            key="no-token"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-destructive flex flex-col items-center py-4"
          >
            <AlertCircle className="h-12 w-12 mb-3" />
            <p className="font-medium">ไม่พบ Token ของคำเชิญ</p>
          </motion.div>
        ) : status === 'error' ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-6 py-4"
          >
            <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20 flex flex-col items-center gap-2">
               <AlertCircle className="h-8 w-8 text-destructive" />
               <p className="text-sm font-medium text-destructive">{errorMessage || 'เกิดข้อผิดพลาดบางอย่าง'}</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-2.5 border border-border rounded-lg hover:bg-muted font-medium text-sm transition-colors text-foreground"
            >
              กลับไปหน้าแรก
            </button>
          </motion.div>
        ) : status === 'success' ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-emerald-500 space-y-4 flex flex-col items-center py-8"
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold">เข้าร่วมทีมสำเร็จ!</p>
              <p className="text-xs text-muted-foreground">กำลังเปลี่ยนหน้าโปรดรอสักครู่...</p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin mt-4 opacity-50" />
          </motion.div>
        ) : (
          <motion.div 
            key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-8 py-4"
          >
            <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
              {user ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">เข้าสู่ระบบแล้ว</p>
                  <p className="text-sm font-medium text-foreground">{user.email}</p>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                   <p className="text-muted-foreground italic">คุณยังไม่ได้เข้าสู่ระบบ</p>
                   <p className="text-xs">ระบบจะสร้างบัญชีให้คุณโดยใช้ Email ที่ได้รับเชิญ</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleAccept}
                disabled={status === 'loading'}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : user ? (
                  <>เข้าร่วมทีมเลย <ArrowRight className="h-4 w-4" /></>
                ) : (
                  <>ยอมรับคำเชิญและเริ่มใช้งาน <UserPlus className="h-4 w-4" /></>
                )}
              </button>
              
              {!user && (
                <button
                  onClick={() => router.push(`/login?redirect=/invites/accept?token=${token}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <LogIn className="h-4 w-4" /> ฉันมีบัญชีอยู่แล้ว
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <Suspense fallback={
        <div className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-12 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        </div>
      }>
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
