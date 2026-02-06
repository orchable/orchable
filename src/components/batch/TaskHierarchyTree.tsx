import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TaskSummary } from "@/services/executionTrackingService";
import { ChevronRight, ChevronDown, ListTree, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskHierarchyTreeProps {
    tasks: TaskSummary[];
}

export function TaskHierarchyTree({ tasks }: TaskHierarchyTreeProps) {
    const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({});

    const toggleLevel = (id: string) => {
        setExpandedLevels(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Organize tasks into a tree structure
    const rootTasks = tasks.filter(t => !t.parent_task_id);
    const childrenMap = tasks.reduce((acc, t) => {
        if (t.parent_task_id) {
            if (!acc[t.parent_task_id]) acc[t.parent_task_id] = [];
            acc[t.parent_task_id].push(t);
        }
        return acc;
    }, {} as Record<string, TaskSummary[]>);

    const renderTaskRows = (task: TaskSummary, depth: number = 0) => {
        const hasChildren = !!childrenMap[task.id];
        const isExpanded = expandedLevels[task.id];

        return (
            <>
                <TableRow
                    key={task.id}
                    className={cn(
                        "group transition-colors",
                        depth > 0 ? "bg-muted/30" : "bg-card font-medium"
                    )}
                >
                    <TableCell className="w-[400px]">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
                            {hasChildren ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-5 h-5 h-auto p-0"
                                    onClick={() => toggleLevel(task.id)}
                                >
                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </Button>
                            ) : (
                                <div className="w-5" />
                            )}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">{task.stage_key}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">#{task.id.slice(0, 6)}</span>
                                </div>
                                {task.lo_code && (
                                    <span className="text-[11px] bg-blue-500/10 text-blue-600 px-1 rounded inline-block w-fit">
                                        {task.lo_code}
                                    </span>
                                )}
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <StatusBadge status={task.status as any} size="sm" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                        {new Date(task.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-right">
                        {task.error_message && (
                            <span className="text-rose-500 text-[10px] bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/20 max-w-[200px] truncate block ml-auto">
                                {task.error_message}
                            </span>
                        )}
                        {!task.error_message && task.completed_at && (
                            <span className="text-emerald-500 text-[10px]">
                                {Math.round((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000)}s
                            </span>
                        )}
                    </TableCell>
                </TableRow>
                {isExpanded && childrenMap[task.id]?.map(child => renderTaskRows(child, depth + 1))}
            </>
        );
    };

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed text-muted-foreground">
                <ListTree className="w-12 h-12 mb-3 opacity-20" />
                <p>No tasks found in this batch</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-primary/5 overflow-hidden bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 p-4 border-b bg-muted/10">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">Task Breakdown</h3>
            </div>
            <Table>
                <TableHeader className="bg-muted/20">
                    <TableRow>
                        <TableHead>Stage / Task ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started At</TableHead>
                        <TableHead className="text-right">Detail</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rootTasks.map(root => renderTaskRows(root))}
                </TableBody>
            </Table>
        </div>
    );
}
