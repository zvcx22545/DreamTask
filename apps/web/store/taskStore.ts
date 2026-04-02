import { create } from 'zustand';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  assigneeId?: string;
  assignee?: { id: string; name: string; email: string; avatar?: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskState {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  upsertTask: (task: Task) => void;
  removeTask: (id: string) => void;
  // ใช้สำหรับล้างข้อมูลทั้งหมดตอน logout
  clearTasks: () => void;
}

export const useTaskStore = create<TaskState>()((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  upsertTask: (task) =>
    set((state) => {
      const idx = state.tasks.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        const updated = [...state.tasks];
        updated[idx] = task;
        return { tasks: updated };
      }
      return { tasks: [task, ...state.tasks] };
    }),
  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
  clearTasks: () => set({ tasks: [] }),
}));
