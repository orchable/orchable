import { useEffect } from 'react';
import { FlowCanvas } from './FlowCanvas';
import { StepPalette } from './StepPalette';
import { StageConfigPanel } from './StageConfigPanel';
import { StartConfigPanel } from './StartConfigPanel';
import { SaveConfigDialog } from './SaveConfigDialog';
import { RunExecutionDialog } from './RunExecutionDialog';

import { ConfigLibrary } from './ConfigLibrary';
import { useDesignerStore } from '@/stores/designerStore';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function OrchestratorDesigner() {
    const { selectedNode, reset, config } = useDesignerStore();

    useEffect(() => {
        // Clean up on unmount
        return () => reset();
    }, [reset]);

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
                    <Button variant="outline" size="sm" onClick={reset} className="bg-card shadow-sm hover:border-primary/50">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                    <SaveConfigDialog />
                    <RunExecutionDialog disabled={!config?.id} />
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
