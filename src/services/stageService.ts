import { supabase } from '@/lib/supabase';
import type { AISettings, PreProcessConfig, PostProcessConfig, StageContract } from '@/lib/types';

// Types for prompt template sync
interface StageData {
    id: string;
    name: string;
    stage_key: string;
    label: string;
    task_type?: string;
    prompt_template_id?: string;
    ai_settings?: AISettings;
    cardinality?: string;
    split_path?: string;
    split_mode?: 'per_item' | 'per_batch';
    output_mapping?: string;
    dependsOn: string[];
    timeout?: number;
    retryConfig?: { maxRetries: number; retryDelay: number };
    position?: { x: number; y: number };
    // Pre/Post process hooks
    pre_process?: PreProcessConfig;
    post_process?: PostProcessConfig;
    contract?: StageContract;
    requires_approval?: boolean;
    return_along_with?: string[];
}

interface PromptTemplateRecord {
    id: string;
    name: string;
    description?: string;
    template: string;
    version: number;
    is_active: boolean;
    default_ai_settings?: Record<string, unknown>;
    next_stage_template_ids?: string[] | null;
    organization_code?: string;
    input_schema?: Record<string, unknown>;
    output_schema?: Record<string, unknown>;
    stage_config?: Record<string, unknown>;
    requires_approval?: boolean;
}

/**
 * Topological sort of stages based on their dependencies (edges)
 * Returns stages in execution order (parents before children)
 */
export function topologicalSortStages(
    stages: StageData[],
    edges: Array<{ source: string; target: string }>
): StageData[] {
    const stageMap = new Map(stages.map(s => [s.id, s]));
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    stages.forEach(s => {
        inDegree.set(s.id, 0);
        adjList.set(s.id, []);
    });

    // Build graph (ignore 'start' node)
    edges.forEach(edge => {
        if (edge.source === 'start') return;
        if (!stageMap.has(edge.source) || !stageMap.has(edge.target)) return;
        
        adjList.get(edge.source)?.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Kahn's algorithm
    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
        if (deg === 0) queue.push(id);
    });

    const sorted: StageData[] = [];
    while (queue.length > 0) {
        const current = queue.shift()!;
        const stage = stageMap.get(current);
        if (stage) sorted.push(stage);

        adjList.get(current)?.forEach(neighbor => {
            const newDegree = (inDegree.get(neighbor) || 1) - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) queue.push(neighbor);
        });
    }

    return sorted;
}

/**
 * Get the next stage(s) for a given stage based on edges
 */
function getNextStages(
    stageId: string,
    edges: Array<{ source: string; target: string }>,
    stageMap: Map<string, StageData>
): StageData[] {
    return edges
        .filter(e => e.source === stageId && stageMap.has(e.target))
        .map(e => stageMap.get(e.target)!)
        .filter(Boolean);
}

/**
 * Sync orchestrator stages to prompt_templates table
 * Creates orchestrator-specific templates with next_stage_template_ids
 * Uses 2-pass approach to avoid FK constraint violations
 */
