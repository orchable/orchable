import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDesignerStore } from '@/stores/designerStore';
import { supabase } from '@/lib/supabase';
import { storage, getAssetStorageAdapter, getStorageAdapterForType } from '@/lib/storage';
import { useTier } from '@/hooks/useTier';
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
import { extractInputFields, generateOutputFormatSection, createDefaultContract, injectOutputFormatIntoPrompt, mapContractToInputSchema, mapContractToOutputSchema, ensureGeminiSchema } from '@/lib/schemaUtils';
import { detectCircularDependency } from '@/services/stageService';
import { OutputSchemaEditor } from '@/components/designer/OutputSchemaEditor';
import { IconPicker } from '@/components/common/IconPicker';
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
    Braces,
    Check,
    CheckCircle2,
    Layout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import type { AIModel, Cardinality, PreProcessConfig, PostProcessConfig, StageContract, AIModelSetting, StepConfig, AISettings, DocumentAsset, ExportConfig, OrchestratorConfig, RegistryComponent, GeminiJsonSchema } from '@/lib/types';
import { PromptEditorDialog } from './PromptEditorDialog';
import { ExportSection } from './ExportSection';
import { ICONS } from '@/lib/icons';

// Types
interface PromptTemplate {
    id: string;
    name: string;
    description: string | null;
    template: string;
    version: number;
    default_ai_settings: AISettings | null;
    stage_config?: StepConfig | null;
    custom_component_id?: string | null;
    custom_component?: { id: string; name: string; description?: string };
}

interface CustomComponentOption {
    id: string;
    name: string;
    description?: string;
}

// Removing hardcoded AI_MODELS in favor of dynamic fetching



const stageConfigSchema = z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Max 50 chars'),
    stage_key: z.string().min(1, 'Stage key is required').regex(/^[a-z0-9_]+$/, 'Only lowercase, numbers, underscores'),
    label: z.string().min(1, 'Label is required'),
    task_type: z.string().min(1, 'Task type is required'),
    prompt_template_id: z.string().optional(),
    custom_component_id: z.string().optional(),
    model_id: z.string().min(1, 'Model is required'),
    temperature: z.number().min(0).max(2),
    topP: z.number().min(0).max(1),
    topK: z.number().min(1).max(100),
    maxOutputTokens: z.number().min(100).max(32000),
    timeout: z.number().min(0),
    maxRetries: z.number().min(0),
    retryDelay: z.number().min(0),
    generate_content_api: z.string().optional(),
    requires_approval: z.boolean().default(false),
    return_along_with: z.string().optional(),
    thinkingLevel: z.string().optional(),
    thinkingBudget: z.number().optional(),
    auxiliary_inputs: z.array(z.string()).optional(),
    sub_orchestration_id: z.string().optional(),
    sub_orchestration_output_path: z.string().optional(),
    export_config: z.object({
        enabled: z.boolean(),
        destination: z.enum(['google_sheets', 'webhook', 'email']),
        settings: z.object({
            sheet_id: z.string().optional(),
            worksheet_name: z.string().optional(),
            webhook_url: z.string().optional(),
            email_recipient: z.string().optional(),
            format: z.enum(['json', 'csv', 'tsv']).optional()
        })
    }).optional()
}).superRefine((data, ctx) => {
    if (data.task_type === 'sub_orchestration' && !data.sub_orchestration_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A sub-orchestration must be selected.",
            path: ["sub_orchestration_id"]
        });
    }
});

