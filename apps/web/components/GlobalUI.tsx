'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { ToastVariant } from '@/store/uiStore';
import { cn } from '@/lib/utils';

// ── Toast icons / colors ──────────────────────────────────────────────────────
const toastConfig: Record<ToastVariant, { icon: React.ReactNode; className: string }> = {
  default: {
    icon: <Info className="h-4 w-4" />,
    className: 'bg-background border border-border text-foreground',
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: 'bg-emerald-950 border border-emerald-700 text-emerald-100',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    className: 'bg-red-950 border border-red-700 text-red-100',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    className: 'bg-amber-950 border border-amber-700 text-amber-100',
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    className: 'bg-blue-950 border border-blue-700 text-blue-100',
  },
};

// ── Toaster ───────────────────────────────────────────────────────────────────
function Toaster() {
  const { toasts, dismissToast } = useUIStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = toastConfig[toast.variant ?? 'default'];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg',
                config.className
              )}
            >
              <span className="mt-0.5 shrink-0">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs opacity-75 mt-0.5">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog() {
  const { dialog, closeDialog } = useUIStore();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (dialog) confirmRef.current?.focus();
  }, [dialog]);

  if (!dialog) return null;

  const handleConfirm = () => {
    dialog.onConfirm();
    closeDialog();
  };

  const handleCancel = () => {
    dialog.onCancel?.();
    closeDialog();
  };

  return (
    <AnimatePresence>
      {dialog && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={handleCancel}
          />
          {/* Panel Wrapper for Centering */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md pointer-events-auto"
            >
            <div className="bg-background border border-border rounded-xl shadow-2xl p-6">
              <h2 className="text-base font-semibold text-foreground">{dialog.title}</h2>
              {dialog.description && (
                <p className="text-sm text-muted-foreground mt-1.5">{dialog.description}</p>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-muted hover:bg-muted/70 text-foreground transition-colors"
                >
                  {dialog.cancelLabel ?? 'ยกเลิก'}
                </button>
                <button
                  ref={confirmRef}
                  onClick={handleConfirm}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    dialog.variant === 'destructive'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  )}
                >
                  {dialog.confirmLabel ?? 'ยืนยัน'}
                </button>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Export: mount once inside <Providers> ─────────────────────────────────────
export function GlobalUI() {
  return (
    <>
      <Toaster />
      <ConfirmDialog />
    </>
  );
}
