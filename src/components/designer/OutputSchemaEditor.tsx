/**
 * OutputSchemaEditor - Dialog for editing output schema definition
 * 
 * Provides a visual interface for defining output JSON structure
 * with support for nested objects and arrays.
 * 
 * Used by ContractSection.
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown, GripVertical, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { OutputSchemaField, InputFieldType } from '@/lib/types';
import { inferSchemaFromJson } from '@/lib/schemaUtils';
import { toast } from 'sonner';

interface OutputSchemaEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    schema: OutputSchemaField[];
    rootType: 'object' | 'array';
    onSave: (schema: OutputSchemaField[], rootType: 'object' | 'array') => void;
}

const FIELD_TYPES: { value: InputFieldType; label: string }[] = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'array', label: 'Array' },
    { value: 'object', label: 'Object' },
];

export function OutputSchemaEditor({ open, onOpenChange, schema, rootType, onSave }: OutputSchemaEditorProps) {
    const [editedSchema, setEditedSchema] = useState<OutputSchemaField[]>(schema);
    const [editedRootType, setEditedRootType] = useState<'object' | 'array'>(rootType);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const handleImportJson = (json: string) => {
        try {
            const result = inferSchemaFromJson(json);
            setEditedSchema(result.schema);
            setEditedRootType(result.rootType);
            toast.success("Schema inferred from JSON!");
        } catch (error: any) {
            toast.error(error.message || "Failed to parse JSON");
        }
    };

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setEditedSchema(schema.length > 0 ? [...schema] : [createEmptyField()]);
            setEditedRootType(rootType);
        }
    }, [open, schema, rootType]);

    const handleSave = () => {
        onSave(editedSchema.filter(f => f.name.trim() !== ''), editedRootType);
        onOpenChange(false);
    };

    const addField = () => {
        setEditedSchema([...editedSchema, createEmptyField()]);
    };

    const updateField = (index: number, updates: Partial<OutputSchemaField>) => {
        setEditedSchema(prev => prev.map((f, i) =>
            i === index ? { ...f, ...updates } : f
        ));
    };

    const removeField = (index: number) => {
        setEditedSchema(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Define Output Schema</DialogTitle>
                    <DialogDescription>
                        Define the expected output structure. This will be used to auto-generate the format section in your prompt.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 py-4 space-y-4">
                    {/* Root Type Selector & Import */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-4">
                            <Label className="text-sm">Root Type:</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={editedRootType === 'object' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setEditedRootType('object')}
                                >
                                    {'{}'} Object
                                </Button>
                                <Button
                                    type="button"
                                    variant={editedRootType === 'array' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setEditedRootType('array')}
                                >
                                    {'[]'} Array
                                </Button>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsImportOpen(true)}
                        >
                            <FileJson className="w-4 h-4 mr-2" />
                            Import JSON
                        </Button>
                    </div>

                    {/* Fields List */}
                    <ScrollArea className="flex-1 max-h-[400px]">
                        <div className="space-y-2 pr-4">
                            {editedSchema.map((field, index) => (
                                <FieldEditor
                                    key={index}
                                    field={field}
                                    onChange={(updates) => updateField(index, updates)}
                                    onRemove={() => removeField(index)}
                                    depth={0}
                                />
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Add Field Button */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={addField}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Field
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Schema
                    </Button>
                </DialogFooter>
            </DialogContent>

            <ImportJsonDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onImport={handleImportJson}
            />
        </Dialog>
    );
}

function ImportJsonDialog({ open, onOpenChange, onImport }: { open: boolean; onOpenChange: (o: boolean) => void; onImport: (json: string) => void }) {
    const [json, setJson] = useState('');

    const handleImport = () => {
        onImport(json);
        setJson(''); // reset
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Import from JSON</DialogTitle>
                    <DialogDescription>
                        Paste a sample JSON output. The system will infer the schema structure and types.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <Textarea
                        value={json}
                        onChange={e => setJson(e.target.value)}
                        placeholder='{"name": "example", "items": []}'
                        className="h-[200px] font-mono text-xs"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={!json.trim()}>Parse & Import</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Single field editor component
interface FieldEditorProps {
    field: OutputSchemaField;
    onChange: (updates: Partial<OutputSchemaField>) => void;
    onRemove: () => void;
    depth: number;
}

function FieldEditor({ field, onChange, onRemove, depth }: FieldEditorProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = field.type === 'object' || field.type === 'array';

    const handleTypeChange = (type: InputFieldType) => {
        const updates: Partial<OutputSchemaField> = { type };

        // Initialize nested structure for object/array
        if (type === 'object' && !field.properties) {
            updates.properties = [];
        } else if (type === 'array' && !field.items) {
            updates.items = { name: 'item', type: 'object', properties: [] };
        }

        // Clear nested if changing to primitive
        if (type !== 'object') {
            updates.properties = undefined;
        }
        if (type !== 'array') {
            updates.items = undefined;
        }

        onChange(updates);
    };

    const addChildProperty = () => {
        onChange({
            properties: [...(field.properties || []), createEmptyField()],
        });
    };

    const updateChildProperty = (index: number, updates: Partial<OutputSchemaField>) => {
        onChange({
            properties: field.properties?.map((p, i) =>
                i === index ? { ...p, ...updates } : p
            ),
        });
    };

    const removeChildProperty = (index: number) => {
        onChange({
            properties: field.properties?.filter((_, i) => i !== index),
        });
    };

    const updateArrayItems = (updates: Partial<OutputSchemaField>) => {
        onChange({
            items: field.items ? { ...field.items, ...updates } : undefined,
        });
    };

    return (
        <div className={cn(
            "border rounded-lg p-3 space-y-3",
            depth > 0 && "ml-4 border-dashed"
        )}>
            {/* Field Header */}
            <div className="flex items-center gap-2">
                {hasChildren && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-muted rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>
                )}

                <div className="flex-1 grid grid-cols-3 gap-2">
                    {/* Field Name */}
                    <Input
                        value={field.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder="field_name"
                        className="h-8 font-mono text-sm"
                    />

                    {/* Field Type */}
                    <Select value={field.type} onValueChange={handleTypeChange}>
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {FIELD_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Required Toggle */}
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={field.required ?? true}
                            onCheckedChange={(checked) => onChange({ required: checked })}
                        />
                        <span className="text-xs text-muted-foreground">Required</span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={onRemove}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Nested Properties (for object type) */}
            {field.type === 'object' && isExpanded && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <Label className="text-xs text-muted-foreground">Object Properties:</Label>
                    {field.properties?.map((prop, index) => (
                        <FieldEditor
                            key={index}
                            field={prop}
                            onChange={(updates) => updateChildProperty(index, updates)}
                            onRemove={() => removeChildProperty(index)}
                            depth={depth + 1}
                        />
                    ))}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={addChildProperty}
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Property
                    </Button>
                </div>
            )}

            {/* Array Items (for array type) */}
            {field.type === 'array' && isExpanded && field.items && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <Label className="text-xs text-muted-foreground">Array Items Schema:</Label>
                    <div className="flex items-center gap-2">
                        <span className="text-xs">Item type:</span>
                        <Select
                            value={field.items.type}
                            onValueChange={(type) => updateArrayItems({ type: type as InputFieldType })}
                        >
                            <SelectTrigger className="h-7 w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FIELD_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {field.items.type === 'object' && (
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Item Properties:</Label>
                            {field.items.properties?.map((prop, index) => (
                                <FieldEditor
                                    key={index}
                                    field={prop}
                                    onChange={(updates) => {
                                        updateArrayItems({
                                            properties: field.items?.properties?.map((p, i) =>
                                                i === index ? { ...p, ...updates } : p
                                            ),
                                        });
                                    }}
                                    onRemove={() => {
                                        updateArrayItems({
                                            properties: field.items?.properties?.filter((_, i) => i !== index),
                                        });
                                    }}
                                    depth={depth + 1}
                                />
                            ))}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                    updateArrayItems({
                                        properties: [...(field.items?.properties || []), createEmptyField()],
                                    });
                                }}
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Item Property
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function createEmptyField(): OutputSchemaField {
    return {
        name: '',
        type: 'string',
        required: true,
    };
}
