import { create } from 'zustand';

// ── Toast ─────────────────────────────────────────────────────────────────────
export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms, default 4000
}

// ── Dialog (Confirm Modal) ────────────────────────────────────────────────────
export interface DialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel?: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────
interface UIState {
  toasts: Toast[];
  dialog: DialogOptions | null;

  // Toast actions
  toast: (options: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Dialog actions
  openDialog: (options: DialogOptions) => void;
  closeDialog: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  dialog: null,

  toast: (options) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, duration: 4000, variant: 'default', ...options };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    // Auto-dismiss
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  openDialog: (options) => set({ dialog: options }),

  closeDialog: () => set({ dialog: null }),
}));

// ── Convenience helpers (can be called outside React components) ──────────────
export const toast = (options: Omit<Toast, 'id'>) =>
  useUIStore.getState().toast(options);

export const openDialog = (options: DialogOptions) =>
  useUIStore.getState().openDialog(options);

export const closeDialog = () =>
  useUIStore.getState().closeDialog();
