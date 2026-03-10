import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlowCanvas } from './FlowCanvas';
import { StepPalette } from './StepPalette';
import { StageConfigPanel } from './StageConfigPanel';
import { StartConfigPanel } from './StartConfigPanel';
import { SaveConfigDialog } from './SaveConfigDialog';
import { RunExecutionDialog } from './RunExecutionDialog';

import { ConfigLibrary } from './ConfigLibrary';
import { useDesignerStore } from '@/stores/designerStore';
import { useConfigs } from '@/hooks/useConfigs';
import { Button } from '@/components/ui/button';
import { RotateCcw, Globe, Maximize2, Minimize2, MoreVertical, FilePlus, Download, Upload, Copy, Play, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ShareToHubDialog } from '@/components/hub/ShareToHubDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DuplicateOrchDialog } from './DuplicateOrchDialog';
import { useImportExport } from '@/hooks/useImportExport';
import { toast } from 'sonner';

export default function OrchestratorDesigner() {
    const { nodes, selectedNode, reset, config, loadConfig, orchestratorName } = useDesignerStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const configId = searchParams.get('configId');
    const { data: savedConfigs } = useConfigs();
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
    const [isExpandedView, setIsExpandedView] = useState(false);
    const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false);

    const { handleExport, handleImport, triggerImport, fileInputRef } = useImportExport();

    useEffect(() => {
        if (configId && savedConfigs && !hasAttemptedLoad) {
            const configToLoad = savedConfigs.find(c => c.id === configId);
            if (configToLoad && config?.id !== configId) {
                loadConfig(configToLoad);
            }
            setHasAttemptedLoad(true);

            // Clear URL param after load so that subsequent refreshes don't force a reload if they made unsaved changes
            if (configToLoad) {
                setSearchParams({});
            }
        }
    }, [configId, savedConfigs, config?.id, loadConfig, hasAttemptedLoad, setSearchParams]);

    const handleNewOrchestration = () => {
        // If more than just the start node, ask for confirmation
        if (nodes.length > 1) {
            setIsNewConfirmOpen(true);
        } else {
            confirmNew();
        }
    };

    const confirmNew = () => {
        reset();
        setSearchParams({});
        toast.info("Bắt đầu Orchestration mới");
    };

    return (
        <div className="flex h-full bg-background">
            {/* Left Sidebar: Palette */}
            <div className="w-64 h-full flex-shrink-0 z-10">
                <StepPalette />
            </div>

            {/* Main Canvas */}
            {/* Main Canvas */}
            <div className="flex-1 relative h-full">
                {/* Fixed hidden input for import */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImport}
                />

                <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
                    {/* Left Group: Creation & Context */}
                    <div className="flex gap-2 pointer-events-auto items-center">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleNewOrchestration}
                            className="shadow-md bg-primary hover:bg-primary/90"
                        >
                            <FilePlus className="w-4 h-4 mr-2" />
                            New
                        </Button>
                        <ConfigLibrary />
                        <Separator orientation="vertical" className="h-6 mx-1 bg-border/50" />
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold leading-none mb-1">
                                {config?.id ? "Editing Orchestration" : "New Orchestration"}
                            </span>
                            <span className="text-sm font-semibold text-foreground leading-none truncate max-w-[200px]">
                                {orchestratorName || "Untitled Orchestration"}
                            </span>
                        </div>
                    </div>

                    {/* Right Group: Actions */}
                    <div className="flex gap-2 pointer-events-auto">
                        <SaveConfigDialog />
                        <RunExecutionDialog disabled={!config?.id} />

                        <Separator orientation="vertical" className="h-9 bg-border" />

                        <Button
                            variant={isExpandedView ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setIsExpandedView(!isExpandedView)}
                            className={isExpandedView ? "border-primary text-primary" : "bg-card shadow-sm hover:border-primary/50"}
                        >
                            {isExpandedView ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                            {isExpandedView ? "Collapse" : "Expand All"}
                        </Button>

                        <Separator orientation="vertical" className="h-9 bg-border" />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-card shadow-sm px-2">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem disabled={!config?.id} onClick={() => setIsDuplicateDialogOpen(true)}>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={!config?.id} onClick={() => setIsShareDialogOpen(true)}>
                                    <Globe className="w-4 h-4 mr-2" />
                                    Share to Hub
                                </DropdownMenuItem>
                                <Separator className="my-1" />
                                <DropdownMenuItem onClick={triggerImport}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExport}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export JSON
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Modals & Dialogs */}
                    <AlertDialog open={isNewConfirmOpen} onOpenChange={setIsNewConfirmOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Bắt đầu Orchestration mới?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Hành động này sẽ xóa dữ liệu hiện tại trên canvas. Nếu bạn chưa lưu, những thay đổi này sẽ bị mất.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmNew} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Tiếp tục
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <DuplicateOrchDialog
                        open={isDuplicateDialogOpen}
                        onOpenChange={setIsDuplicateDialogOpen}
                    />

                    {config?.id && (
                        <ShareToHubDialog
                            open={isShareDialogOpen}
                            onOpenChange={setIsShareDialogOpen}
                            assetType="orchestration"
                            assetId={config.id}
                            initialData={{
                                title: config.name,
                                description: config.description,
                                tags: (config as any).tags || []
                            }}
                        />
                    )}
                </div>
                <FlowCanvas expandAll={isExpandedView} />
            </div>

            {/* Right Sidebar: Config Panel (Conditional) */}
            {selectedNode && (
                <div className="w-80 h-full flex-shrink-0 z-10 overflow-y-auto border-l bg-muted/30">
                    {selectedNode.type === 'startNode' ? (
                        <StartConfigPanel />
                    ) : (
                        <StageConfigPanel stageId={selectedNode.id} />
                    )}
                </div>
            )}
        </div>
    );
}
