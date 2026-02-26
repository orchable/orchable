import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ExternalLink, FileCode, FileText, Presentation, HelpCircle, HardDrive, LayoutDashboard, List, Box } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StepBadge } from '@/components/common/StepBadge';
import { useExecutions, useExecution, useAiTasks } from '@/hooks/useExecutions';
import { useStepExecutions } from '@/hooks/useStepExecutions';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Execution,
  StepExecution,
  StepResult,
  ExecutionStatus
} from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';
import { getRecentBatches, BatchSummary } from '@/services/executionTrackingService';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, MoreVertical } from "lucide-react";
import { taskActionService } from '@/services/taskActionService';
import { toast } from 'sonner';
import { useTier } from '@/hooks/useTier';
import { Cloud, CloudOff, Info } from 'lucide-react';

// Subcomponent: Result Viewer
function ResultViewer({ result }: { result: StepResult }) {
  return (
    <div className="space-y-3">
      {result.summary && (
        <div className="p-3 rounded-lg bg-info/10 border border-info/20">
          <p className="text-sm">{result.summary}</p>
        </div>
      )}

      {result.outputFiles && result.outputFiles.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Output Files</p>
          <div className="space-y-2">
            {result.outputFiles.map((file, idx) => (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-background">
                    {file.type.includes('code') ? <FileCode className="w-4 h-4 text-orange-500" /> :
                      file.type.includes('pdf') ? <FileText className="w-4 h-4 text-red-500" /> :
                        file.type.includes('slide') ? <Presentation className="w-4 h-4 text-yellow-500" /> :
                          <HardDrive className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Step Monitor Item
function StepMonitorItem({ step, index, expanded, onToggle }: { step: StepExecution, index: number, expanded: boolean, onToggle: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative flex gap-4"
    >
      {/* Circle indicator */}
      <div className={cn(
        "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2",
        step.status === 'completed' ? 'bg-success border-success text-white' :
          step.status === 'running' ? 'bg-info border-info text-white animate-pulse' :
            step.status === 'failed' ? 'bg-destructive border-destructive text-white' :
              'bg-background border-muted text-muted-foreground'
      )}>
        {step.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
        {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
        {step.status === 'failed' && <XCircle className="w-4 h-4" />}
        {step.status === 'pending' && <Clock className="w-4 h-4" />}
      </div>

      {/* Content */}
      <Card
        className={cn(
          "flex-1 cursor-pointer transition-all hover:shadow-md",
          expanded ? 'ring-2 ring-primary/30 shadow-lg' : ''
        )}
        onClick={onToggle}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StepBadge name={step.step_name} size="sm" />
              <div>
                <p className="font-semibold">{step.step_name} - {step.step_id}</p>
                <p className="text-xs text-muted-foreground">
                  {step.duration_ms ? `${(step.duration_ms / 1000).toFixed(1)}s` :
                    step.status === 'running' ? 'Processing...' : 'Pending'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={step.status} size="sm" showIcon={false} />
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                expanded ? 'rotate-180' : ''
              )} />
            </div>
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t"
              >
                {step.result ? (
                  <ResultViewer result={step.result} />
                ) : step.error_message ? (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    Error: {step.error_message}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No output data available yet.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Side Panel: Execution Detail
// Side Panel: Execution Detail
function ExecutionDetailPanel({ executionData }: { executionData: Record<string, any> }) {
  const isAiTask = executionData.task_type !== undefined;

  // Only query standard execution details if NOT an AI task
  const { data: execution } = useExecution(executionData.id, isAiTask ? null : 3000);
  const { data: steps } = useStepExecutions(executionData.id, isAiTask ? null : 3000);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const displayData = isAiTask ? executionData : (execution || executionData);
  if (!displayData) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <motion.div
      key={displayData.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 pb-20"
    >
      {/* Header */}
      <div className="mb-6 sticky top-0 bg-background/95 backdrop-blur z-20 pb-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold truncate max-w-lg">
              {isAiTask ? (displayData as any).task_type : (displayData as any).syllabus_row.lessonTitle}
            </h1>
            <StatusBadge status={displayData.status} size="lg" />
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="font-mono bg-muted px-2 py-1 rounded text-xs">ID: {displayData.id.slice(0, 8)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Created: {format(new Date(displayData.created_at), 'Pp')}
          </span>
          {isAiTask && (displayData as any).batch_id && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Batch: {(displayData as any).batch_id.slice(0, 8)}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1 px-2 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => window.open(`/batch/${(displayData as any).batch_id}`, '_blank')}
              >
                <Activity className="w-3 h-3" />
                View Batch Progress
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Basic Data Viewer for AI Tasks */}
      {isAiTask ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Input Data</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
                  {JSON.stringify((displayData as any).input_data || (displayData as any).syllabus_row, null, 2)}
                </pre>
              </div>
              {(displayData as any).output_data && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Output Data</p>
                  <pre className="text-xs bg-success/5 border border-success/20 p-3 rounded-lg overflow-auto max-h-60">
                    {JSON.stringify((displayData as any).output_data, null, 2)}
                  </pre>
                </div>
              )}
              {displayData.error_message && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  Error: {displayData.error_message}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Timeline for legacy executions */
        <div className="mb-8">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Execution Timeline
          </h2>

          <div className="relative pl-4">
            {/* Vertical line connecting steps */}
            <div className="absolute left-[2.4rem] top-4 bottom-10 w-0.5 bg-border z-0" />

            <div className="space-y-6">
              {steps?.map((step, idx) => (
                <StepMonitorItem
                  key={step.id}
                  step={step}
                  index={idx}
                  expanded={expandedStep === step.id}
                  onToggle={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function MonitorPage() {
  const navigate = useNavigate();
  const { tier, isSyncing, usage, limits } = useTier();
  const { data: executions, isLoading: isLoadingExec } = useExecutions();
  const { data: aiTasks, isLoading: isLoadingAi } = useAiTasks();

  const [viewMode, setViewMode] = useState<'batches' | 'executions'>('batches');
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  const handleDeleteBatch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this batch and all its tasks? This action cannot be undone.')) {
      try {
        await taskActionService.deleteBatch(id);
        toast.success('Batch deleted successfully');
        fetchBatches();
      } catch (error) {
        toast.error('Failed to delete batch');
      }
    }
  };

  const fetchBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const data = await getRecentBatches(40);
      setBatches(data);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'batches') {
      fetchBatches();
      const interval = setInterval(fetchBatches, 10000);
      return () => clearInterval(interval);
    }
  }, [viewMode]);

  const unifiedList = useMemo(() => {
    const list = [
      ...(executions || []),
      ...(aiTasks || []).map(task => ({
        id: task.id,
        status: task.status,
        created_at: task.created_at,
        syllabus_row: {
          lessonId: (task.extra?.launcher_metadata?.original_index !== undefined) ? `JSON #${task.extra.launcher_metadata.original_index + 1}` : 'AI',
          lessonTitle: task.task_type || 'AI Task',
        },
        total_steps: 1,
        completed_steps: task.status === 'completed' ? 1 : 0,
        ...task
      }))
    ];
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [executions, aiTasks]);

  useEffect(() => {
    if (viewMode === 'executions' && !selectedExecutionId && unifiedList.length > 0 && !isLoadingExec && !isLoadingAi) {
      setSelectedExecutionId(unifiedList[0].id);
    }
  }, [viewMode, selectedExecutionId, unifiedList, isLoadingExec, isLoadingAi]);

  const selectedExecution = unifiedList.find(e => e.id === selectedExecutionId);

  // Group batches by launch_id (Campaign mode)
  const campaigns = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      status: string;
      created_at: string;
      task_count: number;
      completed_tasks: number;
      failed_tasks: number;
      batch_count: number;
      is_campaign: boolean;
    }>();

    batches.forEach(batch => {
      const key = batch.launch_id || batch.id;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: batch.launch_id ? batch.orchestrator_name.split(' - Item')[0] : batch.orchestrator_name,
          status: batch.status,
          created_at: batch.created_at,
          task_count: 0,
          completed_tasks: 0,
          failed_tasks: 0,
          batch_count: 0,
          is_campaign: !!batch.launch_id
        });
      }

      const campaign = map.get(key)!;
      campaign.task_count += batch.task_count;
      campaign.completed_tasks += batch.completed_tasks;
      campaign.failed_tasks += batch.failed_tasks;
      campaign.batch_count += 1;

      // Update status based on batch health
      // Priority: processing > failed > completed > pending
      if (batch.status === 'processing' || batch.status === 'running') {
        campaign.status = 'processing';
      } else if (batch.status === 'failed' && campaign.status !== 'processing') {
        campaign.status = 'failed';
      } else if (batch.status === 'completed' && campaign.status === 'pending') {
        // If it was pending but at least one batch is done, it's processing or completed
        campaign.status = (campaign.completed_tasks + campaign.failed_tasks >= campaign.task_count) ? 'completed' : 'processing';
      }

      if (batch.created_at < campaign.created_at) {
        campaign.created_at = batch.created_at;
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [batches]);

  return (
    <div className="h-full flex overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 border-r bg-muted/20 flex flex-col"
      >
        <div className="p-4 border-b bg-background/95 backdrop-blur z-10 flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-sm">Monitoring</h2>
            </div>
            {viewMode === 'batches' && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchBatches} disabled={isLoadingBatches}>
                <Loader2 className={cn("w-4 h-4", isLoadingBatches && "animate-spin")} />
              </Button>
            )}
          </div>

          <div className="flex p-1 bg-muted rounded-lg">
            <button
              onClick={() => setViewMode('batches')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all",
                viewMode === 'batches' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Campaigns
            </button>
            <button
              onClick={() => setViewMode('executions')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all",
                viewMode === 'executions' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-3.5 h-3.5" />
              Raw Tasks
            </button>
          </div>

          {usage && (
            <div className="px-3 py-1.5 rounded-full bg-muted/50 border border-border flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-medium whitespace-nowrap">
                {usage.count} / {limits.tasks === Infinity ? '∞' : limits.tasks} tasks this month
              </span>
            </div>
          )}
        </div>


        {isSyncing && (
          <div className="mx-4 mt-2 mb-4 p-3 rounded-xl bg-info/10 border border-info/20 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-4 h-4 text-info animate-spin" />
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-info">Cloud Syncing...</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                Migrating local data to your account.
              </p>
            </div>
          </div>
        )}

        <div className="overflow-y-auto p-3 space-y-2 flex-1">
          {viewMode === 'batches' ? (
            isLoadingBatches ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : campaigns.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Box className="w-8 h-8 opacity-20" />
                No campaigns found.
              </div>
            ) : (
              campaigns.map((camp, idx) => (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => navigate(`/batch/${camp.id}`)}
                  className="p-3 rounded-lg cursor-pointer transition-all border bg-card border-transparent hover:border-primary/30 hover:shadow-md group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {camp.is_campaign ? (
                        <Activity className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary transition-colors" />
                      ) : (
                        <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground/50 transition-colors" />
                      )}
                      <span className="font-mono text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded opacity-70">
                        {camp.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={camp.status as ExecutionStatus} size="sm" showIcon={false} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                            onClick={(e) => handleDeleteBatch(e, camp.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Batch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-sm font-semibold truncate mb-1">
                    {camp.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                    <span>
                      {camp.is_campaign ? `${camp.batch_count} Pipelines` : `${camp.task_count} Tasks`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(camp.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <Progress
                    value={camp.task_count > 0 ? Math.round((camp.completed_tasks / camp.task_count) * 100) : 0}
                    className="h-1"
                  />
                </motion.div>
              ))
            )
          ) : (
            (isLoadingExec || isLoadingAi) ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : unifiedList?.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">No executions found.</div>
            ) : (
              unifiedList?.map((execution, idx) => (
                <motion.div
                  key={execution.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedExecutionId(execution.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all border",
                    selectedExecutionId === execution.id
                      ? 'bg-primary/10 border-primary/30 shadow-sm'
                      : 'bg-card border-transparent hover:border-border hover:shadow-sm'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-medium bg-muted px-1.5 py-0.5 rounded opacity-70">
                      {execution.syllabus_row?.lessonId || execution.task_type || 'Task'}
                    </span>
                    <StatusBadge status={(execution.status as ExecutionStatus) || 'pending'} size="sm" showIcon={false} />
                  </div>
                  <p className="text-sm font-medium truncate mb-2">
                    {execution.syllabus_row?.lessonTitle || execution.task_type || 'Unknown AI Task'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{execution.completed_steps || 0}/{execution.total_steps || 1} steps</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(execution.created_at || new Date()), { addSuffix: true })}
                    </span>
                  </div>
                </motion.div>
              ))
            )
          )}
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {viewMode === 'batches' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center text-muted-foreground p-12"
            >
              <div className="text-center max-w-sm space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Campaign Monitoring</h3>
                <p className="text-sm">
                  Below is a list of campaign executions. Each campaign includes one or more pipelines for each row of data.
                </p>
                <div className="p-4 bg-muted/50 rounded-xl border border-dashed text-xs italic">
                  Click on a campaign to view the detailed progress of all internal pipelines.
                </div>
              </div>
            </motion.div>
          ) : selectedExecution ? (
            <ExecutionDetailPanel executionData={selectedExecution} />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center text-muted-foreground"
            >
              <div className="text-center">
                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select an execution to view details</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
