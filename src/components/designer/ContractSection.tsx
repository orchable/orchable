/**
 * ContractSection - Display Input/Output Contract for a Stage
 * 
 * Shows auto-extracted input variables and output schema definition.
 * Allows editing output schema via OutputSchemaEditor dialog.
 * Output schema is stored as Gemini-compatible JSON Schema.
 */

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileInput, FileOutput, Edit, Copy, Eye, RefreshCw, Database, Share2, Plus, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { StageContract, InputField, GeminiJsonSchema, JsonSchemaProperty, DocumentAsset, ExportConfig } from '@/lib/types';
import { extractInputFields, generateOutputFormatSection, createDefaultContract } from '@/lib/schemaUtils';
import { OutputSchemaEditor } from '@/components/designer/OutputSchemaEditor';

interface ContractSectionProps {
    promptTemplate?: string;
    contract?: StageContract;
    availableScope?: string[] | null;
    onContractChange: (contract: StageContract) => void;
    onPromptTemplateChange?: (newPrompt: string) => void;

    // 🔨 Stage IO additions
    availableDocuments?: DocumentAsset[];
    selectedDocumentIds?: string[];
    onAuxiliaryInputsChange?: (ids: string[]) => void;
    exportConfig?: ExportConfig;
    onExportConfigChange?: (config: ExportConfig) => void;
}

