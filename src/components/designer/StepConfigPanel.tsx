import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDesignerStore } from '@/stores/designerStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { n8nService } from '@/services/n8nService';
import { toast } from 'sonner';

const stepConfigSchema = z.object({
    label: z.string().min(1, 'Label is required'),
    webhookUrl: z.string().refine((val) => {
        if (!val) return true;
        // Allow absolute URLs (http/https) OR relative paths (starting with /)
        return /^(https?:\/\/|\/)/.test(val);
    }, 'Must be a valid URL (http/https) or relative path (starts with /)'),
    timeout: z.number().min(1000, 'Min 1s').max(600000, 'Max 10m'),
    maxRetries: z.number().min(0).max(10),
    retryDelay: z.number().min(1000).max(60000)
});

interface Workflow { id: string; name: string; }

export function StepConfigPanel({ stepId }: { stepId: string }) {
    const { nodes, updateStepData, removeStep } = useDesignerStore();
    const step = nodes.find(n => n.id === stepId);

    const [workflows, setWorkflows] = useState<Workflow[]>([]);

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

    useEffect(() => {
        const loadWorkflows = async () => {
            try {
                const wfs = await n8nService.listWorkflows();
                setWorkflows(wfs);
            } catch (err: any) {
                console.error("Failed to load workflows:", err);
                toast.error(`Could not load workflows: ${err.message}`);
            }
        };
        // Load only if panel is open and api key exists locally
        if (localStorage.getItem("lovable_n8n_api_key")) {
            loadWorkflows();
        }
    }, []);

    const handleWorkflowSelect = async (workflowId: string) => {
        if (!workflowId || workflowId === "none") return;

        try {
            toast.info("Fetching webhook URL...");
            const webhookUrl = await n8nService.getWorkflowWebhook(workflowId);

            if (webhookUrl) {
                form.setValue("webhookUrl", webhookUrl, { shouldDirty: true });
                toast.success("Webhook URL auto-filled!");

                // Optional: Auto-set label from workflow name if empty
                const wf = workflows.find(w => w.id === workflowId);
                const currentLabel = form.getValues("label");
                if (wf && (!currentLabel || currentLabel === "New Step")) {
                    form.setValue("label", wf.name);
                }
            } else {
                toast.warning("No 'Webhook' node found in this workflow.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch workflow details.");
        }
    };

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

                        {/* N8N Workflow Selection */}
                        <div className="space-y-2">
                            <FormLabel>Data Source</FormLabel>
                            <Select onValueChange={(value) => handleWorkflowSelect(value)}>
                                <FormControl>
                                    <SelectTrigger className="text-left">
                                        <SelectValue placeholder="Select n8n Workflow (Automatic)" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {workflows.map((wf) => (
                                        <SelectItem key={wf.id} value={wf.id}>
                                            {wf.name}
                                        </SelectItem>
                                    ))}
                                    {workflows.length === 0 && (
                                        <SelectItem value="none" disabled>
                                            No workflows found (Check Settings)
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Selecting a workflow will auto-fill the Webhook URL (requires 'Webhook' node).
                            </p>
                        </div>

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
