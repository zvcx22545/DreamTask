'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Loader2, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';

const schema = z.object({
  password: z
    .string()
    .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .regex(/[A-Z]/, 'ต้องมีตัวพิมพ์ใหญ่')
    .regex(/[0-9]/, 'ต้องมีตัวเลข'),
  confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const setAuth = useAuthStore((s) => s.setAuth);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      setError('root', { message: 'ไม่พบ Token สำหรับรีเซ็ตรหัสผ่าน' });
      return;
    }

    try {
      const res = await api.post<{
        accessToken: string;
        user: { id: string; name: string; email: string; role: string };
      }>('/auth/reset-password', {
        token,
        password: data.password,
      });

      setAuth(res.data.user, res.data.accessToken);
      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError('root', { message: err.response?.data?.error ?? 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' });
    }
  };

  if (!token) {
    return (
      <div className="text-center p-8 bg-destructive/5 rounded-xl border border-destructive/20">
        <p className="text-destructive font-medium">ไม่พบ Token สำหรับรีเซ็ตรหัสผ่าน</p>
        <p className="text-sm text-muted-foreground mt-2">กรุณาตรวจสอบลิงก์ในอีเมลของคุณอีกครั้ง</p>
        <Link href="/forgot-password" className="inline-block mt-4 text-primary hover:underline">
          ขอรับลิงก์ใหม่
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 bg-green-500/5 rounded-xl border border-green-500/20"
      >
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">รีเซ็ตรหัสผ่านสำเร็จ</h2>
        <p className="text-sm text-muted-foreground mt-2">กำลังพาคุณเข้าสู่ระบบ...</p>
        <div className="mt-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-foreground">
      <div>
        <label className="mb-1 block text-sm font-medium">รหัสผ่านใหม่</label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            {...register('password')}
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-input pl-10 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
          />
        </div>
        {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">ยืนยันรหัสผ่านใหม่</label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            {...register('confirmPassword')}
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-input pl-10 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
          />
        </div>
        {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      {errors.root && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.root.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...
          </>
        ) : (
          <>
            บันทึกรหัสผ่านใหม่และเข้าสู่ระบบ <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden text-foreground">
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
        <div className="mb-8 text-center flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-12 h-12 bg-primary rounded-xl mb-4 flex items-center justify-center shadow-lg"
          >
            <span className="text-primary-foreground font-bold text-xl">T</span>
          </motion.div>
          <h1 className="text-2xl font-bold">รีเซ็ตรหัสผ่าน</h1>
          <p className="mt-2 text-sm text-muted-foreground">กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
        </div>

        <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-8 text-center text-xs text-muted-foreground">
           จำรหัสผ่านได้แล้ว?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
