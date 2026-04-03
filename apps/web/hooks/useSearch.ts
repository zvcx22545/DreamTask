import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task } from '@/store/taskStore';

export interface SearchResponse {
  success: boolean;
  data: Task[];
}

/**
 * Hook สำหรับค้นหางานผ่าน Meilisearch API
 * @param q คำค้นหา
 * @param teamId ID ของทีมที่ต้องการค้นหา
 */
export function useSearch(q: string | undefined, teamId: string | undefined) {
  return useQuery({
    queryKey: ['search', q, teamId],
    queryFn: async () => {
      if (!q || !teamId) return [];
      
      const { data } = await api.get<SearchResponse>('/search', {
        params: { q, teamId },
        hideLoading: true,
      });
      
      return data.data;
    },
    enabled: !!q && !!teamId,
    staleTime: 1000 * 60, // 1 minute
  });
}
