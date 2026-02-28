import { useDesignerStore } from '@/stores/designerStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, FileSpreadsheet, FileJson, Upload, CheckCircle2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { useSaveOrchestrator } from '@/hooks/useConfigs';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { analyzeJsonStructure, isStructureCompatible, FieldInfo } from '@/lib/jsonAnalyzer';
import { JsonInputSection } from '@/components/launcher/JsonInputSection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FieldMappingDialog } from '@/components/launcher/FieldMappingDialog';
import { Separator } from '@/components/ui/separator';
import { StepConfig, JsonInputMapping } from '@/lib/types';
import { AnalysisResult } from '@/lib/jsonAnalyzer';

export function StartConfigPanel() {
    const {
        orchestratorName,
        orchestratorDescription,
        setOrchestratorMetadata,
        nodes,
        edges,
        config,
        inputData,
        setInputData,
        clearInputData,
    } = useDesignerStore();

    const { save, isPending } = useSaveOrchestrator();
    const [isParsing, setIsParsing] = useState(false);
    const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);

    // Filter root stages (those connected directly to Start node)
    const rootStages = useMemo(() => {
        const rootNodeIds = edges
            .filter((e) => e.source === "start")
            .map((e) => e.target);

        return nodes
            .filter((n) => n.type === "stepNode" && rootNodeIds.includes(n.id))
            .map((n) => {
                const data = n.data as unknown as StepConfig;
                return {
                    id: n.id,
                    name: data.label || data.name,
                    contract: data.contract,
                };
            });
    }, [nodes, edges]);

    const validation = useMemo(() => {
        if (
            inputData.mode === "tsv" ||
            rootStages.length === 0 ||
            !inputData.fileName
        )
            return { isValid: true, problems: [] };

        const problems: {
            stageName: string;
            missing: string[];
            delimiters: { start: string; end: string };
        }[] = [];

        const mappedFields = Object.entries(inputData.fieldMapping)
            .filter(
                ([_, value]) =>
                    value && (value.startsWith("static:") ? value.length > 7 : true),
            )
            .map(([name]) => name);

        const perTaskFields = inputData.fieldSelection.perTask.map(
            (f) => f.split(".").pop() || f,
        );

        // SMART VALIDATION: If 'input_data' object is selected, unroll its keys into selectedFields
        const unrolledFields: string[] = [];
        const analysis = inputData.jsonAnalysis as AnalysisResult | null;
        if (
            perTaskFields.includes("input_data") &&
            analysis?.sampleTasks?.[0]?.input_data
        ) {
            const inputDataObj = analysis.sampleTasks[0].input_data as Record<string, unknown>;
            if (typeof inputDataObj === "object" && inputDataObj !== null) {
                unrolledFields.push(...Object.keys(inputDataObj));
            }
        }

        const selectedFields = [
            ...inputData.fieldSelection.shared.map((f) => f.split(".").pop() || f),
            ...perTaskFields,
            ...unrolledFields,
            ...mappedFields,
        ];

        // Only validate the *actual* root stages (those connected to 'start')
        // In current UI, these are the nodes that are sources for edges where source is 'start'
        // But for simplicity and safety, let's validate any stage that has a contract.
        rootStages.forEach((stage) => {
            const requiredFields =
                stage.contract?.input.fields
                    .filter((f) => f.required)
                    .map((f) => f.name) || [];

            const missing = requiredFields.filter((f) => !selectedFields.includes(f));

            if (missing.length > 0) {
                problems.push({
                    stageName: stage.name,
                    missing,
                    delimiters: stage.contract?.input.delimiters || {
                        start: "{{",
                        end: "}}",
                    },
                });
            }
        });

        return {
            isValid: problems.length === 0,
            problems,
        };
    }, [inputData, rootStages]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        const isJson = file.name.endsWith(".json");
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;

                if (isJson) {
                    const json = JSON.parse(text);
                    const analysis = analyzeJsonStructure(json);

                    if (!analysis.taskArrayPath) {
                        throw new Error(
                            "Task list not found in JSON file. Please check file structure. (e.g., an array of objects)",
                        );
                    }

                    // CHECK FOR STRUCTURAL COMPATIBILITY
                    const savedMapping = config?.input_mapping;
                    const isCompatible = isStructureCompatible(savedMapping, analysis);

                    if (isCompatible && savedMapping) {
                        const mapping = savedMapping as JsonInputMapping;
                        setInputData({
                            mode: "json",
                            fileName: file.name,
                            jsonData: json,
                            jsonAnalysis: analysis,
                            fieldSelection: mapping.fieldSelection,
                            fieldMapping: mapping.fieldMapping,
                            selectedTaskIndices: analysis.sampleTasks
                                ? analysis.sampleTasks.map((_, i) => i)
                                : [],
                        });
                        toast.success(`Structure matched! Settings restored from config.`);
                    } else {
                        setInputData({
                            mode: "json",
                            fileName: file.name,
                            jsonData: json,
                            jsonAnalysis: analysis,
                            fieldSelection: {
                                shared: analysis.sharedFields.map((f) => f.path),
                                perTask: analysis.perTaskFields.map((f) => f.path),
                            },
                            fieldMapping: {},
                            selectedTaskIndices: analysis.sampleTasks
                                ? analysis.sampleTasks.map((_, i) => i)
                                : [],
                        });
                        if (savedMapping) {
                            toast.info(`New structure detected. Defaulting to select all.`);
                        } else {
                            toast.success(`Parsed JSON with ${analysis.sampleTasks.length} tasks`);
                        }
                    }
                } else {
                    // TSV logic (No complex mapping persistence for TSV yet as it's flat)
                    const rows = text
                        .trim()
                        .split("\n")
                        .map((row) => row.split("\t"));
                    const data = rows
                        .slice(1)
                        .map((cols) => ({
                            lessonId: cols[0],
                            lessonTitle: cols[1],
                            objective: cols[2],
                            resources: [],
                            duration: cols[4] || "N/A",
                            difficulty: cols[5] || "Start",
                        }))
                        .filter((r) => r.lessonId);

                    setInputData({
                        mode: "tsv",
                        fileName: file.name,
                        syllabusData: data,
                    });
                    toast.success(`Parsed ${data.length} rows from ${file.name}`);
                }
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "Failed to parse file",
                );
                console.error(err);
            } finally {
                setIsParsing(false);
            }
        };

        reader.readAsText(file);
    };

    return (
        <Card className="h-full border-none rounded-none shadow-none flex flex-col">
            <CardHeader className="flex-shrink-0">
                <CardTitle className="text-lg">Orchestrator Settings</CardTitle>
                <CardDescription>
                    Configure basic metadata and runtime input data
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-6 pb-20">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="orch-name">Name</Label>
                        <Input
                            id="orch-name"
                            placeholder="e.g. Standard Course Generator"
                            value={orchestratorName}
                            onChange={(e) =>
                                setOrchestratorMetadata(e.target.value, orchestratorDescription)
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="orch-desc">Description</Label>
                        <Textarea
                            id="orch-desc"
                            placeholder="Describe what this workflow does..."
                            className="min-h-[80px]"
                            value={orchestratorDescription}
                            onChange={(e) =>
                                setOrchestratorMetadata(orchestratorName, e.target.value)
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor="throttling-delay"
                            className="text-xs font-semibold flex items-center justify-between"
                        >
                            Throttling Delay
                            <span className="text-[10px] font-normal opacity-70">
                                (Minutes)
                            </span>
                        </Label>
                        <Input
                            id="throttling-delay"
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0.0"
                            value={inputData.execution_delay_seconds / 60 || ""}
                            onChange={(e) => {
                                const mins = parseFloat(e.target.value) || 0;
                                setInputData({
                                    execution_delay_seconds: Math.round(mins * 60),
                                });
                            }}
                            className="h-9 font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            Delay between tasks to avoid Gemini 429 rate limit errors.
                        </p>
                    </div>
                </div>

                <Separator />

                {/* Input Data Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Upload className="w-3.5 h-3.5" />
                            Orchestrator Input Data
                        </Label>
                        <div className="flex bg-muted p-0.5 rounded-md">
                            <Button
                                variant={inputData.mode === "tsv" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setInputData({ mode: "tsv" })}
                                className="h-7 px-2 text-[10px]"
                            >
                                <FileSpreadsheet className="w-3 h-3 mr-1" />
                                TSV
                            </Button>
                            <Button
                                variant={inputData.mode === "json" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setInputData({ mode: "json" })}
                                className="h-7 px-2 text-[10px]"
                            >
                                <FileJson className="w-3 h-3 mr-1" />
                                JSON
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            type="file"
                            accept=".tsv,.txt,.csv,.json"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                            {isParsing ? (
                                <div className="flex flex-col items-center py-2">
                                    <Loader2 className="w-6 h-6 mb-2 text-primary animate-spin" />
                                    <p className="text-xs font-medium">Analyzing...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-xs font-medium mb-1">
                                        Click to upload {inputData.mode.toUpperCase()}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        or drag and drop
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {inputData.fileName && (
                        <div className="p-3 rounded-md bg-success/5 border border-success/20">
                            <div className="flex items-center gap-2">
                                {inputData.mode === "json" ? (
                                    <FileJson className="w-4 h-4 text-success" />
                                ) : (
                                    <FileSpreadsheet className="w-4 h-4 text-success" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[11px] truncate">
                                        {inputData.fileName}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">
                                        {inputData.mode === "json"
                                            ? `${(inputData.jsonAnalysis as AnalysisResult)?.sampleTasks?.length || 0} tasks`
                                            : `${inputData.syllabusData.length} rows`}{" "}
                                        detected
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={clearInputData}
                                >
                                    ×
                                </Button>
                            </div>
                        </div>
                    )}

                    {inputData.mode === "json" &&
                        inputData.jsonData &&
                        inputData.jsonAnalysis && (
                            <div className="space-y-4 pt-2">
                                <JsonInputSection
                                    analysis={inputData.jsonAnalysis}
                                    selection={inputData.fieldSelection}
                                    mapping={inputData.fieldMapping}
                                    onSelectionChange={(s) => setInputData({ fieldSelection: s })}
                                    sampleJson={inputData.jsonData}
                                    contract={rootStages[0]?.contract}
                                    compact={true}
                                />

                                {!validation.isValid && (
                                    <Alert variant="destructive" className="py-2 px-3">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <AlertTitle className="text-[11px] font-bold">
                                            Incomplete Data Mapping
                                        </AlertTitle>
                                        <AlertDescription className="text-[10px] space-y-2 mt-1">
                                            {validation.problems.map((problem, i) => (
                                                <div key={i}>
                                                    <p className="font-semibold">{problem.stageName}:</p>
                                                    <p>
                                                        Missing:{" "}
                                                        <span className="font-mono">
                                                            {problem.missing.join(", ")}
                                                        </span>
                                                    </p>
                                                </div>
                                            ))}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 text-[9px] w-full mt-1"
                                                onClick={() => setIsMappingDialogOpen(true)}
                                            >
                                                <LinkIcon className="w-3 h-3 mr-1" />
                                                Open Manual Mapping
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {validation.isValid && inputData.fileName && (
                                    <div className="flex items-center gap-2 p-2 rounded bg-success/10 border border-success/20 text-success text-[10px]">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Data matched with stage contracts.
                                    </div>
                                )}
                            </div>
                        )}
                </div>

                <div className="pt-4 flex gap-2 flex-col">
                    <Button
                        onClick={save}
                        disabled={isPending || !orchestratorName}
                        className="w-full"
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Config
                    </Button>
                </div>

                <FieldMappingDialog
                    open={isMappingDialogOpen}
                    onOpenChange={setIsMappingDialogOpen}
                    contract={null}
                    availableFields={
                        inputData.jsonAnalysis
                            ? [
                                ...(inputData.jsonAnalysis as AnalysisResult).sharedFields.map((f: FieldInfo) => f.path),
                                ...(inputData.jsonAnalysis as AnalysisResult).perTaskFields.map(
                                    (f: FieldInfo) => f.path,
                                ),
                            ]
                            : []
                    }
                    mapping={inputData.fieldMapping}
                    onMappingChange={(m) => setInputData({ fieldMapping: m })}
                    onConfirm={() => setIsMappingDialogOpen(false)}
                />
            </CardContent>
        </Card>
    );
}
