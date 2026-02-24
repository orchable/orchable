import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, PlayCircle, XCircle } from "lucide-react";
import { ExecutionProgress } from "@/services/executionTrackingService";
import { cn } from "@/lib/utils";

interface BatchProgressCardProps {
    progress: ExecutionProgress;
    className?: string;
}

export function BatchProgressCard({ progress, className }: BatchProgressCardProps) {
    // Aggregate stats from stages if needed, or use overall_progress directly
    const totalTasks = progress.stages.reduce((sum, s) => sum + s.total_tasks, 0);
    const completedTasks = progress.stages.reduce((sum, s) => sum + s.completed_tasks, 0);
    const failedTasks = progress.stages.reduce((sum, s) => sum + s.failed_tasks, 0);
    const processingTasks = progress.stages.reduce((sum, s) => sum + s.running_tasks, 0);
    const pendingTasks = progress.stages.reduce((sum, s) => sum + s.pending_tasks, 0);

    return (
        <Card className={cn("overflow-hidden border-primary/10 shadow-lg", className)}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-bold">{progress.orchestrator_name}</CardTitle>
                            {progress.config_name && progress.config_name !== progress.orchestrator_name && (
                                <Badge variant="outline" className="text-[10px] h-5 bg-primary/5 text-primary border-primary/20">
                                    {progress.config_name}
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="font-mono text-xs">
                            Batch ID: {progress.orchestrator_execution_id}
                        </CardDescription>
                    </div>
                    <Badge
                        variant={progress.status === 'completed' ? 'default' : progress.status === 'failed' ? 'destructive' : 'secondary'}
                        className="capitalize"
                    >
                        {progress.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-muted-foreground">Overall Completion</span>
                        <span className="font-bold text-primary">{progress.overall_progress}%</span>
                    </div>
                    <Progress value={progress.overall_progress} className="h-2.5" />
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatusItem
                        icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        label="Completed"
                        value={completedTasks}
                        total={totalTasks}
                        color="emerald"
                    />
                    <StatusItem
                        icon={<PlayCircle className="w-4 h-4 text-blue-500 animate-pulse" />}
                        label="Running"
                        value={processingTasks}
                        total={totalTasks}
                        color="blue"
                    />
                    <StatusItem
                        icon={<Clock className="w-4 h-4 text-amber-500" />}
                        label="Pending"
                        value={pendingTasks}
                        total={totalTasks}
                        color="amber"
                    />
                    <StatusItem
                        icon={<XCircle className="w-4 h-4 text-rose-500" />}
                        label="Failed"
                        value={failedTasks}
                        total={totalTasks}
                        color="rose"
                    />
                </div>

                {/* Timeline Info */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground border-t border-primary/5">
                    {progress.started_at && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Started: {new Date(progress.started_at).toLocaleString()}</span>
                        </div>
                    )}
                    {progress.completed_at && (
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Finished: {new Date(progress.completed_at).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function StatusItem({
    icon,
    label,
    value,
    total,
    color
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    total: number;
    color: 'emerald' | 'blue' | 'amber' | 'rose';
}) {
    const colorClasses = {
        emerald: "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20",
        blue: "bg-blue-500/5 border-blue-500/10 hover:border-blue-500/20",
        amber: "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/20",
        rose: "bg-rose-500/5 border-rose-500/10 hover:border-rose-500/20"
    };

    return (
        <div className={cn(
            "p-3 rounded-xl border transition-all duration-200",
            colorClasses[color]
        )}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">{value}</span>
                <span className="text-xs text-muted-foreground">/ {total}</span>
            </div>
        </div>
    );
}
