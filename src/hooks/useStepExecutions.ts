import { useQuery } from '@tanstack/react-query';
import { executionService } from '@/services/executionService';
import { usePolling } from './usePolling';

export function useStepExecutions(executionId: string, pollingInterval: number | null = null) {
  const query = useQuery({
    queryKey: ['step-executions', executionId],
    queryFn: () => executionService.getStepExecutions(executionId),
    enabled: !!executionId
  });

  usePolling(() => {
    if (pollingInterval) {
      query.refetch();
    }
  }, pollingInterval);

  return query;
}
