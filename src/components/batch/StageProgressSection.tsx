import { ExecutionProgress, StageProgress } from "@/services/executionTrackingService";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDashed, PlayCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StageProgressSectionProps {
    progress: ExecutionProgress;
    onStageClick?: (stageKey: string) => void;
}

export function StageProgressSection({ progress, onStageClick }: StageProgressSectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progress.stages.map((stage) => (
                <StageMiniCard
                    key={stage.stage_key}
                    stage={stage}
                    onClick={() => onStageClick?.(stage.stage_key)}
                />
            ))}
        </div>
    );
}

function StageMiniCard({ stage, onClick }: { stage: StageProgress; onClick?: () => void }) {
    const isCompleted = stage.progress_percentage === 100;
    const isRunning = stage.running_tasks > 0;
    const isFailed = stage.failed_tasks > 0;

    return (
        <div
            onClick={onClick}
            className={cn(
                "group p-4 rounded-xl border bg-card/40 backdrop-blur-sm transition-all duration-200 cursor-pointer hover:shadow-md",
                isCompleted ? "border-emerald-500/20 hover:border-emerald-500/40" :
                    isRunning ? "border-blue-500/20 hover:border-blue-500/40" :
                        isFailed ? "border-rose-500/20 hover:border-rose-500/40" :
                            "border-primary/5 hover:border-primary/20"
            )}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-1.5 rounded-lg",
                        isCompleted ? "bg-emerald-500/10 text-emerald-500" :
                            isRunning ? "bg-blue-500/10 text-blue-500" :
                                isFailed ? "bg-rose-500/10 text-rose-500" :
                                    "bg-muted text-muted-foreground"
                    )}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> :
                            isRunning ? <PlayCircle className="w-4 h-4 animate-pulse" /> :
                                isFailed ? <XCircle className="w-4 h-4" /> :
                                    <CircleDashed className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-semibold truncate max-w-[120px]">{stage.stage_key}</span>
                </div>
                <span className={cn(
                    "text-xs font-bold",
                    isCompleted ? "text-emerald-500" :
                        isRunning ? "text-blue-500" :
                            isFailed ? "text-rose-500" :
                                "text-muted-foreground"
                )}>
                    {stage.progress_percentage}%
                </span>
            </div>

            <Progress value={stage.progress_percentage} className="h-1.5 mb-3" />

            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                <div className="flex gap-3">
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {stage.completed_tasks} done
                    </span>
                    {stage.running_tasks > 0 && (
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {stage.running_tasks} active
                        </span>
                    )}
                    {stage.failed_tasks > 0 && (
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {stage.failed_tasks} failed
                        </span>
                    )}
                </div>
                <span>Total: {stage.total_tasks}</span>
            </div>
        </div>
    );
}
