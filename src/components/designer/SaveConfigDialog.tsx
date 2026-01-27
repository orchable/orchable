import { useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { useSaveConfig } from '@/hooks/useConfigs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export function SaveConfigDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const { nodes, edges, config } = useDesignerStore();
    const saveConfig = useSaveConfig();

    const handleSave = async () => {
        if (nodes.length === 0) return;

        // Build steps array from nodes and edges
        const steps = nodes.map(node => {
            const data = node.data as any;
            return {
                id: node.id,
                name: data.name,
                label: data.label,
                webhookUrl: data.webhookUrl,
                timeout: data.timeout,
                retryConfig: data.retryConfig,
                dependsOn: edges
                    .filter(e => e.target === node.id)
                    .map(e => e.source)
            };
        });

        try {
            await saveConfig.mutateAsync({
                // id: config?.id, // If editing existing - implementation simplified for now as config has no ID in current types used here
                name,
                description,
                steps
            });
            setOpen(false);
            toast.success("Configuration saved successfully");
        } catch (error) {
            console.error("Failed to save", error);
            toast.error("Failed to save configuration");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save Config
                </Button>
            </DialogTrigger>
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
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Standard Course Generator"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Describe what this workflow does..."
                        />
                    </div>

                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        This config contains {nodes.length} steps and {edges.length} connections.
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saveConfig.isPending || !name}>
                        {saveConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
