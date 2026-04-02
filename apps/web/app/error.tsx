'use client';

import { useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // โค้ดส่วนนี้มักใช้ส่ง Error ไปยัง Sentry หรือบริการ Monitoring อื่นๆ
    console.error('Captured by global error boundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-8 shadow-sm backdrop-blur-md max-w-lg w-full">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          เกิดข้อผิดพลาดบางอย่าง (Something went wrong)
        </h2>
        <p className="mb-8 text-sm text-muted-foreground">
          เราขออภัยในความไม่สะดวก ระบบอาจจะมีปัญหาขัดข้องชั่วคราว
          <br className="hidden sm:block" />
          กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบครับ
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/'}
            className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            กลับสู่หน้าแรก
          </button>
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <RefreshCcw className="h-4 w-4" />
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    </div>
  );
}