export function ContractSection({
    promptTemplate,
    contract,
    availableScope,
    onContractChange,
    onPromptTemplateChange,
    availableDocuments = [],
    selectedDocumentIds = [],
    onAuxiliaryInputsChange,
    exportConfig,
    onExportConfigChange
}: ContractSectionProps) {
    const [isInputOpen, setIsInputOpen] = useState(true);
    const [isOutputOpen, setIsOutputOpen] = useState(true);
    const [isAuxOpen, setIsAuxOpen] = useState(true);
    const [isExportOpen, setIsExportOpen] = useState(true);
    const [showFormatPreview, setShowFormatPreview] = useState(false);
    const [showRawSchema, setShowRawSchema] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Get current contract or create default (memoized to prevent reference changes)
    const currentContract = useMemo(() => contract || createDefaultContract(), [contract]);

    // Auto-extract input fields from prompt template
    const extractedInputs = useMemo(() => {
        if (!promptTemplate) return [];
        return extractInputFields(promptTemplate, currentContract.input.delimiters); // Pass delimiters
    }, [promptTemplate, currentContract.input.delimiters]);

    // Use extracted inputs or manual overrides
    const inputFields = contract?.input.fields.length
        ? contract.input.fields
        : extractedInputs;

    // Sync extracted inputs to contract state if auto_extracted is true
    useEffect(() => {
        if (!currentContract.input.auto_extracted) return;

        const currentFieldsJson = JSON.stringify(currentContract.input.fields);
        const extractedFieldsJson = JSON.stringify(extractedInputs);

        if (currentFieldsJson !== extractedFieldsJson) {
            onContractChange({
                ...currentContract,
                input: {
                    ...currentContract.input,
                    fields: extractedInputs
                }
            });
        }
    }, [extractedInputs, currentContract, onContractChange]);

    // Generate format section preview
    const formatSection = useMemo(() => {
        return generateOutputFormatSection(currentContract);
    }, [currentContract]);

    // Check if schema has content
    const hasSchema = useMemo(() => {
        const schema = currentContract.output.schema;
        if (!schema) return false;
        if (schema.type === 'object') return !!schema.properties && Object.keys(schema.properties).length > 0;
        if (schema.type === 'array') return !!schema.items;
        return false;
    }, [currentContract.output.schema]);

    const handleCopyFormatSection = () => {
        navigator.clipboard.writeText(formatSection);
        toast.success('Format section copied to clipboard');
    };

    const handleCopyRawSchema = () => {
        navigator.clipboard.writeText(JSON.stringify(currentContract.output.schema, null, 2));
        toast.success('JSON Schema copied to clipboard');
    };

    const handleSchemaChange = (schema: GeminiJsonSchema) => {
        onContractChange({
            ...currentContract,
            output: {
                ...currentContract.output,
                schema,
            },
        });
    };

    const handleDelimitersChange = (start: string, end: string) => {
        onContractChange({
            ...currentContract,
            input: {
                ...currentContract.input,
                delimiters: { start, end }
            }
        });
    };

    const handleSyncFields = () => {
        if (!promptTemplate) return;

        const newFields = extractInputFields(promptTemplate, currentContract.input.delimiters);

        onContractChange({
            ...currentContract,
            input: {
                ...currentContract.input,
                fields: newFields,
                auto_extracted: true
            }
        });

        toast.success('Contract fields synced from prompt template');
    };

    const handleExportToggle = (enabled: boolean) => {
        if (!onExportConfigChange) return;
        const current: ExportConfig = exportConfig || {
            enabled: false,
            destination: 'webhook',
            settings: { format: 'json' }
        };
        onExportConfigChange({ ...current, enabled });
    };

    const handleExportDestChange = (destination: "google_sheets" | "webhook" | "email") => {
        if (!onExportConfigChange) return;
        const current: ExportConfig = exportConfig || {
            enabled: true,
            destination: 'webhook',
            settings: { format: 'json' }
        };
        onExportConfigChange({ ...current, destination });
    };

    const handleExportSettingChange = (key: string, value: string) => {
        if (!onExportConfigChange) return;
        const current: ExportConfig = exportConfig || {
            enabled: true,
            destination: 'webhook',
            settings: { format: 'json' }
        };
        onExportConfigChange({
            ...current,
            settings: { ...current.settings, [key]: value } as ExportConfig['settings']
        });
    };

    const toggleDocument = (id: string) => {
        if (!onAuxiliaryInputsChange) return;
        const newIds = selectedDocumentIds.includes(id)
            ? selectedDocumentIds.filter(idx => idx !== id)
            : [...selectedDocumentIds, id];
        onAuxiliaryInputsChange(newIds);
    };

    return (
        <div className="space-y-4">
            {/* AUXILIARY INPUTS Section */}
            <Collapsible open={isAuxOpen} onOpenChange={setIsAuxOpen}>
                <div className="border rounded-lg bg-indigo-500/5 border-indigo-500/10">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-indigo-500/10 rounded-t-lg">
                            <div className="flex items-center gap-2">
                                {isAuxOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <Database className="w-4 h-4 text-indigo-500" />
                                <span className="font-medium text-sm">AUXILIARY INPUTS</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 border-indigo-200">
                                    {selectedDocumentIds.length} docs
                                </Badge>
                            </div>
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <div className="p-3 pt-0 border-t border-indigo-500/10 space-y-3">
                            <div className="mt-3">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">Available Documents</Label>
                                {availableDocuments.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-1.5 max-h-[150px] overflow-y-auto pr-1">
                                        {availableDocuments.map(doc => (
                                            <div
                                                key={doc.id}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md border transition-colors cursor-pointer",
                                                    selectedDocumentIds.includes(doc.id)
                                                        ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800"
                                                        : "bg-background hover:bg-muted/50"
                                                )}
                                                onClick={() => toggleDocument(doc.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedDocumentIds.includes(doc.id)}
                                                    onCheckedChange={() => toggleDocument(doc.id)}
                                                    id={`doc-${doc.id}`}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">{doc.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {doc.file_type.toUpperCase()} • {Math.round(doc.size_bytes / 1024)} KB • ~{doc.token_count_est} tokens
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 border border-dashed rounded-lg bg-muted/30">
                                        <p className="text-xs text-muted-foreground mb-1">No documents in library</p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[10px]"
                                            onClick={() => window.open('/assets', '_blank')}
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add to Library
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-start gap-2 p-2 bg-indigo-50/50 rounded border border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/30">
                                <Info className="w-3 h-3 text-indigo-500 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed">
                                    Selected documents will be snapshotted when you launch an execution and provided as global context to this stage.
                                </p>
                            </div>
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>
            {/* INPUT Section */}
            <Collapsible open={isInputOpen} onOpenChange={setIsInputOpen}>
                <div className="border rounded-lg bg-muted/20">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 rounded-t-lg">
                            <div className="flex items-center gap-2">
                                {isInputOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <FileInput className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-sm">INPUT</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {inputFields.length} fields
                                </Badge>
                                {contract?.input.auto_extracted !== false && (
                                    <span className="text-[10px] text-muted-foreground">(auto-extracted)</span>
                                )}
                            </div>
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <div className="p-3 pt-0 border-t">
                            {/* Delimiter Settings */}
                            <div className="mb-3 mt-3 p-2 bg-background border rounded-md">
                                <Label className="text-xs text-muted-foreground mb-2 block">Variable Delimiters</Label>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">Start:</span>
                                        <Input
                                            value={currentContract.input.delimiters?.start || '{{'}
                                            onChange={(e) => handleDelimitersChange(e.target.value, currentContract.input.delimiters?.end || '}}')}
                                            className="h-7 text-xs font-mono bg-muted/30"
                                            placeholder="{{"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">End:</span>
                                        <Input
                                            value={currentContract.input.delimiters?.end || '}}'}
                                            onChange={(e) => handleDelimitersChange(currentContract.input.delimiters?.start || '{{', e.target.value)}
                                            className="h-7 text-xs font-mono bg-muted/30"
                                            placeholder="}}"
                                        />
                                    </div>
                                </div>
                                {(currentContract.input.delimiters?.start && currentContract.input.delimiters?.start !== '{{') && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mb-2 h-auto py-1.5 text-xs"
                                        onClick={handleSyncFields}
                                    >
                                        <RefreshCw className="w-3 h-3 mr-1.5" />
                                        Sync Variables to Contract
                                    </Button>
                                )}
                            </div>

                            {inputFields.length > 0 ? (
                                <div className="space-y-1.5">
                                    {inputFields.map((field) => (
                                        <InputFieldRow
                                            key={field.name}
                                            field={field}
                                            delimiters={currentContract.input.delimiters}
                                            isInvalid={availableScope !== null && availableScope !== undefined && !availableScope.includes(field.name)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground py-2">
                                    No variables detected. Add {currentContract.input.delimiters?.start || '{{'}variable{currentContract.input.delimiters?.end || '}}'} patterns to your prompt.
                                </p>
                            )}
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>

            {/* OUTPUT Section */}
            <Collapsible open={isOutputOpen} onOpenChange={setIsOutputOpen}>
                <div className={cn(
                    "border rounded-lg transition-colors",
                    hasSchema ? "border-primary/30 bg-primary/5" : "bg-muted/20"
                )}>
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 rounded-t-lg">
                            <div className="flex items-center gap-2">
                                {isOutputOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <FileOutput className="w-4 h-4 text-green-500" />
                                <span className="font-medium text-sm">OUTPUT</span>
                                {hasSchema ? (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600">
                                        defined
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        not defined
                                    </Badge>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditorOpen(true);
                                }}
                            >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                            </Button>
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <div className="p-3 pt-0 border-t space-y-3">
                            {hasSchema && currentContract.output.schema ? (
                                <>
                                    {/* Schema Tree View */}
                                    <div className="bg-background rounded-md p-2 border">
                                        <div className="text-xs font-mono">
                                            <SchemaTreeView schema={currentContract.output.schema} />
                                        </div>
                                    </div>

                                    {/* Action buttons - stacked, full width */}
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs w-full justify-start"
                                            onClick={() => { setShowRawSchema(!showRawSchema); setShowFormatPreview(false); }}
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            {showRawSchema ? 'Hide' : 'Show'} JSON Schema
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs w-full justify-start"
                                            onClick={() => { setShowFormatPreview(!showFormatPreview); setShowRawSchema(false); }}
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            {showFormatPreview ? 'Hide' : 'Show'} Format Preview
                                        </Button>
                                    </div>

                                    {/* Raw JSON Schema */}
                                    {showRawSchema && (
                                        <div className="relative">
                                            <pre className="bg-background border rounded-md p-3 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-[200px]">
                                                {JSON.stringify(currentContract.output.schema, null, 2)}
                                            </pre>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6"
                                                onClick={handleCopyRawSchema}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Format Preview */}
                                    {showFormatPreview && formatSection && (
                                        <div className="relative">
                                            <pre className="bg-background border rounded-md p-3 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-[200px]">
                                                {formatSection}
                                            </pre>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6"
                                                onClick={handleCopyFormatSection}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Define output schema for Gemini structured output
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditorOpen(true)}
                                    >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Define Output Schema
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>

            {/* EXPORT Section */}
            <Collapsible open={isExportOpen} onOpenChange={setIsExportOpen}>
                <div className={cn(
                    "border rounded-lg transition-colors",
                    exportConfig?.enabled ? "border-amber-500/30 bg-amber-500/5" : "bg-muted/20"
                )}>
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 rounded-t-lg">
                            <div className="flex items-center gap-2">
                                {isExportOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <Share2 className="w-4 h-4 text-amber-500" />
                                <span className="font-medium text-sm">STAGE EXPORT</span>
                                {exportConfig?.enabled ? (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-amber-600">
                                        enabled
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        disabled
                                    </Badge>
                                )}
                            </div>
                            <Switch
                                checked={exportConfig?.enabled || false}
                                onCheckedChange={handleExportToggle}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <div className="p-3 pt-0 border-t space-y-4">
                            <div className="mt-3 space-y-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block">Destination</Label>
                                    <Select
                                        value={exportConfig?.destination || 'webhook'}
                                        onValueChange={handleExportDestChange}
                                        disabled={!exportConfig?.enabled}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="webhook">Webhook (n8n/Custom)</SelectItem>
                                            <SelectItem value="google_sheets">Google Sheets via Webhook</SelectItem>
                                            <SelectItem value="email" disabled>Email (Coming Soon)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {exportConfig?.destination === 'webhook' && (
                                    <div>
                                        <Label className="text-xs mb-1.5 block">Webhook URL</Label>
                                        <Input
                                            placeholder="https://n8n.example.com/webhook/..."
                                            value={exportConfig?.settings?.webhook_url || ''}
                                            onChange={(e) => handleExportSettingChange('webhook_url', e.target.value)}
                                            className="h-8 text-xs font-mono"
                                            disabled={!exportConfig?.enabled}
                                        />
                                    </div>
                                )}

                                {exportConfig?.destination === 'google_sheets' && (
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-xs mb-1.5 block">Google Sheet Link (Anyone can edit)</Label>
                                            <Input
                                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                                value={exportConfig?.settings?.sheet_id || ''}
                                                onChange={(e) => handleExportSettingChange('sheet_id', e.target.value)}
                                                className="h-8 text-xs font-mono"
                                                disabled={!exportConfig?.enabled}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs mb-1.5 block">Sheet Name (Tab Name)</Label>
                                            <Input
                                                placeholder="Sheet1"
                                                value={exportConfig?.settings?.worksheet_name || ''}
                                                onChange={(e) => handleExportSettingChange('worksheet_name', e.target.value)}
                                                className="h-8 text-xs"
                                                disabled={!exportConfig?.enabled}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <Label className="text-xs mb-1.5 block">Format</Label>
                                    <Select
                                        value={exportConfig?.settings?.format || 'json'}
                                        onValueChange={(v) => handleExportSettingChange('format', v)}
                                        disabled={!exportConfig?.enabled}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="json">JSON (Full Payload)</SelectItem>
                                            <SelectItem value="csv">CSV (Table only)</SelectItem>
                                            <SelectItem value="tsv">TSV (For Google Sheets)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>

            {/* Output Schema Editor Dialog */}
            <OutputSchemaEditor
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                schema={currentContract.output.schema}
                onSave={handleSchemaChange}
            />
        </div>
    );
}

// ============================================================
// Schema Tree View (renders GeminiJsonSchema as a tree)
// ============================================================

function SchemaTreeView({ schema }: { schema: GeminiJsonSchema }) {
    if (schema.type === 'array') {
        return (
            <>
                <span className="text-muted-foreground">{'['}</span>
                <div className="pl-3">
                    {schema.items && (
                        <PropertyTreeNode name="items" prop={schema.items} isLast />
                    )}
                </div>
                <span className="text-muted-foreground">{']'}</span>
            </>
        );
    }

    const entries = Object.entries(schema.properties || {});
    return (
        <>
            <span className="text-muted-foreground">{'{'}</span>
            <div className="pl-3">
                {entries.map(([name, prop], i) => (
                    <PropertyTreeNode
                        key={name}
                        name={name}
                        prop={prop}
                        isLast={i === entries.length - 1}
                        isRequired={schema.required?.includes(name)}
                    />
                ))}
            </div>
            <span className="text-muted-foreground">{'}'}</span>
        </>
    );
}

function PropertyTreeNode({ name, prop, isLast, isRequired, depth = 0 }: {
    name: string;
    prop: JsonSchemaProperty;
    isLast: boolean;
    isRequired?: boolean;
    depth?: number;
}) {
    const typeColor = {
        string: 'text-green-600',
        number: 'text-blue-600',
        integer: 'text-blue-600',
        boolean: 'text-purple-600',
        array: 'text-amber-600',
        object: 'text-pink-600',
    }[prop.type];

    return (
        <div className="overflow-hidden">
            <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                <span className="text-foreground truncate shrink-0 max-w-[40%]">{name}</span>
                <span className="text-muted-foreground shrink-0">:</span>
                <span className={cn(typeColor, 'shrink-0')}>{prop.type}</span>
                {prop.type === 'array' && prop.items && (
                    <span className="text-muted-foreground shrink-0">{`<${prop.items.type}>`}</span>
                )}
                {prop.enum && (
                    <span className="text-muted-foreground text-[10px] truncate">[{prop.enum.join('|')}]</span>
                )}
                {isRequired && <span className="text-amber-600 text-[10px] shrink-0">•required</span>}
                {!isLast && <span className="text-muted-foreground shrink-0">,</span>}
            </div>
            {prop.type === 'object' && prop.properties && (
                <div className="pl-3 border-l border-dashed border-muted-foreground/30 ml-1">
                    {Object.entries(prop.properties).map(([childName, childProp], i, arr) => (
                        <PropertyTreeNode
                            key={childName}
                            name={childName}
                            prop={childProp}
                            isLast={i === arr.length - 1}
                            isRequired={prop.required?.includes(childName)}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Input field row component
function InputFieldRow({
    field,
    delimiters,
    isInvalid
}: {
    field: InputField;
    delimiters?: { start: string; end: string };
    isInvalid?: boolean;
}) {
    const start = delimiters?.start || '{{';
    const end = delimiters?.end || '}}';
    return (
        <div className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-muted/50">
            <div className="flex items-center gap-2">
                <Badge
                    variant="outline"
                    className={cn(
                        "font-mono text-[10px] px-1.5 py-0 border-0",
                        isInvalid
                            ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-1 ring-inset ring-red-600/20"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    )}
                >
                    {`${start}${field.name}${end}`}
                </Badge>
                {isInvalid && (
                    <span className="text-[10px] text-red-500 font-medium">out of scope</span>
                )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mr-1">
                <span>{field.type}</span>
                {field.required && <span className="text-amber-600">•required</span>}
            </div>
        </div>
    );
}
