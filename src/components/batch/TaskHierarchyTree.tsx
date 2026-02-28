import { useState, Fragment } from 'react';
import type { ExecutionStatus } from '@/lib/types';
import { GeminiJsonSchema } from '@/lib/types';
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
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, ListTree, Layers, Eye, Copy, Check, Clock, Code2, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDistanceToNow } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { exportToCsv } from '@/lib/csvExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MergeStageDialog } from "./MergeStageDialog";
import { taskActionService } from '@/services/taskActionService';
import { SchemaRenderer } from "./SchemaRenderer";
import { CustomComponentRenderer } from "./CustomComponentRenderer";
import { ComponentEditor } from "./ComponentEditor";
import { getTemplateById, PromptTemplateRecord, updateTemplateViewConfig, updateTemplateCustomComponent, createCustomComponent, updateCustomComponent, linkTemplateToComponent } from "@/services/stageService";
import { useEffect } from 'react';
import { toast } from 'sonner';

interface TaskHierarchyTreeProps {
    tasks: TaskSummary[];
}

export function TaskHierarchyTree({ tasks }: TaskHierarchyTreeProps) {
    const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({});
    const [viewTask, setViewTask] = useState<TaskSummary | null>(null);
    const [viewTemplate, setViewTemplate] = useState<PromptTemplateRecord | null>(null);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    // ... existing state ...

    const toggleLevel = (id: string) => {
        setExpandedLevels(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        const fetchTemplate = async () => {
            if (viewTask?.prompt_template_id) {
                setIsLoadingTemplate(true);
                try {
                    const template = await getTemplateById(viewTask.prompt_template_id);
                    setViewTemplate(template);
                } catch (err) {
                    console.error("Error fetching template:", err);
                    setViewTemplate(null);
                } finally {
                    setIsLoadingTemplate(false);
                }
            } else {
                setViewTemplate(null);
            }
        };

        fetchTemplate();
    }, [viewTask?.prompt_template_id]);

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

        // Highlight error rows
        const isError = task.status === 'failed';

        return (
            <Fragment key={task.id}>
                <TableRow
                    key={task.id}
                    className={cn(
                        "group transition-colors border-b border-muted/50",
                        depth > 0 ? "bg-muted/10" : "bg-card font-medium",
                        isError && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                >
                    <TableCell className="w-[400px] py-2">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
                            {hasChildren ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-5 h-auto p-0 opacity-70 hover:opacity-100"
                                    onClick={() => toggleLevel(task.id)}
                                >
                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </Button>
                            ) : (
                                <div className="w-5" />
                            )}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-sm", isError && "text-destructive font-medium")}>
                                        {task.stage_key}
                                    </span>
                                    {task.task_type && task.task_type !== task.stage_key && (
                                        <Badge variant="outline" className="text-[9px] h-4 px-1 font-normal opacity-70">
                                            {task.task_type}
                                        </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground font-mono opacity-50">#{task.id.slice(0, 6)}</span>
                                    {(task.extra as Record<string, unknown>)?._merged_from_count && (
                                        <Badge variant="secondary" className="text-[9px] h-4 px-1 opacity-80 bg-purple-500/10 text-purple-600 border-purple-500/20">
                                            N:1 Merge ({String((task.extra as Record<string, unknown>)._merged_from_count)})
                                        </Badge>
                                    )}
                                </div>
                                {task.lo_code && (
                                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded inline-block w-fit mt-0.5">
                                        {task.lo_code}
                                    </span>
                                )}
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="py-2">
                        <StatusBadge status={(task.status || 'pending') as ExecutionStatus} size="sm" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono py-2">
                        {task.started_at ? (
                            <div className="flex flex-col">
                                <span>{new Date(task.started_at).toLocaleTimeString()}</span>
                                <span className="text-[9px] opacity-70">{formatDistanceToNow(new Date(task.started_at), { addSuffix: true })}</span>
                            </div>
                        ) : (
                            <span className="italic opacity-50 text-[9px]">pending...</span>
                        )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono py-2">
                        {task.completed_at ? (
                            <div className="flex flex-col">
                                <span>{new Date(task.completed_at).toLocaleTimeString()}</span>
                                <span className="text-[9px] opacity-70">{formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 opacity-40">
                                <Clock className="w-3 h-3" />
                                <span className="italic text-[9px]">in progress</span>
                            </div>
                        )}
                    </TableCell>
                    <TableCell className="text-right py-2">
                        <div className="flex items-center justify-end gap-2">
                            {task.status === 'failed' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm("Retry this failed task?")) {
                                            try {
                                                await taskActionService.retryTask(task.id);
                                                toast.success("Task is scheduled for retry");
                                            } catch (err) {
                                                toast.error("Failed to schedule retry");
                                            }
                                        }
                                    }}
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                    Retry
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={() => setViewTask(task)}
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                            </Button>
                        </div>
                    </TableCell>
                </TableRow>
                {isExpanded && childrenMap[task.id]?.map(child => renderTaskRows(child, depth + 1))}
            </Fragment>
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
        <>
            <div className="rounded-xl border border-primary/5 overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm">
                <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Task Breakdown</h3>
                    </div>
                    <MergeStageDialog tasks={tasks} />
                </div>
                <Table>
                    <TableHeader className="bg-muted/10">
                        <TableRow className="border-b border-muted/50 hover:bg-transparent">
                            <TableHead className="w-[400px]">Stage / Task ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Started At</TableHead>
                            <TableHead>Finished At</TableHead>
                            <TableHead className="text-right">Result & Detail</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rootTasks.map(root => renderTaskRows(root))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!viewTask} onOpenChange={(open) => !open && setViewTask(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Ticket Details
                            <span className="text-sm font-normal text-muted-foreground font-mono">#{viewTask?.id}</span>
                            <StatusBadge status={(viewTask?.status || 'pending') as ExecutionStatus} size="sm" />
                        </DialogTitle>
                        <DialogDescription>
                            Review input data and execution results for <strong>{viewTask?.stage_key}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    {viewTask && (
                        <Tabs defaultValue={viewTask.output_data && viewTemplate?.output_schema ? "formatted" : "output"} className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between border-b px-1">
                                <TabsList className="bg-transparent h-9">
                                    <TabsTrigger value="formatted" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4" disabled={!viewTemplate?.output_schema}>Formatted</TabsTrigger>
                                    <TabsTrigger value="output" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4">Raw JSON</TabsTrigger>
                                    <TabsTrigger value="input" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4">Input Data</TabsTrigger>
                                    <TabsTrigger value="metadata" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4">Metadata</TabsTrigger>
                                    <TabsTrigger value="error" className="data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive border-b-2 border-transparent data-[state=active]:border-destructive rounded-none px-4" disabled={!viewTask.error_message}>Error Log</TabsTrigger>
                                </TabsList>
                                <div className="flex items-center gap-2">
                                    {viewTemplate?.output_schema && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs gap-1.5 text-primary/70 hover:text-primary transition-colors"
                                            onClick={() => {
                                                if (viewTemplate.custom_component_id) {
                                                    toast.info("Using component from Registry. Editing here will create a local copy.");
                                                }
                                                setShowEditor(true);
                                            }}
                                        >
                                            <Code2 className="w-3.5 h-3.5" />
                                            {viewTemplate.custom_component_id ? "Edit (Local Override)" : "Edit View"}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1.5 text-muted-foreground"
                                        onClick={() => {
                                            const data = viewTask.output_data || viewTask.input_data;
                                            if (!data) return;
                                            const exportData = Array.isArray(data) ? data : [data];
                                            exportToCsv(exportData as Record<string, unknown>[], `task_${viewTask.id}_export.csv`);
                                        }}
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Export CSV
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1.5 text-muted-foreground"
                                        onClick={() => copyToClipboard(JSON.stringify(viewTask.output_data || viewTask.input_data, null, 2))}
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? "Copied" : "Copy JSON"}
                                    </Button>
                                </div>
                            </div>

                            <TabsContent value="formatted" className="flex-1 min-h-0 mt-2 p-0">
                                <div className="h-[500px] w-full rounded-md border bg-card overflow-auto">
                                    <div className="p-4 pt-0">
                                        {viewTask.output_data && viewTemplate?.output_schema ? (
                                            (viewTemplate.custom_component?.code || viewTemplate.view_config?.customComponent) ? (
                                                <CustomComponentRenderer
                                                    code={viewTemplate.custom_component?.code || viewTemplate.view_config?.customComponent || ""}
                                                    data={viewTask.output_data}
                                                    schema={viewTemplate.output_schema as unknown as GeminiJsonSchema}
                                                    className="p-4"
                                                />
                                            ) : (
                                                <SchemaRenderer
                                                    data={viewTask.output_data}
                                                    schema={viewTemplate.output_schema as unknown as GeminiJsonSchema}
                                                    systemHiddenFields={['id', 'index', 'parent_id', 'task_id', 'created_at', 'updated_at']}
                                                    initialHiddenFields={viewTemplate.view_config?.hiddenFields || []}
                                                    onSaveConfig={async (config) => {
                                                        if (!viewTask.prompt_template_id) return;
                                                        try {
                                                            const newConfig = {
                                                                ...(viewTemplate.view_config || {}),
                                                                hiddenFields: config.hiddenFields
                                                            };
                                                            await updateTemplateViewConfig(viewTask.prompt_template_id, newConfig);

                                                            // Update local state to reflect changes immediately
                                                            setViewTemplate(prev => prev ? {
                                                                ...prev,
                                                                view_config: newConfig
                                                            } : prev);

                                                            toast.success("View configuration saved as default");
                                                        } catch (err) {
                                                            console.error("Failed to save view config:", err);
                                                            toast.error("Failed to save view configuration");
                                                            throw err;
                                                        }
                                                    }}
                                                />
                                            )
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground italic text-sm">
                                                {isLoadingTemplate ? "Loading schema..." : "No schema available for formatting"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="output" className="flex-1 min-h-0 mt-2 p-0">
                                <ScrollArea className="h-[500px] w-full rounded-md border bg-muted/30">
                                    <div className="p-4">
                                        {viewTask.output_data ? (
                                            <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/80">
                                                {JSON.stringify(viewTask.output_data, null, 2)}
                                            </pre>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground italic text-sm">
                                                No output data available
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="input" className="flex-1 min-h-0 mt-2 p-0">
                                <ScrollArea className="h-[500px] w-full rounded-md border bg-muted/30">
                                    <div className="p-4">
                                        {viewTask.input_data ? (
                                            <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/80">
                                                {JSON.stringify(viewTask.input_data, null, 2)}
                                            </pre>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground italic text-sm">
                                                No input data available
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="metadata" className="flex-1 min-h-0 mt-2 p-0">
                                <ScrollArea className="h-[500px] w-full rounded-md border bg-muted/30">
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <MetadataItem label="Task Type" value={viewTask.task_type} />
                                            <MetadataItem label="User ID" value={viewTask.user_id} />
                                            <MetadataItem label="Parent Task" value={viewTask.parent_task_id} isMono />
                                            <MetadataItem label="Root Task" value={viewTask.root_task_id} isMono />
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hierarchy Path</span>
                                            <div className="flex flex-wrap gap-1">
                                                {Array.isArray(viewTask.hierarchy_path) && viewTask.hierarchy_path.map((id, idx) => (
                                                    <span key={id} className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                                                        {idx > 0 && <ChevronRight className="w-2.5 h-2.5 opacity-50" />}
                                                        {id.slice(0, 8)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2 border-t border-muted">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Execution Timestamps</span>
                                            <div className="grid grid-cols-2 gap-y-2">
                                                <TimestampRow label="Created" date={viewTask.created_at} />
                                                <TimestampRow label="Started" date={viewTask.started_at} />
                                                <TimestampRow label="Completed" date={viewTask.completed_at} />
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="error" className="flex-1 min-h-0 mt-2 p-0">
                                <ScrollArea className="h-[500px] w-full rounded-md border border-destructive/20 bg-destructive/5">
                                    <div className="p-4 text-destructive font-mono text-xs whitespace-pre-wrap">
                                        {viewTask.error_message}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={showEditor} onOpenChange={setShowEditor}>
                <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden border-none shadow-2xl">
                    {viewTemplate && viewTask && (
                        <ComponentEditor
                            initialCode={viewTemplate.custom_component?.code || viewTemplate.view_config?.customComponent}
                            previewData={viewTask.output_data}
                            previewSchema={viewTemplate.output_schema as unknown as GeminiJsonSchema}
                            isLinked={!!viewTemplate.custom_component_id}
                            onSave={async (code) => {
                                if (!viewTask.prompt_template_id) return;

                                try {
                                    if (viewTemplate.custom_component_id) {
                                        const choice = window.confirm("Do you want to update the main Registry (OK) or only override locally for this Stage (Cancel)?");
                                        if (choice) {
                                            // Update Registry
                                            await updateCustomComponent(viewTemplate.custom_component_id, { code });
                                            toast.success("Registry component updated");
                                        } else {
                                            // Local Override
                                            await updateTemplateCustomComponent(viewTask.prompt_template_id, code);
                                            toast.success("Local override saved for Stage");
                                        }
                                    } else {
                                        const publishRegistry = window.confirm("Do you want to register this Component in the Asset Library for reuse?");
                                        if (publishRegistry) {
                                            const name = prompt("Enter name for the new Component:", viewTemplate.name || "New Component");
                                            if (name) {
                                                const newComp = await createCustomComponent({
                                                    name,
                                                    code,
                                                    is_public: true
                                                });
                                                await linkTemplateToComponent(viewTask.prompt_template_id, newComp.id);
                                                toast.success("Successfully registered to Asset Library");
                                            }
                                        } else {
                                            await updateTemplateCustomComponent(viewTask.prompt_template_id, code);
                                            toast.success("Local save successful");
                                        }
                                    }

                                    // Refresh template state
                                    const updatedTemplate = await getTemplateById(viewTask.prompt_template_id);
                                    if (updatedTemplate) setViewTemplate(updatedTemplate);

                                } catch (err) {
                                    console.error("Save error:", err);
                                    toast.error("Error saving component");
                                }
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function MetadataItem({ label, value, isMono }: { label: string; value?: string | null; isMono?: boolean }) {
    if (!value) return null;
    return (
        <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <div className={cn(
                "text-xs px-2 py-1 rounded bg-muted/50 border border-muted",
                isMono && "font-mono"
            )}>
                {value}
            </div>
        </div>
    );
}

function TimestampRow({ label, date }: { label: string; date?: string | null }) {
    if (!date) return null;
    return (
        <>
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className="text-[10px] font-mono text-right">{new Date(date).toLocaleString()}</span>
        </>
    );
}