type StageFormData = z.infer<typeof stageConfigSchema>;

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
    const { nodes, edges, updateStepData, removeStep, duplicateStep } = useDesignerStore();
    const navigate = useNavigate();
    const { tier } = useTier();
    const stage = nodes.find(n => n.id === stageId);
    const [activeTab, setActiveTab] = useState('basic');
    const designerConfig = useDesignerStore(state => state.config);

    // Validation state
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

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

    // Registry components state
    const [registryComponents, setRegistryComponents] = useState<CustomComponentOption[]>([]);
    const [loadingComponents, setLoadingComponents] = useState(false);

    // AI Models state (dynamic from db)
    const [aiModels, setAiModels] = useState<AIModelSetting[]>([]);
    const [loadingAiModels, setLoadingAiModels] = useState(false);

    // Sub-orchestrations list
    const [orchestrations, setOrchestrations] = useState<OrchestratorConfig[]>([]);
    const [loadingOrch, setLoadingOrch] = useState(false);

    // 🔨 Stage IO: Available Documents state
    const [availableDocuments, setAvailableDocuments] = useState<DocumentAsset[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    // Delete template state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm<StageFormData>({
        resolver: zodResolver(stageConfigSchema),
        defaultValues: {
            name: '',
            stage_key: '',
            label: '',
            task_type: '',
            prompt_template_id: '',
            custom_component_id: '',
            model_id: 'gemini-2.0-flash',
            temperature: 1.0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            timeout: 300000,
            maxRetries: 3,
            retryDelay: 5000,
            requires_approval: false,
            return_along_with: '',
            thinkingLevel: '',
            thinkingBudget: 0,
            auxiliary_inputs: [],
            sub_orchestration_id: '',
            sub_orchestration_output_path: 'result',
            export_config: {
                enabled: false,
                destination: 'webhook',
                settings: { format: 'json' }
            }
        }
    });

    // Fetch prompt templates from correctly synced storage
    const fetchTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        try {
            const adapter = await getAssetStorageAdapter();
            const data = await adapter.listTemplates();
            // Sort by name
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setTemplates(sorted as unknown as PromptTemplate[]);
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        } finally {
            setLoadingTemplates(false);
        }
    }, []);

    const fetchComponents = useCallback(async () => {
        setLoadingComponents(true);
        try {
            const adapter = await getAssetStorageAdapter();
            const components = await adapter.listComponents();
            setRegistryComponents(components as unknown as RegistryComponent[]);
        } catch (err) {
            console.error('Failed to fetch components:', err);
        } finally {
            setLoadingComponents(false);
        }
    }, []);

    const fetchAiModels = useCallback(async () => {
        setLoadingAiModels(true);
        try {
            const adapter = await getAssetStorageAdapter();
            const models = await adapter.listAiModelSettings();
            setAiModels(models);

            // Set default if form model_id is empty
            if (!form.getValues('model_id') && models.length > 0) {
                const defaultModel = models.find((m: AIModelSetting) => m.model_id === 'gemini-2.0-flash') || models[0];
                form.setValue('model_id', defaultModel.model_id);
            }
        } catch (err) {
            console.error('Failed to fetch AI models:', err);
        } finally {
            setLoadingAiModels(false);
        }
    }, [form]);

    const fetchDocuments = useCallback(async () => {
        setLoadingDocs(true);
        try {
            // Documents are handled via tier-isolated storage adapter as defined in AssetLibrary
            const storageType = tier === 'premium' ? 'supabase' : 'indexeddb';
            const documentStorage = getStorageAdapterForType(storageType);
            const documents = await documentStorage.listAssets();
            setAvailableDocuments(documents);
        } catch (err) {
            console.error('Failed to fetch documents:', err);
        } finally {
            setLoadingDocs(false);
        }
    }, [tier]);

    const fetchOrchestrations = useCallback(async () => {
        setLoadingOrch(true);
        try {
            const config = useDesignerStore.getState().config;
            const list = await storage.adapter.listConfigs();
            // Filter out the current one to prevent self-recursion
            const filtered = config?.id 
                ? list.filter(c => c.id !== config.id)
                : list;
                
            setOrchestrations(filtered);
        } catch (err) {
            console.error('Failed to fetch orchestrations:', err);
        } finally {
            setLoadingOrch(false);
        }
    }, []);

    const watchedVariables = form.watch(['model_id', 'temperature', 'topP', 'topK', 'maxOutputTokens', 'generate_content_api', 'thinkingLevel', 'thinkingBudget', 'task_type', 'sub_orchestration_id', 'stage_key']);
    const taskType = watchedVariables[8];
    const subOrchId = watchedVariables[9];
    const stageKey = watchedVariables[10];
    const designerId = designerConfig?.id;
    const designerName = designerConfig?.name;

    // Real-time validation
    useEffect(() => {
        const validateDesign = async () => {
            const { task_type, sub_orchestration_id, stage_key } = form.getValues();
            setValidationError(null);

            // 1. Check for circular dependency
            if (taskType === 'sub_orchestration' && subOrchId) {
                setIsValidating(true);
                try {
                    // If we have a current config ID, check for circularity
                    if (designerId) {
                        const isCircular = await detectCircularDependency(subOrchId, new Set([designerId]));
                        if (isCircular) {
                            setValidationError(`Circular Dependency Detected: The selected orchestration eventually calls the current orchestration (${designerName}).`);
                        }
                    }
                } catch (err) {
                    console.error('Validation error:', err);
                } finally {
                    setIsValidating(false);
                }
            }

            // 2. Check for stage key collision in current flow
            const currentKeys = nodes
                .filter(n => n.id !== stageId)
                .map(n => n.data?.stage_key || n.id);

            if (stage_key && currentKeys.includes(stage_key)) {
                setValidationError(`Stage Key Collision: The key "${stage_key}" is already used by another stage in this orchestration.`);
            }
        };

        const timer = setTimeout(validateDesign, 500);
        return () => clearTimeout(timer);
    }, [taskType, subOrchId, stageKey, designerId, designerName, nodes, stageId, form]);

    useEffect(() => {
        fetchTemplates();
        fetchComponents();
        fetchAiModels();
        fetchDocuments();
        fetchOrchestrations();
    }, [fetchTemplates, fetchComponents, fetchAiModels, fetchDocuments, fetchOrchestrations]);

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

    const performAtomicSave = async (options: { 
        promptContent?: string;
        showToast?: boolean;
        closeEditor?: boolean;
    } = {}) => {
        const { promptContent, showToast = true, closeEditor = false } = options;
        const data = form.getValues() as StageFormData;
        
        if (!selectedTemplate && data.prompt_template_id) {
            // If we have an ID but no selectedTemplate state, try to find it
            const found = templates.find(t => t.id === data.prompt_template_id);
            if (found) setSelectedTemplate(found);
        }

        try {
            const finalPrompt = promptContent !== undefined ? promptContent : (selectedTemplate?.template || '');
            
            // 1. Update local designer store (Zustand)
            // This ensures the current orchestration design is up to date
            updateStepData(stageId, {
                name: data.name,
                stage_key: data.stage_key,
                label: data.label,
                task_type: data.task_type,
                prompt_template_id: data.prompt_template_id,
                ai_settings: {
                    model_id: data.model_id as AIModel,
                    generate_content_api: (data.generate_content_api || 'generateContent') as "generateContent" | "streamGenerateContent",
                    generationConfig: {
                        temperature: data.temperature,
                        topP: data.topP,
                        topK: data.topK,
                        maxOutputTokens: data.maxOutputTokens,
                        thinkingLevel: data.thinkingLevel || undefined,
                        thinkingBudget: data.thinkingBudget || undefined
                    }
                },
                timeout: data.timeout,
                retryConfig: {
                    maxRetries: data.maxRetries,
                    retryDelay: data.retryDelay
                },
                pre_process: preProcessConfig,
                post_process: postProcessConfig,
                contract: contract,
                export_config: data.export_config ? {
                    enabled: data.export_config.enabled === true,
                    destination: data.export_config.destination || 'webhook',
                    settings: data.export_config.settings || { format: 'json' }
                } : {
                    enabled: false,
                    destination: 'webhook',
                    settings: { format: 'json' }
                },
                requires_approval: data.requires_approval,
                custom_component_id: (data.custom_component_id === '_default' || !data.custom_component_id) ? null : data.custom_component_id,
                return_along_with: data.return_along_with ? data.return_along_with.split(',').map(s => s.trim()).filter(Boolean) : [],
                sub_orchestration_id: data.sub_orchestration_id,
                sub_orchestration_output_path: data.sub_orchestration_output_path,
                auxiliary_inputs: data.auxiliary_inputs || []
            });

            // 2. Persist to Asset Storage (Template)
            if (data.prompt_template_id && selectedTemplate) {
                await storage.waitForAdapter();
                
                // Construct StepConfig for the template storage (used as default)
                const templateStageConfig: StepConfig = {
                    id: selectedTemplate.id,
                    name: selectedTemplate.name,
                    label: selectedTemplate.name,
                    task_type: data.task_type || '', // Added task_type
                    dependsOn: [],
                    requires_approval: data.requires_approval || false,
                    timeout: data.timeout || 300000,
                    retryConfig: {
                        maxRetries: data.maxRetries || 3,
                        retryDelay: data.retryDelay || 5000
                    },
                    pre_process: preProcessConfig,
                    post_process: postProcessConfig,
                    contract: contract,
                    export_config: data.export_config ? {
                        enabled: data.export_config.enabled === true,
                        destination: data.export_config.destination || 'webhook',
                        settings: data.export_config.settings || { format: 'json' }
                    } : {
                        enabled: false,
                        destination: 'webhook',
                        settings: { format: 'json' }
                    },
                    return_along_with: data.return_along_with ? data.return_along_with.split(',').map(s => s.trim()).filter(Boolean) : [],
                    auxiliary_inputs: data.auxiliary_inputs || [],
                };

                const aiSettings: AISettings = {
                    model_id: data.model_id as AIModel,
                    generate_content_api: (data.generate_content_api || 'generateContent') as "generateContent" | "streamGenerateContent",
                    generationConfig: {
                        temperature: data.temperature,
                        topP: data.topP,
                        topK: data.topK,
                        maxOutputTokens: data.maxOutputTokens,
                        thinkingLevel: data.thinkingLevel || undefined,
                        thinkingBudget: data.thinkingBudget || undefined
                    }
                };

                const upsertDoc = {
                    id: selectedTemplate.id,
                    name: selectedTemplate.name,
                    description: selectedTemplate.description || undefined,
                    template: finalPrompt,
                    version: selectedTemplate.version,
                    is_active: true,
                    stage_config: templateStageConfig as unknown as Record<string, unknown>,
                    default_ai_settings: aiSettings as unknown as Record<string, unknown>,
                    custom_component_id: selectedTemplate.custom_component_id || undefined,
                };

                await storage.adapter.upsertTemplate(upsertDoc);
                
                // Update local templates list
                setTemplates(prev => prev.map(t => 
                    t.id === selectedTemplate.id 
                        ? { ...t, template: finalPrompt, default_ai_settings: aiSettings, stage_config: templateStageConfig } 
                        : t
                ));

                // Update selected template
                setSelectedTemplate(prev => prev ? { 
                    ...prev, 
                    template: finalPrompt, 
                    default_ai_settings: aiSettings, 
                    stage_config: templateStageConfig 
                } : null);
            }

            if (showToast) {
                toast.success('Stage and prompt configuration saved');
            }

            if (closeEditor) {
                setIsEditorOpen(false);
            }
            return true;
        } catch (err) {
            console.error('Failed atomic save:', err);
            if (showToast) {
                toast.error('Failed to save configuration');
            }
            return false;
        }
    };

    const handleSavePrompt = async () => {
        setIsSavingPrompt(true);
        await performAtomicSave({ 
            promptContent: editedPrompt, 
            closeEditor: true 
        });
        setIsSavingPrompt(false);
    };

    const handleDeleteTemplate = async () => {
        if (!selectedTemplate) return;

        setIsDeleting(true);
        try {
            const adapter = await getAssetStorageAdapter();
            await adapter.deleteTemplate(selectedTemplate.id);
            
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
        const updated: PromptTemplate = { ...selectedTemplate, template: newPrompt };
        setSelectedTemplate(updated);
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));

        // Also update the edit buffer in case they open the dialog
        if (selectedTemplate.id === updated.id) {
            setEditedPrompt(newPrompt);
        }

        try {
            await storage.waitForAdapter();
            const existing = await storage.adapter.getTemplate(selectedTemplate.id);
            if (existing) {
                await storage.adapter.upsertTemplate({
                    ...existing,
                    template: newPrompt
                });
            }
        } catch (err) {
            console.error('Failed to auto-save prompt:', err);
            toast.error('Failed to save updated prompt template');
        }
    };

    useEffect(() => {
        if (stage) {
            const data = stage.data as unknown as StepConfig;
            const templateId = data.prompt_template_id || (data as unknown as Record<string, string>).prompt_template_name || '';
            const ai = data.ai_settings || {} as AISettings;
            const gc = (ai.generationConfig || {}) as Record<string, unknown>;

            form.reset({
                name: data.name || '',
                stage_key: data.stage_key || data.name || '',
                label: data.label || '',
                task_type: data.task_type || '',
                prompt_template_id: templateId,
                model_id: ai.model_id || 'gemini-2.0-flash',
                temperature: (gc.temperature as number) ?? (ai as unknown as Record<string, number>).temperature ?? 1.0,
                topP: (gc.topP as number) ?? (ai as unknown as Record<string, number>).topP ?? 0.95,
                topK: (gc.topK as number) ?? (ai as unknown as Record<string, number>).topK ?? 40,
                maxOutputTokens: (gc.maxOutputTokens as number) ?? (ai as unknown as Record<string, number>).maxOutputTokens ?? 8192,
                generate_content_api: ai.generate_content_api || (gc.generate_content_api as string) || 'generateContent',
                requires_approval: data.requires_approval === true,
                timeout: data.timeout ?? (ai as unknown as Record<string, number>).timeout ?? 300000,
                maxRetries: (data.retryConfig?.maxRetries ?? (ai as unknown as Record<string, number>).maxRetries) ?? 3,
                retryDelay: (data.retryConfig?.retryDelay ?? (ai as unknown as Record<string, number>).retryDelay) ?? 5000,
                custom_component_id: data.custom_component_id || '',
                return_along_with: Array.isArray(data.return_along_with) ? data.return_along_with.join(', ') : data.return_along_with || '',
                thinkingLevel: (gc.thinkingLevel as string) || (ai as unknown as Record<string, string>).thinkingLevel || '',
                thinkingBudget: (gc.thinkingBudget as number) ?? (ai as unknown as Record<string, number>).thinkingBudget ?? 0,
                auxiliary_inputs: data.auxiliary_inputs || [],
                sub_orchestration_id: data.sub_orchestration_id || '',
                sub_orchestration_output_path: data.sub_orchestration_output_path || 'result',
                export_config: data.export_config || {
                    enabled: false,
                    destination: 'webhook',
                    settings: { format: 'json' }
                }
            });

            // Find and set selected template
            if (templateId && templates.length > 0) {
                const found = templates.find(t => t.id === templateId);
                setSelectedTemplate(found || null);
            }

            // Load pre/post process configs
            setPreProcessConfig(data.pre_process);
            setPostProcessConfig(data.post_process);

            // Load contract (with backward-compatible migration)
            if (data.contract && JSON.stringify(data.contract) !== JSON.stringify(contract)) {
                // Auto-migrate legacy OutputSchemaField[] to GeminiJsonSchema
                if (data.contract.output) {
                    const output = data.contract.output as Record<string, unknown>;
                    const legacySchema = output.schema;
                    const legacyRootType = output.rootType as string | undefined;
                    data.contract.output.schema = ensureGeminiSchema(legacySchema as Record<string, unknown>, legacyRootType as 'object' | 'array' | undefined);
                    // Clean up legacy rootType field
                    delete (data.contract.output as unknown as Record<string, unknown>).rootType;
                }
                setContract(data.contract);
            }
        }
    }, [stage, form, templates, contract]);

    // Handle explicit template selection (auto-fill)
    const handleTemplateSelect = useCallback((templateId: string) => {
        const found = templates.find(t => t.id === templateId);
        if (found) {
            // Auto-fill Stage Config from template
            if (found.stage_config) {
                const sc = found.stage_config;
                if (sc.task_type) form.setValue('task_type', sc.task_type);
                if (sc.requires_approval !== undefined) form.setValue('requires_approval', sc.requires_approval);
                if (sc.timeout) form.setValue('timeout', sc.timeout);

                // Handle retryConfig
                if (sc.retryConfig) {
                    form.setValue('maxRetries', sc.retryConfig.maxRetries);
                    form.setValue('retryDelay', sc.retryConfig.retryDelay);
                } else {
                    const scAny = sc as unknown as Record<string, unknown>;
                    if (scAny.maxRetries !== undefined) form.setValue('maxRetries', scAny.maxRetries as number);
                    if (scAny.retryDelay !== undefined) form.setValue('retryDelay', scAny.retryDelay as number);
                }

                if (sc.return_along_with && Array.isArray(sc.return_along_with)) {
                    form.setValue('return_along_with', sc.return_along_with.join(', '));
                }

                if (sc.auxiliary_inputs) form.setValue('auxiliary_inputs', sc.auxiliary_inputs);
                if (sc.export_config) form.setValue('export_config', sc.export_config);
            }

            // Auto-fill AI settings from template defaults
            if (found.default_ai_settings) {
                const settings = found.default_ai_settings;
                const gc = settings.generationConfig || {};

                if (settings.model_id) {
                    form.setValue('model_id', settings.model_id);
                }
                if (gc.temperature !== undefined) {
                    form.setValue('temperature', gc.temperature);
                }
                if (gc.thinkingLevel !== undefined) {
                    form.setValue('thinkingLevel', gc.thinkingLevel);
                }
                if (gc.thinkingBudget !== undefined) {
                    form.setValue('thinkingBudget', gc.thinkingBudget);
                }
            }

            // Auto-fill Custom Component from template
            if (found.custom_component_id) {
                form.setValue('custom_component_id', found.custom_component_id);
            } else {
                form.setValue('custom_component_id', '');
            }
        }
    }, [templates, form]);

    // Set selected template when form value changes
    const watchedTemplateId = form.watch('prompt_template_id');
    useEffect(() => {
        let isMounted = true;
        const checkTemplate = async () => {
            if (watchedTemplateId) {
                let found = templates.find(t => t.id === watchedTemplateId);
                if (!found) {
                    // Try to fetch it (maybe it's a newly created snapshot)
                    try {
                        await storage.waitForAdapter();
                        const existing = await storage.adapter.getTemplate(watchedTemplateId);
                        if (existing && isMounted) {
                            found = existing as unknown as PromptTemplate;
                            // Optionally add to templates list so it's in dropdown
                            setTemplates(prev => {
                                if (!prev.find(t => t.id === existing.id)) {
                                    return [...prev, found as PromptTemplate].sort((a, b) => a.name.localeCompare(b.name));
                                }
                                return prev;
                            });
                        }
                    } catch (e) {
                        console.error("Failed to load missing template", e);
                    }
                }

                if (found && isMounted) {
                    setSelectedTemplate(found);
                    handleTemplateSelect(watchedTemplateId); // Apply template settings
                } else if (isMounted) {
                    setSelectedTemplate(null);
                }
            } else if (isMounted) {
                setSelectedTemplate(null);
            }
        };

        checkTemplate();

        return () => { isMounted = false; };
    }, [watchedTemplateId, templates, handleTemplateSelect]);

    // Extract available variables from parent stages
    const availableScope = useMemo(() => {
        if (!stageId || !edges.length) return [];

        const parentIds = edges
            .filter(e => e.target === stageId)
            .map(e => e.source)
            .filter(id => id !== 'start'); // We don't have schema for Launcher input yet

        if (parentIds.length === 0) return null; // Root stage

        // Always include global system variable
        const scope: string[] = ['input_data'];

        // Also include variables expected by the current stage's contract
        if (contract?.input?.fields) {
            scope.push(...contract.input.fields.map(f => f.name));
        }

        parentIds.forEach(id => {
            const parentNode = nodes.find(n => n.id === id);
            if (parentNode?.data) {
                const data = parentNode.data as unknown as StepConfig;
                const schemaObj = data.contract?.output?.schema as GeminiJsonSchema | undefined;
                const outputFields: string[] = [];

                if (schemaObj) {
                    if (schemaObj.properties) {
                        outputFields.push(...Object.keys(schemaObj.properties));
                    }
                    // Handle array of objects: extract properties from items
                    if (schemaObj.type === 'array' && schemaObj.items?.properties) {
                        outputFields.push(...Object.keys(schemaObj.items.properties));
                    }
                    // Fallback for legacy array format
                    if (Array.isArray(schemaObj)) {
                        outputFields.push(...(schemaObj as Record<string, unknown>[]).map((f) => String(f.name || '')));
                    }
                }
                // return_along_with fields
                const returnAlongWith = Array.isArray(data.return_along_with)
                    ? data.return_along_with
                    : [];

                scope.push(...outputFields, ...returnAlongWith);
            }
        });

        return Array.from(new Set(scope));
    }, [stageId, edges, nodes, contract?.input?.fields]);

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

        const data = stage.data as unknown as StepConfig;
        const configToExport = {
            version: 1,
            type: 'stage_config',
            name: form.getValues('name'),
            stage_key: form.getValues('stage_key'),
            label: form.getValues('label'),
            task_type: form.getValues('task_type'),
            prompt_template_id: form.getValues('prompt_template_id'),
            auxiliary_inputs: form.getValues('auxiliary_inputs'),
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
                    name: imported.name || imported.stage_key?.slice(0, 2) || '',
                    stage_key: imported.stage_key || '',
                    label: imported.label || '',
                    task_type: imported.task_type || '',
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
                    auxiliary_inputs: imported.auxiliary_inputs || [],
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
        await performAtomicSave();
    };

    if (!stage) return null;
    const stageData = stage.data as unknown as StepConfig;

    return (
        <Card className="h-full border-none rounded-none shadow-none">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold overflow-hidden">
                            {(() => {
                                const name = stageData.name?.toLowerCase() || 's';
                                const IconComp = ICONS[name];
                                if (IconComp) {
                                    return <IconComp className="w-5 h-5 text-primary-foreground" />;
                                }
                                return <span className="truncate px-0.5">{name.slice(0, 3).toUpperCase()}</span>;
                            })()}
                        </span>
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        {validationError && (
                            <Badge variant="destructive" className="animate-pulse mr-2">
                                Validation Error
                            </Badge>
                        )}

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
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => {
                                duplicateStep(stageId);
                                toast.success('Step duplicated');
                            }}
                            type="button"
                            title="Duplicate Step"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {validationError && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Design Error</AlertTitle>
                                <AlertDescription>{validationError}</AlertDescription>
                            </Alert>
                        )}
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
                                <TabsTrigger value="basic" className="text-xs">
                                    <Settings className="w-3 h-3 mr-1" />
                                    Basic
                                </TabsTrigger>
                                <TabsTrigger value="prompt" className="text-xs">
                                    <FileText className="w-3 h-3 mr-1" />
                                    Prompt
                                </TabsTrigger>
                                <TabsTrigger value="contract" className="text-xs">
                                    <FileInput className="w-3 h-3 mr-1" />
                                    IO
                                </TabsTrigger>
                                <TabsTrigger value="ai" className="text-xs">
                                    <Zap className="w-3 h-3 mr-1" />
                                    AI
                                </TabsTrigger>
                                <TabsTrigger value="hooks" className="text-xs">
                                    <Webhook className="w-3 h-3 mr-1" />
                                    Hooks
                                </TabsTrigger>
                                <TabsTrigger value="visual" className="text-xs">
                                    <Layout className="w-3 h-3 mr-1" />
                                    Visual
                                </TabsTrigger>
                            </TabsList>

                            {/* Basic Tab */}
                            <TabsContent value="basic" className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Step Icon</FormLabel>
                                                <FormControl>
                                                    <IconPicker
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
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
                                </div>

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
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select task type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="generic">Generic AI Task</SelectItem>
                                                    <SelectItem value="reasoning">Reasoning / Thinking</SelectItem>
                                                    <SelectItem value="sub_orchestration">Nested Orchestration (Sub-orch)</SelectItem>
                                                    <SelectItem value="system">System Task</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Determines the execution strategy</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {form.watch('task_type') === 'sub_orchestration' && (
                                    <div className="space-y-4 p-4 rounded-lg border bg-amber-50/30 border-amber-200/50 dark:bg-amber-950/10 dark:border-amber-900/30">
                                        <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-400">
                                            <Braces className="w-4 h-4" />
                                            Sub-Orchestration Settings
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="sub_orchestration_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Select Orchestration</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select an orchestration..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {orchestrations.map(orch => (
                                                                <SelectItem key={orch.id} value={orch.id}>
                                                                    {orch.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>Choose existing orchestration to nest</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="sub_orchestration_output_path"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Sub-orch Output Path</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="e.g. result or final_answer" className="font-mono text-sm" />
                                                    </FormControl>
                                                    <FormDescription>JSON path in sub-orch state to export back to parent</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

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
                                            <Select
                                                value={field.value}
                                                onValueChange={(val) => {
                                                    field.onChange(val);
                                                    // Auto-fill defaults from the selected dynamic model
                                                    const selectedModel = aiModels.find(m => m.model_id === val);
                                                    if (selectedModel) {
                                                        form.setValue('temperature', selectedModel.temperature);
                                                        form.setValue('topP', selectedModel.top_p);
                                                        form.setValue('topK', selectedModel.top_k);
                                                        form.setValue('maxOutputTokens', selectedModel.max_output_tokens);
                                                        form.setValue('generate_content_api', selectedModel.generate_content_api);
                                                        form.setValue('timeout', selectedModel.timeout_ms);
                                                        form.setValue('maxRetries', selectedModel.retries);
                                                    }
                                                }}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="border-primary/50 bg-primary/5 text-foreground">
                                                        <SelectValue placeholder="Select an AI model" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {loadingAiModels ? (
                                                        <SelectItem value="loading" disabled>Loading models...</SelectItem>
                                                    ) : aiModels.length > 0 ? (
                                                        aiModels.map(model => (
                                                            <SelectItem key={model.id} value={model.model_id}>
                                                                {model.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        // Fallback just in case db is empty
                                                        <>
                                                            <SelectItem value="gemini-flash-latest">Gemini Flash (Fast)</SelectItem>
                                                            <SelectItem value="gemini-pro-latest">Gemini Pro (Quality)</SelectItem>
                                                        </>
                                                    )}
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

                                {/* Thinking Configuration Section */}
                                {(() => {
                                    const currentModelId = form.watch('model_id');
                                    const modelSettings = aiModels.find(m => m.model_id === currentModelId);
                                    if (!modelSettings?.capabilities?.thinking) return null;

                                    return (
                                        <div className="space-y-4 pt-4 border-t bg-primary/5 p-3 rounded-lg border border-primary/20">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-semibold flex items-center gap-1.5">
                                                    🧠 Reasoning (Thinking)
                                                </span>
                                                <Badge variant="outline" className="text-[10px] bg-background">
                                                    {modelSettings.thinking_config_type === 'level' ? 'thinkingLevel' : 'thinkingBudget'}
                                                </Badge>
                                            </div>

                                            {modelSettings.thinking_config_type === 'level' ? (
                                                <FormField
                                                    control={form.control}
                                                    name="thinkingLevel"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Reasoning Level</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                                <FormControl>
                                                                    <SelectTrigger className="bg-background">
                                                                        <SelectValue placeholder="Select thinking level" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="minimal">Minimal</SelectItem>
                                                                    <SelectItem value="low">Low</SelectItem>
                                                                    <SelectItem value="medium">Medium</SelectItem>
                                                                    <SelectItem value="high">High</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormDescription className="text-[10px]">Controls the depth of reasoning</FormDescription>
                                                        </FormItem>
                                                    )}
                                                />
                                            ) : (
                                                <FormField
                                                    control={form.control}
                                                    name="thinkingBudget"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex justify-between">
                                                                <FormLabel className="text-xs">Reasoning Budget (tokens)</FormLabel>
                                                                <span className="text-xs text-muted-foreground">{field.value}</span>
                                                            </div>
                                                            <FormControl>
                                                                <Slider
                                                                    min={0}
                                                                    max={32000}
                                                                    step={512}
                                                                    value={[field.value || 0]}
                                                                    onValueChange={([v]) => field.onChange(v)}
                                                                    className="py-2"
                                                                />
                                                            </FormControl>
                                                            <FormDescription className="text-[10px]">Max tokens dedicated to internal reasoning</FormDescription>
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    );
                                })()}

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
                                                <Select
                                                    onValueChange={(val) => {
                                                        field.onChange(val);
                                                        handleTemplateSelect(val);
                                                    }}
                                                    value={field.value}
                                                >
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
                                                    The following variables are not available from parent stages:
                                                    <span className="font-mono ml-1 font-bold">
                                                        {invalidVariables.map(v => `${contract?.input.delimiters?.start || '{{'}${v}${contract?.input.delimiters?.end || '}}'}`).join(', ')}
                                                    </span>
                                                    <br />
                                                    Allowed scope:
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

                                <ExportSection
                                    config={form.watch('export_config') as ExportConfig}
                                    onChange={(config) => {
                                        form.setValue('export_config', config || {
                                            enabled: false,
                                            destination: 'webhook',
                                            settings: { format: 'json' }
                                        });
                                        // Update designer store immediately for responsiveness
                                        updateStepData(stageId, { export_config: config });
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
                                    availableDocuments={availableDocuments}
                                    selectedDocumentIds={form.watch('auxiliary_inputs')}
                                    onAuxiliaryInputsChange={(ids) => {
                                        form.setValue('auxiliary_inputs', ids);
                                        // Update designer store
                                        updateStepData(stageId, { auxiliary_inputs: ids });
                                    }}
                                />
                            </TabsContent>

                            {/* Visual Tab */}
                            <TabsContent value="visual" className="space-y-4 mt-4">
                                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                                            <Layout className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold">Custom View Registry</h4>
                                            <p className="text-[11px] text-muted-foreground">Select a UI component to display results for this stage.</p>
                                        </div>
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="custom_component_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>UI Component</FormLabel>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value || "_default"}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select from library..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="_default">Default (Property Table)</SelectItem>
                                                            {registryComponents.map(comp => (
                                                                <SelectItem key={comp.id} value={comp.id}>
                                                                    {comp.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    type="button"
                                                    onClick={() => navigate('/assets')}
                                                    title="Manage Registry"
                                                >
                                                    <Braces className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <FormDescription>
                                                This component will be used to filter and render output in Batch Progress.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {form.watch('custom_component_id') && form.watch('custom_component_id') !== '_default' && (
                                    <Alert className="bg-emerald-500/5 border-emerald-500/20">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <AlertTitle className="text-xs font-bold text-emerald-600 uppercase">Registry Component Linked</AlertTitle>
                                        <AlertDescription className="text-[11px] text-emerald-600/80">
                                            This stage will use a component from the Registry. Changes at the Registry will automatically apply to this stage.
                                        </AlertDescription>
                                    </Alert>
                                )}
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
