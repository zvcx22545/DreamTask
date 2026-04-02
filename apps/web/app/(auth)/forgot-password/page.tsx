'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { api } from '@/lib/api';
import { CheckCircle2, ArrowLeft, ExternalLink, Copy, Check } from 'lucide-react';

const schema = z.object({
  email: z.string().email('อีเมลไม่ถูกต้อง'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await api.post<{ success: true; resetLink: string }>('/auth/forgot-password', data);
      setResetLink(res.data.resetLink);
    } catch (err: any) {
      setError('root', { message: err.response?.data?.error ?? 'เกิดข้อผิดพลาดในการส่งคำขอ' });
    }
  };

  const copyToClipboard = () => {
    if (resetLink) {
      navigator.clipboard.writeText(resetLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          <h1 className="text-2xl font-bold">ลืมรหัสผ่าน</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {resetLink ? 'สร้างลิงก์รีเซ็ตรหัสผ่านสำเร็จ' : 'กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!resetLink ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">อีเมล</label>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
                </div>

                {errors.root && (
                  <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.root.message}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'กำลังส่งคำขอ...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
                </button>

                <Link 
                  href="/login" 
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
                >
                  <ArrowLeft className="w-4 h-4" /> กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center justify-center p-6 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium">สร้างลิงก์รีเซ็ตรหัสผ่านแล้ว</p>
                  <p className="text-xs text-muted-foreground mt-1">คัดลอกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={resetLink}
                    className="w-full rounded-lg border border-border bg-muted/50 pl-3 pr-24 py-3 text-xs font-mono text-foreground focus:outline-none"
                  />
                  <div className="absolute right-1 top-1 flex gap-1">
                    <button
                      onClick={copyToClipboard}
                      className="p-2 rounded-md bg-background border border-border hover:bg-muted transition-colors"
                      title="คัดลอก"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <Link
                      href={resetLink}
                      className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      title="เปิดลิงก์"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
                <p className="text-[10px] text-center text-muted-foreground">* เนื่องจากระบบยังไม่มี Email Service ลิงก์จะถูกส่งกลับมาให้ที่นี่เพื่อการทดสอบ</p>
              </div>

              <button
                onClick={() => setResetLink(null)}
                className="w-full rounded-lg border border-border py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
              >
                ลองด้วยอีเมลอื่น
              </button>

              <Link 
                href="/login" 
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
