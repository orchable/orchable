import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Upload, FileSpreadsheet, Rocket, ChevronRight, CheckCircle2, Loader2, AlertCircle, Search, FileJson, Settings2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useConfigs } from '@/hooks/useConfigs';
import { useCreateExecution } from '@/hooks/useExecutions';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { SyllabusRow, OrchestratorConfig, StepConfig } from '@/lib/types';
import { n8nService } from '@/services/n8nService';
import { analyzeJsonStructure, getValueByPath, processTaskData, type AnalysisResult, type FieldInfo } from '@/lib/jsonAnalyzer';
import type { FieldSelection, FieldMapping, StageContract } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { JsonInputSection } from '@/components/launcher/JsonInputSection';
import { FieldMappingDialog } from '@/components/launcher/FieldMappingDialog';
import { TaskSelectionTable } from '@/components/launcher/TaskSelectionTable';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTier } from '@/hooks/useTier';
import { storage, UserTier } from '@/lib/storage';
import { getTierSource } from '@/lib/storage/executionRouter';
import { executorService } from '@/services/executorService';

export function LauncherPage() {
  const { user } = useAuth();
  const { tier } = useTier();
  const navigate = useNavigate();
  const { data: configs, isLoading: isLoadingConfigs } = useConfigs();
  const createExecutionMutation = useCreateExecution();

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [syllabusData, setSyllabusData] = useState<SyllabusRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputMode, setInputMode] = useState<'tsv' | 'json'>('tsv');
  const [isParsing, setIsParsing] = useState(false);

  // JSON Mode State
  const [jsonData, setJsonData] = useState<Record<string, unknown>[] | null>(null);
  const [jsonAnalysis, setJsonAnalysis] = useState<AnalysisResult | null>(null);
  const [fieldSelection, setFieldSelection] = useState<FieldSelection>({ shared: [], perTask: [] });
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<number[]>([]);

  interface RootStage extends StepConfig {
    id: string;
    name: string;
    _nextStage?: StepConfig;
  }
  const [rootStages, setRootStages] = useState<RootStage[]>([]);
  const [mappingWarning, setMappingWarning] = useState<string[]>([]);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);

  // Sync root stages' contracts when configuration changes
  useEffect(() => {
    if (!selectedConfigId || !configs) {
      setRootStages([]);
      return;
    }

    const config = configs.find(c => c.id === selectedConfigId);
    if (!config) return;

    // Find all steps that have no dependencies (root steps)
    const roots = config.steps
      .filter(s => !s.dependsOn || s.dependsOn.length === 0)
      .filter(s => s.contract)
      .map(s => {
        // Find next stage(s) - for now, take first child only
        const nextStage = config.steps.find(child => child.dependsOn?.includes(s.id));

        return {
          ...s,
          id: s.id,
          name: s.label || s.name,
          // We'll use this nextStage info during launch
          _nextStage: nextStage
        } as RootStage;
      });

    setRootStages(roots);
  }, [selectedConfigId, configs]);

  // Validate fields against contracts of all root stages
  const validation = useMemo(() => {
    if (inputMode === 'tsv' || rootStages.length === 0) return { isValid: true, problems: [] };

    const problems: { stageName: string; missing: string[]; delimiters: { start: string; end: string } }[] = [];

    const mappedFields = Object.entries(fieldMapping)
      .filter(([_, value]) => value && (value.startsWith("static:") ? value.length > 7 : true))
      .map(([name]) => name);

    const perTaskFields = fieldSelection.perTask.map(f => f.split('.').pop() || f);

    // SMART VALIDATION: If 'input_data' object is selected, unroll its keys into selectedFields
    const unrolledFields: string[] = [];
    if (perTaskFields.includes('input_data') && jsonAnalysis?.sampleTasks?.[0]?.input_data) {
      const inputDataObj = jsonAnalysis.sampleTasks[0].input_data;
      if (typeof inputDataObj === 'object' && inputDataObj !== null) {
        unrolledFields.push(...Object.keys(inputDataObj));
      }
    }

    const selectedFields = [
      ...fieldSelection.shared.map(f => f.split('.').pop() || f),
      ...perTaskFields,
      ...unrolledFields,
      ...mappedFields
    ];

    rootStages.forEach(stage => {
      const requiredFields = stage.contract?.input.fields
        .filter(f => f.required)
        .map(f => f.name) || [];

      const missing = requiredFields.filter(f => !selectedFields.includes(f));

      if (missing.length > 0) {
        problems.push({
          stageName: stage.name,
          missing,
          delimiters: stage.contract?.input.delimiters || { start: '{{', end: '}}' }
        });
      }
    });

    return {
      isValid: problems.length === 0,
      problems
    };
  }, [inputMode, rootStages, fieldSelection, fieldMapping, jsonAnalysis]);

  const orchestrationMetadata = useMemo(() => {
    if (!selectedConfigId || rootStages.length === 0) return null;

    const config = configs?.find(c => c.id === selectedConfigId);
    if (!config) return null;

    const firstStage = rootStages[0];
    const nextStage = firstStage?._nextStage;
    const nextStageKey = nextStage?.stage_key;

    const firstStageTemplateId = `${config.id}_${firstStage.stage_key}_${firstStage.id}`;
    const nextStageTemplateId = nextStage ? `${config.id}_${nextStage.stage_key}_${nextStage.id}` : null;

    return {
      next_stage_config: nextStageTemplateId ? {
        template_id: nextStageTemplateId,
        cardinality: (nextStage?.cardinality === '1:N') ? 'one_to_many' : 'one_to_one',
        split_path: nextStage?.split_path || null,
        split_mode: nextStage?.split_mode || 'per_item',
        output_mapping: nextStage?.output_mapping || 'result',
        delimiters: nextStage?.contract?.input?.delimiters
      } : null,
      pre_process: firstStage.pre_process?.enabled ? firstStage.pre_process : undefined,
      post_process: firstStage.post_process?.enabled ? firstStage.post_process : undefined,
      'return-along-with': firstStage.return_along_with || []
    };
  }, [selectedConfigId, rootStages, configs]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isJson = file.name.endsWith('.json');
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        if (isJson) {
          const json = JSON.parse(text);
          setJsonData(json);
          const analysis = analyzeJsonStructure(json);

          if (!analysis.taskArrayPath) {
            throw new Error('Task list not found in JSON. Please check file structure.');
          }

          setJsonAnalysis(analysis);
          setInputMode('json');

          // Initial selection: all fields (map FieldInfo to path strings)
          setFieldSelection({
            shared: analysis.sharedFields.map(f => f.path),
            perTask: analysis.perTaskFields.map(f => f.path)
          });

          // Initial task selection: all tasks
          if (analysis.sampleTasks) {
            setSelectedTaskIndices(analysis.sampleTasks.map((_, i) => i));
          }

          toast.success(`Parsed JSON with ${analysis.sampleTasks.length} tasks`);
          return;
        }

        // TSV logic
        const rows = text.trim().split('\n').map(row => row.split('\t'));
        const data: SyllabusRow[] = rows.slice(1).map(cols => ({
          lessonId: cols[0],
          lessonTitle: cols[1],
          objective: cols[2],
          resources: [],
          duration: cols[4] || 'N/A',
          difficulty: cols[5] || 'Start'
        })).filter(r => r.lessonId);

        setSyllabusData(data);
        toast.success(`Parsed ${data.length} lessons from ${file.name}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to parse file');
        console.error(err);
        setFileName(null);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      toast.error('Error reading file');
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const handleLaunch = async () => {
    if (!selectedConfigId) return;
    setIsLaunching(true);

    try {
      if (inputMode === 'json' && jsonData && jsonAnalysis) {
        // 1. Prepare common launch session info
        const launchId = crypto.randomUUID();
        const taskArray = getValueByPath(jsonData, jsonAnalysis.taskArrayPath);
        const selectedTasks = selectedTaskIndices.map(idx => taskArray[idx]);

        if (selectedTasks.length === 0) {
          toast.error('Please select at least one task');
          setIsLaunching(false);
          return;
        }

        const config = configs?.find(c => c.id === selectedConfigId);
        if (!config) {
          toast.error('Configuration not found.');
          setIsLaunching(false);
          return;
        }

        const firstStage = rootStages[0];
        const nextStage = firstStage?._nextStage;

        // Build full template IDs matching stageService format: configId_stageKey_stepId
        const firstStageTemplateId = `${config.id}_${firstStage.stage_key}_${firstStage.id}`;
        const nextStageTemplateId = nextStage ? `${config.id}_${nextStage.stage_key}_${nextStage.id}` : null;

        // 2. Process each row into its own batch
        toast.info(`Preparing ${selectedTasks.length} pipelines...`);

        const tierSource = await getTierSource(tier);
        const allTasksToInsert: Record<string, unknown>[] = [];

        for (let i = 0; i < selectedTasks.length; i++) {
          const task = selectedTasks[i];
          const processed = processTaskData(
            task,
            jsonData,
            fieldSelection,
            fieldMapping,
            rootStages[0]?.contract?.input.fields.map(f => f.name) || []
          );

          // Create a task_batches record for THIS ROW
          const batch = await storage.adapter.createBatch({
            name: `${config.name} - Row ${selectedTaskIndices[i] + 1}`,
            total_tasks: 1, // Will be updated by triggers if more tasks are created in stages
            pending_tasks: 1,
            status: 'processing',
            batch_type: 'manual_run',
            orchestrator_config_id: config.id,
            launch_id: launchId, // Campaign grouping
            preset_key: 'manual', // Legacy compatibility
            grade_code: 'none',    // Legacy compatibility
            created_by: user?.id
          });

          const batchId = batch.id;

          allTasksToInsert.push({
            task_type: firstStage?.task_type || 'generic',
            status: 'plan',
            input_data: processed.input_data,
            launch_id: launchId, // Grouping at Campaign level
            batch_id: batchId,   // Grouping at Row level
            user_id: user?.id,
            tier_source: tierSource,
            extra: {
              ...processed.extra,
              launcher_metadata: {
                original_index: selectedTaskIndices[i],
                source_file: fileName,
                config_id: selectedConfigId,
                launch_id: launchId
              },
              current_stage_config: {
                template_id: firstStageTemplateId,
                cardinality: (firstStage.cardinality === '1:N' || firstStage.cardinality === 'one_to_many')
                  ? 'one_to_many'
                  : 'one_to_one',
                split_path: firstStage.split_path || null,
                split_mode: firstStage.split_mode || 'per_item',
                output_mapping: firstStage.output_mapping || 'result',
                delimiters: firstStage.contract?.input?.delimiters
              },
              // next_stage_configs will be populated by Load Batch from prompt_templates.next_stage_template_ids
              // Setting here as fallback for legacy compatibility
              next_stage_config: nextStageTemplateId ? {
                template_id: nextStageTemplateId,
                cardinality: (nextStage?.cardinality === '1:N' || nextStage?.cardinality === 'one_to_many')
                  ? 'one_to_many'
                  : 'one_to_one',
                split_path: nextStage?.split_path || null,
                split_mode: nextStage?.split_mode || 'per_item',
                output_mapping: nextStage?.output_mapping || 'result',
                delimiters: nextStage?.contract?.input?.delimiters
              } : null,
              pre_process: firstStage.pre_process?.enabled ? firstStage.pre_process : undefined,
              post_process: firstStage.post_process?.enabled ? firstStage.post_process : undefined,
              'return-along-with': firstStage.return_along_with || []
            },
            stage_key: firstStage?.stage_key || 'start',
            prompt_template_id: firstStageTemplateId,
            sequence: i,
            test_mode: false
          });
        }

        // 3. Perform bulk insert of all initial tasks (Stage 1)
        try {
          await storage.adapter.createTasks(allTasksToInsert);
        } catch (err: any) {
          if (err.message === 'QUOTA_EXCEEDED') {
            toast.error("Monthly quota exceeded (30 tasks). Please upgrade to Premium or use your own API keys.", {
              duration: 5000,
              action: {
                label: "Upgrade",
                onClick: () => navigate("/settings")
              }
            });
            setIsLaunching(false);
            return;
          }
          throw err;
        }

        // All authenticated users use unified execution path
        executorService.start(tier);

        toast.success(`Successfully launched campaign with ${allTasksToInsert.length} pipelines`);
      } else {
        // TSV Mode (Legacy / Standard) - We should also update this to follow the new semantics
        const dataToProcess = syllabusData.length > 0 ? syllabusData : [{
          lessonId: `manual-${Date.now()}`,
          lessonTitle: 'Manual Execution',
          objective: 'Manual Run',
          resources: [],
          duration: 'N/A',
          difficulty: 'N/A'
        } as SyllabusRow];

        const launchId = crypto.randomUUID();
        const config = configs?.find(c => c.id === selectedConfigId);

        for (let i = 0; i < dataToProcess.length; i++) {
          const row = dataToProcess[i];

          // Note: createExecutionMutation creates a lab_execution record.
          // We should ideally create a task_batch here too if we want it in Monitor.
          // For now, let's keep legacy standard as is or unify?
          // Map each CSV/TSV row to its own batch, mirroring JSON behavior
          // So let's unify it!

          const execution = await createExecutionMutation.mutateAsync({
            configId: selectedConfigId!,
            syllabusRow: row,
            tier
          });

          // All authenticated users use unified execution path
          executorService.start(tier);
        }
        toast.success(`Successfully launched ${dataToProcess.length} execution(s)`);
      }

      navigate('/monitor');
    } catch (error) {
      console.error('Launch failed', error);
      toast.error('Failed to launch. Check console.');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success to-primary flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Execution Launcher</h1>
            <p className="text-muted-foreground">Launch batch executions from input data</p>
          </div>
        </motion.div>

        {/* Step 1: Select Config */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <CardTitle>Select Orchestrator Configuration</CardTitle>
                  <CardDescription>Choose a saved configuration to use</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingConfigs ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search configurations..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {configs
                      ?.filter(config =>
                        !searchTerm ||
                        config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        config.description?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((config, idx) => (
                        <motion.div
                          key={config.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.1 }}
                          onClick={() => setSelectedConfigId(config.id)}
                          className={`group p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedConfigId === config.id
                            ? 'border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]'
                            : 'border-transparent bg-muted/50 hover:border-primary/30 hover:bg-muted/80'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {selectedConfigId === config.id ? (
                                <CheckCircle2 className="w-5 h-5 text-white animate-in zoom-in duration-300" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary/30" />
                              )}
                              <div>
                                <p className={`font-semibold ${selectedConfigId === config.id ? 'text-white' : ''}`}>{config.name}</p>
                                <p className={`text-sm ${selectedConfigId === config.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{config.description}</p>
                              </div>
                            </div>
                            <div className={`text-sm ${selectedConfigId === config.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {config.steps?.length || 0} steps
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    {(!configs || configs.length === 0) && (
                      <div className="text-center p-4 text-muted-foreground border border-dashed rounded-lg">
                        No configurations found. Please create one in Designer.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 2: Upload Input Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <CardTitle>Orchestrator Input Data</CardTitle>
                  <CardDescription>Upload TSV or JSON file containing input data</CardDescription>
                </div>
              </div>
              <div className="flex bg-muted p-1 rounded-lg self-start mt-2">
                <Button
                  variant={inputMode === 'tsv' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setInputMode('tsv')}
                  className="text-xs h-8 px-3"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                  TSV Mode
                </Button>
                <Button
                  variant={inputMode === 'json' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setInputMode('json')}
                  className="text-xs h-8 px-3"
                >
                  <FileJson className="w-3.5 h-3.5 mr-1.5" />
                  JSON Mode
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <input
                  type="file"
                  accept=".tsv,.txt,.csv,.json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  {isParsing ? (
                    <div className="flex flex-col items-center py-4">
                      <Loader2 className="w-10 h-10 mb-3 text-primary animate-spin" />
                      <p className="font-medium mb-1">Analyzing data...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-medium mb-1">Click to upload {inputMode.toUpperCase()} file</p>
                      <p className="text-sm text-muted-foreground">or drag and drop file here</p>
                    </>
                  )}
                </motion.div>
              </div>

              {fileName && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.1 }}
                  className="mt-4 p-4 rounded-lg bg-success/10 border border-success/20"
                >
                  <div className="flex items-center gap-3">
                    {inputMode === 'json' ? <FileJson className="w-5 h-5 text-success" /> : <FileSpreadsheet className="w-5 h-5 text-success" />}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {inputMode === 'json' ? `${jsonAnalysis?.sampleTasks?.length || 0} tasks` : `${syllabusData.length} rows`} detected
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setFileName(null); setSyllabusData([]); setJsonData(null); setJsonAnalysis(null); }}>Remove</Button>
                  </div>
                </motion.div>
              )}

              {inputMode === 'json' && jsonData && jsonAnalysis && (
                <div className="space-y-4">
                  <JsonInputSection
                    analysis={jsonAnalysis}
                    selection={fieldSelection}
                    mapping={fieldMapping}
                    onSelectionChange={setFieldSelection}
                    sampleJson={jsonData}
                    contract={rootStages[0]?.contract || null}
                    orchestrationMetadata={orchestrationMetadata}
                  />

                  {rootStages.length > 0 && !validation.isValid && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="text-sm font-semibold">Warning: Missing Required Information</AlertTitle>
                      <AlertDescription className="text-xs space-y-3">
                        {validation.problems.map((problem, i) => (
                          <div key={i} className="pb-2 border-b border-destructive/10 last:border-0 last:pb-0">
                            <p className="font-semibold text-destructive mb-1">Stage "{problem.stageName}":</p>
                            <p>Required fields:
                              <span className="font-mono ml-1 font-bold">
                                {problem.missing.map(m => `${problem.delimiters.start}${m}${problem.delimiters.end}`).join(', ')}
                              </span>
                            </p>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setIsMappingDialogOpen(true)}>
                            <LinkIcon className="w-3 h-3 mr-1" />
                            Manual Mapping
                          </Button>
                          <Link to={`/designer?configId=${selectedConfigId}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px]">
                              <Settings2 className="w-3 h-3 mr-1" />
                              Edit Stage Contract
                            </Button>
                          </Link>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {rootStages.length > 0 && validation.isValid && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-xs mt-4">
                      <CheckCircle2 className="w-4 h-4" />
                      Data matches initial stage contracts.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <FieldMappingDialog
          open={isMappingDialogOpen}
          onOpenChange={setIsMappingDialogOpen}
          contract={rootStages[0]?.contract || null}
          availableFields={jsonAnalysis ? [
            ...jsonAnalysis.sharedFields.map((f: FieldInfo) => f.path),
            ...jsonAnalysis.perTaskFields.map((f: FieldInfo) => f.path)
          ] : []}
          mapping={fieldMapping}
          onMappingChange={setFieldMapping}
          onConfirm={() => setIsMappingDialogOpen(false)}
        />

        {/* Step 3: Preview & Launch */}
        {selectedConfigId && (
          <motion.div
            id="step-3-preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className={inputMode === 'json' && validation.isValid ? 'border-primary shadow-lg transition-all' : ''}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <CardTitle>Preview & Launch</CardTitle>
                    <CardDescription>{syllabusData.length > 0 ? 'Preview data and launch batch execution' : 'Launch execution (Single Run)'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Data preview table (Only show if data exists) */}
                {inputMode === 'tsv' && syllabusData.length > 0 && (
                  <div className="rounded-lg border overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">Lesson ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syllabusData.map((row, idx) => (
                          <motion.tr
                            key={idx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="border-t hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 text-sm font-mono">{row.lessonId}</td>
                            <td className="px-4 py-3 text-sm">{row.lessonTitle}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground`}>
                                {row.difficulty}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {inputMode === 'json' && jsonData && jsonAnalysis && (
                  <TaskSelectionTable
                    tasks={jsonAnalysis.sampleTasks}
                    selectedIndices={selectedTaskIndices}
                    onSelectionChange={setSelectedTaskIndices}
                    selection={fieldSelection}
                    sampleJson={jsonData}
                    mapping={fieldMapping}
                    contract={rootStages[0]?.contract || null}
                  />
                )}

                {inputMode === 'tsv' && syllabusData.length === 0 && (
                  <div className="p-4 rounded-lg bg-muted/30 text-center text-muted-foreground text-sm">
                    No input data. A single test execution will be launched.
                  </div>
                )}

                {inputMode === 'json' && (!jsonData || selectedTaskIndices.length === 0) && (
                  <div className="p-4 rounded-lg bg-muted/30 text-center text-muted-foreground text-sm">
                    {!jsonData ? 'Please upload a JSON file in Step 2.' : 'Please select at least one task to launch.'}
                  </div>
                )}

                {/* Summary */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total {inputMode === 'json' ? 'tasks' : 'executions'}:</p>
                    <p className="text-2xl font-bold">
                      {inputMode === 'json' ? selectedTaskIndices.length : (syllabusData.length || 1)}
                    </p>
                  </div>
                  {(inputMode === 'json' ? selectedTaskIndices.length > 0 : syllabusData.length > 0) && (
                    <div className="space-y-1 text-right">
                      <p className="text-sm text-muted-foreground">Estimated time:</p>
                      <p className="text-2xl font-bold">~{(inputMode === 'json' ? selectedTaskIndices.length : syllabusData.length) * 5} minutes</p>
                    </div>
                  )}
                </div>

                {/* Launch button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg bg-gradient-to-r from-success to-primary text-white shadow-lg hover:shadow-glow transition-shadow"
                    onClick={handleLaunch}
                    disabled={isLaunching || !selectedConfigId || (inputMode === 'json' && (!jsonData || selectedTaskIndices.length === 0 || !validation.isValid))}
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-5 h-5 mr-2" />
                        Launch {inputMode === 'json' ? selectedTaskIndices.length : (syllabusData.length || 1)} Execution{(inputMode === 'json' ? selectedTaskIndices.length : (syllabusData.length || 1)) !== 1 ? 's' : ''}
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
