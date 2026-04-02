'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await api.post<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }>(
        '/auth/login', data,
      );
      setAuth(res.data.user, res.data.accessToken);
      router.push('/');
    } catch (err: any) {
      setError('root', { message: err.response?.data?.error ?? 'เกิดข้อผิดพลาด' });
    }
  };

  const handleGoogleSuccess = async (response: any) => {
    try {
      const res = await api.post<{ accessToken: string; user: any }>(
        '/auth/google', { credential: response.credential },
      );
      setAuth(res.data.user, res.data.accessToken);
      router.push('/');
    } catch (err: any) {
      setError('root', { message: err.response?.data?.error ?? 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-2xl"
      >
        <div className="mb-8 text-center object-center flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-12 h-12 bg-primary rounded-xl mb-4 flex items-center justify-center shadow-lg"
          >
            <span className="text-primary-foreground font-bold text-xl">T</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-sm text-muted-foreground">ยินดีต้อนรับกลับ 👋</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">อีเมล</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">รหัสผ่าน</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
            <div className="mt-2 flex justify-end">
              <Link href="/forgot-password" title="Forgot Password" className="text-xs text-primary hover:underline">
                ลืมรหัสผ่าน?
              </Link>
            </div>
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>

          {errors.root && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.root.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">หรือ</span>
          </div>
        </div>

        <div className="flex justify-center min-h-[40px]">
          {mounted ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('root', { message: 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้' })}
              useOneTap
            />
          ) : (
            <div className="w-[200px] h-[40px] bg-muted animate-pulse rounded-md"></div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" className="text-primary hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
