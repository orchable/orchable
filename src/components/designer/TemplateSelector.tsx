import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { useDesignerStore } from "@/stores/designerStore"
import { StepConfig, OrchestratorConfig } from "@/lib/types";

export function TemplateSelector() {
    const { loadConfig } = useDesignerStore();

    const applyTemplate = (value: string) => {
        const timestamp = new Date().toISOString();
        const baseConfig: Pick<OrchestratorConfig, "id" | "name" | "created_at" | "updated_at"> = {
            id: `temp-${Date.now()}`,
            name: "Template Config",
            created_at: timestamp,
            updated_at: timestamp
        };

        let steps: StepConfig[] = [];

        if (value === 'simple-linear') {
            steps = [
                { id: 'step-a', name: 'A', label: 'Step A', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-b', name: 'B', label: 'Step B', webhookUrl: '', dependsOn: ['step-a'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-c', name: 'C', label: 'Step C', webhookUrl: '', dependsOn: ['step-b'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
            ];
        } else if (value === 'branching') {
            steps = [
                { id: 'step-a', name: 'A', label: 'Start', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-b', name: 'B', label: 'Branch 1', webhookUrl: '', dependsOn: ['step-a'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-c', name: 'C', label: 'Branch 2', webhookUrl: '', dependsOn: ['step-a'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-d', name: 'D', label: 'Converge', webhookUrl: '', dependsOn: ['step-b', 'step-c'], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
            ];
        } else if (value === 'parallel') {
            steps = [
                { id: 'step-a', name: 'A', label: 'Task A', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-b', name: 'B', label: 'Task B', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
                { id: 'step-c', name: 'C', label: 'Task C', webhookUrl: '', dependsOn: [], timeout: 300000, retryConfig: { maxRetries: 3, retryDelay: 5000 } },
            ];
        }

        if (steps.length > 0) {
            loadConfig({ ...baseConfig, steps });
        }
    };

    return (
        <Select onValueChange={applyTemplate}>
            <SelectTrigger className="w-[180px] bg-card h-9 border-input text-foreground">
                <SelectValue placeholder="Load Pattern..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="simple-linear">Linear (A→B→C)</SelectItem>
                <SelectItem value="branching">Branching (A→[B,C]→D)</SelectItem>
                <SelectItem value="parallel">Parallel (A, B, C)</SelectItem>
            </SelectContent>
        </Select>
    )
}
