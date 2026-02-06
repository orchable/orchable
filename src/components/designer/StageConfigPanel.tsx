import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDesignerStore } from '@/stores/designerStore';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Alert,
    AlertTitle,
    AlertDescription
} from '@/components/ui/alert';
import {
    AlertCircle,
    Settings,
    Zap,
    FileText,
    Trash2,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Maximize2,
    Type,
    Webhook,
    FileInput,
    Download,
    Upload,
    Copy,
    Share2,
    Code,
    History,
    Braces
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { PrePostProcessSection } from './PrePostProcessSection';
import { ContractSection } from './ContractSection';
import type { AIModel, Cardinality, PreProcessConfig, PostProcessConfig, StageContract } from '@/lib/types';

// Types
interface PromptTemplate {
    id: string;
    name: string;
    description: string | null;
    template: string;
    version: number;
    default_ai_settings: {
        model_id?: string;
        temperature?: number;
    } | null;
    stage_config?: any;
}

// Model options
const AI_MODELS: { value: AIModel; label: string }[] = [
    { value: 'gemini-flash-latest', label: 'Gemini Flash (Fast)' },
    { value: 'gemini-pro-latest', label: 'Gemini Pro (Quality)' }
];

const CARDINALITY_OPTIONS: { value: Cardinality; label: string; description: string }[] = [
    { value: '1:1', label: '1:1', description: 'One input → One output' },
    { value: '1:N', label: '1:N', description: 'One input → Multiple outputs' },
    { value: 'N:1', label: 'N:1', description: 'Multiple inputs → One output' }
];

const SPLIT_MODES = [
    { value: 'per_item', label: 'Per Item (One task per element)' },
    { value: 'per_batch', label: 'Per Batch (Group elements)' }
];

const stageConfigSchema = z.object({
    stage_key: z.string().min(1, 'Stage key is required').regex(/^[a-z0-9_]+$/, 'Only lowercase, numbers, underscores'),
    label: z.string().min(1, 'Label is required'),
    task_type: z.string().min(1, 'Task type is required'),
    cardinality: z.enum(['1:1', '1:N', 'N:1', 'one_to_one', 'one_to_many']),
    split_path: z.string().optional(),
    split_mode: z.enum(['per_item', 'per_batch']).optional(),
    output_mapping: z.string().optional(),
    prompt_template_id: z.string().optional(),
    model_id: z.enum(['gemini-flash-latest', 'gemini-pro-latest']),
    temperature: z.number().min(0).max(2),
    topP: z.number().min(0).max(1),
    topK: z.number().min(1).max(100),
    maxOutputTokens: z.number().min(100).max(32000),
    timeout: z.number().min(0),
    maxRetries: z.number().min(0),
    retryDelay: z.number().min(0),
    generate_content_api: z.string().optional(),
    requires_approval: z.boolean().default(false),
    return_along_with: z.string().optional()
});

type StageFormData = z.infer<typeof stageConfigSchema> & {
    cardinality: '1:1' | '1:N' | 'one_to_one' | 'one_to_many';
};

// Component to highlight variable patterns in template
function TemplatePreview({ template, delimiters }: { template: string; delimiters?: { start: string; end: string } }) {
    const lines = template.split('\n').slice(0, 100); // Limit preview
    const hasMore = template.split('\n').length > 100;

    const start = delimiters?.start || '{{';
    const end = delimiters?.end || '}}';
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escape(start)}[^${escape(end.charAt(0))}]+${escape(end)})`, 'g');

    const highlightVariables = (text: string) => {
        const parts = text.split(regex);
        return parts.map((part, i) => {
            if (part.match(regex)) {
                return (
                    <Badge
                        key={i}
                        variant="secondary"
                        className="mx-0.5 px-1.5 py-0 text-[11px] font-mono bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200"
                    >
                        {part}
                    </Badge>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <ScrollArea className="h-[300px] rounded-md border bg-muted/30">
            <div className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {lines.map((line, i) => (
                    <div key={i} className="min-h-[1.2em]">
                        {highlightVariables(line) || ' '}
                    </div>
                ))}
                {hasMore && (
                    <div className="text-muted-foreground italic mt-2">
                        ... ({template.split('\n').length - 100} more lines)
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}

// Extract variables from template
function extractVariables(template: string, delimiters?: { start: string; end: string }): string[] {
    const start = delimiters?.start || '{{';
    const end = delimiters?.end || '}}';
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escape(start)}([^${escape(end.charAt(0))}]+)${escape(end)}`, 'g');

    const matches = Array.from(template.matchAll(regex));
    const variables = [...new Set(matches.map(m => m[1].trim()))];
    return variables.sort();
}

