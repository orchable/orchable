import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TaskInspectorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        taskIndex: number;
        input_data: any;
        extra: any;
        rawTask: any;
    } | null;
}

export const TaskInspectorDialog: React.FC<TaskInspectorDialogProps> = ({
    isOpen,
    onClose,
    data
}) => {
    const [copied, setCopied] = React.useState<string | null>(null);

    if (!data) return null;

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const JsonViewer = ({ json, copyKey }: { json: any, copyKey: string }) => {
        const jsonString = JSON.stringify(json, null, 2);
        return (
            <div className="relative group">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(jsonString, copyKey)}
                >
                    {copied === copyKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <div className="bg-muted/50 p-4 rounded-md font-mono text-xs overflow-auto max-h-[400px]">
                    <pre>{jsonString}</pre>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Task Inspector (Row #{data.taskIndex + 1})</DialogTitle>
                    <DialogDescription>
                        Detailed view of the data structure that will be sent to the execution engine.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="input_data" className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="input_data">Input Data (Contract)</TabsTrigger>
                        <TabsTrigger value="extra">Extra Data</TabsTrigger>
                        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-auto mt-2">
                        <TabsContent value="input_data" className="h-full">
                            <ScrollArea className="h-full">
                                <div className="space-y-4 pr-4">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        These fields match the <strong>Contract</strong> and will be used to render the prompt templates.
                                    </div>
                                    <JsonViewer json={data.input_data} copyKey="input_data" />
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="extra" className="h-full">
                            <ScrollArea className="h-full">
                                <div className="space-y-4 pr-4">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Supplementary data and metadata that does NOT match the contract.
                                    </div>
                                    <JsonViewer json={data.extra} copyKey="extra" />
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="raw" className="h-full">
                            <ScrollArea className="h-full">
                                <div className="space-y-4 pr-4">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        The original task object from the uploaded JSON.
                                    </div>
                                    <JsonViewer json={data.rawTask} copyKey="raw" />
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
