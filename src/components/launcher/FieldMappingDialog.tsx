import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Link as LinkIcon, RefreshCw, Type, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StageContract } from '@/lib/types';

interface FieldMappingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contract: StageContract | null;
    availableFields: string[];
    mapping: Record<string, string>;
    onMappingChange: (mapping: Record<string, string>) => void;
    onConfirm: () => void;
}

export const FieldMappingDialog: React.FC<FieldMappingDialogProps> = ({
    open,
    onOpenChange,
    contract,
    availableFields,
    mapping,
    onMappingChange,
    onConfirm,
}) => {
    if (!contract) return null;

    const handleMapField = (contractField: string, value: string) => {
        onMappingChange({
            ...mapping,
            [contractField]: value,
        });
    };

    const handleStaticValue = (contractField: string, value: string) => {
        onMappingChange({
            ...mapping,
            [contractField]: `static:${value}`,
        });
    };

    const autoMap = () => {
        const newMapping = { ...mapping };
        contract.input.fields.forEach(cf => {
            const match = availableFields.find(af => af.split('.').pop() === cf.name || af === cf.name);
            if (match) {
                newMapping[cf.name] = match;
            }
        });
        onMappingChange(newMapping);
    };

    const isComplete = contract.input.fields
        .filter(f => f.required)
        .every(f => mapping[f.name]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-primary" />
                        Mapping Fields to Contract
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6">
                    <Alert className="bg-primary/5 border-primary/20">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-sm font-semibold">Input Configuration for First Stage</AlertTitle>
                        <AlertDescription className="text-xs">
                            Each task needs the following information to match the Orchestrator contract. Please select the corresponding fields from your JSON.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                        {contract.input.fields.map((field) => {
                            const currentMapping = mapping[field.name] || "";
                            const isStatic = currentMapping.startsWith("static:");
                            const staticValue = isStatic ? currentMapping.replace("static:", "") : "";
                            const sourcePath = isStatic ? "" : currentMapping;

                            // Visual feedback for variables with delimiters
                            const displayName = contract.input.delimiters
                                ? `${contract.input.delimiters.start}${field.name}${contract.input.delimiters.end}`
                                : field.name;

                            return (
                                <div key={field.name} className="flex flex-col gap-3 border-b pb-4 last:border-0 pt-2">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <Label className="font-mono text-sm font-bold text-primary">{displayName}</Label>
                                                {field.required && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">Required</Badge>}
                                                {isStatic && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-amber-50 text-amber-600 border-amber-200">Static</Badge>}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground italic line-clamp-1">{field.description || `Type: ${field.type}`}</p>
                                        </div>

                                        <Tabs
                                            value={isStatic ? "static" : "json"}
                                            onValueChange={(val) => {
                                                if (val === "json") handleMapField(field.name, "");
                                                else handleStaticValue(field.name, "");
                                            }}
                                            className="h-7"
                                        >
                                            <TabsList className="h-7 p-0.5 bg-muted/50">
                                                <TabsTrigger value="json" className="h-6 text-[10px] px-2 gap-1">
                                                    <Database className="w-3 h-3" /> JSON
                                                </TabsTrigger>
                                                <TabsTrigger value="static" className="h-6 text-[10px] px-2 gap-1">
                                                    <Type className="w-3 h-3" /> Static
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            {isStatic ? (
                                                <Input
                                                    value={staticValue}
                                                    onChange={(e) => handleStaticValue(field.name, e.target.value)}
                                                    placeholder="Enter static value..."
                                                    className="h-9 text-xs"
                                                />
                                            ) : (
                                                <Select
                                                    value={sourcePath}
                                                    onValueChange={(value) => handleMapField(field.name, value)}
                                                >
                                                    <SelectTrigger className={`h-9 text-xs font-mono ${!sourcePath && field.required ? 'border-destructive/50 ring-destructive/20' : ''}`}>
                                                        <SelectValue placeholder="Select field from JSON..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableFields.map(f => (
                                                            <SelectItem key={f} value={f} className="text-xs font-mono">
                                                                {f}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter className="border-t pt-4">
                    <div className="flex justify-between w-full">
                        <Button variant="outline" size="sm" onClick={autoMap} className="text-xs">
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Auto Map by Name
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button size="sm" onClick={onConfirm} disabled={!isComplete}>
                                Confirm Mapping
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
