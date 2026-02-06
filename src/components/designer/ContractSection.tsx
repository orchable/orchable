/**
 * ContractSection - Display Input/Output Contract for a Stage
 * 
 * Shows auto-extracted input variables and output schema definition.
 * Allows editing output schema via OutputSchemaEditor dialog.
 */

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileInput, FileOutput, Edit, Copy, Eye, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { StageContract, InputField, OutputSchemaField } from '@/lib/types';
import { extractInputFields, generateOutputFormatSection, createDefaultContract } from '@/lib/schemaUtils';
import { OutputSchemaEditor } from '@/components/designer/OutputSchemaEditor';

interface ContractSectionProps {
    promptTemplate?: string;
    contract?: StageContract;
    availableScope?: string[] | null;
    onContractChange: (contract: StageContract) => void;
    onPromptTemplateChange?: (newPrompt: string) => void;
}

export function ContractSection({ promptTemplate, contract, availableScope, onContractChange, onPromptTemplateChange }: ContractSectionProps) {
    const [isInputOpen, setIsInputOpen] = useState(true);
    const [isOutputOpen, setIsOutputOpen] = useState(true);
    const [showFormatPreview, setShowFormatPreview] = useState(false);
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
    // This ensures the fields are persisted when the stage is saved
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
    }, [extractedInputs, currentContract.input.auto_extracted, currentContract.input.fields, onContractChange]);



    // Generate format section preview
    const formatSection = useMemo(() => {
        return generateOutputFormatSection(currentContract);
    }, [currentContract]);

    const handleCopyFormatSection = () => {
        navigator.clipboard.writeText(formatSection);
        toast.success('Format section copied to clipboard');
    };

    const handleSchemaChange = (schema: OutputSchemaField[], rootType: 'object' | 'array') => {
        onContractChange({
            ...currentContract,
            output: {
                ...currentContract.output,
                schema,
                rootType,
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

        // Force extraction with current delimiters and update contract
        const newFields = extractInputFields(promptTemplate, currentContract.input.delimiters);

        onContractChange({
            ...currentContract,
            input: {
                ...currentContract.input,
                fields: newFields,
                auto_extracted: true // Re-enable auto-extract if it was manually disabled
            }
        });

        toast.success('Contract fields synced from prompt template');
    };

    return (
        <div className="space-y-4">
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
                    currentContract.output.schema?.length ? "border-primary/30 bg-primary/5" : "bg-muted/20"
                )}>
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 rounded-t-lg">
                            <div className="flex items-center gap-2">
                                {isOutputOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <FileOutput className="w-4 h-4 text-green-500" />
                                <span className="font-medium text-sm">OUTPUT</span>
                                {currentContract.output.schema?.length ? (
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
                            {currentContract.output.schema?.length ? (
                                <>
                                    {/* Schema Tree View */}
                                    <div className="bg-background rounded-md p-2 border">
                                        <div className="text-xs font-mono">
                                            <span className="text-muted-foreground">
                                                {currentContract.output.rootType === 'array' ? '[' : '{'}
                                            </span>
                                            <div className="pl-3">
                                                {currentContract.output.schema.map((field, i) => (
                                                    <SchemaFieldRow
                                                        key={field.name}
                                                        field={field}
                                                        isLast={i === currentContract.output.schema!.length - 1}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-muted-foreground">
                                                {currentContract.output.rootType === 'array' ? ']' : '}'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Format Preview Toggle */}
                                    <div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs w-full justify-start"
                                            onClick={() => setShowFormatPreview(!showFormatPreview)}
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            {showFormatPreview ? 'Hide' : 'Show'} Generated Format Section
                                        </Button>

                                        {showFormatPreview && formatSection && (
                                            <div className="mt-2 relative">
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
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Define output schema to auto-inject format section into prompt
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

            {/* Output Schema Editor Dialog */}
            <OutputSchemaEditor
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                schema={currentContract.output.schema || []}
                rootType={currentContract.output.rootType || 'object'}
                onSave={handleSchemaChange}
            />
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

// Schema field row component (recursive for nested)
function SchemaFieldRow({ field, isLast, depth = 0 }: { field: OutputSchemaField; isLast: boolean; depth?: number }) {
    const typeColor = {
        string: 'text-green-600',
        number: 'text-blue-600',
        boolean: 'text-purple-600',
        array: 'text-amber-600',
        object: 'text-pink-600',
    }[field.type];

    return (
        <div>
            <div className="flex items-center gap-1">
                <span className="text-foreground">{field.name}</span>
                <span className="text-muted-foreground">:</span>
                <span className={cn(typeColor)}>{field.type}</span>
                {field.type === 'array' && field.items && (
                    <span className="text-muted-foreground">{`<${field.items.type}>`}</span>
                )}
                {!isLast && <span className="text-muted-foreground">,</span>}
            </div>
            {field.type === 'object' && field.properties && (
                <div className="pl-3 border-l border-dashed border-muted-foreground/30 ml-1">
                    {field.properties.map((prop, i) => (
                        <SchemaFieldRow
                            key={prop.name}
                            field={prop}
                            isLast={i === field.properties!.length - 1}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
