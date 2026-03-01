import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Grid,
    List,
    Code,
    FileText,
    Settings2,
    Save,
    MoreVertical,
    Trash2,
    Edit2,
    Copy,
    ExternalLink,
    ChevronRight,
    Database,
    Sparkles,
    Share2,
    Globe,
    FileCode
} from 'lucide-react';
import {
    DocumentAsset
} from '@/lib/types';
import { DocumentLibrary } from '@/components/assets/DocumentLibrary';
import { UploadDocumentModal } from '@/components/assets/UploadDocumentModal';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    getCustomComponents,
    deleteCustomComponent,
    createCustomComponent,
    updateCustomComponent,
    type CustomComponent,
    type PromptTemplateRecord
} from '@/services/stageService';
import { supabase } from "@/lib/supabase";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTier } from '@/hooks/useTier';
import { ComponentEditor } from '@/components/batch/ComponentEditor';
import { db } from '@/lib/storage/IndexedDBAdapter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PromptEditorDialog } from '@/components/designer/PromptEditorDialog';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { AIModelSetting } from '@/lib/types';
import { ShareToHubDialog } from '@/components/hub/ShareToHubDialog';
import { HubAssetType } from '@/services/hubService';

export function AssetLibrary() {
    const [activeTab, setActiveTab] = useState('components');
    const [components, setComponents] = useState<CustomComponent[]>([]);
    const [templates, setTemplates] = useState<PromptTemplateRecord[]>([]);
    const [documents, setDocuments] = useState<DocumentAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [editingComponent, setEditingComponent] = useState<CustomComponent | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Prompt Editor States
    const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplateRecord | null>(null);
    const [editedPrompt, setEditedPrompt] = useState('');
    const [promptDelimiters, setPromptDelimiters] = useState<{ start: string, end: string }>({ start: '%%', end: '%%' });
    const [isSavingPrompt, setIsSavingPrompt] = useState(false);

    // AI Settings State
    const [aiSettings, setAiSettings] = useState<AIModelSetting[]>([]);
    const [selectedAiTag, setSelectedAiTag] = useState<string | null>(null);
    const [editingAiSetting, setEditingAiSetting] = useState<AIModelSetting | null>(null);
    const [isAiSettingEditorOpen, setIsAiSettingEditorOpen] = useState(false);
    const [isSavingAiSetting, setIsSavingAiSetting] = useState(false);

    // Hub Sharing State
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [sharingAssetType, setSharingAssetType] = useState<HubAssetType>('template');
    const [sharingAssetId, setSharingAssetId] = useState<string>('');
    const [sharingAssetInitialData, setSharingAssetInitialData] = useState<{ title: string, description?: string, tags?: string[] }>({ title: '' });

    // Document Specific State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const { user } = useAuth();
    const { tier } = useTier();
    const navigate = useNavigate();

    useEffect(() => {
        fetchAssets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const [comps, tplList, aiList, docList] = await Promise.all([
                getCustomComponents(),
                supabase.from('prompt_templates').select('*').order('name'),
                supabase.from('ai_model_settings').select('*').order('name'),
                supabase.from('document_assets').select('*').order('created_at', { ascending: false })
            ]);
            setComponents(comps);
            if (tplList.data) setTemplates(tplList.data);

            if (aiList.data) {
                // If Free Tier, load local overrides from IndexedDB
                if (tier === 'free') {
                    const localSettings = await db.ai_model_settings.toArray();
                    const mergedSettings = aiList.data.map(globalSetting => {
                        const localOverride = localSettings.find(ls => ls.model_id === globalSetting.model_id);
                        if (localOverride) {
                            return { ...globalSetting, ...localOverride, id: globalSetting.id }; // Keep global ID but use local values
                        }
                        return globalSetting;
                    });
                    setAiSettings(mergedSettings);
                } else {
                    // For Premium: Merge system defaults with user's overrides
                    const systemSettings = aiList.data.filter(s => s.user_id === null);
                    const userOverrides = aiList.data.filter(s => s.user_id === user?.id);
                    const mergedSettings = systemSettings.map(globalSetting => {
                        const override = userOverrides.find(o => o.model_id === globalSetting.model_id);
                        if (override) {
                            return { ...globalSetting, ...override, id: override.id };
                        }
                        return globalSetting;
                    });
                    setAiSettings(mergedSettings);
                }
            }
            if (docList.data) setDocuments(docList.data as DocumentAsset[]);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
            toast.error('Failed to load resource list');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteComponent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this component?')) return;
        try {
            await deleteCustomComponent(id);
            toast.success('Component deleted');
            fetchAssets();
        } catch (error) {
            toast.error('Failed to delete component');
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            const { error } = await supabase.from('prompt_templates').delete().eq('id', id);
            if (error) throw error;
            toast.success('Template deleted');
            fetchAssets();
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete template');
        }
    };

    const handleEditComponent = (comp: CustomComponent) => {
        setEditingComponent(comp);
        setShowEditor(true);
    };

    const handleNewComponent = () => {
        setEditingComponent(null);
        setShowEditor(true);
    };

    const handleSaveComponent = async (code: string, mockData?: Record<string, unknown>) => {
        try {
            if (editingComponent) {
                await updateCustomComponent(editingComponent.id, {
                    code,
                    mock_data: mockData
                });
                toast.success('Component updated');
            } else {
                const name = prompt('Enter new component name:', 'New Component');
                if (!name) return;
                await createCustomComponent({
                    name,
                    code,
                    mock_data: mockData,
                    created_by: user?.id,
                    is_public: true
                });
                toast.success('New component created');
            }
            setShowEditor(false);
            fetchAssets();
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Error saving component');
        }
    };

    const handleEditTemplate = async (template: PromptTemplateRecord) => {
        setEditingTemplate(template);
        setEditedPrompt(template.template || '');
        const savedDelimiters = template.view_config?.delimiters as { start: string, end: string } | undefined;
        setPromptDelimiters(savedDelimiters || { start: '%%', end: '%%' });
        setIsPromptEditorOpen(true);
    };

    const handleSavePrompt = async () => {
        if (!editingTemplate) return;
        setIsSavingPrompt(true);
        try {
            const { error } = await supabase
                .from('prompt_templates')
                .update({
                    template: editedPrompt,
                    version: (editingTemplate.version || 1) + 1,
                    updated_at: new Date().toISOString(),
                    view_config: {
                        ...(editingTemplate.view_config || {}),
                        delimiters: promptDelimiters
                    }
                })
                .eq('id', editingTemplate.id);

            if (error) throw error;
            toast.success('Prompt template updated');
            setIsPromptEditorOpen(false);
            fetchAssets();
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Error saving template');
        } finally {
            setIsSavingPrompt(false);
        }
    };

    const handleEditAiSetting = (setting: AIModelSetting) => {
        setEditingAiSetting({ ...setting });
        setIsAiSettingEditorOpen(true);
    };

    const handleSaveAiSetting = async () => {
        if (!editingAiSetting) return;
        setIsSavingAiSetting(true);
        try {
            if (tier === 'free') {
                const payload = { ...editingAiSetting };
                const existing = await db.ai_model_settings.where('model_id').equals(editingAiSetting.model_id).first();
                if (existing) {
                    await db.ai_model_settings.update(existing.id!, payload);
                } else {
                    payload.id = editingAiSetting.model_id + '_local';
                    await db.ai_model_settings.put(payload);
                }
                toast.success('AI default settings saved locally');
                setIsAiSettingEditorOpen(false);
                fetchAssets();
                return;
            }

            if (!user) throw new Error("Must be logged in to save settings.");

            const { data: existingUserSetting } = await supabase
                .from('ai_model_settings')
                .select('id')
                .eq('user_id', user.id)
                .eq('model_id', editingAiSetting.model_id)
                .maybeSingle();

            const payload = {
                model_id: editingAiSetting.model_id,
                name: editingAiSetting.name,
                category: editingAiSetting.category,
                tagline: editingAiSetting.tagline,
                description: editingAiSetting.description,
                supported_inputs: editingAiSetting.supported_inputs,
                supported_outputs: editingAiSetting.supported_outputs,
                input_token_limit: editingAiSetting.input_token_limit,
                output_token_limit: editingAiSetting.output_token_limit,
                capabilities: editingAiSetting.capabilities,
                temperature: editingAiSetting.temperature,
                top_k: editingAiSetting.top_k,
                top_p: editingAiSetting.top_p,
                max_output_tokens: editingAiSetting.max_output_tokens,
                timeout_ms: editingAiSetting.timeout_ms,
                retries: editingAiSetting.retries,
                user_id: user.id
            };

            let saveError;
            if (existingUserSetting) {
                const { error } = await supabase
                    .from('ai_model_settings')
                    .update(payload)
                    .eq('id', existingUserSetting.id);
                saveError = error;
            } else {
                const { error } = await supabase
                    .from('ai_model_settings')
                    .insert(payload);
                saveError = error;
            }

            if (saveError) throw saveError;

            toast.success('AI default settings updated');
            setIsAiSettingEditorOpen(false);
            fetchAssets();
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Error saving AI settings');
        } finally {
            setIsSavingAiSetting(false);
        }
    };

    const handleShareToHub = (type: HubAssetType, asset: { id: string; name: string; description?: string; tags?: string[] }) => {
        setSharingAssetType(type);
        setSharingAssetId(asset.id);
        setSharingAssetInitialData({
            title: asset.name,
            description: asset.description,
            tags: asset.tags || []
        });
        setIsShareDialogOpen(true);
    };

    const filteredComponents = components.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col h-screen bg-background p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Asset Library</h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Database className="w-4 h-4" />
                        Manage reusable Prompt Templates and Custom Components.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search resources..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {activeTab === 'components' && (
                        <Button className="gap-2" onClick={handleNewComponent}>
                            <Plus className="w-4 h-4" />
                            New Component
                        </Button>
                    )}
                    {activeTab === 'documents' && (
                        <Button className="gap-2" onClick={() => setIsUploadModalOpen(true)}>
                            <Plus className="w-4 h-4" />
                            Upload Document
                        </Button>
                    )}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="bg-transparent border-b rounded-none px-0 h-12 w-full justify-start gap-6">
                    <TabsTrigger
                        value="components"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 h-full gap-2"
                    >
                        <Code className="w-4 h-4" />
                        View Components
                        <Badge variant="secondary" className="ml-1">{components.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="templates"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 h-full gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Prompt Templates
                        <Badge variant="secondary" className="ml-1">{templates.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="documents"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 h-full gap-2"
                    >
                        <FileCode className="w-4 h-4" />
                        Documents
                        <Badge variant="secondary" className="ml-1">{documents.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="ai_settings"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 h-full gap-2"
                    >
                        <Settings2 className="w-4 h-4" />
                        AI Settings
                        <Badge variant="secondary" className="ml-1">{aiSettings.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto mt-6">
                    <TabsContent value="components" className="m-0 focus-visible:outline-none">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
                            </div>
                        ) : filteredComponents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredComponents.map((comp) => (
                                    <Card key={comp.id} className="group hover:border-primary/50 transition-all duration-300 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                    <Code className="w-5 h-5" />
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem className="gap-2" onClick={() => handleEditComponent(comp)}>
                                                            <Edit2 className="w-4 h-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="gap-2">
                                                            <Copy className="w-4 h-4" />
                                                            Duplicate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="gap-2" onClick={() => handleShareToHub('component', comp)}>
                                                            <Share2 className="w-4 h-4" />
                                                            Share to Hub
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive gap-2 focus:bg-destructive/10 focus:text-destructive"
                                                            onClick={() => handleDeleteComponent(comp.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <CardTitle className="mt-4 line-clamp-1">{comp.name}</CardTitle>
                                            <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                                                {comp.description || 'No description for this component.'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pb-4">
                                            <div className="flex gap-2">
                                                {comp.hub_asset_id ? (
                                                    <Badge variant="default" className="text-[10px] bg-primary/20 text-primary border-primary/30 hover:bg-primary/20">
                                                        <Globe className="w-3 h-3 mr-1" />
                                                        Public on Hub
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {comp.is_public ? 'Public' : 'Private'}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px]">
                                                    TSX
                                                </Badge>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="pt-0 border-t border-border/10 bg-muted/5 p-3 flex justify-between items-center">
                                            <span className="text-[10px] text-muted-foreground italic">
                                                Updated: {new Date(comp.updated_at || '').toLocaleDateString('en-US')}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs gap-1 group/btn"
                                                onClick={() => handleEditComponent(comp)}
                                            >
                                                Open Editor
                                                <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/5">
                                <div className="p-4 rounded-full bg-muted mb-4 text-muted-foreground">
                                    <Sparkles className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-medium">No components yet</h3>
                                <p className="text-muted-foreground text-sm">Create your first custom UI component.</p>
                                <Button className="mt-4 gap-2" onClick={handleNewComponent}>
                                    <Plus className="w-4 h-4" />
                                    Create Component
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="templates" className="m-0 focus-visible:outline-none">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
                            </div>
                        ) : filteredTemplates.length > 0 ? (
                            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Template Name</th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Task Type</th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">UI Component</th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Updated</th>
                                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTemplates.map((template) => (
                                            <tr key={template.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{template.name}</span>
                                                        <span className="text-[10px] text-muted-foreground line-clamp-1">{template.description}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge variant="outline" className="text-[11px] capitalize bg-background">
                                                        {template.organization_code ? 'Custom' : 'System'}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {template.custom_component_id ? (
                                                        <div className="flex items-center gap-1.5 text-primary">
                                                            <Code className="w-3 h-3" />
                                                            <span className="text-xs font-medium">Linked Registry</span>
                                                        </div>
                                                    ) : template.view_config?.customComponent ? (
                                                        <div className="flex items-center gap-1.5 text-amber-500">
                                                            <ExternalLink className="w-3 h-3" />
                                                            <span className="text-xs font-medium">Inline Legacy</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Default</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-xs text-muted-foreground">
                                                    {template.version > 0 ? `v${template.version}` : 'v1'}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {template.hub_asset_id ? (
                                                            <Badge variant="secondary" className="h-8 px-2 bg-primary/10 text-primary border-primary/20 mr-1">
                                                                <Globe className="w-3 h-3 mr-1" />
                                                                Hub
                                                            </Badge>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={() => handleShareToHub('template', template)}
                                                                title="Share to Hub"
                                                            >
                                                                <Share2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                            onClick={() => handleEditTemplate(template)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteTemplate(template.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/5">
                                <h3 className="text-lg font-medium">No Prompt Templates yet</h3>
                                <p className="text-muted-foreground text-sm">Templates are created automatically when you design an Orchestrator.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="documents" className="m-0 focus-visible:outline-none">
                        <DocumentLibrary
                            documents={documents}
                            loading={loading}
                            onUpload={() => setIsUploadModalOpen(true)}
                            onRefresh={fetchAssets}
                        />
                    </TabsContent>

                    <TabsContent value="ai_settings" className="m-0 focus-visible:outline-none h-full">
                        <div className="space-y-4">
                            {(() => {
                                const allTags = Array.from(new Set(aiSettings.flatMap(s => s.use_case_tags ?? [])));
                                return allTags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 pb-2 border-b border-border/50">
                                        <div className="flex items-center gap-2 mr-2">
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">Filter:</span>
                                            <Badge
                                                variant={selectedAiTag === null ? 'default' : 'outline'}
                                                className="cursor-pointer text-[10px] px-2 py-0"
                                                onClick={() => setSelectedAiTag(null)}
                                            >
                                                All
                                            </Badge>
                                        </div>
                                        {allTags.map(tag => (
                                            <Badge
                                                key={tag}
                                                variant={selectedAiTag === tag ? 'default' : 'outline'}
                                                className={`cursor-pointer text-[10px] px-2 py-0 capitalize ${selectedAiTag === tag
                                                    ? "hover:bg-primary/90 hover:text-primary-foreground"
                                                    : "hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                                                    }`}
                                                onClick={() => setSelectedAiTag(selectedAiTag === tag ? null : tag)}
                                            >
                                                {tag.replace(/-/g, ' ')}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : null;
                            })()}

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {aiSettings
                                    .filter(s => !selectedAiTag || (s.use_case_tags && s.use_case_tags.includes(selectedAiTag)))
                                    .map((setting) => {
                                        const isFree = setting.free_tier_rpd != null;
                                        const capIcons = [
                                            { key: 'thinking', label: '🧠 Thinking' },
                                            { key: 'function_calling', label: '⚙️ Functions' },
                                            { key: 'search_grounding', label: '🔍 Search' },
                                            { key: 'code_execution', label: '💻 Code Run' },
                                            { key: 'image_generation', label: '🎨 Image Gen' },
                                            { key: 'batch_api', label: '📦 Batch' },
                                            { key: 'url_context', label: '🌐 URL' },
                                            { key: 'caching', label: '💾 Cache' },
                                        ];
                                        const enabledCaps = capIcons.filter(c => setting.capabilities?.[c.key]);

                                        return (
                                            <Card key={setting.id} className={`flex flex-col group transition-all duration-300 hover:shadow-lg hover:border-primary/40 ${!setting.is_active ? 'opacity-60' : ''}`}>
                                                <CardHeader className="pb-3 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                {setting.category && (
                                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                                                                        {setting.category}
                                                                    </Badge>
                                                                )}
                                                                <Badge
                                                                    variant={isFree ? 'default' : 'outline'}
                                                                    className={`text-[10px] px-1.5 py-0 font-normal shrink-0 ${isFree ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 'text-amber-400 border-amber-500/30'}`}
                                                                >
                                                                    {isFree ? '🔓 Free' : '🔒 Paid'}
                                                                </Badge>
                                                            </div>
                                                            <CardTitle className="text-base leading-tight truncate">{setting.name}</CardTitle>
                                                            <code className="text-[10px] text-muted-foreground font-mono">{setting.model_id}</code>
                                                        </div>
                                                        <Switch
                                                            checked={setting.is_active}
                                                            onCheckedChange={async (checked) => {
                                                                if (tier === 'free') {
                                                                    const existing = await db.ai_model_settings.where('model_id').equals(setting.model_id).first();
                                                                    if (existing) {
                                                                        await db.ai_model_settings.update(existing.id!, { is_active: checked });
                                                                    } else {
                                                                        await db.ai_model_settings.put({ ...setting, is_active: checked, id: setting.model_id + '_local' });
                                                                    }
                                                                    setAiSettings(prev => prev.map(s => s.id === setting.id ? { ...s, is_active: checked } : s));
                                                                    toast.success(checked ? 'Model enabled locally' : 'Model disabled locally');
                                                                    return;
                                                                }

                                                                const { error } = await supabase
                                                                    .from('ai_model_settings')
                                                                    .update({ is_active: checked })
                                                                    .eq('id', setting.id);
                                                                if (!error) {
                                                                    setAiSettings(prev => prev.map(s => s.id === setting.id ? { ...s, is_active: checked } : s));
                                                                    toast.success(checked ? 'Model enabled' : 'Model disabled');
                                                                } else {
                                                                    toast.error('Failed to update status');
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    {setting.tagline && (
                                                        <p className="text-xs text-muted-foreground italic leading-tight">{setting.tagline}</p>
                                                    )}
                                                    {setting.description && (
                                                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 border-l-2 border-primary/30 pl-2">
                                                            {setting.description}
                                                        </p>
                                                    )}
                                                </CardHeader>

                                                <CardContent className="pb-3 flex-1 space-y-3">
                                                    <div className="space-y-1.5 text-xs">
                                                        {setting.supported_inputs && setting.supported_inputs.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 items-center">
                                                                <span className="text-muted-foreground w-12 shrink-0">In:</span>
                                                                {setting.supported_inputs.map(t => (
                                                                    <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 font-normal">{t}</Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {setting.supported_outputs && setting.supported_outputs.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 items-center">
                                                                <span className="text-muted-foreground w-12 shrink-0">Out:</span>
                                                                {setting.supported_outputs.map(t => (
                                                                    <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 font-normal">{t}</Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {(setting.input_token_limit || setting.output_token_limit) && (
                                                            <div className="flex gap-3 text-muted-foreground">
                                                                {setting.input_token_limit && <span>In: <strong className="text-foreground">{(setting.input_token_limit / 1000).toFixed(0)}K</strong></span>}
                                                                {setting.output_token_limit && <span>Out: <strong className="text-foreground">{(setting.output_token_limit / 1000).toFixed(0)}K</strong></span>}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {enabledCaps.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {enabledCaps.map(c => (
                                                                <span key={c.key} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/50">
                                                                    {c.label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {isFree && (
                                                        <div className="rounded-md bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1.5 text-[10px] space-y-0.5">
                                                            <div className="text-emerald-400 font-medium mb-0.5">Free Tier Quota</div>
                                                            <div className="flex gap-3 text-muted-foreground">
                                                                {setting.free_tier_rpm != null && <span>RPM: <strong className="text-emerald-300">{setting.free_tier_rpm}</strong></span>}
                                                                {setting.free_tier_tpm != null && <span>TPM: <strong className="text-emerald-300">{(setting.free_tier_tpm / 1000).toFixed(0)}K</strong></span>}
                                                                {setting.free_tier_rpd != null && <span>RPD: <strong className="text-emerald-300">{setting.free_tier_rpd}</strong></span>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="rounded-md bg-muted/30 border border-border/50 px-2.5 py-1.5 text-[10px]">
                                                        <div className="text-muted-foreground font-medium mb-1">Default Parameters</div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                                                            <span>Temp: <strong className="text-foreground">{setting.temperature}</strong></span>
                                                            <span>Top-P: <strong className="text-foreground">{setting.top_p}</strong></span>
                                                            <span>Top-K: <strong className="text-foreground">{setting.top_k}</strong></span>
                                                            <span>Max Out: <strong className="text-foreground">{(setting.max_output_tokens / 1000).toFixed(0)}K</strong></span>
                                                        </div>
                                                    </div>
                                                </CardContent>

                                                <CardFooter className="pt-0 justify-end pb-4 pr-4 gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="gap-2 text-muted-foreground hover:text-primary"
                                                        onClick={() => handleShareToHub('ai_preset', setting)}
                                                    >
                                                        <Share2 className="w-3.5 h-3.5" />
                                                        Share
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="gap-2"
                                                        onClick={() => handleEditAiSetting(setting)}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        Edit Defaults
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        );
                                    })}
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            {/* Component Editor Dialog */}
            <Dialog open={showEditor} onOpenChange={setShowEditor}>
                <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden border-none shadow-2xl">
                    <ComponentEditor
                        isRegistryMode
                        initialCode={editingComponent?.code}
                        initialMockData={editingComponent?.mock_data}
                        onSave={handleSaveComponent}
                    />
                </DialogContent>
            </Dialog>

            <PromptEditorDialog
                open={isPromptEditorOpen}
                onOpenChange={setIsPromptEditorOpen}
                prompt={editedPrompt}
                onPromptChange={setEditedPrompt}
                onSave={handleSavePrompt}
                isSaving={isSavingPrompt}
                title={editingTemplate?.name || 'Edit Prompt'}
                availableScope={editingTemplate?.input_schema?.properties ? Object.keys(editingTemplate.input_schema.properties) : []}
                sidebarMode="used"
                delimiters={promptDelimiters}
                onDelimitersChange={setPromptDelimiters}
            />

            <Dialog open={isAiSettingEditorOpen} onOpenChange={setIsAiSettingEditorOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit AI Defaults</DialogTitle>
                        <DialogDescription>
                            Configure default parameters for {editingAiSetting?.name}. These can be overridden per task.
                        </DialogDescription>
                    </DialogHeader>
                    {editingAiSetting && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="temperature">Temperature</Label>
                                    <span className="text-sm text-muted-foreground">{editingAiSetting.temperature}</span>
                                </div>
                                <Slider
                                    id="temperature"
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={[editingAiSetting.temperature]}
                                    onValueChange={([v]) => setEditingAiSetting({ ...editingAiSetting, temperature: v })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="top_p">Top-P</Label>
                                    <span className="text-sm text-muted-foreground">{editingAiSetting.top_p}</span>
                                </div>
                                <Slider
                                    id="top_p"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={[editingAiSetting.top_p || 0.95]}
                                    onValueChange={([v]) => setEditingAiSetting({ ...editingAiSetting, top_p: v })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="top_k">Top-K</Label>
                                    <span className="text-sm text-muted-foreground">{editingAiSetting.top_k}</span>
                                </div>
                                <Slider
                                    id="top_k"
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={[editingAiSetting.top_k || 40]}
                                    onValueChange={([v]) => setEditingAiSetting({ ...editingAiSetting, top_k: v })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="max_tokens">Max Output Tokens</Label>
                                <Input
                                    id="max_tokens"
                                    type="number"
                                    value={editingAiSetting.max_output_tokens}
                                    onChange={(e) => setEditingAiSetting({ ...editingAiSetting, max_output_tokens: parseInt(e.target.value) || 8192 })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAiSettingEditorOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAiSetting} disabled={isSavingAiSetting}>
                            {isSavingAiSetting ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ShareToHubDialog
                open={isShareDialogOpen}
                onOpenChange={setIsShareDialogOpen}
                assetType={sharingAssetType}
                assetId={sharingAssetId}
                initialData={sharingAssetInitialData}
                onSuccess={fetchAssets}
            />

            <UploadDocumentModal
                open={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
                onSuccess={fetchAssets}
            />
        </div>
    );
}
