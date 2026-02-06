import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    ChevronDown,
    ChevronUp,
    AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getExecutionProgress,
    getExecutionTasks,
    subscribeToExecutionUpdates,
    type ExecutionProgress,
    type StageProgress,
    type TaskSummary
} from '@/services/executionTrackingService';

interface ExecutionMonitorProps {
    orchestratorExecutionId: string;
    onClose?: () => void;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
        completed: { variant: 'default', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Completed' },
        failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, label: 'Failed' },
        running: { variant: 'secondary', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Running' },
        processing: { variant: 'secondary', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Processing' },
        pending: { variant: 'outline', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
        awaiting_approval: { variant: 'outline', icon: <Clock className="w-3 h-3" />, label: 'Awaiting Approval' }
    };

    const { variant, icon, label } = config[status] || config.pending;

    return (
        <Badge variant={variant} className="gap-1 text-xs">
            {icon}
            {label}
        </Badge>
    );
}

// Stage progress card
function StageCard({ stage, isExpanded, onToggle }: {
    stage: StageProgress;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const hasErrors = stage.failed_tasks > 0;
    const isComplete = stage.progress_percentage === 100;
    const isRunning = stage.running_tasks > 0;

    return (
        <Card className={cn(
            "transition-all",
            isComplete && "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20",
            hasErrors && "border-destructive/50 bg-destructive/5",
            isRunning && "border-primary/50"
        )}>
            <CardHeader className="py-3 px-4 cursor-pointer" onClick={onToggle}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{stage.stage_key}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                            Stage {stage.stage_number}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {stage.completed_tasks}/{stage.total_tasks}
                        </span>
                        <span className="text-sm font-medium w-12 text-right">
                            {stage.progress_percentage}%
                        </span>
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                    </div>
                </div>
                <Progress
                    value={stage.progress_percentage}
                    className={cn(
                        "h-2 mt-2",
                        hasErrors && "[&>div]:bg-destructive",
                        isComplete && "[&>div]:bg-emerald-500"
                    )}
                />
            </CardHeader>

            {isExpanded && (
                <CardContent className="pt-0 pb-3 px-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>{stage.completed_tasks} completed</span>
                        </div>
                        {stage.running_tasks > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                <span>{stage.running_tasks} running</span>
                            </div>
                        )}
                        {stage.pending_tasks > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{stage.pending_tasks} pending</span>
                            </div>
                        )}
                        {stage.failed_tasks > 0 && (
                            <div className="flex items-center gap-1 text-destructive">
                                <XCircle className="w-3 h-3" />
                                <span>{stage.failed_tasks} failed</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

export function ExecutionMonitor({ orchestratorExecutionId, onClose }: ExecutionMonitorProps) {
    const [progress, setProgress] = useState<ExecutionProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchProgress = useCallback(async () => {
        const data = await getExecutionProgress(orchestratorExecutionId);
        setProgress(data);
        setLoading(false);
    }, [orchestratorExecutionId]);

    // Initial fetch and real-time subscription
    useEffect(() => {
        fetchProgress();

        // Subscribe to real-time updates
        const unsubscribe = subscribeToExecutionUpdates(orchestratorExecutionId, () => {
            if (autoRefresh) {
                fetchProgress();
            }
        });

        return () => {
            unsubscribe();
        };
    }, [orchestratorExecutionId, fetchProgress, autoRefresh]);

    // Auto-refresh polling as fallback
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(fetchProgress, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchProgress]);

    const toggleStage = (stageKey: string) => {
        setExpandedStages(prev => {
            const next = new Set(prev);
            if (next.has(stageKey)) {
                next.delete(stageKey);
            } else {
                next.add(stageKey);
            }
            return next;
        });
    };

    if (loading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!progress) {
        return (
            <Card className="w-full">
                <CardContent className="py-8 text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Failed to load execution progress</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={fetchProgress}>
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const isRunning = progress.status === 'running' || progress.status === 'processing';
    const isCompleted = progress.status === 'completed';
    const duration = progress.started_at
        ? Math.round((new Date(progress.completed_at || Date.now()).getTime() - new Date(progress.started_at).getTime()) / 1000)
        : 0;

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">{progress.orchestrator_name}</CardTitle>
                        <CardDescription className="mt-1">
                            Execution ID: {orchestratorExecutionId.slice(0, 8)}...
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={progress.status} />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchProgress}
                            disabled={loading}
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Overall Progress */}
                <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className="font-medium">{progress.overall_progress}%</span>
                    </div>
                    <Progress
                        value={progress.overall_progress}
                        className={cn(
                            "h-3",
                            isCompleted && "[&>div]:bg-emerald-500"
                        )}
                    />
                </div>

                {/* Stats */}
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <span>{progress.total_stages} stages</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{duration > 0 ? `${duration}s elapsed` : 'Starting...'}</span>
                </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-4">
                <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                        {progress.stages.map(stage => (
                            <StageCard
                                key={stage.stage_key}
                                stage={stage}
                                isExpanded={expandedStages.has(stage.stage_key)}
                                onToggle={() => toggleStage(stage.stage_key)}
                            />
                        ))}
                    </div>

                    {progress.stages.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Clock className="w-8 h-8 mx-auto mb-2" />
                            <p>No tasks yet. Waiting for execution to start...</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
