import { useParams, useNavigate } from 'react-router-dom';
import { useBatchProgress } from '@/hooks/useBatchProgress';
import { BatchProgressCard } from '@/components/batch/BatchProgressCard';
import { TaskHierarchyTree } from '@/components/batch/TaskHierarchyTree';
import { Button } from '@/components/ui/button';
import { ChevronLeft, RefreshCcw, LayoutDashboard, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { getBatchTasks, TaskSummary } from '@/services/executionTrackingService';

export function BatchProgress() {
    const { batchId } = useParams<{ batchId: string }>();
    const navigate = useNavigate();
    const { data: progress, loading, refresh } = useBatchProgress(batchId);
    const [tasks, setTasks] = useState<TaskSummary[]>([]);
    const [tasksLoading, setTasksLoading] = useState(true);

    const fetchTasks = async () => {
        if (!batchId) return;
        setTasksLoading(true);
        try {
            const data = await getBatchTasks(batchId);
            setTasks(data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setTasksLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        // Also re-fetch tasks when progress updates (e.g. from hook)
        const interval = setInterval(fetchTasks, 5000);
        return () => clearInterval(interval);
    }, [batchId]);

    if (loading && !progress) {
        return (
            <div className="container py-8 space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-10 w-[100px]" />
                </div>
                <Skeleton className="h-[250px] w-full rounded-2xl" />
                <Skeleton className="h-[400px] w-full rounded-2xl" />
            </div>
        );
    }

    if (!progress && !loading) {
        return (
            <div className="container py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 rounded-full bg-destructive/10 text-destructive">
                    <Activity className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Batch Not Found</h2>
                <p className="text-muted-foreground max-w-[400px]">
                    The batch ID you're looking for might be incorrect or doesn't exist in our records.
                </p>
                <Button onClick={() => navigate('/monitor')} variant="outline" className="mt-4">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Monitor
                </Button>
            </div>
        );
    }

    return (
        <div className="container py-8 space-y-8 min-h-screen pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/monitor')}
                        className="rounded-full hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                            Execution Dashboard
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-1.5 pt-1">
                            <LayoutDashboard className="w-4 h-4" />
                            Monitoring overall progress and task relationships
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl border-primary/20 hover:bg-primary/5"
                        onClick={() => {
                            refresh();
                            fetchTasks();
                        }}
                    >
                        <RefreshCcw className={`w-4 h-4 mr-2 ${loading || tasksLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Hero Stats */}
            {progress && <BatchProgressCard progress={progress} />}

            {/* Task List / Tree */}
            <div className="space-y-4">
                <TaskHierarchyTree tasks={tasks} />
            </div>

            {/* Help / Tip */}
            <div className="rounded-xl border border-dashed p-6 bg-muted/30">
                <div className="flex gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary h-fit">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-semibold text-sm">Real-time Sync Active</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            This dashboard is connected to Supabase Realtime. New tasks and status changes will appear
                            automatically as the orchestrator processes the workload. You can manually refresh if needed.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
