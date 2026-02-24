/**
 * OutputSchemaEditor - Dialog for editing Gemini-compatible JSON Schema
 * 
 * Provides a visual interface for defining output JSON structure
 * using standard JSON Schema format (type, description, required, enum, nullable).
 * The schema produced maps directly to Gemini's `responseJsonSchema`.
 * 
 * Used by ContractSection.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown, FileJson } from 'lucide-react';
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
import type { JsonSchemaProperty, GeminiJsonSchema, InputFieldType } from '@/lib/types';
import { inferSchemaFromJson } from '@/lib/schemaUtils';
import { toast } from 'sonner';

interface OutputSchemaEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    schema?: GeminiJsonSchema;
    onSave: (schema: GeminiJsonSchema) => void;
}

const FIELD_TYPES: { value: InputFieldType; label: string }[] = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'integer', label: 'Integer' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'array', label: 'Array' },
    { value: 'object', label: 'Object' },
];

function createDefaultSchema(): GeminiJsonSchema {
    return {
        type: 'object',
        properties: {},
        required: [],
    };
}

export function OutputSchemaEditor({ open, onOpenChange, schema, onSave }: OutputSchemaEditorProps) {
    const [editedSchema, setEditedSchema] = useState<GeminiJsonSchema>(schema || createDefaultSchema());
    const [isImportOpen, setIsImportOpen] = useState(false);

    const handleImportJson = (json: string) => {
        try {
            const result = inferSchemaFromJson(json);
            setEditedSchema(result);
            toast.success("Schema inferred from JSON!");
        } catch (error: any) {
            toast.error(error.message || "Failed to parse JSON");
        }
    };

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setEditedSchema(schema && schema.type ? { ...schema } : createDefaultSchema());
        }
    }, [open, schema]);

    const handleSave = () => {
        // Clean up empty properties
        const cleaned = cleanSchema(editedSchema);
        onSave(cleaned);
        onOpenChange(false);
    };

    const handleRootTypeChange = (newType: 'object' | 'array') => {
        if (newType === editedSchema.type) return;

        if (newType === 'array') {
            // Convert object → array: move properties into items
            setEditedSchema({
                type: 'array',
                items: {
                    type: 'object',
                    properties: editedSchema.properties || {},
                    required: editedSchema.required || [],
                },
            });
        } else {
            // Convert array → object: extract items properties to root
            const itemProps = editedSchema.items?.type === 'object' ? editedSchema.items : undefined;
            setEditedSchema({
                type: 'object',
                properties: itemProps?.properties || {},
                required: itemProps?.required || [],
            });
        }
    };

    // Get the editable properties object (for object root or array item)
    const editableProps = editedSchema.type === 'array' && editedSchema.items?.type === 'object'
        ? editedSchema.items
        : editedSchema;

    const updateEditableProps = useCallback((updater: (prev: JsonSchemaProperty) => JsonSchemaProperty) => {
        setEditedSchema(prev => {
            if (prev.type === 'array' && prev.items?.type === 'object') {
                return { ...prev, items: updater(prev.items!) };
            }
            return { ...prev, ...updater(prev) } as GeminiJsonSchema;
        });
    }, []);

    const addProperty = (name: string = '') => {
        const propName = name || `field_${Object.keys(editableProps.properties || {}).length + 1}`;
        updateEditableProps(prev => ({
            ...prev,
            properties: {
                ...prev.properties,
                [propName]: { type: 'string' },
            },
            required: [...(prev.required || []), propName],
        }));
    };

    const removeProperty = (name: string) => {
        updateEditableProps(prev => {
            const newProps = { ...prev.properties };
            delete newProps[name];
            return {
                ...prev,
                properties: newProps,
                required: (prev.required || []).filter(r => r !== name),
            };
        });
    };

    const updateProperty = (oldName: string, newName: string, updates: Partial<JsonSchemaProperty>) => {
        updateEditableProps(prev => {
            const newProps = { ...prev.properties };
            const existing = newProps[oldName] || { type: 'string' as const };

            // Handle rename
            if (oldName !== newName && newName.trim()) {
                delete newProps[oldName];
                newProps[newName] = { ...existing, ...updates };
                // Update required list
                const newRequired = (prev.required || []).map(r => r === oldName ? newName : r);
                return { ...prev, properties: newProps, required: newRequired };
            }

            newProps[oldName] = { ...existing, ...updates };
            return { ...prev, properties: newProps };
        });
    };

    const toggleRequired = (name: string) => {
        updateEditableProps(prev => {
            const isRequired = (prev.required || []).includes(name);
            return {
                ...prev,
                required: isRequired
                    ? (prev.required || []).filter(r => r !== name)
                    : [...(prev.required || []), name],
            };
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Define Output Schema</DialogTitle>
                    <DialogDescription>
                        Define the expected output structure as Gemini-compatible JSON Schema.
                        This schema will be sent directly as <code className="text-xs bg-muted px-1 rounded">responseJsonSchema</code> to enable structured output.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 flex flex-col gap-4">
                    {/* Root Type Selector & Import - Fixed at top */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-4">
                            <Label className="text-sm">Root Type:</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={editedSchema.type === 'object' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleRootTypeChange('object')}
                                >
                                    {'{}'} Object
                                </Button>
                                <Button
                                    type="button"
                                    variant={editedSchema.type === 'array' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleRootTypeChange('array')}
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

                    {/* Properties List - Scrollable with explicit height */}
                    <ScrollArea className="h-[calc(85vh-240px)]">
                        <div className="space-y-2 pr-4 pb-4">
                            {Object.entries(editableProps.properties || {}).map(([name, prop]) => (
                                <PropertyEditor
                                    key={name}
                                    name={name}
                                    property={prop}
                                    isRequired={(editableProps.required || []).includes(name)}
                                    onChange={(newName, updates) => updateProperty(name, newName, updates)}
                                    onRemove={() => removeProperty(name)}
                                    onToggleRequired={() => toggleRequired(name)}
                                    depth={0}
                                />
                            ))}

                            {/* Add Property Button - Inside scroll region */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() => addProperty()}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Property
                            </Button>
                        </div>
                    </ScrollArea>
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

