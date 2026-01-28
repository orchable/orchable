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
            // 1. Save to Supabase
            const savedConfig = await saveConfig.mutateAsync({
                name: orchestratorName,
                description: orchestratorDescription,
                steps
            });
            
            // 2. Compile & Publish to n8n (Fire & Forget or Await?) -> Await to show status
            const n8nApiKey = localStorage.getItem("lovable_n8n_api_key");
            if (n8nApiKey) {
                 try {
                     const { compilerService } = await import('@/services/compilerService');
                     const { n8nService } = await import('@/services/n8nService');
                     
                     // Compile
                     const workflowJson = compilerService.compile(savedConfig);
                     
                     // Enforce unique naming convention: [Orchestrator] Name (UUID)
                     const n8nName = `[Orchestrator] ${savedConfig.name} (${savedConfig.id})`;
                     workflowJson.name = n8nName;
                     
                     // Check existence
                     const existingWorkflows = await n8nService.listWorkflows();
                     const match = existingWorkflows.find(w => w.name === n8nName);
                     
                     if (match) {
                         await n8nService.updateWorkflow(match.id, workflowJson);
                         // Ensure active
                         await n8nService.activateWorkflow(match.id, true);
                         toast.success("Saved to DB & Updated n8n Workflow!");
                     } else {
                         const created = await n8nService.createWorkflow(workflowJson);
                         await n8nService.activateWorkflow(created.id, true);
                         toast.success("Saved to DB & Created n8n Workflow!");
                     }
                 } catch (n8nError: any) {
                     console.error("n8n Publish Error:", n8nError);
                     toast.warning(`Saved to DB, but n8n publish failed: ${n8nError.message}`);
                 }
            } else {
                toast.success("Saved to DB (n8n publish skipped - No API Key)");
            }

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
