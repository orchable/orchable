import { useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { useSaveOrchestrator } from '@/hooks/useConfigs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface SaveConfigDialogProps {
    open?: boolean;
    setOpen?: (open: boolean) => void;
}

export function SaveConfigDialog({ open: propOpen, setOpen: propSetOpen }: SaveConfigDialogProps) {
    const { nodes, edges, orchestratorName, orchestratorDescription, setOrchestratorMetadata } = useDesignerStore();
    const { save, isPending } = useSaveOrchestrator();

    const [internalOpen, setInternalOpen] = useState(false);

    // Support both controlled and uncontrolled
    const open = propOpen !== undefined ? propOpen : internalOpen;
    const setOpen = propSetOpen !== undefined ? propSetOpen : setInternalOpen;

    const handleSave = async () => {
        const success = await save();
        if (success) {
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save Configuration</DialogTitle>
                    <DialogDescription>
                        Save this orchestration workflow to the database.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                            value={orchestratorName}
                            onChange={e => setOrchestratorMetadata(e.target.value, orchestratorDescription)}
                            placeholder="e.g. Standard Course Generator"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                            value={orchestratorDescription}
                            onChange={e => setOrchestratorMetadata(orchestratorName, e.target.value)}
                            placeholder="Describe what this workflow does..."
                        />
                    </div>

                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        This config contains {nodes.length} steps and {edges.length} connections.
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isPending || !orchestratorName}>
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
