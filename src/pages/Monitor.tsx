import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ExternalLink, FileCode, FileText, Presentation, HelpCircle, HardDrive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StepBadge } from '@/components/common/StepBadge';
import { useExecutions, useExecution, useAiTasks } from '@/hooks/useExecutions';
import { useStepExecutions } from '@/hooks/useStepExecutions';
import { formatDistanceToNow, format } from 'date-fns';
import type { StepExecution, StepResult } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';

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
                <p className="font-semibold">{step.step_name} - {step.step_id}</p> {/* Using step_name for label if label not available in StepExecution type yet, or assuming config join */}
                <p className="text-xs text-muted-foreground">
                  {step.duration_ms ? `${(step.duration_ms / 1000).toFixed(1)}s` :
                    step.status === 'running' ? 'Đang xử lý...' : 'Chờ xử lý'}
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
function ExecutionDetailPanel({ executionData }: { executionData: any }) {
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
              {isAiTask ? displayData.task_type : displayData.syllabus_row.lessonTitle}
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
          {isAiTask && displayData.batch_id && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Batch: {displayData.batch_id.slice(0, 8)}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1 px-2 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => window.open(`/batch/${displayData.batch_id}`, '_blank')}
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
                  {JSON.stringify(displayData.input_data, null, 2)}
                </pre>
              </div>
              {displayData.output_data && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Output Data</p>
                  <pre className="text-xs bg-success/5 border border-success/20 p-3 rounded-lg overflow-auto max-h-60">
                    {JSON.stringify(displayData.output_data, null, 2)}
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
  const { data: executions, isLoading: isLoadingExec } = useExecutions();
  const { data: aiTasks, isLoading: isLoadingAi } = useAiTasks();
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  // Unified list
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
        ...task // spread for detail panel
      }))
    ];
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [executions, aiTasks]);

  // Auto-select first if none selected
  if (!selectedExecutionId && unifiedList.length > 0 && !isLoadingExec && !isLoadingAi) {
    setSelectedExecutionId(unifiedList[0].id);
  }

  const selectedExecution = unifiedList.find(e => e.id === selectedExecutionId);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Sidebar - Execution List */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 border-r bg-muted/20 flex flex-col"
      >
        <div className="p-4 border-b bg-background/95 backdrop-blur z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Executions</h2>
          </div>
        </div>

        <div className="overflow-y-auto p-3 space-y-2 flex-1">
          {(isLoadingExec || isLoadingAi) ? (
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
                  <StatusBadge status={(execution.status as any) || 'pending'} size="sm" showIcon={false} />
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
                {/* Progress bar */}
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(execution.completed_steps / (execution.total_steps || 1)) * 100}%` }}
                    className={cn(
                      "h-full rounded-full",
                      execution.status === 'completed' ? 'bg-success' :
                        execution.status === 'failed' ? 'bg-destructive' :
                          execution.status === 'running' ? 'bg-primary' : 'bg-muted-foreground'
                    )}
                  />
                </div>
              </motion.div>
            )))}
        </div>
      </motion.div>

      {/* Main Content - Execution Detail */}
      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {selectedExecution ? (
            <ExecutionDetailPanel executionData={selectedExecution} />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center text-muted-foreground"
            >
              <div className="text-center">
                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chọn một execution để xem chi tiết</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
