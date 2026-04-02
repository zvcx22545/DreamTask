import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UserSummary {
  id: string;
  name: string;
  avatar?: string;
}

export interface TaskComment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  user: UserSummary;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook สำหรับดึงรายการคอมเมนต์ของงาน (Tasks)
 * @param taskId ID ของงาน
 */
export function useComments(taskId: string) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const { data } = await api.get<TaskComment[]>(`/tasks/${taskId}/comments`);
      return data;
    },
    enabled: !!taskId,
  });
}

/**
 * Hook สำหรับเพิ่มคอมเมนต์ใหม่
 */
export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const { data } = await api.post<TaskComment>(`/tasks/${taskId}/comments`, { content });
      return data;
    },
    onSuccess: (_, { taskId }) => {
      // Invalidate เพื่อให้ UI ดึงข้อมูลคอมเมนต์ล่าสุดมาแสดง
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });
}

/**
 * Hook สำหรับลบคอมเมนต์
 */
export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, commentId }: { taskId: string; commentId: string }) => {
      await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });
}
