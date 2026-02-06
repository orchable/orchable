import { useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Play, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ExecutionMonitor } from './ExecutionMonitor';
import { topologicalSortStages } from '@/services/stageService';

interface RunExecutionDialogProps {
    disabled?: boolean;
}

export function RunExecutionDialog({ disabled }: RunExecutionDialogProps) {
    const { nodes, edges, config } = useDesignerStore();
    const [open, setOpen] = useState(false);
    const [inputTab, setInputTab] = useState<'tsv' | 'json'>('tsv');
    const [tsvInput, setTsvInput] = useState('');
    const [jsonInput, setJsonInput] = useState('[\n  {\n    "lo_code": "LO001",\n    "title": "Example LO"\n  }\n]');
    const [isCreating, setIsCreating] = useState(false);
    const [executionId, setExecutionId] = useState<string | null>(null);

    // Parse TSV to JSON array
    const parseTsv = (tsv: string): any[] => {
        const lines = tsv.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split('\t').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split('\t');
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
                obj[h] = values[i]?.trim() || '';
            });
            return obj;
        });

        return rows;
    };

    const handleRun = async () => {
        if (!config?.id) {
            toast.error('Please save the orchestrator config first');
            return;
        }

        setIsCreating(true);

        try {
            // Parse input data
            let inputItems: any[];
            if (inputTab === 'tsv') {
                inputItems = parseTsv(tsvInput);
            } else {
                inputItems = JSON.parse(jsonInput);
            }

            if (!Array.isArray(inputItems) || inputItems.length === 0) {
                toast.error('Input must be a non-empty array');
                setIsCreating(false);
                return;
            }

            // Generate a batch_id to group tasks together
            // (bypasses orchestrator_executions FK issue)
            const batchId = crypto.randomUUID();

            // Get sorted stages
            const stepNodes = nodes.filter(n => n.type === 'stepNode');
            const stages = stepNodes.map(node => ({
                id: node.id,
                name: (node.data as any).name,
                stage_key: (node.data as any).stage_key || (node.data as any).name?.toLowerCase() || node.id,
                label: (node.data as any).label,
                task_type: (node.data as any).task_type,
                prompt_template_id: (node.data as any).prompt_template_id,
                ai_settings: (node.data as any).ai_settings,
                cardinality: (node.data as any).cardinality || '1:1',
                split_path: (node.data as any).split_path,
                split_mode: (node.data as any).split_mode,
                output_mapping: (node.data as any).output_mapping,
                // Pre/Post process hooks
                pre_process: (node.data as any).pre_process,
                post_process: (node.data as any).post_process,
                // Contract (for delimiters)
                contract: (node.data as any).contract,
                dependsOn: edges.filter(e => e.target === node.id && e.source !== 'start').map(e => e.source),
                position: node.position
            }));

            const sortedStages = topologicalSortStages(stages, edges);
            const firstStage = sortedStages[0];

            if (!firstStage) {
                toast.error('Orchestrator has no stages configured');
                setIsCreating(false);
                return;
            }

            // Create initial tasks for Stage 1 (no FK constraints - all metadata in input_data)
            const nextStages = edges
                .filter(e => e.source === firstStage.id)
                .map(e => nodes.find(n => n.id === e.target))
                .filter(Boolean);

            const nextStageTemplateIds = nextStages.map(ns => `${config.id}_${(ns!.data as any).stage_key || (ns!.data as any).name?.toLowerCase() || ns!.id}`);

            const initialTasks = inputItems.map((item, index) => ({
                task_type: firstStage.task_type || 'generic',
                status: 'pending',
                input_data: {
                    ...item,
                    _orchestrator_config_id: config.id,
                    _orchestrator_name: config.name,
                    _prompt_template_id: `${config.id}_${firstStage.stage_key}`,
                    _next_stage_template_ids: nextStageTemplateIds
                },
                lo_code: item.lo_code || item.code || null,
                stage_key: firstStage.stage_key,
                step_number: 1,
                total_steps: sortedStages.length,
                batch_id: batchId,
                prompt_template_id: `${config.id}_${firstStage.stage_key}`, // FK to prompt_templates
                sequence: index,
                root_task_id: null,
                hierarchy_path: [],
                extra: {
                    current_stage_config: {
                        template_id: `${config.id}_${firstStage.stage_key}`,
                        cardinality: (firstStage.cardinality === '1:N' || firstStage.cardinality === 'one_to_many')
                            ? 'one_to_many'
                            : 'one_to_one',
                        split_path: (firstStage as any).split_path || null,
                        split_mode: (firstStage as any).split_mode || 'per_item',
                        output_mapping: (firstStage as any).output_mapping || 'result'
                    },
                    next_stage_configs: nextStages.map(ns => {
                        const nsData = ns!.data as any;
                        const nsKey = nsData.stage_key || nsData.name?.toLowerCase() || ns!.id;
                        return {
                            template_id: `${config.id}_${nsKey}`,
                            cardinality: (nsData.cardinality === '1:N' || nsData.cardinality === 'one_to_many')
                                ? 'one_to_many'
                                : 'one_to_one',
                            split_path: nsData.split_path || 'result.questions',
                            split_mode: nsData.split_mode || 'per_item',
                            output_mapping: nsData.output_mapping || 'result',
                            delimiters: nsData.contract?.input?.delimiters
                        };
                    }),
                    // Deprecated: keep for backward compatibility
                    next_stage_config: nextStages.length > 0 ? {
                        template_id: nextStageTemplateIds[0],
                        cardinality: ((nextStages[0]!.data as any).cardinality === '1:N' || (nextStages[0]!.data as any).cardinality === 'one_to_many')
                            ? 'one_to_many'
                            : 'one_to_one',
                        split_path: (nextStages[0]!.data as any).split_path || 'result.questions',
                        split_mode: (nextStages[0]!.data as any).split_mode || 'per_item',
                        output_mapping: (nextStages[0]!.data as any).output_mapping || 'result',
                        delimiters: (nextStages[0]!.data as any).contract?.input?.delimiters
                    } : null,
                    // Pre/Post process hooks (injected from stage config)
                    pre_process: firstStage.pre_process?.enabled ? firstStage.pre_process : undefined,
                    post_process: firstStage.post_process?.enabled ? firstStage.post_process : undefined,
                    // Current stage delimiters
                    delimiters: firstStage.contract?.input?.delimiters
                }
            }));

            const { data: tasks, error: tasksError } = await supabase
                .from('ai_tasks')
                .insert(initialTasks)
                .select('id');

            if (tasksError) throw tasksError;

            // Update root_task_id to self for root tasks
            if (tasks && tasks.length > 0) {
                const updatePromises = tasks.map(task =>
                    supabase
                        .from('ai_tasks')
                        .update({ root_task_id: task.id })
                        .eq('id', task.id)
                );
                await Promise.all(updatePromises);
            }

            toast.success(`Created ${inputItems.length} tasks for Stage 1 (batch: ${batchId.slice(0, 8)})`);
            setExecutionId(batchId); // Use batchId for monitoring

        } catch (error: any) {
            console.error('Failed to start execution:', error);
            toast.error(`Failed to start: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setExecutionId(null);
        setTsvInput('');
    };

    const stepNodes = nodes.filter(n => n.type === 'stepNode');
    const hasStages = stepNodes.length > 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    disabled={disabled || !hasStages}
                    className="bg-emerald-600 hover:bg-emerald-700"
                >
                    <Play className="w-4 h-4 mr-2" />
                    Run
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {executionId ? 'Execution Progress' : 'Run Orchestrator'}
                        {executionId && <Badge variant="secondary">Running</Badge>}
                    </DialogTitle>
                    <DialogDescription>
                        {executionId
                            ? 'Monitoring execution progress...'
                            : `${stepNodes.length} stages configured. Provide input data to start.`
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4">
                    {executionId ? (
                        <ExecutionMonitor orchestratorExecutionId={executionId} />
                    ) : (
                        <Tabs value={inputTab} onValueChange={(v) => setInputTab(v as 'tsv' | 'json')}>
                            <TabsList className="mb-4">
                                <TabsTrigger value="tsv" className="gap-1">
                                    <FileText className="w-3 h-3" />
                                    TSV Input
                                </TabsTrigger>
                                <TabsTrigger value="json" className="gap-1">
                                    <FileText className="w-3 h-3" />
                                    JSON Input
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="tsv">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Paste TSV data (tab-separated, first row = headers)
                                    </label>
                                    <Textarea
                                        placeholder="lo_code\ttitle\tbloom\nLO001\tVariables\tRemember\nLO002\tFunctions\tApply"
                                        value={tsvInput}
                                        onChange={e => setTsvInput(e.target.value)}
                                        className="min-h-[200px] font-mono text-xs"
                                    />
                                    {tsvInput && (
                                        <p className="text-xs text-muted-foreground">
                                            Parsed: {parseTsv(tsvInput).length} rows
                                        </p>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="json">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        JSON array of input items
                                    </label>
                                    <Textarea
                                        placeholder='[{"lo_code": "LO001", "title": "Variables"}]'
                                        value={jsonInput}
                                        onChange={e => setJsonInput(e.target.value)}
                                        className="min-h-[200px] font-mono text-xs"
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>

                <DialogFooter>
                    {executionId ? (
                        <Button variant="outline" onClick={handleClose}>
                            Close
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRun}
                                disabled={isCreating || (!tsvInput && inputTab === 'tsv')}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Start Execution
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
