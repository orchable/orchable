import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Grid,
    List,
    Code,
    FileText,
    MoreVertical,
    Trash2,
    Edit2,
    Copy,
    ExternalLink,
    ChevronRight,
    Database,
    Sparkles
} from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { ComponentEditor } from '@/components/batch/ComponentEditor';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PromptEditorDialog } from '@/components/designer/PromptEditorDialog';

export function AssetLibrary() {
    const [activeTab, setActiveTab] = useState('components');
    const [components, setComponents] = useState<CustomComponent[]>([]);
    const [templates, setTemplates] = useState<PromptTemplateRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [editingComponent, setEditingComponent] = useState<CustomComponent | null>(null);

    // Prompt Editor States
    const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplateRecord | null>(null);
    const [editedPrompt, setEditedPrompt] = useState('');
    const [promptDelimiters, setPromptDelimiters] = useState<{ start: string, end: string }>({ start: '%%', end: '%%' });
    const [isSavingPrompt, setIsSavingPrompt] = useState(false);

    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const [comps, tplList] = await Promise.all([
                getCustomComponents(),
                // For now fetch all, filtering can be added later
                supabase.from('prompt_templates').select('*').order('name')
            ]);
            setComponents(comps);
            if (tplList.data) setTemplates(tplList.data);
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

        // Initialize delimiters from view_config or default to %%
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
                    <Button className="gap-2" onClick={handleNewComponent}>
                        <Plus className="w-4 h-4" />
                        New Asset
                    </Button>
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
                                                <Badge variant="outline" className="text-[10px]">
                                                    {comp.is_public ? 'Public' : 'Private'}
                                                </Badge>
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
                </div>
            </Tabs>

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
        </div>
    );
}