// ============================================================
// Property Editor (recursive)
// ============================================================

interface PropertyEditorProps {
    name: string;
    property: JsonSchemaProperty;
    isRequired: boolean;
    onChange: (newName: string, updates: Partial<JsonSchemaProperty>) => void;
    onRemove: () => void;
    onToggleRequired: () => void;
    depth: number;
}

function PropertyEditor({ name, property, isRequired, onChange, onRemove, onToggleRequired, depth }: PropertyEditorProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [editingName, setEditingName] = useState(name);
    const hasChildren = property.type === 'object' || property.type === 'array';

    const handleTypeChange = (newType: InputFieldType) => {
        const updates: Partial<JsonSchemaProperty> = { type: newType };

        if (newType === 'object' && !property.properties) {
            updates.properties = {};
            updates.required = [];
        } else if (newType === 'array' && !property.items) {
            updates.items = { type: 'string' };
        }

        if (newType !== 'object') {
            updates.properties = undefined;
            updates.required = undefined;
        }
        if (newType !== 'array') {
            updates.items = undefined;
        }
        // Clear enum if switching to non-primitive
        if (newType === 'object' || newType === 'array' || newType === 'boolean') {
            updates.enum = undefined;
        }

        onChange(editingName, updates);
    };

    const handleNameBlur = () => {
        if (editingName.trim() && editingName !== name) {
            onChange(editingName, {});
        } else {
            setEditingName(name);
        }
    };

    // Child property management for object type
    const addChildProperty = () => {
        const childName = `field_${Object.keys(property.properties || {}).length + 1}`;
        onChange(editingName, {
            properties: {
                ...property.properties,
                [childName]: { type: 'string' },
            },
            required: [...(property.required || []), childName],
        });
    };

    const removeChildProperty = (childName: string) => {
        const newProps = { ...property.properties };
        delete newProps[childName];
        onChange(editingName, {
            properties: newProps,
            required: (property.required || []).filter(r => r !== childName),
        });
    };

    const updateChildProperty = (oldChildName: string, newChildName: string, updates: Partial<JsonSchemaProperty>) => {
        const newProps = { ...property.properties };
        const existing = newProps[oldChildName] || { type: 'string' as const };

        if (oldChildName !== newChildName && newChildName.trim()) {
            delete newProps[oldChildName];
            newProps[newChildName] = { ...existing, ...updates };
            const newRequired = (property.required || []).map(r => r === oldChildName ? newChildName : r);
            onChange(editingName, { properties: newProps, required: newRequired });
        } else {
            newProps[oldChildName] = { ...existing, ...updates };
            onChange(editingName, { properties: newProps });
        }
    };

    const toggleChildRequired = (childName: string) => {
        const isChildRequired = (property.required || []).includes(childName);
        onChange(editingName, {
            required: isChildRequired
                ? (property.required || []).filter(r => r !== childName)
                : [...(property.required || []), childName],
        });
    };

    return (
        <div className={cn(
            "border rounded-lg p-3 space-y-2",
            depth > 0 && "ml-4 border-dashed"
        )}>
            {/* Property Header */}
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
                    {/* Property Name */}
                    <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="property_name"
                        className="h-8 font-mono text-sm"
                    />

                    {/* Property Type */}
                    <Select value={property.type} onValueChange={handleTypeChange}>
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
                            checked={isRequired}
                            onCheckedChange={onToggleRequired}
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

            {/* Description */}
            <Input
                value={property.description || ''}
                onChange={(e) => onChange(editingName, { description: e.target.value || undefined })}
                placeholder="Description (helps guide the model)"
                className="h-7 text-xs"
            />

            {/* Enum (for string/number/integer) */}
            {(property.type === 'string' || property.type === 'number' || property.type === 'integer') && (
                <Input
                    value={property.enum?.join(', ') || ''}
                    onChange={(e) => {
                        const val = e.target.value.trim();
                        if (!val) {
                            onChange(editingName, { enum: undefined });
                        } else {
                            const items = val.split(',').map(s => s.trim()).filter(Boolean);
                            onChange(editingName, {
                                enum: property.type === 'string'
                                    ? items
                                    : items.map(Number).filter(n => !isNaN(n))
                            });
                        }
                    }}
                    placeholder="Enum values (comma-separated, optional)"
                    className="h-7 text-xs font-mono"
                />
            )}

            {/* Object Properties */}
            {property.type === 'object' && isExpanded && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <Label className="text-xs text-muted-foreground">Properties:</Label>
                    {Object.entries(property.properties || {}).map(([childName, childProp]) => (
                        <PropertyEditor
                            key={childName}
                            name={childName}
                            property={childProp}
                            isRequired={(property.required || []).includes(childName)}
                            onChange={(newName, updates) => updateChildProperty(childName, newName, updates)}
                            onRemove={() => removeChildProperty(childName)}
                            onToggleRequired={() => toggleChildRequired(childName)}
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

            {/* Array Items */}
            {property.type === 'array' && isExpanded && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <Label className="text-xs text-muted-foreground">Array Items Schema:</Label>
                    <div className="flex items-center gap-2">
                        <span className="text-xs">Item type:</span>
                        <Select
                            value={property.items?.type || 'string'}
                            onValueChange={(type) => {
                                const newItems: JsonSchemaProperty = { type: type as InputFieldType };
                                if (type === 'object') {
                                    newItems.properties = {};
                                    newItems.required = [];
                                }
                                onChange(editingName, { items: newItems });
                            }}
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

                    {property.items?.type === 'object' && (
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Item Properties:</Label>
                            {Object.entries(property.items.properties || {}).map(([childName, childProp]) => (
                                <PropertyEditor
                                    key={childName}
                                    name={childName}
                                    property={childProp}
                                    isRequired={(property.items?.required || []).includes(childName)}
                                    onChange={(newName, updates) => {
                                        const newProps = { ...property.items?.properties };
                                        const existing = newProps[childName] || { type: 'string' as InputFieldType };
                                        if (childName !== newName && newName.trim()) {
                                            delete newProps[childName];
                                            newProps[newName] = { ...existing, ...updates };
                                            const newReq = (property.items?.required || []).map(r => r === childName ? newName : r);
                                            onChange(editingName, { items: { ...property.items!, properties: newProps, required: newReq } });
                                        } else {
                                            newProps[childName] = { ...existing, ...updates };
                                            onChange(editingName, { items: { ...property.items!, properties: newProps } });
                                        }
                                    }}
                                    onRemove={() => {
                                        const newProps = { ...property.items?.properties };
                                        delete newProps[childName];
                                        onChange(editingName, {
                                            items: {
                                                ...property.items!,
                                                properties: newProps,
                                                required: (property.items?.required || []).filter(r => r !== childName),
                                            }
                                        });
                                    }}
                                    onToggleRequired={() => {
                                        const isReq = (property.items?.required || []).includes(childName);
                                        onChange(editingName, {
                                            items: {
                                                ...property.items!,
                                                required: isReq
                                                    ? (property.items?.required || []).filter(r => r !== childName)
                                                    : [...(property.items?.required || []), childName],
                                            }
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
                                    const childName = `field_${Object.keys(property.items?.properties || {}).length + 1}`;
                                    onChange(editingName, {
                                        items: {
                                            ...property.items!,
                                            properties: {
                                                ...property.items?.properties,
                                                [childName]: { type: 'string' },
                                            },
                                            required: [...(property.items?.required || []), childName],
                                        }
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

// ============================================================
// Import JSON Dialog
// ============================================================

function ImportJsonDialog({ open, onOpenChange, onImport }: { open: boolean; onOpenChange: (o: boolean) => void; onImport: (json: string) => void }) {
    const [json, setJson] = useState('');

    const handleImport = () => {
        onImport(json);
        setJson('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Import from JSON</DialogTitle>
                    <DialogDescription>
                        Paste a sample JSON output. The system will infer the JSON Schema structure and types automatically.
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

// ============================================================
// Helpers
// ============================================================

function cleanSchema(schema: GeminiJsonSchema): GeminiJsonSchema {
    const cleanProp = (prop: JsonSchemaProperty): JsonSchemaProperty => {
        const cleaned: JsonSchemaProperty = { type: prop.type };
        if (prop.description) cleaned.description = prop.description;
        if (prop.enum && prop.enum.length > 0) cleaned.enum = prop.enum;
        if (prop.nullable) cleaned.nullable = prop.nullable;

        if (prop.type === 'object' && prop.properties) {
            const cleanedProps: Record<string, JsonSchemaProperty> = {};
            for (const [key, val] of Object.entries(prop.properties)) {
                if (key.trim()) {
                    cleanedProps[key] = cleanProp(val);
                }
            }
            if (Object.keys(cleanedProps).length > 0) {
                cleaned.properties = cleanedProps;
            }
            if (prop.required && prop.required.length > 0) {
                cleaned.required = prop.required.filter(r => cleanedProps[r]);
            }
        }

        if (prop.type === 'array' && prop.items) {
            cleaned.items = cleanProp(prop.items);
        }

        return cleaned;
    };

    return cleanProp(schema) as GeminiJsonSchema;
}
