import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '@/services/configService';

export function useConfigs() {
  return useQuery({
    queryKey: ['configs'],
    queryFn: configService.listConfigs
  });
}

export function useConfig(id: string) {
  return useQuery({
    queryKey: ['config', id],
    queryFn: () => configService.getConfig(id),
    enabled: !!id
  });
}

export function useSaveConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: configService.saveConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    }
  });
}
