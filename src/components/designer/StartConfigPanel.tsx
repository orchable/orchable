import { useDesignerStore } from '@/stores/designerStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function StartConfigPanel() {
    const {
        orchestratorName,
        orchestratorDescription,
        setOrchestratorMetadata
    } = useDesignerStore();

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
            </CardContent>
        </Card>
    );
}
