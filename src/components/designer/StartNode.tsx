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
                "w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm relative z-20",
                "bg-emerald-600 border-2",
                selected
                    ? "border-emerald-300 shadow-lg shadow-emerald-500/40 scale-110"
                    : "border-emerald-500 hover:border-emerald-400 hover:shadow-emerald-500/20"
            )}>
                <Play className="w-6 h-6 text-white ml-1 fill-white" />

                {/* Visual Handle Dot (Matches StepNode style) */}
                <div className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background transition-colors z-30",
                    selected ? "border-emerald-300" : "border-emerald-500/70 group-hover:border-emerald-400"
                )} />
            </div>

            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                Start
            </div>

            {/* Actual ReactFlow Handle (Invisible, larger hit area) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-6 h-6 !bg-transparent !border-none !bottom-[-12px] !left-1/2 !-translate-x-1/2 cursor-crosshair z-50"
            />
        </div>
    );
}
