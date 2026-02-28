import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calculator,
    Upload,
    Database,
    ChevronRight,
    Search,
    FileJson,
    Settings2,
    Zap,
    Coins,
    PieChart,
    RefreshCw,
    Info,
    DollarSign,
    Layers,
    FileText,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useConfigs } from '@/hooks/useConfigs';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { pricingService, ModelPricing } from '@/services/pricingService';
import { tokenUtils } from '@/lib/tokenUtils';
import { OrchestratorConfig, AISettings, DocumentAsset, AIModel } from '@/lib/types';

export function CalculatorPage() {
    const { data: configs, isLoading: isLoadingConfigs } = useConfigs();
    const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pricingList, setPricingList] = useState<ModelPricing[]>([]);
    const [isFetchingPricing, setIsFetchingPricing] = useState(false);

    // Data Input State
    const [recordCount, setRecordCount] = useState(0);
    const [sampleData, setSampleData] = useState<Record<string, unknown>>({});
    const [fileName, setFileName] = useState<string | null>(null);

    // Per-stage output estimates (characters)
    const [stageOutputEstimates, setStageOutputEstimates] = useState<Record<string, number>>({});
    const [stageMultipliers, setStageMultipliers] = useState<Record<string, number>>({});
    const [fetchedTemplates, setFetchedTemplates] = useState<Record<string, string>>({});
    const [availableDocuments, setAvailableDocuments] = useState<DocumentAsset[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    const selectedConfig = useMemo(() =>
        configs?.find(c => c.id === selectedConfigId),
        [configs, selectedConfigId]
    );

    const filteredConfigs = useMemo(() =>
        configs?.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchTerm.toLowerCase())
        ) || [],
        [configs, searchTerm]
    );

    useEffect(() => {
        const fetchPricing = async () => {
            setIsFetchingPricing(true);
            const pricing = await pricingService.fetchLivePricing();
            setPricingList(pricing);
            setIsFetchingPricing(false);
        };
        fetchPricing();
    }, []);

    useEffect(() => {
        const fetchTemplates = async () => {
            if (!selectedConfig) return;

            const templateIds = selectedConfig.steps
                .map(step => step.prompt_template_id)
                .filter(Boolean) as string[];

            if (templateIds.length === 0) return;

            try {
                const { data, error } = await supabase
                    .from('prompt_templates')
                    .select('id, template')
                    .in('id', templateIds);

                if (error) throw error;

                const templateMap: Record<string, string> = {};
                data.forEach(t => { templateMap[t.id] = t.template; });
                setFetchedTemplates(prev => ({ ...prev, ...templateMap }));
            } catch (err) {
                console.error("Failed to fetch templates:", err);
            }
        };
        fetchTemplates();
    }, [selectedConfig]);

    useEffect(() => {
        const fetchDocuments = async () => {
            setLoadingDocs(true);
            try {
                const { data, error } = await supabase
                    .from('document_assets')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setAvailableDocuments(data || []);
            } catch (err) {
                console.error('Failed to fetch documents:', err);
            } finally {
                setLoadingDocs(false);
            }
        };
        fetchDocuments();
    }, []);

    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const processFile = (file: File) => {
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            try {
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    const records = Array.isArray(data) ? data : [data];
                    setRecordCount(records.length);
                    setSampleData(records[0] || {});
                } else {
                    // Simplistic CSV/TSV count
                    const lines = content.split('\n').filter(l => l.trim());
                    const count = Math.max(0, lines.length - 1);
                    setRecordCount(count);
                    // Extract headers for sample data keys
                    const headers = lines[0]?.split(/[,\t]/).map(h => h.trim());
                    const firstRow = lines[1]?.split(/[,\t]/).map(v => v.trim());
                    const obj: Record<string, string> = {};
                    headers?.forEach((h, i) => { if (h) obj[h] = firstRow?.[i] || ''; });
                    setSampleData(obj);
                }
                toast.success(`Loaded ${file.name} successfully`);
            } catch (err) {
                toast.error("Failed to parse file");
            }
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleOutputEstimateChange = (stageId: string, chars: string) => {
        const val = parseInt(chars) || 0;
        setStageOutputEstimates(prev => ({ ...prev, [stageId]: val }));
    };

    const handleMultiplierChange = (stageId: string, multiplier: string) => {
        const val = parseInt(multiplier) || 1;
        setStageMultipliers(prev => ({ ...prev, [stageId]: val }));
    };

    const calculation = useMemo(() => {
        if (!selectedConfig || !recordCount) return null;

        let totalStaticInputTokens = 0;
        let totalStaticOutputTokens = 0;
        let totalCost = 0;

        // Track task count per stage. 
        // We assume steps are somewhat ordered or follow a main path.
        // For accurate graph propagation, we'd need topological sort.
        // For now, let's use a simple per-stage calculation logic.

        const stageTaskCounts: Record<string, number> = {};

        const stageBreakdown = selectedConfig.steps.map(step => {
            // Determine Task Count for this stage
            let currentStageTaskCount = recordCount;

            // If it has parents, we should ideally sum their outputs.
            // Simplified: if it has dependencies, inherit from the first one.
            if (step.dependsOn && step.dependsOn.length > 0) {
                const parentId = step.dependsOn[0];
                currentStageTaskCount = stageTaskCounts[parentId] || recordCount;
            }

            // Apply Cardinality Adjustment for the NEXT tasks generated by THIS stage
            // 1:1 -> next count = current count
            // 1:N -> next count = current count * N
            // N:1 -> next count = 1 (simplified global merge) or current count / groups
            const cardinality = (step.cardinality || '1:1').toLowerCase();
            const multiplier = stageMultipliers[step.id] || 1;

            let tasksProducedByThisStage = currentStageTaskCount;
            if (cardinality === '1:n' || cardinality === 'one_to_many') {
                tasksProducedByThisStage = currentStageTaskCount * multiplier;
            } else if (cardinality === 'n:1' || cardinality === 'many_to_one') {
                tasksProducedByThisStage = 1; // Simplified: assume global merge
            }

            stageTaskCounts[step.id] = tasksProducedByThisStage;

            // --- Cost Calculation for currentStageTaskCount ---

            // 1. Estimate Input Tokens
            const templateId = step.prompt_template_id;
            const template = (templateId ? fetchedTemplates[templateId] : null) || (step.ai_settings as AISettings & { prompt_template?: string })?.prompt_template || '';
            const promptInputTokens = tokenUtils.estimatePromptTokens(template, sampleData);

            // 🔨 Stage IO: Add Auxiliary Input tokens
            const auxiliaryInputIds = step.auxiliary_inputs || [];
            const auxiliaryTokens = auxiliaryInputIds.reduce((sum, id) => {
                const doc = availableDocuments.find(d => d.id === id);
                return sum + (doc?.token_count_est || 0);
            }, 0);

            const inputTokensPerRecord = promptInputTokens + auxiliaryTokens;
            const stageInputTokens = inputTokensPerRecord * currentStageTaskCount;

            // 2. Estimate Output Tokens
            const expectedChars = stageOutputEstimates[step.id] || 0;
            const estimatedOutputTokensPerRecord = Math.ceil(expectedChars / 4);
            const stageOutputTokens = estimatedOutputTokensPerRecord * currentStageTaskCount;

            // 3. Calculate Cost
            const modelId = step.ai_settings?.model_id || 'gemini-1.5-flash';
            const inputCost = pricingService.calculateCost(stageInputTokens, 'input', modelId, pricingList);
            const outputCost = pricingService.calculateCost(stageOutputTokens, 'output', modelId, pricingList);
            const stageTotalCost = inputCost + outputCost;

            totalStaticInputTokens += stageInputTokens;
            totalStaticOutputTokens += stageOutputTokens;
            totalCost += stageTotalCost;

            return {
                id: step.id,
                name: step.label || step.name,
                model: modelId,
                cardinality,
                taskCount: currentStageTaskCount,
                nextTaskCount: tasksProducedByThisStage,
                inputTokens: stageInputTokens,
                outputTokens: stageOutputTokens,
                cost: stageTotalCost,
                inputTokensPerRecord,
                outputTokensPerRecord: estimatedOutputTokensPerRecord
            };
        });

        return {
            stages: stageBreakdown,
            totalInputTokens: totalStaticInputTokens,
            totalOutputTokens: totalStaticOutputTokens,
            totalCost,
            recordCount
        };
    }, [selectedConfig, recordCount, sampleData, stageOutputEstimates, stageMultipliers, pricingList, fetchedTemplates, availableDocuments]);

    return (
        <div className="flex-1 flex flex-col h-screen bg-background p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Calculator className="w-8 h-8 text-primary" />
                        Cost Calculator
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Estimate orchestration operating costs based on input data.
                    </p>
                </div>
                {isFetchingPricing && (
                    <Badge variant="outline" className="animate-pulse gap-2 bg-primary/5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Updating latest pricing...
                    </Badge>
                )}
            </div>

            <div className="flex-1 grid grid-cols-12 gap-8 min-h-0">
                {/* Left: Configuration & Data Selection */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
                    {/* Step 1: Select Orchestrator */}
                    <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
                        <CardHeader className="pb-3 bg-muted/30">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">1</div>
                                <CardTitle className="text-lg">Select Orchestrator</CardTitle>
                            </div>
                            <CardDescription>Select the scenario you want to estimate costs for.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search scenarios..."
                                    className="pl-9 bg-background/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {filteredConfigs.map(config => (
                                    <button
                                        key={config.id}
                                        onClick={() => setSelectedConfigId(config.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${selectedConfigId === config.id
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border/50 hover:border-border hover:bg-muted/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded bg-background border flex items-center justify-center ${selectedConfigId === config.id ? 'border-primary/30' : 'border-border'}`}>
                                                <Settings2 className={`w-4 h-4 ${selectedConfigId === config.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-medium text-sm truncate">{config.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{config.steps.length} stages</span>
                                            </div>
                                        </div>
                                        {selectedConfigId === config.id && <Zap className="w-3 h-3 text-primary fill-primary" />}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 2: Upload Data */}
                    <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
                        <CardHeader className="pb-3 bg-muted/30">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">2</div>
                                <CardTitle className="text-lg">Input Data</CardTitle>
                            </div>
                            <CardDescription>Upload CSV/JSON file to get actual record count.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {fileName ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded bg-background border">
                                                {fileName.endsWith('.json') ? <FileJson className="w-4 h-4 text-orange-500" /> : <Database className="w-4 h-4 text-green-500" />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium truncate">{fileName}</span>
                                                <span className="text-[10px] text-muted-foreground">{recordCount} records found</span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { setFileName(null); setRecordCount(0); }}>Reset</Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all relative ${isDragging ? 'border-primary bg-primary/10' : 'border-border/50 hover:bg-muted/30'
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <Input
                                        type="file"
                                        accept=".csv,.tsv,.json"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileUploadChange}
                                    />
                                    <Upload className={`w-8 h-8 mb-1 transition-transform ${isDragging ? 'text-primary scale-110' : 'text-muted-foreground'}`} />
                                    <p className="text-sm font-medium">Click to select or drag and drop file</p>
                                    <p className="text-[10px] text-muted-foreground text-center px-4">Supports .csv, .tsv, or .json arrays</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 3: Global Config */}
                    <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
                        <CardHeader className="pb-3 bg-muted/30">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">3</div>
                                <CardTitle className="text-lg">Simulation Options</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium">Record count</label>
                                    <Badge variant="secondary" className="px-1.5 h-4 text-[10px]">Override</Badge>
                                </div>
                                <Input
                                    type="number"
                                    value={recordCount}
                                    onChange={(e) => setRecordCount(parseInt(e.target.value) || 0)}
                                    className="h-8 bg-background/50"
                                    placeholder="Enter number of tasks..."
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Calculation Results */}
                <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0 bg-card/30 rounded-2xl border border-border/50 p-6 overflow-hidden">
                    {!selectedConfig ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <PieChart className="w-8 h-8 opacity-20" />
                            </div>
                            <h3 className="text-lg font-medium">No Orchestrator Selected</h3>
                            <p className="text-sm max-w-sm text-center">Select a scenario from the sidebar to begin cost simulation.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                <StatCard
                                    label="Total Cost (Est.)"
                                    value={`$${calculation?.totalCost.toFixed(4) || '0.0000'}`}
                                    icon={DollarSign}
                                    color="text-primary"
                                    sub={`${(calculation?.totalCost || 0) > 0 ? ((calculation?.totalCost || 0) * 25400).toLocaleString() : 0} VND`}
                                />
                                <StatCard
                                    label="Input Data"
                                    value={calculation?.recordCount || 0}
                                    icon={Layers}
                                    color="text-blue-500"
                                    sub="Input records"
                                />
                                <StatCard
                                    label="Input Tokens"
                                    value={calculation?.totalInputTokens.toLocaleString() || 0}
                                    icon={RefreshCw}
                                    color="text-amber-500"
                                    sub="~Exact Simulation"
                                />
                                <StatCard
                                    label="Output Tokens"
                                    value={calculation?.totalOutputTokens.toLocaleString() || 0}
                                    icon={Sparkles}
                                    color="text-purple-500"
                                    sub="~User Estimates"
                                />
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-muted-foreground" />
                                        Stage Breakdown
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                        Model Prices From: {pricingList.length > 0 ? 'Google AI Live' : 'Fallbacks'}
                                    </Badge>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                    {calculation?.stages.map(stage => (
                                        <div key={stage.id} className="group relative rounded-2xl border border-border/50 bg-background/40 hover:bg-background/60 transition-all p-5 overflow-hidden">
                                            {/* Cost Highlight */}
                                            <div className="absolute top-0 right-0 p-4 pt-5 pr-6 text-right">
                                                <span className="block text-2xl font-bold tracking-tight">${stage.cost.toFixed(5)}</span>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Estimated Cost</span>
                                            </div>

                                            <div className="flex flex-col md:flex-row md:items-start items-center gap-6">
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-base truncate">{stage.name}</h4>
                                                        <Badge variant="outline" className="text-[9px] bg-muted/30">{stage.model}</Badge>
                                                    </div>

                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Tasks</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="font-mono text-sm font-bold text-primary">{stage.taskCount.toLocaleString()}</span>
                                                                <span className="text-[10px] opacity-60">runs</span>
                                                            </div>
                                                            <div className="text-[9px] text-muted-foreground mt-0.5">
                                                                {stage.cardinality}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Input / Run</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="font-mono text-sm">{stage.inputTokensPerRecord.toLocaleString()}</span>
                                                                <span className="text-[10px] opacity-60">tk</span>
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-[10px] text-primary/80 uppercase font-semibold mb-1.5 flex items-center gap-1.5">
                                                                        Expected Output
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Info className="w-3 h-3 cursor-help" />
                                                                                </TooltipTrigger>
                                                                                <TooltipContent className="max-w-[200px] text-[11px]">
                                                                                    Enter average character count returned by the model per task for this stage.
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    </p>
                                                                    <div className="flex items-center gap-2">
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="Chars"
                                                                            className="h-8 w-20 bg-background font-mono text-xs"
                                                                            value={stageOutputEstimates[stage.id] || ''}
                                                                            onChange={(e) => handleOutputEstimateChange(stage.id, e.target.value)}
                                                                        />
                                                                        <span className="text-[10px] text-muted-foreground">chars</span>
                                                                    </div>
                                                                </div>

                                                                {(stage.cardinality === '1:n' || stage.cardinality === 'one_to_many') && (
                                                                    <div>
                                                                        <p className="text-[10px] text-amber-600 uppercase font-semibold mb-1.5 flex items-center gap-1.5">
                                                                            Split Factor (N)
                                                                            <Zap className="w-3 h-3" />
                                                                        </p>
                                                                        <div className="flex items-center gap-2">
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="N"
                                                                                className="h-8 w-16 bg-background font-mono text-xs border-amber-200"
                                                                                value={stageMultipliers[stage.id] || ''}
                                                                                onChange={(e) => handleMultiplierChange(stage.id, e.target.value)}
                                                                            />
                                                                            <span className="text-[10px] text-muted-foreground">items</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Projection Card */}
                            <div className="mt-6 p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                        <Coins className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Campaign Budget Forecast</h4>
                                        <p className="text-xs text-muted-foreground">Estimated variance of ~5-10% from actual due to model tokenization algorithms.</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-primary tracking-tighter">${calculation?.totalCost.toFixed(2)}</div>
                                    <div className="text-[11px] font-bold text-muted-foreground uppercase">Estimated Campaign Budget</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: React.ElementType; color: string; sub: string }) {
    return (
        <Card className="border-border/50 bg-card overflow-hidden group hover:border-primary/30 transition-all">
            <CardHeader className="p-4 pb-0 space-y-0">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                    <div className={`p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors`}>
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
        </Card>
    );
}
