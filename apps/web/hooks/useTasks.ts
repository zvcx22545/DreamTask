import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTaskStore } from '@/store/taskStore';
import type { Task } from '@/store/taskStore';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/types';

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

export function useTasks(teamId: string | undefined, params?: Record<string, string>) {
  const setTasks = useTaskStore((s) => s.setTasks);

  return useQuery({
    queryKey: ['tasks', teamId, params],
    queryFn: async () => {
      if (!teamId) return { tasks: [], total: 0, page: 1, limit: 20 };
      const { data } = await api.get<TaskListResponse>('/tasks', { 
        params: { ...params, teamId },
        hideLoading: true
      });
      setTasks(data.tasks); // sync to Zustand for WS merging
      return data;
    },
    enabled: !!teamId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskInput) => api.post<Task>('/tasks', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTaskInput & { id: string }) =>
      api.patch<Task>(`/tasks/${id}`, body, { hideLoading: true }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
