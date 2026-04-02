import { create } from 'zustand';

// ============================================================================
// loadingStore - Global Loading State
// ============================================================================
// ใช้สำหรับแสดง Loading Spinner กลางจอเวลาเรียก API ที่ใช้เวลานาน
//
// วิธีใช้:
//   import { startLoading, stopLoading } from '@/store/loadingStore';
//
//   startLoading('กำลังบันทึกข้อมูล...');
//   try {
//     await api.post('/tasks', data);
//   } finally {
//     stopLoading();
//   }

interface LoadingState {
  isLoading: boolean;
  message: string;
  // เพิ่ม counter เพื่อป้องกันกรณีที่มีหลาย API ยิงพร้อมกัน
  // Spinner จะหายก็ต่อเมื่อ API ทุกตัว complete แล้วเท่านั้น
  count: number;

  startLoading: (message?: string) => void;
  stopLoading: () => void;
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  isLoading: false,
  message: 'กำลังโหลด...',
  count: 0,

  startLoading: (message = 'กำลังโหลด...') =>
    set((state) => ({
      isLoading: true,
      message,
      count: state.count + 1,
    })),

  stopLoading: () =>
    set((state) => {
      const newCount = Math.max(0, state.count - 1);
      return {
        count: newCount,
        isLoading: newCount > 0,
      };
    }),
}));

// Convenience helpers สำหรับเรียกนอก React Component
export const startLoading = (message?: string) =>
  useLoadingStore.getState().startLoading(message);

export const stopLoading = () =>
  useLoadingStore.getState().stopLoading();
