import { useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { useConfigs } from '@/hooks/useConfigs';
import { OrchestratorConfig, StepConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, Search, LayoutTemplate, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export function ConfigLibrary() {
    const { loadConfig } = useDesignerStore();
    const { data: savedConfigs } = useConfigs();
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const templates = [
        {
            id: 'simple-linear',
            name: 'Linear Process',
            description: 'A simple sequence of steps (A → B → C)',
            steps: [
                { id: 'step-a', name: 'A', label: 'Step A', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-b', name: 'B', label: 'Step B', webhookUrl: '', dependsOn: ['step-a'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-c', name: 'C', label: 'Step C', webhookUrl: '', dependsOn: ['step-b'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
            ]
        },
        {
            id: 'branching',
            name: 'Branching Logic',
            description: 'Execute parallel branches that converge (A → [B, C] → D)',
            steps: [
                { id: 'step-a', name: 'A', label: 'Start', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-b', name: 'B', label: 'Branch 1', webhookUrl: '', dependsOn: ['step-a'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-c', name: 'C', label: 'Branch 2', webhookUrl: '', dependsOn: ['step-a'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-d', name: 'D', label: 'Converge', webhookUrl: '', dependsOn: ['step-b', 'step-c'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
            ]
        },
        {
            id: 'parallel',
            name: 'Parallel Execution',
            description: 'Run multiple independent tasks simultaneously (A, B, C)',
            steps: [
                { id: 'step-a', name: 'A', label: 'Task A', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-b', name: 'B', label: 'Task B', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-c', name: 'C', label: 'Task C', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
            ]
        }
    ];

    const handleLoadTemplate = (steps: StepConfig[]) => {
        const timestamp = new Date().toISOString();
        const baseConfig: Pick<OrchestratorConfig, "id" | "name" | "created_at" | "updated_at"> = {
            id: `temp-${Date.now()}`,
            name: "New Process",
            created_at: timestamp,
            updated_at: timestamp
        };
        loadConfig({ ...baseConfig, steps });
        setOpen(false);
    };

    const handleLoadConfig = (config: OrchestratorConfig) => {
        loadConfig(config);
        setOpen(false);
    };

    const filteredConfigs = savedConfigs?.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="bg-card">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Load Library
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
                <SheetHeader>
                    <SheetTitle>Pattern Library</SheetTitle>
                    <SheetDescription>
                        Load pre-built templates or your saved orchestrations.
                    </SheetDescription>
                </SheetHeader>

                <div className="py-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search patterns..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Tabs defaultValue="saved" className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="saved">My Configs</TabsTrigger>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="saved" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-3">
                                {filteredConfigs?.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No saved configurations found matching "{searchTerm}"
                                    </div>
                                )}
                                {filteredConfigs?.map((config) => (
                                    <div
                                        key={config.id}
                                        className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => handleLoadConfig(config)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2 font-medium">
                                                <FileText className="w-4 h-4 text-primary" />
                                                {config.name}
                                            </div>
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {formatDistanceToNow(new Date(config.updated_at), { addSuffix: true })}
                                            </Badge>
                                        </div>
                                        {config.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {config.description}
                                            </p>
                                        )}
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {config.steps.length} steps
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="templates" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-3">
                                {templates.map((template) => (
                                    <div
                                        key={template.id}
                                        className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => handleLoadTemplate(template.steps)}
                                    >
                                        <div className="flex items-center gap-2 font-medium">
                                            <LayoutTemplate className="w-4 h-4 text-blue-500" />
                                            {template.name}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {template.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
