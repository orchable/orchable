import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';

interface StartNodeProps {
    data: any;
    selected: boolean;
}

export function StartNode({ selected }: StartNodeProps) {
    return (
        <div className="relative group">
            <div className={cn(
                "h-12 px-5 rounded-full flex items-center gap-3 transition-all cursor-pointer shadow-sm relative z-20",
                "border-2",
                // Configured/Flat look
                selected
                    ? "bg-emerald-500/20 border-emerald-500 shadow-md shadow-emerald-500/10 scale-105"
                    : "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/60 hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10"
            )}>
                <Play className={cn(
                    "w-5 h-5 shrink-0 transition-colors",
                    selected ? "text-emerald-500 fill-emerald-500" : "text-emerald-600 fill-emerald-600 dark:text-emerald-500 dark:fill-emerald-500"
                )} />
                <span className={cn(
                    "text-sm font-bold whitespace-nowrap pr-1 transition-colors",
                    selected ? "text-emerald-600" : "text-emerald-700 dark:text-emerald-400"
                )}>
                    Tasklist Input
                </span>

                {/* Visual Handle Dot (Matches StepNode style) */}
                <div className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background transition-colors z-30",
                    selected ? "border-emerald-300" : "border-emerald-500/70 group-hover:border-emerald-400"
                )} />
            </div>

            {/* Actual ReactFlow Handle (Invisible, larger hit area) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-full h-10 !bg-transparent !border-none !bottom-[-12px] !left-0 !translate-x-0 cursor-crosshair z-50"
            />
        </div>
    );
}
