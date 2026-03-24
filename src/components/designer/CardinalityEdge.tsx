import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { EdgeConfig } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SplitSquareHorizontal, Merge, ArrowRight } from 'lucide-react';

export function CardinalityEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    selected
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const edgeConfig = (data as { edgeConfig?: EdgeConfig })?.edgeConfig;
    const cardinality = edgeConfig?.cardinality || 'one_to_one';

    let icon = <ArrowRight className="w-3 h-3" />;
    let label = '1:1';
    let bgColor = 'bg-background';
    let borderColor = 'border-border';
    let textColor = 'text-foreground';

    if (cardinality === '1:N' || cardinality === 'one_to_many') {
        icon = <SplitSquareHorizontal className="w-3 h-3" />;
        label = '1:N';
        bgColor = 'bg-blue-50 dark:bg-blue-950';
        borderColor = 'border-blue-200 dark:border-blue-800';
        textColor = 'text-blue-700 dark:text-blue-300';
    } else if (cardinality === 'N:1' || cardinality === 'many_to_one') {
        icon = <Merge className="w-3 h-3" />;
        label = 'N:1';
        bgColor = 'bg-orange-50 dark:bg-orange-950';
        borderColor = 'border-orange-200 dark:border-orange-800';
        textColor = 'text-orange-700 dark:text-orange-300';
    }

    return (
        <>
            <BaseEdge 
                path={edgePath} 
                markerEnd={markerEnd} 
                style={{
                    ...style,
                    strokeWidth: selected ? 3 : 2,
                    stroke: selected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    transition: 'stroke 0.2s',
                }} 
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    <Badge 
                        variant="outline"
                        className={cn(
                            "flex items-center gap-1 px-2 py-0.5 shadow-sm cursor-pointer transition-colors font-mono text-xs",
                            bgColor,
                            borderColor,
                            textColor,
                            selected && "ring-2 ring-primary ring-offset-1"
                        )}
                    >
                        {icon}
                        <span>{label}</span>
                    </Badge>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
