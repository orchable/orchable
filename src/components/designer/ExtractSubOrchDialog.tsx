import { useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { useSaveOrchestrator, useSaveConfig } from '@/hooks/useConfigs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractSubOrchestration } from '@/services/stageService';
import type { StepConfig } from '@/lib/types';
import type { Node } from '@xyflow/react';

interface ExtractSubOrchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedNodeIds: string[];
}

export function ExtractSubOrchDialog({ open, onOpenChange, selectedNodeIds }: ExtractSubOrchDialogProps) {
    const { nodes, edges, replaceNodesWithSubOrch } = useDesignerStore();
    const { save: saveParent, isPending: isSavingParent } = useSaveOrchestrator();
    const saveChild = useSaveConfig();

    const [name, setName] = useState('');
    const [stageKey, setStageKey] = useState('');
    const [description, setDescription] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);

    const handleExtract = async () => {
        if (!name || !stageKey) {
            toast.error("Name and Stage Key are required");
            return;
        }

        setIsExtracting(true);
        try {
            // 1. Run extraction logic
            const result = extractSubOrchestration(
                selectedNodeIds,
                nodes.map(n => n.data as unknown as StepConfig),
                edges.map(e => ({ source: e.source, target: e.target })),
                {
                    id: crypto.randomUUID(),
                    name,
                    description,
                    stage_key: stageKey
                }
            );

            // 2. Save Child Orchestration (Orch B)
            const childConfig = await saveChild.mutateAsync({
                name: result.subOrch.name,
                description: result.subOrch.description,
                steps: result.subOrch.steps,
                viewport: { x: 0, y: 0, zoom: 1 }
            });

            // 3. Update Parent Canvas
            const subOrchNode: Node = {
                id: result.subOrchNode.id,
                type: 'stepNode',
                position: result.subOrchNode.position!,
                data: {
                    ...result.subOrchNode,
                    sub_orchestration_id: childConfig.id, // Use the real ID from DB
                    stepId: result.subOrchNode.id
                }
            };

            replaceNodesWithSubOrch(
                new Set(selectedNodeIds),
                subOrchNode,
                result.parentSteps
            );

            // 4. Save Parent Orchestration (Orch A)
            // Note: useSaveOrchestrator's save() function uses the current store state
            // which we just updated in step 3.
            const success = await saveParent();
            if (success) {
                toast.success("Sub-orchestration extracted and saved successfully!");
                onOpenChange(false);
            }
        } catch (err) {
            console.error("Extraction failed:", err);
            toast.error("Failed to extract sub-orchestration");
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Extract Sub-Orchestration</DialogTitle>
                    <DialogDescription>
                        Create a new orchestration from the {selectedNodeIds.length} selected stages.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Orchestration Name</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Data Processing Sub-flow"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Stage Key (in current orch)</label>
                        <Input
                            value={stageKey}
                            onChange={e => setStageKey(e.target.value)}
                            placeholder="e.g. sub_data_proc"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional description..."
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleExtract} disabled={isExtracting || isSavingParent || !name || !stageKey}>
                        {(isExtracting || isSavingParent) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Extract & Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
