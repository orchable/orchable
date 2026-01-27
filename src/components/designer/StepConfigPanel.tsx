import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDesignerStore } from '@/stores/designerStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const stepConfigSchema = z.object({
    label: z.string().min(1, 'Label is required'),
    webhookUrl: z.string().url('Must be a valid URL').or(z.literal('')),
    timeout: z.number().min(1000, 'Min 1s').max(600000, 'Max 10m'),
    maxRetries: z.number().min(0).max(10),
    retryDelay: z.number().min(1000).max(60000)
});

export function StepConfigPanel({ stepId }: { stepId: string }) {
    const { nodes, updateStepData, removeStep } = useDesignerStore();
    const step = nodes.find(n => n.id === stepId);

    const form = useForm<z.infer<typeof stepConfigSchema>>({
        resolver: zodResolver(stepConfigSchema),
        defaultValues: {
            label: '',
            webhookUrl: '',
            timeout: 300000,
            maxRetries: 3,
            retryDelay: 5000
        }
    });

    // Load step data into form when selection changes
    useEffect(() => {
        if (step) {
            const data = step.data as any;
            form.reset({
                label: data.label || '',
                webhookUrl: data.webhookUrl || '',
                timeout: data.timeout || 300000,
                maxRetries: data.retryConfig?.maxRetries || 3,
                retryDelay: data.retryConfig?.retryDelay || 5000
            });
        }
    }, [step, form]);

    const onSubmit = (data: z.infer<typeof stepConfigSchema>) => {
        updateStepData(stepId, {
            label: data.label,
            webhookUrl: data.webhookUrl,
            timeout: data.timeout,
            retryConfig: {
                maxRetries: data.maxRetries,
                retryDelay: data.retryDelay
            }
        });
    };

    if (!step) return null;
    const stepData = step.data as any;

    return (
        <Card className="h-full border-none rounded-none shadow-none">
            <CardHeader>
                <CardTitle className="text-lg">Step {stepData.name} Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="label"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Label</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g. Generate Lesson Plan" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="webhookUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Webhook URL</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="https://n8n.example.com/..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="timeout"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Timeout (ms)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="maxRetries"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Retries</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="retryDelay"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Delay (ms)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="pt-4 space-y-2">
                            <Button type="submit" className="w-full">Update Step</Button>
                            <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                onClick={() => removeStep(stepId)}
                            >
                                Delete Step
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
