import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDesignerStore } from '@/stores/designerStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EdgeConfig, Cardinality } from '@/lib/types';
import { Activity } from 'lucide-react';

const CARDINALITY_OPTIONS: { value: Cardinality; label: string; description: string }[] = [
    { value: 'one_to_one', label: '1:1 (One to One)', description: 'One input → One output' },
    { value: 'one_to_many', label: '1:N (One to Many)', description: 'One input → Multiple outputs' },
    { value: 'many_to_one', label: 'N:1 (Many to One)', description: 'Multiple inputs → One output (Merge)' }
];

const SPLIT_MODES = [
    { value: 'per_item', label: 'Per Item (One task per element)' },
    { value: 'per_batch', label: 'Per Batch (Group elements)' }
];

const edgeConfigSchema = z.object({
    cardinality: z.enum(['1:1', '1:N', 'N:1', 'one_to_one', 'one_to_many', 'many_to_one'] as const).default('one_to_one'),
    split_path: z.string().optional(),
    split_mode: z.enum(['per_item', 'per_batch']).optional(),
    batch_size: z.number().int().min(1).optional(),
    batch_grouping: z.enum(['global', 'isolated']).optional(),
    merge_path: z.string().optional(),
    output_mapping: z.string().optional(),
});

type EdgeConfigFormValues = z.infer<typeof edgeConfigSchema>;

export function EdgeConfigPanel() {
    const selectedEdge = useDesignerStore((state) => state.selectedEdge);
    const updateEdgeData = useDesignerStore((state) => state.updateEdgeData);

    const edgeConfig: EdgeConfig = (selectedEdge?.data as Record<string, unknown>)?.edgeConfig as EdgeConfig || { cardinality: 'one_to_one' };

    const form = useForm<EdgeConfigFormValues>({
        resolver: zodResolver(edgeConfigSchema),
        defaultValues: {
            ...edgeConfig,
        },
    });

    // Reset form when selected edge changes
    useEffect(() => {
        if (selectedEdge) {
            const currentConfig: EdgeConfig = (selectedEdge.data as Record<string, unknown>)?.edgeConfig as EdgeConfig || { cardinality: 'one_to_one' };
            form.reset({
                ...currentConfig,
            });
        }
    }, [selectedEdge?.id, form]);

    // Save to store immediately when values change
    useEffect(() => {
        const subscription = form.watch((value) => {
            if (selectedEdge?.id) {
                const newData = {
                    ...selectedEdge.data,
                    edgeConfig: { ...value } as EdgeConfig,
                };
                updateEdgeData(selectedEdge.id, newData);
            }
        });
        return () => subscription.unsubscribe();
    }, [form, selectedEdge, updateEdgeData]);

    if (!selectedEdge) return null;

    const cardinality = form.watch('cardinality');
    const isOneToMany = cardinality === '1:N' || cardinality === 'one_to_many';
    const isManyToOne = cardinality === 'N:1' || cardinality === 'many_to_one';

    return (
        <Card className="rounded-none border-x-0 border-b-0 h-[calc(100vh-80px)] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Edge Configuration
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <Form {...form}>
                    <form className="space-y-6">
                        <FormField
                            control={form.control}
                            name="cardinality"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cardinality</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {CARDINALITY_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="font-mono">
                                                            {opt.label}
                                                        </Badge>
                                                        <span className="text-muted-foreground text-xs">
                                                            {opt.description}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isOneToMany && (
                            <div className="space-y-4 pl-4 border-l-2 border-muted pt-2 pb-2">
                                <FormField
                                    control={form.control}
                                    name="split_path"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Split Path</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. result.questions" className="font-mono text-sm" value={field.value || ''} />
                                            </FormControl>
                                            <FormDescription>JSON path to the array to split</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="split_mode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Split Mode</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'per_item'}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {SPLIT_MODES.map(mode => (
                                                        <SelectItem key={mode.value} value={mode.value}>
                                                            {mode.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                {form.watch('split_mode') === 'per_batch' && (
                                    <FormField
                                        control={form.control}
                                        name="batch_size"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Batch Size</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="number"
                                                        {...field}
                                                        value={field.value || ''}
                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                                                        placeholder="e.g. 10" 
                                                        className="font-mono text-sm" 
                                                    />
                                                </FormControl>
                                                <FormDescription>Number of items per batch</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        )}
                        
                        {(isOneToMany || isManyToOne) && (
                            <div className="space-y-4 pl-4 border-l-2 border-muted pb-2">
                                <FormField
                                    control={form.control}
                                    name="batch_grouping"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Batch Grouping</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'global'}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="global">Global (All items in Launch)</SelectItem>
                                                    <SelectItem value="isolated">Isolated (Per Parent item)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                How downstream Many to One merges should aggregate tasks.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {isManyToOne && (
                            <div className="space-y-4 pl-4 border-l-2 border-orange-500 pt-2 pb-2">
                                <FormField
                                    control={form.control}
                                    name="merge_path"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-orange-600 dark:text-orange-400">Merge Path</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. output_data" className="font-mono text-sm border-orange-200 focus-visible:ring-orange-500" value={field.value || ''} />
                                            </FormControl>
                                            <FormDescription>JSON path in sibling outputs to aggregate (e.g. "output_data" moves task.output_data[] into one array)</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="output_mapping"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Output Mapping</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g. result" className="font-mono text-sm" value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>Key to map content to for next stage</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
