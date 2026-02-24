import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TaskSummary } from "@/services/executionTrackingService";
import { Layers, Combine, Copy, Check, FileJson } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface MergeStageDialogProps {
    tasks: TaskSummary[];
}

export function MergeStageDialog({ tasks }: MergeStageDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedStage, setSelectedStage] = useState<string>("");
    const [selectedField, setSelectedField] = useState<string>("");
    const [copied, setCopied] = useState(false);

    // 1. Get unique stages that have at least one completed task with output
    const stages = useMemo(() => {
        const stageSet = new Set<string>();
        tasks.forEach(t => {
            if (t.status === 'completed' && t.output_data && t.stage_key) {
                stageSet.add(t.stage_key);
            }
        });
        return Array.from(stageSet).sort();
    }, [tasks]);

    // 2. Get available fields for the selected stage (from the first valid task)
    const availableFields = useMemo(() => {
        if (!selectedStage) return [];
        const sampleTask = tasks.find(t => t.stage_key === selectedStage && t.status === 'completed' && t.output_data);
        if (!sampleTask || !sampleTask.output_data) return [];

        return Object.keys(sampleTask.output_data).filter(key => {
            // Optional: Filter for arrays only? The user asked for "questions" (array), 
            // but we might want to support object merging too.
            // For now, let's allow all top-level keys.
            return true;
        });
    }, [selectedStage, tasks]);

    // 3. Perform the Merge
    const mergedResult = useMemo(() => {
        if (!selectedStage || !selectedField) return null;

        const targetTasks = tasks.filter(t => t.stage_key === selectedStage && t.status === 'completed' && t.output_data);

        let mergedApi: any[] = [];
        let count = 0;

        targetTasks.forEach(t => {
            const val = t.output_data[selectedField];
            if (Array.isArray(val)) {
                mergedApi = [...mergedApi, ...val];
                count++;
            } else if (val) {
                // If distinct value, maybe push to array? 
                // User requirement: "merge values of 'questions' fields (as an array) together."
                // So we primarily assume array concatenation.
                mergedApi.push(val);
                count++;
            }
        });

        return {
            result: { [selectedField]: mergedApi },
            count,
            taskCount: targetTasks.length
        };
    }, [selectedStage, selectedField, tasks]);

    const handleCopy = () => {
        if (mergedResult) {
            navigator.clipboard.writeText(JSON.stringify(mergedResult.result, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 border-primary/20 text-primary hover:bg-primary/5">
                    <Combine className="w-3.5 h-3.5" />
                    Merge Results
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Combine className="w-5 h-5 text-primary" />
                        Merge Stage Results
                    </DialogTitle>
                    <DialogDescription>
                        Combine output fields from multiple tasks in the same stage into a single dataset.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Select Stage</Label>
                            <Select value={selectedStage} onValueChange={(val) => { setSelectedStage(val); setSelectedField(""); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a stage..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Select Field to Merge</Label>
                            <Select value={selectedField} onValueChange={setSelectedField} disabled={!selectedStage}>
                                <SelectTrigger>
                                    <SelectValue placeholder="e.g. questions" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFields.map(f => (
                                        <SelectItem key={f} value={f}>{f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {mergedResult && (
                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground">
                                    Merged Preview
                                    <Badge variant="secondary" className="ml-2 font-normal">
                                        Merged {mergedResult.count} items from {mergedResult.taskCount} tasks
                                    </Badge>
                                </Label>
                                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={handleCopy}>
                                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? "Copied" : "Copy JSON"}
                                </Button>
                            </div>
                            <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/30">
                                <div className="p-4">
                                    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/80">
                                        {JSON.stringify(mergedResult.result, null, 2)}
                                    </pre>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
