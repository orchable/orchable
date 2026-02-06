import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executionService } from '@/services/executionService';
import { usePolling } from './usePolling';

export function useExecutions() {
  return useQuery({
    queryKey: ['executions'],
    queryFn: executionService.listExecutions
  });
}

export function useExecution(id: string, pollingInterval: number | null = null) {
  const query = useQuery({
    queryKey: ['execution', id],
    queryFn: () => executionService.getExecution(id),
    enabled: !!id
  });

  usePolling(() => {
    if (pollingInterval) {
      query.refetch();
    }
  }, pollingInterval);

  return query;
}

export function useCreateExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ configId, syllabusRow }: { configId: string, syllabusRow: any }) => {
       return executionService.createExecution({ configId, syllabusRow });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    }
  });
}

export function useAiTasks() {
  return useQuery({
    queryKey: ['ai_tasks'],
    queryFn: executionService.listAiTasks
  });
}
