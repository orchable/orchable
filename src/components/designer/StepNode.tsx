import { Handle, Position } from '@xyflow/react';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { StepBadge } from '@/components/common/StepBadge';
import { Badge } from '@/components/ui/badge';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Cardinality, StageContract, JsonSchemaProperty } from '@/lib/types';
import { summarizeInputFields, summarizeOutputSchema, extractInputFields } from '@/lib/schemaUtils';
import { Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StepNodeProps {
    data: {
        stepId: string;
        name: string; // 'A', 'B', 'C', 'D', 'E'
        label: string;
        webhookUrl?: string;       // Legacy
        task_type?: string;        // New: stage task type
        stage_key?: string;        // New: stage key
        cardinality?: Cardinality; // New: 1:1, 1:N, N:1
        prompt_template?: string;  // Prompt template content for input extraction
        contract?: StageContract;  // Input/Output contract
        sub_orchestration_id?: string;
    };
    selected: boolean;
}

/** Renders a single [name, JsonSchemaProperty] pair and its nested children */
const JsonSchemaNode = ({ name, prop, depth = 0 }: { name: string; prop: JsonSchemaProperty; depth?: number }) => {
    return (
        <div className="space-y-0.5">
            <div className={cn(
                "text-[10px] grid grid-cols-[1fr_auto] gap-2 items-center hover:bg-muted/50 px-1 rounded cursor-default",
                depth > 0 && "ml-3 border-l pl-2"
            )}>
                <div className="flex items-center gap-1 min-w-0">
                    <code className="bg-muted/50 px-1 rounded text-green-600 truncate font-mono" title={name}>
                        {name}
                    </code>
                    {prop.description && (
                        <span className="text-muted-foreground truncate opacity-70 max-w-[80px]" title={prop.description}>
                            - {prop.description}
                        </span>
                    )}
                </div>
                <span className="text-muted-foreground font-mono opacity-70">
                    {prop.type}{prop.type === 'array' && prop.items ? `<${prop.items.type}>` : ''}
                </span>
            </div>

            {/* Recursive render for Object properties */}
            {prop.type === 'object' && prop.properties && Object.entries(prop.properties).map(([childName, childProp]) => (
                <JsonSchemaNode key={childName} name={childName} prop={childProp} depth={depth + 1} />
            ))}

            {/* Recursive render for Array<object> items */}
            {prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties && (
                <div className="ml-3 border-l pl-2">
                    <div className="text-[9px] text-muted-foreground italic px-1">Item properties:</div>
                    {Object.entries(prop.items.properties).map(([childName, childProp]) => (
                        <JsonSchemaNode key={childName} name={childName} prop={childProp} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export function StepNode({ data, selected }: StepNodeProps) {
    // Check if configured: either webhook (legacy) or task_type (new)
    const isConfigured = !!(data.webhookUrl || data.task_type);
    const cardinality = data.cardinality || '1:1';
    const navigate = useNavigate();
    const isSubOrch = data.task_type === 'sub_orchestration';

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (isSubOrch && data.sub_orchestration_id) {
            e.stopPropagation();
            navigate(`/designer/${data.sub_orchestration_id}`);
        }
    };

    // Compute IN/OUT summary
    const ioSummary = useMemo(() => {
        if (!isConfigured) return null;

        // Get input summary from contract or extract from prompt
        let inputSummary = 'none';
        if (data.contract?.input.fields.length) {
            inputSummary = summarizeInputFields(data.contract.input.fields);
        } else if (data.prompt_template) {
            const extracted = extractInputFields(data.prompt_template);
            inputSummary = summarizeInputFields(extracted);
        }

        // Get output summary from contract
        let outputSummary = '—';
        const outputSchema = data.contract?.output.schema;
        if (outputSchema?.type) {
            outputSummary = summarizeOutputSchema(data.contract);
        }

        return { input: inputSummary, output: outputSummary };
    }, [data.contract, data.prompt_template, isConfigured]);

    return (
        <div className="relative group">
            <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                    <Card className={cn(
                        "w-52 p-4 cursor-pointer transition-all border-2 relative",
                        // Base
                        "bg-card",
                        // Configured (Green) - only when not selected
                        isConfigured && !selected && "border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/20 hover:shadow-md hover:shadow-emerald-500/20",
                        // Not Configured & Not Selected
                        !isConfigured && !selected && "border-border group-hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                        // Selected (Primary Blue Override)
                        // Selected (Primary Blue Override)
                        selected && "border-primary shadow-lg shadow-primary/10",
                        // Sub-orch specific style
                        isSubOrch && "border-dashed"
                    )}
                        onDoubleClick={handleDoubleClick}
                    >
                        <div className="flex items-center gap-3">
                            <StepBadge name={data.name} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{data.label}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {data.task_type || data.webhookUrl ? (
                                        data.task_type ? `Task: ${data.task_type}` : 'Webhook configured'
                                    ) : (
                                        'Not configured'
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* IO Summary - Show when configured and has contract */}
                        {ioSummary && (ioSummary.input !== 'none' || ioSummary.output !== '—') && (
                            <div className="mt-2 pt-2 border-t border-dashed border-muted-foreground/20 text-[10px] font-mono space-y-0.5">
                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 truncate">
                                    <span className="opacity-60">IN:</span>
                                    <span className="truncate">{ioSummary.input}</span>
                                </div>
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 truncate">
                                    <span className="opacity-60">OUT:</span>
                                    <span className="truncate">{ioSummary.output}</span>
                                </div>
                            </div>
                        )}

                        {/* Cardinality Badge */}
                        {cardinality !== '1:1' && (
                            <Badge
                                variant="secondary"
                                className="absolute -top-2 -right-2 text-[10px] font-mono px-1.5 py-0"
                            >
                                {cardinality}
                            </Badge>
                        )}

                        {/* Sub-orchestration Indicator */}
                        {isSubOrch && (
                            <div
                                className="absolute -top-2 -left-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md border border-background"
                                title="Nested Orchestration"
                            >
                                <Layers className="w-3 h-3" />
                            </div>
                        )}

                        {/* Connection Handles - Visual only */}
                        <div className={cn(
                            "absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background transition-colors z-10",
                            selected ? "border-primary" : (isConfigured ? "border-emerald-500/70" : "border-muted-foreground/30 group-hover:border-primary")
                        )} />
                        <div className={cn(
                            "absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background transition-colors z-10",
                            selected ? "border-primary" : (isConfigured ? "border-emerald-500/70" : "border-muted-foreground/30 group-hover:border-primary")
                        )} />
                    </Card>
                </HoverCardTrigger>

                {/* Hover Content: Contract Details */}
                {data.contract && (
                    <HoverCardContent className="w-[500px] p-0 overflow-hidden z-[1000]" align="start" side="right">
                        <div className="bg-muted/40 p-3 border-b">
                            <h4 className="font-semibold text-sm flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <StepBadge name={data.name} size="sm" className="w-5 h-5 text-[10px]" />
                                    {data.label}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                    Type: {data.task_type || 'generic'}
                                </div>
                            </h4>
                        </div>

                        <ScrollArea className="max-h-[350px]">
                            <div className="grid grid-cols-2 divide-x h-full min-h-[150px]">
                                {/* Input Section */}
                                <div className="p-2 space-y-1.5 bg-blue-50/5 dark:bg-blue-900/5">
                                    <div className="flex items-center justify-between px-1 mb-1">
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-200 bg-blue-50 text-blue-700">INPUT</Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                            {data.contract.input.fields.length} fields
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {data.contract.input.fields.length > 0 ? (
                                            data.contract.input.fields.map((field, i) => (
                                                <div key={i} className="text-[10px] grid grid-cols-[1fr_auto] gap-2 items-center hover:bg-muted/50 px-1 rounded">
                                                    <code className="bg-muted/50 px-1 rounded text-blue-600 font-mono truncate" title={field.name}>{field.name}</code>
                                                    <span className="text-muted-foreground font-mono opacity-70">{field.type}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-[10px] text-muted-foreground italic px-1">No input fields</div>
                                        )}
                                    </div>
                                </div>

                                {/* Output Section */}
                                <div className="p-2 space-y-1.5 bg-green-50/5 dark:bg-green-900/5">
                                    <div className="flex items-center justify-between px-1 mb-1">
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-green-200 bg-green-50 text-green-700">OUTPUT</Badge>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                            {data.contract.output.schema?.type || 'object'}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {(() => {
                                            const schema = data.contract.output.schema;
                                            if (!schema?.type) {
                                                return <div className="text-[10px] text-muted-foreground italic px-1">No output schema</div>;
                                            }
                                            // Object root: render each property
                                            if (schema.type === 'object' && schema.properties) {
                                                return Object.entries(schema.properties).map(([name, prop]) => (
                                                    <JsonSchemaNode key={name} name={name} prop={prop} />
                                                ));
                                            }
                                            // Array root: show item schema
                                            if (schema.type === 'array' && schema.items) {
                                                return <JsonSchemaNode name="[ ]" prop={schema.items} />;
                                            }
                                            return <div className="text-[10px] text-muted-foreground italic px-1">Empty schema</div>;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </HoverCardContent>
                )}
            </HoverCard>

            {/* Actual ReactFlow Handles */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-6 h-6 !bg-transparent !border-none !top-[-12px] !left-1/2 !-translate-x-1/2 cursor-crosshair z-50"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-6 h-6 !bg-transparent !border-none !bottom-[-12px] !left-1/2 !-translate-x-1/2 cursor-crosshair z-50"
            />
        </div>
    );
}
