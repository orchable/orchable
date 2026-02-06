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

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<any> }) => 
      configService.updateConfig(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
      queryClient.setQueryData(['config', data.id], data);
    }
  });
}

import { useDesignerStore } from '@/stores/designerStore';
import { toast } from 'sonner';
import { syncStagesToPromptTemplates } from '@/services/stageService';

export function useSaveOrchestrator() {
    const { nodes, edges, orchestratorName, orchestratorDescription, config: currentConfig, loadConfig } = useDesignerStore();
    const saveConfig = useSaveConfig();
    const updateConfig = useUpdateConfig();

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

        // Build steps array with ALL stage fields
        const steps = stepNodes.map(node => {
            const data = node.data as any;
            return {
                // Identity
                id: node.id,
                name: data.name,
                label: data.label,
                
                // Stage-specific (new)
                stage_key: data.stage_key || data.name?.toLowerCase() || node.id,
                task_type: data.task_type || '',
                prompt_template_id: data.prompt_template_id || '',
                cardinality: data.cardinality || '1:1',
                
                // 1:N Split config (these were missing!)
                split_path: data.split_path || '',
                split_mode: data.split_mode || 'per_item',
                output_mapping: data.output_mapping || 'result',
                return_along_with: data.return_along_with || [],
                
                // AI Settings (new)
                ai_settings: data.ai_settings || {
                    model_id: 'gemini-flash-latest',
                    generationConfig: {
                        temperature: 1.0,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 8192
                    }
                },
                
                // Execution config
                timeout: data.timeout || 300000,
                retryConfig: data.retryConfig || { maxRetries: 3, retryDelay: 5000 },
                
                // Layout
                position: node.position,
                
                // Dependencies (computed from edges)
                dependsOn: edges
                    .filter(e => e.target === node.id)
                    .map(e => e.source)
                    .filter(sourceId => sourceId !== 'start'),

                // Pre/Post Process Hooks
                pre_process: data.pre_process,
                post_process: data.post_process,

                // Input/Output Contract
                contract: data.contract,
                
                // Approval flow
                requires_approval: data.requires_approval || false
            };
        });

        try {
            let savedConfig;
            const payload = {
                name: orchestratorName,
                description: orchestratorDescription,
                viewport: useDesignerStore.getState().viewport,
                steps
            };

            // 1. Save to Supabase (Create or Update)
            if (currentConfig?.id) {
                savedConfig = await updateConfig.mutateAsync({
                    id: currentConfig.id,
                    updates: payload
                });
                toast.success("Configuration updated!");
            } else {
                savedConfig = await saveConfig.mutateAsync(payload);
                toast.success("New configuration saved!");
                loadConfig(savedConfig);
            }
            
            // 2. Sync stages to prompt_templates
            try {
                const templateIdMap = await syncStagesToPromptTemplates(
                    savedConfig.id,
                    savedConfig.name,
                    steps,
                    edges
                );
                
                console.log('Synced templates:', Object.fromEntries(templateIdMap));
                toast.success(`Synced ${templateIdMap.size} stage templates!`);
            } catch (syncError: any) {
                console.error("Failed to sync stage templates:", syncError);
                toast.warning(`Config saved, but template sync failed: ${syncError.message}`);
            }

            // NOTE: n8n workflow compilation removed
            // The universal agent will read from prompt_templates at runtime

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
