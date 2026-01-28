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

import { useDesignerStore } from '@/stores/designerStore';
import { toast } from 'sonner';

export function useSaveOrchestrator() {
    const { nodes, edges, orchestratorName, orchestratorDescription } = useDesignerStore();
    const saveConfig = useSaveConfig();

    const save = async () => {
        // Filter out Start Node
        const stepNodes = nodes.filter(n => n.type === 'stepNode');
        
        if (stepNodes.length === 0) {
            toast.error("Process must have at least one step");
            return false;
        }

        if (!orchestratorName) {
            toast.error("Orchestrator name is required");
            return false;
        }

        // Build steps array from nodes and edges
        const steps = stepNodes.map(node => {
            const data = node.data as any;
            return {
                id: node.id,
                name: data.name,
                label: data.label,
                webhookUrl: data.webhookUrl,
                timeout: data.timeout,
                retryConfig: data.retryConfig,
                dependsOn: edges
                    .filter(e => e.target === node.id)
                    .map(e => e.source)
                    .filter(sourceId => sourceId !== 'start') // Don't include 'start' as a dependency in the saved config
            };
        });

        try {
            await saveConfig.mutateAsync({
                name: orchestratorName,
                description: orchestratorDescription,
                steps
            });
            toast.success("Configuration saved successfully");
            return true;
        } catch (error) {
            console.error("Failed to save", error);
            toast.error("Failed to save configuration");
            throw error;
        }
    };

    return {
        save,
        isPending: saveConfig.isPending
    }
}
