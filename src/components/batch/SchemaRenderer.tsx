import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Settings2, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeminiJsonSchema, JsonSchemaProperty } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';

interface SchemaRendererProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    schema: GeminiJsonSchema | JsonSchemaProperty;
    depth?: number;
    className?: string;
    systemHiddenFields?: string[]; // Fixed fields (e.g. tracking IDs)
    initialHiddenFields?: string[]; // Persisted user settings from view_config
    onSaveConfig?: (config: { hiddenFields: string[] }) => Promise<void>;
}

/**
 * Recursively renders data according to its JSON Schema definition.
 * Specifically optimized for Gemini structured output.
 */
export const SchemaRenderer: React.FC<SchemaRendererProps> = ({
    data,
    schema,
    depth = 0,
    className,
    systemHiddenFields = [],
    initialHiddenFields = [],
    onSaveConfig
}) => {
    // Local state for user-toggled hidden fields
    const [userHiddenFields, setUserHiddenFields] = useState<string[]>(initialHiddenFields);
    const [isSaving, setIsSaving] = useState(false);

    // Stable serialized key for comparing initialHiddenFields across renders
    const initialHiddenKey = useMemo(() => JSON.stringify(initialHiddenFields), [initialHiddenFields]);

    // Sync local state when initialHiddenFields changes
    // (e.g., after async template fetch, or switching to a different task)
    useEffect(() => {
        setUserHiddenFields(JSON.parse(initialHiddenKey));
    }, [initialHiddenKey]);

    const allHiddenFields = useMemo(() => {
        return [...systemHiddenFields, ...userHiddenFields];
    }, [systemHiddenFields, userHiddenFields]);

    const toggleField = (field: string) => {
        setUserHiddenFields(prev =>
            prev.includes(field)
                ? prev.filter(f => f !== field)
                : [...prev, field]
        );
    };

    if (data === undefined || data === null) {
        return <span className="text-muted-foreground italic">null</span>;
    }

    // --- ARRAY RENDERING ---
    if (schema.type === 'array') {
        const items = Array.isArray(data) ? data : [];
        const itemSchema = schema.items;

        if (items.length === 0) {
            return <span className="text-muted-foreground italic text-sm">Empty array</span>;
        }

        // If it's an array of objects, render as a Table
        if (itemSchema?.type === 'object' && itemSchema.properties) {
            const allPropKeys = Object.keys(itemSchema.properties);
            const visiblePropKeys = allPropKeys.filter(key =>
                !allHiddenFields.some(hf => hf.toLowerCase() === key.toLowerCase())
            );

            const minTableWidth = Math.max(1000, visiblePropKeys.length * 180);

            return (
                <div className={cn("space-y-2 my-4", className)}>
                    {/* Column Toggle UI (only show at top-ish levels to avoid clutter) */}
                    {depth < 2 && (
                        <div className="flex justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 text-[11px] gap-2 border-dashed">
                                        <Settings2 className="w-3.5 h-3.5" />
                                        Columns
                                        {userHiddenFields.length > 0 && (
                                            <Badge variant="secondary" className="ml-1 px-1 h-4 min-w-[16px] text-[9px] bg-primary text-primary-foreground border-none">
                                                {userHiddenFields.length}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 overflow-hidden flex flex-col">
                                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground/70">Toggle Columns</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {allPropKeys.map(key => {
                                            const isSystemFixed = systemHiddenFields.some(hf => hf.toLowerCase() === key.toLowerCase());
                                            const isUserHidden = userHiddenFields.includes(key);

                                            return (
                                                <DropdownMenuCheckboxItem
                                                    key={key}
                                                    checked={!isSystemFixed && !isUserHidden}
                                                    onCheckedChange={() => toggleField(key)}
                                                    disabled={isSystemFixed}
                                                    className="text-xs"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {(!isSystemFixed && !isUserHidden) ? <Eye className="w-3 h-3 opacity-50" /> : <EyeOff className="w-3 h-3 opacity-50" />}
                                                        <span className="truncate max-w-[140px]">
                                                            {itemSchema.properties?.[key]?.description || key}
                                                        </span>
                                                        {isSystemFixed && <span className="text-[9px] opacity-40 ml-auto">Fixed</span>}
                                                    </div>
                                                </DropdownMenuCheckboxItem>
                                            );
                                        })}
                                    </div>
                                    {onSaveConfig && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <div className="p-2 pt-0">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full h-8 text-[10px] gap-2"
                                                    disabled={isSaving}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setIsSaving(true);
                                                        try {
                                                            await onSaveConfig({ hiddenFields: userHiddenFields });
                                                        } finally {
                                                            setIsSaving(false);
                                                        }
                                                    }}
                                                >
                                                    {isSaving ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3 h-3" />
                                                    )}
                                                    Save as Default
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    <div className="rounded-md border border-muted/50 bg-card" style={{ width: '100%', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                            <Table style={{ minWidth: visiblePropKeys.length > 0 ? `${minTableWidth}px` : '100%' }}>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-muted/50">
                                        {visiblePropKeys.map(key => (
                                            <TableHead key={key} className="h-10 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap text-muted-foreground px-4">
                                                {itemSchema.properties?.[key]?.description || key}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, idx) => (
                                        <TableRow key={idx} className="hover:bg-primary/[0.01] border-muted/50 transition-colors">
                                            {visiblePropKeys.map(key => (
                                                <TableCell key={key} className="py-3 px-4 align-top">
                                                    <SchemaRenderer
                                                        data={item?.[key]}
                                                        schema={itemSchema.properties![key]}
                                                        depth={depth + 1}
                                                        systemHiddenFields={systemHiddenFields}
                                                        initialHiddenFields={userHiddenFields}
                                                    />
                                                </TableCell>
                                            ))}
                                            {visiblePropKeys.length === 0 && (
                                                <TableCell className="text-center py-10 text-muted-foreground italic text-xs">
                                                    No visible columns
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            );
        }

        // Otherwise render as a list of badges/chips
        return (
            <div className={cn("flex flex-wrap gap-1 my-1", className)}>
                {items.map((item, idx) => (
                    <Badge key={idx} variant="secondary" className="font-normal text-[11px] bg-primary/5 text-primary border-primary/20">
                        {String(item)}
                    </Badge>
                ))}
            </div>
        );
    }

    // --- OBJECT RENDERING ---
    if (schema.type === 'object' && schema.properties) {
        const propKeys = Object.keys(schema.properties).filter(key =>
            !allHiddenFields.some(hf => hf.toLowerCase() === key.toLowerCase())
        );

        // Heuristic for "Compact Layout" (e.g. stats/batch_info)
        // If all fields are primitives and there are <= 6 fields, render in a grid
        const isCompact = propKeys.length <= 6 && propKeys.every(key => {
            const type = schema.properties?.[key]?.type;
            return type !== 'object' && type !== 'array';
        });

        if (isCompact) {
            return (
                <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-3 rounded-lg border border-primary/10 bg-primary/5 my-2", className)}>
                    {propKeys.map(key => {
                        const propSchema = schema.properties![key];
                        return (
                            <div key={key} className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">
                                    {propSchema.description || key}
                                </label>
                                <SchemaRenderer
                                    data={data[key]}
                                    schema={propSchema}
                                    depth={depth + 1}
                                    systemHiddenFields={systemHiddenFields}
                                    initialHiddenFields={userHiddenFields}
                                />
                            </div>
                        );
                    })}
                </div>
            );
        }

        // If we are at depth 0, we don't necessarily need a wrapper card
        // if nested, use a subtle card
        const Wrapper = depth > 0 ? Card : React.Fragment;
        const wrapperProps = depth > 0 ? { className: "mt-2 border-muted/50 shadow-none bg-muted/10 overflow-hidden" } : {};

        return (
            <Wrapper {...wrapperProps}>
                <div className={cn(depth > 0 ? "p-4 space-y-4" : "space-y-6", className)}>
                    {propKeys.map(key => {
                        const propSchema = schema.properties![key];
                        return (
                            <div key={key} className="group">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-1.5 mb-1.5 group-hover:text-primary transition-colors">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/30 group-hover:bg-primary" />
                                    {propSchema.description || key}
                                    {schema.required?.includes(key) && (
                                        <span className="text-destructive font-bold ml-0.5">*</span>
                                    )}
                                </label>
                                <div className="pl-3 border-l-2 border-muted transition-colors group-hover:border-primary/20">
                                    <SchemaRenderer
                                        data={data[key]}
                                        schema={propSchema}
                                        depth={depth + 1}
                                        systemHiddenFields={systemHiddenFields}
                                        initialHiddenFields={userHiddenFields}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Wrapper>
        );
    }

    // --- PRIMITIVE RENDERING ---
    switch (schema.type) {
        case 'boolean':
            return (
                <Badge variant={data ? "default" : "secondary"} className={cn("text-[10px] h-5", data ? "bg-green-500/10 text-green-600 border-green-200" : "bg-muted/10 text-muted-foreground")}>
                    {data ? 'YES' : 'NO'}
                </Badge>
            );
        case 'number':
        case 'integer':
            return <code className="text-[12px] bg-muted px-1.5 py-0.5 rounded font-mono text-primary">{data}</code>;
        case 'string':
            if (schema.enum) {
                return (
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-primary/5 text-primary border-primary/20">
                        {data}
                    </Badge>
                );
            }
            return <span className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{String(data)}</span>;
        default:
            return <span className="text-sm">{String(data)}</span>;
    }
};
