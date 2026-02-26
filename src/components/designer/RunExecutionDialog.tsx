import { useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExecutionMonitor } from './ExecutionMonitor';
import { analyzeJsonStructure, isStructureCompatible } from '@/lib/jsonAnalyzer';
import { batchService } from '@/services/batchService';
import { useTier } from '@/hooks/useTier';

interface RunExecutionDialogProps {
    disabled?: boolean;
}

export function RunExecutionDialog({ disabled }: RunExecutionDialogProps) {
    const { nodes, edges, config, inputData, setInputData } = useDesignerStore();
    const { tier } = useTier();
    const [open, setOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [executionId, setExecutionId] = useState<string | null>(null);
    const [batchAlias, setBatchAlias] = useState('');

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        const isJson = file.name.endsWith('.json');
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;

                if (isJson) {
                    const json = JSON.parse(text);
                    const analysis = analyzeJsonStructure(json);

                    if (!analysis.taskArrayPath) {
                        throw new Error('Task list not found in JSON file. Please check file structure. (e.g., an array of objects)');
                    }

                    // CHECK FOR STRUCTURAL COMPATIBILITY
                    const savedMapping = config?.input_mapping as Record<string, any>;
                    const isCompatible = isStructureCompatible(savedMapping, analysis);

                    if (isCompatible && savedMapping) {
                        setInputData({
                            mode: 'json',
                            fileName: file.name,
                            jsonData: json,
                            jsonAnalysis: analysis,
                            fieldSelection: savedMapping.fieldSelection,
                            fieldMapping: savedMapping.fieldMapping,
                            selectedTaskIndices: (analysis.sampleTasks as any[]) ? (analysis.sampleTasks as any[]).map((_: any, i: number) => i) : []
                        });
                        toast.success(`Structure matched! Settings restored from config.`);
                    } else {
                        setInputData({
                            mode: 'json',
                            fileName: file.name,
                            jsonData: json,
                            jsonAnalysis: analysis,
                            fieldSelection: {
                                shared: analysis.sharedFields.map((f: any) => f.path),
                                perTask: analysis.perTaskFields.map((f: any) => f.path)
                            },
                            fieldMapping: {},
                            selectedTaskIndices: (analysis.sampleTasks as any[]) ? (analysis.sampleTasks as any[]).map((_, i) => i) : []
                        });
                        if (savedMapping) {
                            toast.info(`New structure detected. Defaulting to select all.`);
                        } else {
                            toast.success(`Parsed JSON with ${analysis.sampleTasks.length} tasks`);
                        }
                    }
                } else {
                    // TSV logic
                    const rows = text.trim().split('\n').map(row => row.split('\t'));
                    const data = rows.slice(1).map(cols => ({
                        lessonId: cols[0],
                        lessonTitle: cols[1],
                        objective: cols[2],
                        resources: [],
                        duration: cols[4] || 'N/A',
                        difficulty: cols[5] || 'Start'
                    })).filter(r => r.lessonId);

                    setInputData({
                        mode: 'tsv',
                        fileName: file.name,
                        syllabusData: data
                    });
                    toast.success(`Parsed ${data.length} rows from ${file.name}`);
                }
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to parse file');
                console.error(err);
            } finally {
                setIsParsing(false);
            }
        };

        reader.readAsText(file);
    };

    const handleRun = async () => {
        if (!config?.id) {
            toast.error('Please save the orchestrator config first');
            return;
        }

        if (!inputData.fileName) {
            toast.error('Please upload data in Start Panel before running.');
            return;
        }

        setIsCreating(true);

        try {
            // Get input items
            let inputItems: any[];
            const currentInputData = inputData as Record<string, any>;
            if (currentInputData.mode === 'tsv') {
                inputItems = currentInputData.syllabusData;
            } else {
                const { processTaskData } = await import('@/lib/jsonAnalyzer');
                inputItems = (currentInputData.jsonAnalysis as any).sampleTasks.map((task: any) => {
                    const processed = processTaskData(
                        task,
                        currentInputData.jsonData,
                        currentInputData.fieldSelection,
                        currentInputData.fieldMapping,
                        []
                    );
                    return {
                        ...processed.input_data,
                        ...processed.extra
                    };
                });
            }

            if (!Array.isArray(inputItems) || inputItems.length === 0) {
                toast.error('Input must be a non-empty array');
                setIsCreating(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || 'anonymous';

            toast.info(`Preparing ${inputItems.length} pipelines...`);

            // Use the new batchService to create batch and tasks
            const { batch, launchId } = await batchService.createLaunch({
                config,
                inputItems,
                batchName: batchAlias.trim(),
                userId: currentUserId
            });

            // If in Lite mode, ensure executor is running
            const geminiApiKey = localStorage.getItem("orchable_gemini_api_key");
            if (geminiApiKey) {
                const { executorService } = await import('@/services/executorService');
                executorService.start(tier);
                toast.success("Local Task Executor started.");
            } else {
                toast.warning("No Gemini API Key found in settings. Task processing will wait until a key is provided.");
            }

            toast.success(`Launched ${inputItems.length} pipelines (Batch: ${batch.id.slice(0, 8)})`);
            setExecutionId(launchId);

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
                        <div className="space-y-4">
                            {inputData.fileName ? (
                                <div className="p-4 rounded-lg bg-success/5 border border-success/20 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-success/10 rounded-full">
                                            <CheckCircle2 className="w-5 h-5 text-success" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Data Ready to Run</p>
                                            <p className="text-xs text-muted-foreground">
                                                File: <span className="font-medium text-foreground">{inputData.fileName}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="bg-background/50 p-2 rounded border border-success/10">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Items</p>
                                            <p className="text-lg font-mono font-bold">
                                                {inputData.mode === 'json' ? (inputData.jsonAnalysis as any)?.sampleTasks?.length : inputData.syllabusData.length}
                                            </p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border border-success/10">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Input Mode</p>
                                            <p className="text-lg font-mono font-bold uppercase">{inputData.mode}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-success/10">
                                        <Label htmlFor="batch-alias" className="text-xs font-semibold text-muted-foreground">
                                            Batch Alias Name (Optional)
                                        </Label>
                                        <Input
                                            id="batch-alias"
                                            placeholder="e.g. Test Run with High Temperature"
                                            value={batchAlias}
                                            onChange={(e) => setBatchAlias(e.target.value)}
                                            className="bg-background/50 h-9"
                                        />
                                        <p className="text-[10px] text-muted-foreground italic">
                                            Best practice: use a name that describes this specific batch of data or parameters.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".tsv,.txt,.csv,.json"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="p-8 text-center space-y-3 border-2 border-dashed rounded-xl border-muted-foreground/20 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">
                                        {isParsing ? (
                                            <div className="flex flex-col items-center py-2">
                                                <Loader2 className="w-8 h-8 mb-2 text-primary animate-spin" />
                                                <p className="text-sm font-medium">Parsing data...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mx-auto text-muted-foreground opacity-50 group-hover:text-primary transition-colors" />
                                                <div className="space-y-1">
                                                    <p className="font-medium text-sm">No Input Data Provided</p>
                                                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                                        Click or drag and drop a TSV or JSON file here to start.
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="bg-muted/50 p-3 rounded-md text-[11px] text-muted-foreground border border-muted">
                                <p className="font-semibold mb-1 text-foreground flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Note:
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Execution will create a separate batch for each input item.</li>
                                    <li>You can monitor progress in real-time within this dialog.</li>
                                    <li>Data is transient and will be cleared when you close or reload the designer.</li>
                                </ul>
                            </div>
                        </div>
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
                                disabled={isCreating || !inputData.fileName}
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
