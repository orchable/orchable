import { useDesignerStore } from '@/stores/designerStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useSaveOrchestrator } from '@/hooks/useConfigs';

export function StartConfigPanel() {
    const {
        orchestratorName,
        orchestratorDescription,
        setOrchestratorMetadata
    } = useDesignerStore();

    const { save, isPending } = useSaveOrchestrator();

    return (
        <Card className="h-full border-none rounded-none shadow-none">
            <CardHeader>
                <CardTitle className="text-lg">Orchestrator Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="orch-name">Name</Label>
                    <Input
                        id="orch-name"
                        placeholder="e.g. Standard Course Generator"
                        value={orchestratorName}
                        onChange={(e) => setOrchestratorMetadata(e.target.value, orchestratorDescription)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="orch-desc">Description</Label>
                    <Textarea
                        id="orch-desc"
                        placeholder="Describe what this workflow does..."
                        className="min-h-[120px]"
                        value={orchestratorDescription}
                        onChange={(e) => setOrchestratorMetadata(orchestratorName, e.target.value)}
                    />
                </div>

                <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                    <p>
                        This is the entry point of your orchestration.
                        Configure the name and description that will appear in the Launcher.
                    </p>
                </div>

                <div className="pt-4">
                    <div className="w-full">
                        <Button onClick={save} disabled={isPending || !orchestratorName} className="w-full">
                            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Config
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
