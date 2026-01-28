import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { StepBadge } from '@/components/common/StepBadge';
import { cn } from '@/lib/utils';

interface StepNodeProps {
    data: {
        stepId: string;
        name: string; // 'A', 'B', 'C', 'D', 'E'
        label: string;
        webhookUrl: string;
    };
    selected: boolean;
}

export function StepNode({ data, selected }: StepNodeProps) {
    const isConfigured = !!data.webhookUrl;

    return (
        <div className="relative group">
            <Card className={cn(
                "w-52 p-4 cursor-pointer transition-all border-2 relative",
                // Base
                "bg-card",
                // Configured (Green) - only when not selected
                isConfigured && !selected && "border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/20 hover:shadow-md hover:shadow-emerald-500/20",
                // Not Configured & Not Selected
                !isConfigured && !selected && "border-border group-hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                // Selected (Primary Blue Override)
                selected && "border-primary shadow-lg shadow-primary/10"
            )}>
                <div className="flex items-center gap-3">
                    <StepBadge name={data.name} />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{data.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {data.webhookUrl ? 'Webhook configured' : 'No webhook'}
                        </p>
                    </div>
                </div>

                {/* Connection Handles - Visual only, real handles are invisible/positioned */}
                {/* Connection Handles - Visual only */}
                <div className={cn(
                    "absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background transition-colors z-10",
                    selected ? "border-primary" : (isConfigured ? "border-emerald-500/70" : "border-muted-foreground/30 group-hover:border-primary")
                )} />
                <div className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background transition-colors z-10",
                    selected ? "border-primary" : (isConfigured ? "border-emerald-500/70" : "border-muted-foreground/30 group-hover:border-primary")
                )} />
            </Card>

            {/* Actual ReactFlow Handles */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-6 h-6 !bg-transparent !border-none !top-[-12px] !left-1/2 !-translate-x-1/2 cursor-crosshair z-50"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-6 h-6 !bg-transparent !border-none !bottom-[-12px] !left-1/2 !-translate-x-1/2 cursor-crosshair z-50"
            />
        </div>
    );
}