export function StageConfigPanel({ stageId }: { stageId: string }) {
    const { nodes, edges, updateStepData, removeStep } = useDesignerStore();
    const stage = nodes.find(n => n.id === stageId);
    const [activeTab, setActiveTab] = useState('basic');

    // Prompt templates state
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
    const [showPreview, setShowPreview] = useState(true);

    // Pre/Post Process state
    const [preProcessConfig, setPreProcessConfig] = useState<PreProcessConfig | undefined>(undefined);
    const [postProcessConfig, setPostProcessConfig] = useState<PostProcessConfig | undefined>(undefined);

    // Contract state
    const [contract, setContract] = useState<StageContract | undefined>(undefined);

    // Delete template state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm<StageFormData>({
        resolver: zodResolver(stageConfigSchema as any),
        defaultValues: {
            stage_key: '',
            label: '',
            task_type: '',
            cardinality: '1:1',
            split_path: 'result.questions',
            split_mode: 'per_item',
            output_mapping: 'result',
            prompt_template_id: '',
            model_id: 'gemini-flash-latest',
            temperature: 1.0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            timeout: 300000,
            maxRetries: 3,
            retryDelay: 5000,
            requires_approval: false,
            return_along_with: ''
        }
    });

    // Fetch prompt templates from Supabase
    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const { data, error } = await supabase
                .from('prompt_templates')
                .select('id, name, description, template, version, default_ai_settings, stage_config')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setTemplates(data || []);
        } catch (err) {
            console.error('Failed to fetch prompt templates:', err);
            toast.error('Failed to load prompt templates');
        } finally {
            setLoadingTemplates(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    // Prompt Editor State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState('');
    const [isSavingPrompt, setIsSavingPrompt] = useState(false);

    const handleOpenEditor = () => {
        if (selectedTemplate) {
            setEditedPrompt(selectedTemplate.template);
            setIsEditorOpen(true);
        }
    };

    const handleSavePrompt = async () => {
        if (!selectedTemplate) return;

        setIsSavingPrompt(true);
        try {
            // Construct stage config
            const stageConfig = {
                task_type: form.getValues('task_type') || '',
                cardinality: form.getValues('cardinality') || '1:1',
                split_path: form.getValues('split_path') || '',
                split_mode: form.getValues('split_mode') || 'per_item',
                output_mapping: form.getValues('output_mapping') || '',
                requires_approval: form.getValues('requires_approval') || false,
                timeout: form.getValues('timeout') || 300000,
                retryConfig: {
                    maxRetries: form.getValues('maxRetries') || 0,
                    retryDelay: form.getValues('retryDelay') || 5000
                },
                return_along_with: form.getValues('return_along_with')?.split(',').map(s => s.trim()).filter(Boolean) || []
            };

            // Construct AI settings
            const aiSettings = {
                model_id: form.getValues('model_id'),
                temperature: form.getValues('temperature'),
                topP: form.getValues('topP'),
                topK: form.getValues('topK'),
                maxOutputTokens: form.getValues('maxOutputTokens'),
                generate_content_api: form.getValues('generate_content_api'),
            };

            console.log('Saving Stage Config:', stageConfig);
            console.log('Saving AI Settings:', aiSettings);

            const { error } = await supabase
                .from('prompt_templates')
                .update({
                    template: editedPrompt,
                    stage_config: stageConfig,
                    default_ai_settings: aiSettings
                })
                .eq('id', selectedTemplate.id);

            if (error) throw error;

            toast.success('Template and configuration saved');

            // Update local state
            const updatedTemplates = templates.map(t =>
                t.id === selectedTemplate.id ? {
                    ...t,
                    template: editedPrompt,
                    // We don't store stage_config in the lightweight template list usually, 
                    // but we should probably update it if we did.
                    // For now, just updating template string in local state is enough for the UI.
                    default_ai_settings: aiSettings
                } : t
            );
            setTemplates(updatedTemplates);

            // Update selected template
            setSelectedTemplate({
                ...selectedTemplate,
                template: editedPrompt,
                default_ai_settings: aiSettings
            });

            setIsEditorOpen(false);
        } catch (err) {
            console.error('Failed to update prompt:', err);
            toast.error('Failed to update prompt template');
        } finally {
            setIsSavingPrompt(false);
        }
    };

    const handleDeleteTemplate = async () => {
        if (!selectedTemplate) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('prompt_templates')
                .delete()
                .eq('id', selectedTemplate.id);

            if (error) throw error;

            toast.success(`Template "${selectedTemplate.name}" deleted`);

            // Remove from local state
            setTemplates(prev => prev.filter(t => t.id !== selectedTemplate.id));
            setSelectedTemplate(null);
            form.setValue('prompt_template_id', '');

            setShowDeleteConfirm(false);
        } catch (err) {
            console.error('Failed to delete template:', err);
            toast.error('Failed to delete template');
        } finally {
            setIsDeleting(false);
        }
    };


    const handlePromptTemplateUpdate = async (newPrompt: string) => {
        if (!selectedTemplate) return;

        // Update local state immediately for responsiveness
        const updated = { ...selectedTemplate, template: newPrompt };
        setSelectedTemplate(updated);
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));

        // Also update the edit buffer in case they open the dialog
        if (selectedTemplate.id === updated.id) {
            setEditedPrompt(newPrompt);
        }

        try {
            const { error } = await supabase
                .from('prompt_templates')
                .update({ template: newPrompt })
                .eq('id', selectedTemplate.id);

            if (error) throw error;
            // Success toast is handled by ContractSection or we can do it here? 
            // ContractSection already toasts.
        } catch (err) {
            console.error('Failed to auto-save prompt:', err);
            toast.error('Failed to save updated prompt template');
        }
    };

    // Load stage data when selection changes
    useEffect(() => {
        if (stage) {
            const data = stage.data as any;
            const templateId = data.prompt_template_id || data.prompt_template_name || '';

            form.reset({
                stage_key: data.stage_key || data.name || '',
                label: data.label || '',
                task_type: data.task_type || '',
                cardinality: (data.cardinality === 'one_to_many' || data.cardinality === '1:N') ? '1:N' : '1:1',
                split_path: data.split_path || 'result.questions',
                split_mode: data.split_mode || 'per_item',
                output_mapping: data.output_mapping || 'result',
                prompt_template_id: templateId,
                model_id: data.ai_settings?.model_id || 'gemini-flash-latest',
                temperature: data.ai_settings?.generationConfig?.temperature ?? data.ai_settings?.temperature ?? 1.0,
                topP: data.ai_settings?.generationConfig?.topP ?? data.ai_settings?.topP ?? 0.95,
                topK: data.ai_settings?.generationConfig?.topK ?? data.ai_settings?.topK ?? 40,
                maxOutputTokens: data.ai_settings?.generationConfig?.maxOutputTokens ?? data.ai_settings?.maxOutputTokens ?? 8192,
                generate_content_api: data.ai_settings?.generationConfig?.generate_content_api || data.ai_settings?.generate_content_api || 'generateContent',
                requires_approval: data.requires_approval ?? data.stage_config?.requires_approval ?? false,
                timeout: data.timeout ?? data.ai_settings?.timeout ?? 300000,
                maxRetries: data.retryConfig?.maxRetries ?? data.ai_settings?.maxRetries ?? 3,
                retryDelay: data.retryConfig?.retryDelay ?? data.ai_settings?.retryDelay ?? 5000,
                return_along_with: Array.isArray(data.return_along_with) ? data.return_along_with.join(', ') : data.return_along_with || ''
            });

            // Find and set selected template
            if (templateId && templates.length > 0) {
                const found = templates.find(t => t.id === templateId);
                setSelectedTemplate(found || null);
            }

            // Load pre/post process configs
            setPreProcessConfig(data.pre_process);
            setPostProcessConfig(data.post_process);

            // Load contract
            if (data.contract && JSON.stringify(data.contract) !== JSON.stringify(contract)) {
                setContract(data.contract);
            }
        }
    }, [stage, form, templates, contract]);

    // Update selected template when form value changes
    const watchedTemplateId = form.watch('prompt_template_id');
    useEffect(() => {
        if (watchedTemplateId) {
            const found = templates.find(t => t.id === watchedTemplateId);
            setSelectedTemplate(found || null);

            if (found) {
                // Auto-fill Stage Config from template
                if (found.stage_config) {
                    const sc = found.stage_config;
                    if (sc.task_type) form.setValue('task_type', sc.task_type);
                    if (sc.cardinality) {
                        const mapped = (sc.cardinality === 'one_to_many' || sc.cardinality === '1:N') ? '1:N' : '1:1';
                        form.setValue('cardinality', mapped);
                    }
                    if (sc.split_path) form.setValue('split_path', sc.split_path);
                    if (sc.split_mode) form.setValue('split_mode', sc.split_mode);
                    if (sc.output_mapping) form.setValue('output_mapping', sc.output_mapping);
                    if (sc.requires_approval !== undefined) form.setValue('requires_approval', sc.requires_approval);
                    if (sc.timeout) form.setValue('timeout', sc.timeout);
                    if (sc.retryConfig) {
                        if (sc.retryConfig.maxRetries) form.setValue('maxRetries', sc.retryConfig.maxRetries);
                        if (sc.retryConfig.retryDelay) form.setValue('retryDelay', sc.retryConfig.retryDelay);
                    }
                    if (sc.return_along_with && Array.isArray(sc.return_along_with)) {
                        form.setValue('return_along_with', sc.return_along_with.join(', '));
                    }
                }

                // Auto-fill AI settings from template defaults
                if (found.default_ai_settings) {
                    const settings = found.default_ai_settings;
                    if (settings.model_id) {
                        const modelId = settings.model_id as AIModel;
                        if (AI_MODELS.some(m => m.value === modelId)) {
                            form.setValue('model_id', modelId);
                        }
                    }
                    if (settings.temperature !== undefined) {
                        form.setValue('temperature', settings.temperature);
                    }
                }
            }
        } else {
            setSelectedTemplate(null);
        }
    }, [watchedTemplateId, templates, form]);

    // Extract available variables from parent stages
    const availableScope = useMemo(() => {
        if (!stageId || !edges.length) return [];

        const parentIds = edges
            .filter(e => e.target === stageId)
            .map(e => e.source)
            .filter(id => id !== 'start'); // We don't have schema for Launcher input yet

        if (parentIds.length === 0) return null; // Root stage

        const scope: string[] = [];
        parentIds.forEach(id => {
            const parentNode = nodes.find(n => n.id === id);
            if (parentNode?.data) {
                const data = parentNode.data as any;
                // Output Schema fields
                const outputFields = data.contract?.output?.schema?.map((f: any) => f.name) || [];
                // return_along_with fields
                const returnAlongWith = Array.isArray(data.return_along_with)
                    ? data.return_along_with
                    : [];

                scope.push(...outputFields, ...returnAlongWith);
            }
        });

        return Array.from(new Set(scope));
    }, [stageId, edges, nodes]);

    // Extract variables from selected template
    const templateVariables = useMemo(() => {
        if (!selectedTemplate?.template) return [];
        return extractVariables(selectedTemplate.template, contract?.input.delimiters);
    }, [selectedTemplate, contract?.input.delimiters]);

    // Validate variables against scope
    const invalidVariables = useMemo(() => {
        if (availableScope === null) return []; // Root stage
        return templateVariables.filter(v => !availableScope.includes(v));
    }, [templateVariables, availableScope]);

    const handleExport = () => {
        if (!stage) return;

        const data = stage.data as any;
        const configToExport = {
            version: 1,
            type: 'stage_config',
            stage_key: form.getValues('stage_key'),
            label: form.getValues('label'),
            task_type: form.getValues('task_type'),
            cardinality: form.getValues('cardinality'),
            split_path: form.getValues('split_path'),
            split_mode: form.getValues('split_mode'),
            output_mapping: form.getValues('output_mapping'),
            prompt_template_id: form.getValues('prompt_template_id'),
            ai_settings: {
                model_id: form.getValues('model_id'),
                temperature: form.getValues('temperature'),
                topP: form.getValues('topP'),
                topK: form.getValues('topK'),
                maxOutputTokens: form.getValues('maxOutputTokens'),
                generate_content_api: form.getValues('generate_content_api'),
                timeout: form.getValues('timeout'),
                maxRetries: form.getValues('maxRetries'),
                retryDelay: form.getValues('retryDelay'),
            },
            contract: data.contract,
            pre_process: data.pre_process,
            post_process: data.post_process,
        };

        const blob = new Blob([JSON.stringify(configToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stage_${configToExport.stage_key || 'config'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Stage configuration exported');
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const imported = JSON.parse(content);

                if (imported.type !== 'stage_config') {
                    throw new Error('Invalid stage configuration file');
                }

                // Update form
                form.reset({
                    stage_key: imported.stage_key || '',
                    label: imported.label || '',
                    task_type: imported.task_type || '',
                    cardinality: imported.cardinality || '1:1',
                    split_path: imported.split_path || '',
                    split_mode: imported.split_mode || 'per_item',
                    output_mapping: imported.output_mapping || '',
                    prompt_template_id: imported.prompt_template_id || '',
                    model_id: imported.ai_settings?.model_id || 'gemini-flash-latest',
                    temperature: imported.ai_settings?.generationConfig?.temperature ?? imported.ai_settings?.temperature ?? 0.7,
                    topP: imported.ai_settings?.generationConfig?.topP ?? imported.ai_settings?.topP ?? 1,
                    topK: imported.ai_settings?.generationConfig?.topK ?? imported.ai_settings?.topK ?? 40,
                    maxOutputTokens: imported.ai_settings?.generationConfig?.maxOutputTokens ?? imported.ai_settings?.maxOutputTokens ?? 2048,
                    generate_content_api: imported.ai_settings?.generationConfig?.generate_content_api || imported.ai_settings?.generate_content_api || 'generateContent',
                    requires_approval: imported.requires_approval ?? imported.stage_config?.requires_approval ?? false,
                    timeout: imported.timeout ?? imported.ai_settings?.timeout ?? 300000,
                    maxRetries: imported.retryConfig?.maxRetries ?? imported.ai_settings?.maxRetries ?? 3,
                    retryDelay: imported.retryConfig?.retryDelay ?? imported.ai_settings?.retryDelay ?? 5000,
                });

                // Update store directly for non-form data
                updateStepData(stageId, {
                    contract: imported.contract,
                    pre_process: imported.pre_process,
                    post_process: imported.post_process,
                });

                toast.success('Stage configuration imported');
            } catch (error) {
                console.error('Import error:', error);
                toast.error(error instanceof Error ? error.message : 'Failed to import stage');
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    const onSubmit = async (data: StageFormData) => {
        // Update local designer store
        updateStepData(stageId, {
            stage_key: data.stage_key,
            label: data.label,
            task_type: data.task_type,
            cardinality: data.cardinality,
            split_path: data.split_path,
            split_mode: data.split_mode,
            output_mapping: data.output_mapping,
            prompt_template_id: data.prompt_template_id,
            ai_settings: {
                model_id: data.model_id,
                generationConfig: {
                    temperature: data.temperature,
                    topP: data.topP,
                    topK: data.topK,
                    maxOutputTokens: data.maxOutputTokens,
                    generate_content_api: data.generate_content_api
                }
            },
            timeout: data.timeout,
            retryConfig: {
                maxRetries: data.maxRetries,
                retryDelay: data.retryDelay
            },
            // Pre/Post process hooks
            pre_process: preProcessConfig,
            post_process: postProcessConfig,
            // Input/Output contract
            contract: contract,
            requires_approval: data.requires_approval,
            return_along_with: data.return_along_with ? data.return_along_with.split(',').map(s => s.trim()).filter(Boolean) : []
        });

        // Also persist stage_config to Supabase prompt_templates table
        if (data.prompt_template_id) {
            try {
                const stageConfig = {
                    cardinality: (data.cardinality === '1:N' || data.cardinality === 'one_to_many') ? 'one_to_many' : 'one_to_one',
                    split_path: data.split_path || '',
                    split_mode: data.split_mode || 'per_item',
                    output_mapping: data.output_mapping || '',
                    requires_approval: data.requires_approval || false,
                    timeout: data.timeout || 300000,
                    retryConfig: {
                        maxRetries: data.maxRetries || 3,
                        retryDelay: data.retryDelay || 5000
                    },
                    return_along_with: data.return_along_with ? data.return_along_with.split(',').map(s => s.trim()).filter(Boolean) : []
                };

                const aiSettings = {
                    model_id: data.model_id,
                    generate_content_api: data.generate_content_api,
                    generationConfig: {
                        temperature: data.temperature,
                        topP: data.topP,
                        topK: data.topK,
                        maxOutputTokens: data.maxOutputTokens
                    }
                };

                console.log('Saving to Supabase - Stage Config:', stageConfig);

                const { error } = await supabase
                    .from('prompt_templates')
                    .update({
                        stage_config: stageConfig,
                        default_ai_settings: aiSettings
                    })
                    .eq('id', data.prompt_template_id);

                if (error) {
                    console.error('Failed to save stage_config to Supabase:', error);
                    toast.error('Failed to sync configuration to cloud');
                    return;
                }

                toast.success('Stage saved & synced to cloud!');
            } catch (err) {
                console.error('Error saving to Supabase:', err);
                toast.error('Failed to sync configuration');
            }
        } else {
            toast.success('Stage updated locally');
        }
    };

    if (!stage) return null;
    const stageData = stage.data as any;

    return (
        <Card className="h-full border-none rounded-none shadow-none">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {stageData.name || 'S'}
                        </span>
                        Stage Configuration
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="font-mono text-xs mr-1">
                            {form.watch('cardinality')}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={handleExport}
                            type="button"
                            title="Export Configuration"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                id="stage-import-header"
                                className="hidden"
                                accept=".json"
                                onChange={handleImport}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => document.getElementById('stage-import-header')?.click()}
                                type="button"
                                title="Import Configuration"
                            >
                                <Upload className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-5">
                                <TabsTrigger value="basic" className="text-xs">
                                    <Settings className="w-3 h-3 mr-1" />
                                    Basic
                                </TabsTrigger>
                                <TabsTrigger value="ai" className="text-xs">
                                    <Zap className="w-3 h-3 mr-1" />
                                    AI
                                </TabsTrigger>
                                <TabsTrigger value="prompt" className="text-xs">
                                    <FileText className="w-3 h-3 mr-1" />
                                    Prompt
                                </TabsTrigger>
                                <TabsTrigger value="hooks" className="text-xs">
                                    <Webhook className="w-3 h-3 mr-1" />
                                    Hooks
                                </TabsTrigger>
                                <TabsTrigger value="contract" className="text-xs">
                                    <FileInput className="w-3 h-3 mr-1" />
                                    IO
                                </TabsTrigger>
                            </TabsList>

                            {/* Basic Tab */}
                            <TabsContent value="basic" className="space-y-4 mt-4">
                                <FormField
                                    control={form.control}
                                    name="label"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Display Label</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. Question Generator" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="stage_key"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Stage Key</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. stage_1_qgen" className="font-mono text-sm" />
                                            </FormControl>
                                            <FormDescription>Unique identifier (lowercase, underscores)</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="task_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Task Type</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. qgen_1_core" className="font-mono text-sm" />
                                            </FormControl>
                                            <FormDescription>Routing key for n8n workflow</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="requires_approval"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel>Requires Approval</FormLabel>
                                                <FormDescription>
                                                    Pause execution for manual review before proceeding
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

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

                                {form.watch('cardinality') === '1:N' && (
                                    <div className="space-y-4 pl-4 border-l-2 border-muted">
                                        <FormField
                                            control={form.control}
                                            name="split_path"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Split Path</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="e.g. result.questions" className="font-mono text-sm" />
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
                                                    <Select onValueChange={field.onChange} value={field.value}>
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
                                    </div>
                                )}

                                <FormField
                                    control={form.control}
                                    name="output_mapping"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Output Mapping</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. result" className="font-mono text-sm" />
                                            </FormControl>
                                            <FormDescription>Key to map content to for next stage</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="return_along_with"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Return Along With</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. lo_code, student_id" className="font-mono text-sm" />
                                            </FormControl>
                                            <FormDescription>Comma-separated fields to copy from input to output</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            {/* AI Settings Tab */}
                            <TabsContent value="ai" className="space-y-4 mt-4">
                                <FormField
                                    control={form.control}
                                    name="model_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>AI Model</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {AI_MODELS.map(model => (
                                                        <SelectItem key={model.value} value={model.value}>
                                                            {model.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="temperature"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex justify-between">
                                                <FormLabel>Temperature</FormLabel>
                                                <span className="text-sm text-muted-foreground">{field.value}</span>
                                            </div>
                                            <FormControl>
                                                <Slider
                                                    min={0}
                                                    max={2}
                                                    step={0.1}
                                                    value={[field.value]}
                                                    onValueChange={([v]) => field.onChange(v)}
                                                />
                                            </FormControl>
                                            <FormDescription>Higher = more creative</FormDescription>
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="topP"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between">
                                                    <FormLabel>Top P</FormLabel>
                                                    <span className="text-xs text-muted-foreground">{field.value}</span>
                                                </div>
                                                <FormControl>
                                                    <Slider
                                                        min={0}
                                                        max={1}
                                                        step={0.05}
                                                        value={[field.value]}
                                                        onValueChange={([v]) => field.onChange(v)}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="topK"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between">
                                                    <FormLabel>Top K</FormLabel>
                                                    <span className="text-xs text-muted-foreground">{field.value}</span>
                                                </div>
                                                <FormControl>
                                                    <Slider
                                                        min={1}
                                                        max={100}
                                                        step={1}
                                                        value={[field.value]}
                                                        onValueChange={([v]) => field.onChange(v)}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="maxOutputTokens"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Output Tokens</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={e => field.onChange(+e.target.value)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="generate_content_api"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Generate Content API</FormLabel>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-muted-foreground mr-1">Select method</span>
                                                    <Type className="w-3 h-3 text-muted-foreground" />
                                                </div>
                                            </div>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select API method" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="generateContent">generateContent (Default)</SelectItem>
                                                    <SelectItem value="streamGenerateContent">streamGenerateContent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Method to call from Vertex AI</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                    <FormField
                                        control={form.control}
                                        name="timeout"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Timeout (ms)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={e => field.onChange(+e.target.value)}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="maxRetries"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Retries</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={e => field.onChange(+e.target.value)}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>

                            {/* Prompt Tab */}
                            <TabsContent value="prompt" className="space-y-4 mt-4">
                                {/* Template Selector */}
                                <FormField
                                    control={form.control}
                                    name="prompt_template_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Prompt Template</FormLabel>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={fetchTemplates}
                                                    disabled={loadingTemplates}
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${loadingTemplates ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </div>
                                            {loadingTemplates ? (
                                                <Skeleton className="h-10 w-full" />
                                            ) : (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a prompt template..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {templates.length === 0 ? (
                                                            <SelectItem value="_empty" disabled>
                                                                No templates found
                                                            </SelectItem>
                                                        ) : (
                                                            templates.map(template => (
                                                                <SelectItem key={template.id} value={template.id}>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{template.name}</span>
                                                                        {template.description && (
                                                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                                {template.description}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Selected Template Info */}
                                {selectedTemplate && (
                                    <div className="space-y-3">
                                        {invalidVariables.length > 0 && (
                                            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle className="text-sm font-semibold mb-1">
                                                    Variable Scope Warning
                                                </AlertTitle>
                                                <AlertDescription className="text-xs">
                                                    Các biến sau không có sẵn từ Stage cha:
                                                    <span className="font-mono ml-1 font-bold">
                                                        {invalidVariables.map(v => `${contract?.input.delimiters?.start || '{{'}${v}${contract?.input.delimiters?.end || '}}'}`).join(', ')}
                                                    </span>
                                                    <br />
                                                    Phạm vi cho phép:
                                                    <span className="font-mono ml-1">
                                                        {availableScope?.map(v => `${contract?.input.delimiters?.start || '{{'}${v}${contract?.input.delimiters?.end || '}}'}`).join(', ') || 'none'}
                                                    </span>
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Template Metadata */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Badge variant="outline" className="text-xs">
                                                    v{selectedTemplate.version}
                                                </Badge>
                                                {selectedTemplate.default_ai_settings?.model_id && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {selectedTemplate.default_ai_settings.model_id}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setShowDeleteConfirm(true)}
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" />
                                                Delete
                                            </Button>
                                        </div>

                                        {/* Variables */}
                                        {templateVariables.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    Variables ({templateVariables.length}):
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {templateVariables.map(v => (
                                                        <Badge
                                                            key={v}
                                                            variant="secondary"
                                                            className="text-[10px] font-mono bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                                        >
                                                            {`${contract?.input.delimiters?.start || '{{'}${v}${contract?.input.delimiters?.end || '}}'}`}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Template Preview */}
                                        <div>
                                            <div className="flex items-center gap-1 w-full">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex-1 justify-between text-xs text-muted-foreground"
                                                    onClick={() => setShowPreview(!showPreview)}
                                                >
                                                    <span>Template Preview</span>
                                                    {showPreview ? (
                                                        <ChevronUp className="w-3 h-3" />
                                                    ) : (
                                                        <ChevronDown className="w-3 h-3" />
                                                    )}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    title="Open Full Editor"
                                                    onClick={handleOpenEditor}
                                                    disabled={!selectedTemplate}
                                                >
                                                    <Maximize2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            {showPreview && (
                                                <TemplatePreview template={selectedTemplate.template} />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Empty State */}
                                {!selectedTemplate && !loadingTemplates && (
                                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                                        <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                                        <p className="text-sm text-muted-foreground">
                                            Select a prompt template to preview
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Hooks Tab */}
                            <TabsContent value="hooks" className="space-y-4 mt-4">
                                <PrePostProcessSection
                                    type="pre"
                                    config={preProcessConfig}
                                    onChange={(config) => {
                                        const newConfig = config as PreProcessConfig | undefined;
                                        setPreProcessConfig(newConfig);
                                        // Only sync to store if different
                                        if (JSON.stringify(newConfig) !== JSON.stringify(stage?.data.pre_process)) {
                                            updateStepData(stageId, { pre_process: newConfig });
                                        }
                                    }}
                                />
                                <PrePostProcessSection
                                    type="post"
                                    config={postProcessConfig}
                                    onChange={(config) => {
                                        const newConfig = config as PostProcessConfig | undefined;
                                        setPostProcessConfig(newConfig);
                                        // Only sync to store if different
                                        if (JSON.stringify(newConfig) !== JSON.stringify(stage?.data.post_process)) {
                                            updateStepData(stageId, { post_process: newConfig });
                                        }
                                    }}
                                />
                            </TabsContent>

                            {/* Contract Tab */}
                            <TabsContent value="contract" className="space-y-4 mt-4">
                                <ContractSection
                                    promptTemplate={selectedTemplate?.template}
                                    contract={contract}
                                    availableScope={availableScope}
                                    onContractChange={(newContract) => {
                                        setContract(newContract);
                                        // Only sync to store if different to avoid infinite loops
                                        if (JSON.stringify(newContract) !== JSON.stringify(stage?.data.contract)) {
                                            updateStepData(stageId, { contract: newContract });
                                        }
                                    }}
                                    onPromptTemplateChange={handlePromptTemplateUpdate}
                                />
                            </TabsContent>
                        </Tabs>

                        <div className="pt-4 space-y-2 border-t">
                            <Button type="submit" className="w-full">
                                Update Stage
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                onClick={() => removeStep(stageId)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Stage
                            </Button>
                        </div>
                    </form>
                </Form>

                <PromptEditorDialog
                    open={isEditorOpen}
                    onOpenChange={setIsEditorOpen}
                    prompt={editedPrompt}
                    onPromptChange={setEditedPrompt}
                    onSave={handleSavePrompt}
                    isSaving={isSavingPrompt}
                    title={selectedTemplate?.name || 'Edit Prompt'}
                    delimiters={contract?.input.delimiters}
                    availableScope={availableScope}
                />

                {/* Delete Template Confirmation */}
                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Prompt Template?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete <strong>"{selectedTemplate?.name}"</strong>?
                                This action cannot be undone and may affect stages using this template.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteTemplate}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

// Basic token estimator (approx 4 chars per token)
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export function PromptEditorDialog({
    open,
    onOpenChange,
    prompt,
    onPromptChange,
    onSave,
    isSaving,
    title,
    delimiters,
    availableScope
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    prompt: string;
    onPromptChange: (value: string) => void;
    onSave: () => void;
    isSaving: boolean;
    title: string;
    delimiters?: { start: string; end: string };
    availableScope?: string[] | null;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    // Regex builder helper (same as schemaUtils, maybe extract to shared hook later)
    const getRegex = () => {
        const start = delimiters?.start || '{{';
        const end = delimiters?.end || '}}';
        const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`${escape(start)}([a-zA-Z0-9_.-]+)${escape(end)}`, 'g');
    };

    // Sync scroll from textarea to backdrop
    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
            backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    // Highlight variables in overlay
    const renderHighlights = (text: string) => {
        const regex = getRegex();
        let lastIndex = 0;
        let match;
        const parts = [];

        while ((match = regex.exec(text)) !== null) {
            // Text before match
            parts.push(text.substring(lastIndex, match.index));

            // The variable name
            const varName = match[1];
            const isInvalid = availableScope !== null && availableScope !== undefined && !availableScope.includes(varName);

            // Highlighted match
            parts.push(
                <mark
                    key={match.index}
                    className={cn(
                        "px-0.5 rounded-sm bg-blue-500/20 text-blue-700 dark:text-blue-300 border-b border-blue-500/50",
                        isInvalid && "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50"
                    )}
                >
                    {match[0]}
                </mark>
            );
            lastIndex = regex.lastIndex;
        }
        // Text after last match
        parts.push(text.substring(lastIndex));
        return parts;
    };

    const insertVariable = (varName: string) => {
        if (!textareaRef.current) return;
        const startAlt = delimiters?.start || '{{';
        const endAlt = delimiters?.end || '}}';
        const variable = `${startAlt}${varName}${endAlt}`;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        onPromptChange(before + variable + after);

        // Return focus and set cursor (next tick)
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newPos = start + variable.length;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const tokenCount = Math.ceil(prompt.length / 4);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b flex-row items-center justify-between gap-4 space-y-0">
                    <div>
                        <DialogTitle className="flex items-center gap-2">
                            <Code className="w-5 h-5 text-primary" />
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Sử dụng {delimiters?.start || '{{'}variable{delimiters?.end || '}}'} để chèn biến.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Editor Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-background">
                        <div className="flex-1 relative font-mono text-sm group">
                            {/* Backdrop for highlights */}
                            <div
                                ref={backdropRef}
                                className="absolute inset-0 p-6 pointer-events-none whitespace-pre-wrap break-words overflow-hidden highlight-backdrop"
                                aria-hidden="true"
                            >
                                {renderHighlights(prompt)}
                            </div>

                            {/* Actual Textarea */}
                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => onPromptChange(e.target.value)}
                                onScroll={handleScroll}
                                className="absolute inset-0 w-full h-full p-6 bg-transparent resize-none outline-none caret-primary text-transparent whitespace-pre-wrap break-words overflow-auto"
                                spellCheck={false}
                                placeholder="Nhập prompt template tại đây..."
                            />
                        </div>
                    </div>

                    {/* Available Variables Sidebar */}
                    <div className="w-64 border-l bg-muted/20 flex flex-col overflow-hidden">
                        <div className="p-3 border-b bg-muted/40 flex items-center gap-2">
                            <Braces className="w-4 h-4 text-primary" />
                            <span className="text-xs font-semibold">Available Variables</span>
                        </div>
                        <ScrollArea className="flex-1 p-2">
                            <div className="space-y-1">
                                {availableScope === null ? (
                                    <div className="p-3 text-center">
                                        <Badge variant="outline" className="text-[10px] mb-2">Root Stage</Badge>
                                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                                            Stage này lấy dữ liệu từ nguồn bên ngoài (File Upload). Bạn có thể gõ tên trường bất kỳ.
                                        </p>
                                    </div>
                                ) : availableScope.length > 0 ? (
                                    availableScope.map(v => (
                                        <Button
                                            key={v}
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start font-mono text-[11px] h-8 px-2 group hover:bg-primary/10 hover:text-primary transition-colors"
                                            onClick={() => insertVariable(v)}
                                        >
                                            <span className="text-muted-foreground mr-1 opacity-50">{delimiters?.start || '{{'}</span>
                                            {v}
                                            <span className="text-muted-foreground ml-1 opacity-50">{delimiters?.end || '}}'}</span>
                                        </Button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center">
                                        <p className="text-[10px] text-muted-foreground italic">
                                            Stage cha không có output hoặc return_along_with.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                        <div className="p-3 border-t bg-muted/40">
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Click để chèn biến vào prompt tại vị trí con trỏ chuột.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t flex items-center justify-between sm:justify-between bg-background">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            <span>~{tokenCount} tokens</span>
                        </div>
                        {tokenCount > 8192 && (
                            <span className="text-amber-500 font-medium flex items-center gap-1">
                                <Maximize2 className="w-3 h-3" />
                                Large prompt
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
                            {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                            Save Template
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