export async function syncStagesToPromptTemplates(
    orchestratorId: string,
    orchestratorName: string,
    stages: StageData[],
    edges: Array<{ source: string; target: string }>
): Promise<Map<string, string>> {
    const stageMap = new Map(stages.map(s => [s.id, s]));
    const sortedStages = topologicalSortStages(stages, edges);
    
    // Map: stageId -> generated prompt_template_id
    const templateIdMap = new Map<string, string>();

    // Generate unique template IDs for each stage
    sortedStages.forEach(stage => {
        const templateId = `${orchestratorId}_${stage.stage_key || stage.id}`;
        templateIdMap.set(stage.id, templateId);
    });

    // PASS 1: Insert/update all templates WITHOUT next_stage_template_ids (to avoid FK violation)
    for (const stage of sortedStages) {
        const templateId = templateIdMap.get(stage.id)!;

        // Fetch source template content if referenced
        let templateContent = '';
        if (stage.prompt_template_id) {
            const { data: sourceTemplate } = await supabase
                .from('prompt_templates')
                .select('template')
                .eq('id', stage.prompt_template_id)
                .single();
            
            if (sourceTemplate?.template) {
                templateContent = sourceTemplate.template;
            }
        }

        // Build AI settings (Nested API format)
        const defaultAiSettings = stage.ai_settings ? {
            model_id: stage.ai_settings.model_id,
            generate_content_api: stage.ai_settings.generationConfig.generate_content_api || 'generateContent',
            generationConfig: {
                temperature: stage.ai_settings.generationConfig.temperature,
                topP: stage.ai_settings.generationConfig.topP,
                topK: stage.ai_settings.generationConfig.topK,
                maxOutputTokens: stage.ai_settings.generationConfig.maxOutputTokens
            }
        } : { 
            model_id: 'gemini-2.0-flash', 
            generate_content_api: 'generateContent',
            generationConfig: { temperature: 0.7 } 
        };

        // Build Input/Output schemas from contract
        const inputSchema = {
            required_fields: stage.contract?.input.fields.filter(f => f.required).map(f => f.name) || [],
            optional_fields: stage.contract?.input.fields.filter(f => !f.required).map(f => f.name) || [],
            delimiters: stage.contract?.input.delimiters || { start: '{{', end: '}}' }
        };

        // For output schema, we convert the flattened schema fields to a structured object if possible
        // or just store the raw contract output schema
        const outputSchema = stage.contract?.output || null;

        // Build stage-specific config
        const stageConfig = {
            cardinality: (stage.cardinality === '1:N' || stage.cardinality === 'one_to_many') ? 'one_to_many' : 'one_to_one',
            split_path: stage.split_path,
            split_mode: stage.split_mode,
            output_mapping: stage.output_mapping,
            pre_process: stage.pre_process,
            post_process: stage.post_process,
            timeout: stage.timeout,
            retryConfig: stage.retryConfig,
            return_along_with: stage.return_along_with || [], // Correct field name
            requires_approval: stage.requires_approval || false
        };

        const record: Partial<PromptTemplateRecord> = {
            id: templateId,
            name: `[${orchestratorName}] ${stage.label || stage.stage_key}`,
            description: `Stage: ${stage.stage_key} | Task: ${stage.task_type || 'generic'}`,
            template: templateContent,
            version: 1,
            is_active: true,
            default_ai_settings: defaultAiSettings,
            input_schema: inputSchema,
            output_schema: outputSchema as any,
            stage_config: stageConfig,
            requires_approval: stage.requires_approval || false,
            organization_code: orchestratorId
            // NOTE: next_stage_template_ids NOT set here to avoid FK violation
        };

        // Upsert (insert or update)
        const { error } = await supabase
            .from('prompt_templates')
            .upsert(record, { onConflict: 'id' });
        
        if (error) {
            console.error(`Failed to upsert template for stage ${stage.stage_key}:`, error);
            throw new Error(`Failed to sync stage ${stage.stage_key}: ${error.message}`);
        }
    }

    // PASS 2: Update next_stage_template_ids now that all templates exist
    for (const stage of sortedStages) {
        const templateId = templateIdMap.get(stage.id)!;
        
        // Find next stage(s)
        const nextStages = getNextStages(stage.id, edges, stageMap);
        const nextTemplateIds = nextStages.map(ns => templateIdMap.get(ns.id)).filter(Boolean) as string[];
        const nextTemplateId = nextTemplateIds.length > 0 ? nextTemplateIds[0] : null;

        if (nextTemplateIds.length > 0) {
            const { error } = await supabase
                .from('prompt_templates')
                .update({ 
                    next_stage_template_ids: nextTemplateIds 
                })
                .eq('id', templateId);
            
            if (error) {
                console.error(`Failed to update next_stage(s) for ${stage.stage_key}:`, error);
            }
        }
    }

    return templateIdMap;
}

/**
 * Get all templates for an orchestrator
 */
export async function getOrchestratorTemplates(orchestratorId: string) {
    const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('organization_code', orchestratorId)
        .order('name');
    
    if (error) throw error;
    return data || [];
}

/**
 * Delete all templates for an orchestrator
 */
export async function deleteOrchestratorTemplates(orchestratorId: string) {
    const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('organization_code', orchestratorId);
    
    if (error) throw error;
}
