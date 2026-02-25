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
import { Separator } from '@/components/ui/separator';
import { n8nService } from '@/services/n8nService';
import { toast } from 'sonner';
import { PrePostProcessSection } from './PrePostProcessSection';
import type { PreProcessConfig, PostProcessConfig } from '@/lib/types';

const stepConfigSchema = z.object({
    label: z.string().min(1, 'Label is required'),
    webhookUrl: z.string().refine((val) => {
        if (!val) return true;
        // Allow absolute URLs (http/https) OR relative paths (starting with /)
        return /^(https?:\/\/|\/)/.test(val);
    }, 'Must be a valid URL (http/https) or relative path (starts with /)'),
    webhookMethod: z.enum(['GET', 'POST']).default('POST'),
    authType: z.enum(['none', 'header']).default('none'),
    authHeaderName: z.string().optional(),
    authHeaderValue: z.string().optional(),
    timeout: z.number().min(1000, 'Min 1s').max(600000, 'Max 10m'),
    maxRetries: z.number().min(0).max(10),
    retryDelay: z.number().min(1000).max(60000),
    n8nWorkflowId: z.string().optional()
});

interface Workflow { id: string; name: string; }

export function StepConfigPanel({ stepId }: { stepId: string }) {
    const { nodes, updateStepData, removeStep } = useDesignerStore();
    const step = nodes.find(n => n.id === stepId);

    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [preProcessConfig, setPreProcessConfig] = useState<PreProcessConfig | undefined>(undefined);
    const [postProcessConfig, setPostProcessConfig] = useState<PostProcessConfig | undefined>(undefined);

    const form = useForm<z.infer<typeof stepConfigSchema>>({
        resolver: zodResolver(stepConfigSchema),
        defaultValues: {
            label: '',
            webhookUrl: '',
            webhookMethod: 'POST',
            authType: 'none',
            authHeaderName: 'X-API-KEY',
            authHeaderValue: '',
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
        if (localStorage.getItem("orchable_n8n_api_key")) {
            loadWorkflows();
        }
    }, []);

    const handleWorkflowSelect = async (workflowId: string) => {
        if (!workflowId || workflowId === "none") return;

        try {
            // Store the ID
            form.setValue("n8nWorkflowId", workflowId, { shouldDirty: true });

            toast.info("Fetching webhook URL...");
            // ... existing fetch logic
            const result = await n8nService.getWorkflowWebhook(workflowId);

            if (result) {
                form.setValue("webhookUrl", result.url, { shouldDirty: true });
                form.setValue("webhookMethod", result.method, { shouldDirty: true });
                toast.success(`Webhook auto-filled! Method: ${result.method}`);

                // ... label logic
                const wf = workflows.find(w => w.id === workflowId);
                const currentLabel = form.getValues("label");
                if (wf && (!currentLabel || currentLabel === "New Step")) {
                    form.setValue("label", wf.name);
                }
            } else {
                toast.warning("No 'Webhook' node found in this workflow.");
            }
        } catch (error) {
            // ... error handling
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
                webhookMethod: data.webhookMethod || 'POST',
                authType: data.authConfig?.type || 'none',
                authHeaderName: data.authConfig?.headerName || 'X-API-KEY',
                authHeaderValue: data.authConfig?.headerValue || '',
                timeout: data.timeout || 300000,
                maxRetries: data.retryConfig?.maxRetries || 3,
                retryDelay: data.retryConfig?.retryDelay || 5000,
                // @ts-ignore
                n8nWorkflowId: data.n8nWorkflowId || ''
            });
            // Load pre/post process configs
            setPreProcessConfig(data.pre_process);
            setPostProcessConfig(data.post_process);
        }
    }, [step, form]);

    const onSubmit = (data: z.infer<typeof stepConfigSchema> & { n8nWorkflowId?: string }) => {
        updateStepData(stepId, {
            label: data.label,
            webhookUrl: data.webhookUrl,
            webhookMethod: data.webhookMethod,
            authConfig: {
                type: data.authType,
                headerName: data.authHeaderName,
                headerValue: data.authHeaderValue
            },
            timeout: data.timeout,
            retryConfig: {
                maxRetries: data.maxRetries,
                retryDelay: data.retryDelay
            },
            n8nWorkflowId: form.getValues("n8nWorkflowId"),
            // Pre/Post Process Hooks
            pre_process: preProcessConfig,
            post_process: postProcessConfig,
        });
        toast.success("Step updated successfully!");
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
                            <Select
                                value={form.watch("n8nWorkflowId")}
                                onValueChange={(value) => handleWorkflowSelect(value)}
                            >
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

                        <div className="flex gap-4">
                            <FormField
                                control={form.control}
                                name="webhookMethod"
                                render={({ field }) => (
                                    <FormItem className="w-[120px]">
                                        <FormLabel>Method</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="GET">GET</SelectItem>
                                                <SelectItem value="POST">POST</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="webhookUrl"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Webhook URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    // If user manually edits URL, clear the linked workflow ID
                                                    // to switch back to HTTP Request mode
                                                    form.setValue("n8nWorkflowId", undefined, { shouldDirty: true });
                                                }}
                                                placeholder="https://n8n.example.com/..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Authentication */}
                        <div className="space-y-4 border rounded-lg p-3 bg-muted/20">
                            <FormField
                                control={form.control}
                                name="authType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            Authentication
                                            <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Auth Type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                <SelectItem value="header">Header Auth (API Key)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {form.watch("authType") === "header" && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <FormField
                                        control={form.control}
                                        name="authHeaderName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Header Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="X-API-KEY" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="authHeaderValue"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Value</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="password" placeholder="Key/Token" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

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

                        {/* Pre/Post Process Hooks */}
                        <Separator className="my-4" />
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Processing Hooks</h4>
                            <PrePostProcessSection
                                type="pre"
                                config={preProcessConfig}
                                onChange={(config) => setPreProcessConfig(config as PreProcessConfig | undefined)}
                                workflows={workflows}
                            />
                            <PrePostProcessSection
                                type="post"
                                config={postProcessConfig}
                                onChange={(config) => setPostProcessConfig(config as PostProcessConfig | undefined)}
                                workflows={workflows}
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
