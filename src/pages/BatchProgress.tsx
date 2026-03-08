import { useParams, useNavigate } from 'react-router-dom';
import { useBatchProgress } from '@/hooks/useBatchProgress';
import { BatchProgressCard } from '@/components/batch/BatchProgressCard';
import { TaskHierarchyTree } from '@/components/batch/TaskHierarchyTree';
import { Button } from '@/components/ui/button';
import { ChevronLeft, RefreshCcw, LayoutDashboard, Activity, Download, RotateCcw, Trash2, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { getBatchTasks, TaskSummary } from '@/services/executionTrackingService';
import { StageProgressSection } from '@/components/batch/StageProgressSection';
import { taskActionService } from '@/services/taskActionService';
import { toast } from 'sonner';
import { exportToCsv, exportToTsv, copyToTsvClipboard } from '@/lib/csvExport';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

    const handleDeleteBatch = async () => {
        if (!batchId) return;
        if (window.confirm('Are you sure you want to delete this batch and all its tasks? This action cannot be undone.')) {
            try {
                await taskActionService.deleteBatch(batchId);
                toast.success('Batch deleted successfully');
                navigate('/monitor');
            } catch (error) {
                toast.error('Failed to delete batch');
            }
        }
    };

    const getExportData = () => {
        const exportData: Record<string, unknown>[] = [];
        tasks.forEach(t => {
            if (t.status === 'completed' && t.output_data) {
                if (Array.isArray(t.output_data)) {
                    exportData.push(...t.output_data as Record<string, unknown>[]);
                } else {
                    exportData.push(t.output_data as Record<string, unknown>);
                }
            }
        });

        if (exportData.length === 0) {
            toast.info('No completed tasks with data to export');
            return null;
        }
        return exportData;
    };

    const handleExportCsv = () => {
        const data = getExportData();
        if (data) exportToCsv(data, `batch_${batchId}_all_completed.csv`);
    };

    const handleExportTsv = () => {
        const data = getExportData();
        if (data) exportToTsv(data, `batch_${batchId}_all_completed.tsv`);
    };

    const handleCopyTsv = async () => {
        const data = getExportData();
        if (data) {
            const success = await copyToTsvClipboard(data);
            if (success) {
                toast.success('Copied to clipboard (Ready for Google Sheets)');
            } else {
                toast.error('Failed to copy to clipboard');
            }
        }
    };

    const handleRetryAllFailed = async () => {
        if (!batchId) return;
        const failedCount = tasks.filter(t => t.status === 'failed').length;
        if (failedCount === 0) {
            toast.info('No failed tasks to retry');
            return;
        }

        if (window.confirm(`Are you sure you want to retry ${failedCount} failed task(s)?`)) {
            try {
                await taskActionService.retryAllFailedInBatch(batchId);
                toast.success(`Successfully queued ${failedCount} task(s) for retry`);
                fetchTasks();
                refresh();
            } catch (error) {
                toast.error('Failed to retry tasks');
            }
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export All
                                <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl font-medium">
                            <DropdownMenuItem onClick={handleCopyTsv}>
                                Copy as TSV (Google Sheets)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportTsv}>
                                Download TSV File
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportCsv}>
                                Download CSV File
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="outline"
                        className="rounded-xl border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                        onClick={handleRetryAllFailed}
                        disabled={!tasks.some(t => t.status === 'failed')}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Retry Failed
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10"
                        onClick={handleDeleteBatch}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </Button>
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

            {/* Stage Progress Section */}
            {progress && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Stage Breakdown</h3>
                    </div>
                    <StageProgressSection progress={progress} />
                </div>
            )}

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
