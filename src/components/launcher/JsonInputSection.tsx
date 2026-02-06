import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Eye, Braces, List, Copy, Check } from 'lucide-react';
import { getValueByPath, processTaskData } from '@/lib/jsonAnalyzer';
import type { FieldInfo } from '@/lib/jsonAnalyzer';
import type { FieldSelection, StageContract } from '@/lib/types';

interface JsonInputSectionProps {
    analysis: any;
    selection: FieldSelection;
    mapping: Record<string, string>;
    onSelectionChange: (selection: FieldSelection) => void;
    sampleJson: any;
    contract?: StageContract | null;
    orchestrationMetadata?: any;
}

export const JsonInputSection: React.FC<JsonInputSectionProps> = ({
    analysis,
    selection,
    mapping,
    onSelectionChange,
    sampleJson,
    contract,
    orchestrationMetadata
}) => {
    const [copied, setCopied] = React.useState(false);

    // Auto-select fields that match contract variable names
    React.useEffect(() => {
        if (!contract || !analysis) return;

        const contractFields = contract.input.fields.map(f => f.name);
        const newShared = [...selection.shared];
        const newPerTask = [...selection.perTask];
        let changed = false;

        analysis.sharedFields.forEach((field: FieldInfo) => {
            const name = field.path.split('.').pop();
            if (name && contractFields.includes(name) && !newShared.includes(field.path)) {
                newShared.push(field.path);
                changed = true;
            }
        });

        analysis.perTaskFields.forEach((field: FieldInfo) => {
            const name = field.path.split('.').pop();
            if (name && contractFields.includes(name) && !newPerTask.includes(field.path)) {
                newPerTask.push(field.path);
                changed = true;
            }
        });

        if (changed) {
            onSelectionChange({ shared: newShared, perTask: newPerTask });
        }
    }, [contract, analysis]); // Only run when contract or analysis changes

    if (!analysis) return null;

    const copyPreviewToClipboard = () => {
        if (previewData) {
            navigator.clipboard.writeText(JSON.stringify(previewData, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const toggleShared = (field: string) => {
        const newShared = selection.shared.includes(field)
            ? selection.shared.filter(f => f !== field)
            : [...selection.shared, field];
        onSelectionChange({ ...selection, shared: newShared });
    };

    const togglePerTask = (field: string) => {
        const newPerTask = selection.perTask.includes(field)
            ? selection.perTask.filter(f => f !== field)
            : [...selection.perTask, field];
        onSelectionChange({ ...selection, perTask: newPerTask });
    };

    const selectAllShared = () => {
        onSelectionChange({ ...selection, shared: analysis.sharedFields.map((f: FieldInfo) => f.path) });
    };

    const deselectAllShared = () => {
        onSelectionChange({ ...selection, shared: [] });
    };

    const selectAllPerTask = () => {
        onSelectionChange({ ...selection, perTask: analysis.perTaskFields.map((f: FieldInfo) => f.path) });
    };

    const deselectAllPerTask = () => {
        onSelectionChange({ ...selection, perTask: [] });
    };

    // Preview data for the first task
    const previewData = React.useMemo(() => {
        if (!analysis.sampleTasks?.[0]) return null;
        const task = analysis.sampleTasks[0];

        const contractFields = contract?.input.fields.map(f => f.name) || [];
        const processed = processTaskData(
            task,
            sampleJson,
            selection,
            mapping,
            contractFields
        );

        return {
            input_data: processed.input_data,
            extra: {
                ...processed.extra,
                // Add a visual indicator of system injection in the preview
                ...(orchestrationMetadata ? {
                    _comment: "─── Orchestrator Injection ───",
                    ...orchestrationMetadata
                } : {})
            }
        };
    }, [selection, mapping, analysis, sampleJson, contract, orchestrationMetadata]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 mt-6">
            {/* Contract Fields Section */}
            {contract && (
                <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <Braces className="w-4 h-4" />
                        Trường thông tin theo Contract ({contract.input.fields.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {contract.input.fields.map(field => (
                            <Badge key={field.name} variant="outline" className="bg-background font-mono text-[10px] py-0.5 border-primary/30 text-primary">
                                {field.name}
                            </Badge>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                        Các trường trùng tên bên dưới sẽ được tự động highlight và chọn.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shared Fields */}
                <Card className="border-muted/40 shadow-sm">
                    <CardHeader className="pb-3 px-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                Thông tin chung (Shared)
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">root.field</Badge>
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 hover:bg-primary/10 hover:text-primary" onClick={selectAllShared}>All</Button>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 hover:bg-destructive/10 hover:text-destructive" onClick={deselectAllShared}>None</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <ScrollArea className="h-48 pr-3">
                            <div className="space-y-1.5">
                                {analysis.sharedFields.map((field: FieldInfo) => {
                                    const fieldName = field.path.split('.').pop();
                                    const isContractMatch = contract?.input.fields.some(f => f.name === fieldName);

                                    return (
                                        <div
                                            key={field.path}
                                            className={`flex items-center space-x-2 group p-1 rounded-md transition-colors ${isContractMatch ? 'bg-primary/5 hover:bg-primary/10' : ''
                                                }`}
                                        >
                                            <Checkbox
                                                id={`shared-${field.path}`}
                                                checked={selection.shared.includes(field.path)}
                                                onCheckedChange={() => toggleShared(field.path)}
                                                className={`border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary ${isContractMatch ? 'border-primary/50' : ''
                                                    }`}
                                            />
                                            <label
                                                htmlFor={`shared-${field.path}`}
                                                className={`text-[11px] font-mono truncate flex-1 cursor-pointer transition-colors flex items-center gap-1.5 ${isContractMatch ? 'text-primary font-bold' : 'text-muted-foreground group-hover:text-foreground'
                                                    }`}
                                                title={field.path}
                                            >
                                                {field.path}
                                                {field.type === 'array' && <List className="w-3 h-3 text-primary" />}
                                                {field.type === 'object' && <Braces className="w-3 h-3 text-amber-500" />}
                                                {isContractMatch && <Badge className="text-[8px] h-3 px-1 py-0 bg-primary/20 text-primary border-0">Contract</Badge>}
                                            </label>
                                        </div>
                                    );
                                })}
                                {analysis.sharedFields.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground text-center py-8 italic">No shared fields detected</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Per-Task Fields */}
                <Card className="border-muted/40 shadow-sm">
                    <CardHeader className="pb-3 px-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                Thông tin riêng (Per-Task)
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0 font-mono">
                                    {analysis.taskArrayPath}[*]
                                </Badge>
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 hover:bg-primary/10 hover:text-primary" onClick={selectAllPerTask}>All</Button>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 hover:bg-destructive/10 hover:text-destructive" onClick={deselectAllPerTask}>None</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <ScrollArea className="h-48 pr-3">
                            <div className="space-y-1.5">
                                {analysis.perTaskFields.map((field: FieldInfo) => {
                                    const fieldName = field.path.split('.').pop();
                                    const isContractMatch = contract?.input.fields.some(f => f.name === fieldName);

                                    return (
                                        <div
                                            key={field.path}
                                            className={`flex items-center space-x-2 group p-1 rounded-md transition-colors ${isContractMatch ? 'bg-primary/5 hover:bg-primary/10' : ''
                                                }`}
                                        >
                                            <Checkbox
                                                id={`task-${field.path}`}
                                                checked={selection.perTask.includes(field.path)}
                                                onCheckedChange={() => togglePerTask(field.path)}
                                                className={`border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary ${isContractMatch ? 'border-primary/50' : ''
                                                    }`}
                                            />
                                            <label
                                                htmlFor={`task-${field.path}`}
                                                className={`text-[11px] font-mono truncate flex-1 cursor-pointer transition-colors flex items-center gap-1.5 ${isContractMatch ? 'text-primary font-bold' : 'text-muted-foreground group-hover:text-foreground'
                                                    }`}
                                                title={field.path}
                                            >
                                                {field.path}
                                                {field.type === 'array' && <List className="w-3 h-3 text-primary" />}
                                                {field.type === 'object' && <Braces className="w-3 h-3 text-amber-500" />}
                                                {isContractMatch && <Badge className="text-[8px] h-3 px-1 py-0 bg-primary/20 text-primary border-0">Contract</Badge>}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Preview Section */}
            <Card className="bg-muted/30 border-dashed border-muted-foreground/20 shadow-none">
                <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground animate-in fade-in">
                        <Eye className="w-3.5 h-3.5" />
                        Xem trước dữ liệu 1 task (First Item)
                    </CardTitle>
                    <div className="flex items-center justify-between">
                        <CardDescription className="text-[10px] italic">
                            Dữ liệu sẽ được truyền vào orchestrator dựa trên các trường bạn đã chọn ở trên.
                        </CardDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 relative"
                            onClick={copyPreviewToClipboard}
                            title="Copy JSON"
                        >
                            {copied ? (
                                <Check className="h-3.5 w-3.5 text-green-500 scale-100 transition-all" />
                            ) : (
                                <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground scale-100 transition-all" />
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <pre className="text-[10px] font-mono bg-background/50 p-3 rounded-lg border border-muted/50 max-h-40 overflow-auto whitespace-pre-wrap custom-scrollbar">
                        {JSON.stringify(previewData, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
};
