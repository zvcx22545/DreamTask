import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  googleId?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  // เวลาที่ login ล่าสุด (timestamp ms) ใช้สำหรับ Session Timeout
  loginAt: number | null;
  setAuth: (user: User, token: string) => void;
  setToken: (token: string) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      loginAt: null,
      // บันทึกข้อมูล user, token และเวลา login ไว้เสมอ
      setAuth: (user, accessToken) => set({ user, accessToken, loginAt: Date.now() }),
      setToken: (accessToken) => set({ accessToken }),
      updateUser: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),

      logout: () => {
        // 1. ล้างข้อมูล Auth (user + token + loginAt)
        set({ user: null, accessToken: null, loginAt: null });

        // 2. ล้าง teamStore ออกจาก memory และ localStorage
        //    (import แบบ lazy เพื่อหลีกเลี่ยง circular dep)
        import('@/store/teamStore').then(({ useTeamStore }) => {
          useTeamStore.getState().clearTeam();
          // ลบ persist key ออกจาก localStorage โดยตรง เพื่อให้ Login ครั้งหน้าเริ่มจาก null
          localStorage.removeItem('auth-team-store');
        });

        // 3. ล้าง taskStore ออกจาก memory
        import('@/store/taskStore').then(({ useTaskStore }) => {
          useTaskStore.getState().clearTasks();
        });
      },
    }),
    {
      name: 'auth-store',
      // บันทึก user, accessToken และ loginAt ลง localStorage เพื่อไม่ให้ token หายเมื่อกด F5
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, loginAt: state.loginAt }),
    },
  ),
);
