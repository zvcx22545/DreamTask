import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Team {
  id: string;
  name: string;
}

interface TeamState {
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
  // ใช้สำหรับล้างข้อมูลตอน logout
  clearTeam: () => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      currentTeam: null,
      setCurrentTeam: (team) => set({ currentTeam: team }),
      clearTeam: () => set({ currentTeam: null }),
    }),
    {
      name: 'auth-team-store',
    }
  )
);
