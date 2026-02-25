import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlowCanvas } from './FlowCanvas';
import { StepPalette } from './StepPalette';
import { StageConfigPanel } from './StageConfigPanel';
import { StartConfigPanel } from './StartConfigPanel';
import { SaveConfigDialog } from './SaveConfigDialog';
import { RunExecutionDialog } from './RunExecutionDialog';

import { ConfigLibrary } from './ConfigLibrary';
import { OrchestratorImportExport } from './OrchestratorImportExport';
import { useDesignerStore } from '@/stores/designerStore';
import { useConfigs } from '@/hooks/useConfigs';
import { Button } from '@/components/ui/button';
import { RotateCcw, Globe } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ShareToHubDialog } from '@/components/hub/ShareToHubDialog';

export default function OrchestratorDesigner() {
    const { selectedNode, reset, config, loadConfig } = useDesignerStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const configId = searchParams.get('configId');
    const { data: savedConfigs } = useConfigs();
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

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

    return (
        <div className="flex h-full bg-background">
            {/* Left Sidebar: Palette */}
            <div className="w-64 h-full flex-shrink-0 z-10">
                <StepPalette />
            </div>

            {/* Main Canvas */}
            <div className="flex-1 relative h-full">
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                    <ConfigLibrary />
                    <Separator orientation="vertical" className="h-9 bg-border" />
                    <OrchestratorImportExport />
                    <Separator orientation="vertical" className="h-9 bg-border" />
                    <Button variant="outline" size="sm" onClick={reset} className="bg-card shadow-sm hover:border-primary/50">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                    <Separator orientation="vertical" className="h-9 bg-border" />
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!config?.id}
                        onClick={() => setIsShareDialogOpen(true)}
                        className="bg-card shadow-sm hover:border-primary/50 text-primary"
                    >
                        <Globe className="w-4 h-4 mr-2" />
                        Share
                    </Button>
                    <SaveConfigDialog />
                    <RunExecutionDialog disabled={!config?.id} />

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
                <FlowCanvas />
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
