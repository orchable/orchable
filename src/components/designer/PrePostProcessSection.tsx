import { useState } from 'react';
import { ChevronDown, ChevronRight, Webhook, Workflow } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { PreProcessConfig, PostProcessConfig, PreProcessOutputHandling, PostProcessInputSource } from '@/lib/types';

interface PrePostProcessSectionProps {
    type: 'pre' | 'post';
    config?: PreProcessConfig | PostProcessConfig;
    onChange: (config: PreProcessConfig | PostProcessConfig | undefined) => void;
    workflows?: { id: string; name: string }[];
}

const DEFAULT_PRE_CONFIG: PreProcessConfig = {
    enabled: false,
    type: 'webhook',
    on_failure: 'abort',
    output_handling: 'merge',
};

const DEFAULT_POST_CONFIG: PostProcessConfig = {
    enabled: false,
    type: 'webhook',
    on_failure: 'continue',
    input_source: 'output_only',
};

export function PrePostProcessSection({ type, config, onChange, workflows = [] }: PrePostProcessSectionProps) {
    const [isOpen, setIsOpen] = useState(config?.enabled || false);

    const title = type === 'pre' ? 'Pre-Process' : 'Post-Process';
    const description = type === 'pre'
        ? 'Execute before AI processing (fetch data, validate input)'
        : 'Execute after AI processing (push results, notify)';

    const currentConfig = config || (type === 'pre' ? DEFAULT_PRE_CONFIG : DEFAULT_POST_CONFIG);

    const handleEnabledChange = (enabled: boolean) => {
        if (enabled) {
            onChange({ ...currentConfig, enabled: true });
        } else {
            onChange({ ...currentConfig, enabled: false });
        }
        setIsOpen(enabled);
    };

    const updateConfig = (updates: Partial<PreProcessConfig | PostProcessConfig>) => {
        onChange({ ...currentConfig, ...updates } as PreProcessConfig | PostProcessConfig);
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={cn(
                "border rounded-lg transition-colors",
                currentConfig.enabled ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"
            )}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="font-medium text-sm">{title}</span>
                            {currentConfig.enabled && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                    {currentConfig.type === 'webhook' ? 'Webhook' : 'Sub-workflow'}
                                </span>
                            )}
                        </div>
                        <Switch

                            checked={currentConfig.enabled}
                            onCheckedChange={handleEnabledChange}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="p-3 pt-0 space-y-4 border-t">
                        <p className="text-xs text-muted-foreground">{description}</p>

                        {/* Type Selection */}
                        <div className="space-y-2">
                            <Label className="text-xs">Type</Label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 p-2 rounded-md border text-sm transition-colors",
                                        currentConfig.type === 'webhook'
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border hover:bg-muted"
                                    )}
                                    onClick={() => updateConfig({ type: 'webhook' })}
                                >
                                    <Webhook className="w-4 h-4" />
                                    Webhook
                                </button>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 p-2 rounded-md border text-sm transition-colors",
                                        currentConfig.type === 'subworkflow'
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border hover:bg-muted"
                                    )}
                                    onClick={() => updateConfig({ type: 'subworkflow' })}
                                >
                                    <Workflow className="w-4 h-4" />
                                    Sub-workflow
                                </button>
                            </div>
                        </div>

                        {/* Webhook Config */}
                        {currentConfig.type === 'webhook' && (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <div className="w-24">
                                        <Label className="text-xs">Method</Label>
                                        <Select
                                            value={currentConfig.webhook_method || 'POST'}
                                            onValueChange={(v) => updateConfig({ webhook_method: v as 'GET' | 'POST' })}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="GET">GET</SelectItem>
                                                <SelectItem value="POST">POST</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs">URL</Label>
                                        <Input
                                            placeholder="https://api.example.com/..."
                                            value={currentConfig.webhook_url || ''}
                                            onChange={(e) => updateConfig({ webhook_url: e.target.value })}
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subworkflow Config */}
                        {currentConfig.type === 'subworkflow' && (
                            <div className="space-y-2">
                                <Label className="text-xs">n8n Workflow</Label>
                                <Select
                                    value={currentConfig.n8n_workflow_id || ''}
                                    onValueChange={(v) => updateConfig({ n8n_workflow_id: v })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select workflow..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {workflows.map((wf) => (
                                            <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
                                        ))}
                                        {workflows.length === 0 && (
                                            <SelectItem value="" disabled>No workflows found</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* On Failure */}
                        <div className="space-y-2">
                            <Label className="text-xs">On Failure</Label>
                            <Select
                                value={currentConfig.on_failure}
                                onValueChange={(v) => updateConfig({ on_failure: v as 'abort' | 'continue' })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="abort">Abort Step</SelectItem>
                                    <SelectItem value="continue">Continue Anyway</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pre-Process specific: Output Handling */}
                        {type === 'pre' && (
                            <div className="space-y-2">
                                <Label className="text-xs">Output Handling</Label>
                                <Select
                                    value={(currentConfig as PreProcessConfig).output_handling || 'merge'}
                                    onValueChange={(v) => updateConfig({ output_handling: v as PreProcessOutputHandling })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="replace">Replace Input</SelectItem>
                                        <SelectItem value="merge">Merge with Input</SelectItem>
                                        <SelectItem value="nested">Nest in Field</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(currentConfig as PreProcessConfig).output_handling === 'nested' && (
                                    <Input
                                        placeholder="Field name (e.g. external_data)"
                                        value={(currentConfig as PreProcessConfig).nested_field_name || ''}
                                        onChange={(e) => updateConfig({ nested_field_name: e.target.value })}
                                        className="h-9 mt-2"
                                    />
                                )}
                            </div>
                        )}

                        {/* Post-Process specific: Input Source */}
                        {type === 'post' && (
                            <div className="space-y-2">
                                <Label className="text-xs">Receives</Label>
                                <Select
                                    value={(currentConfig as PostProcessConfig).input_source || 'output_only'}
                                    onValueChange={(v) => updateConfig({ input_source: v as PostProcessInputSource })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="output_only">AI Output Only</SelectItem>
                                        <SelectItem value="input_and_output">Input + Output</SelectItem>
                                        <SelectItem value="custom">Custom Mapping</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(currentConfig as PostProcessConfig).input_source === 'custom' && (
                                    <Input
                                        placeholder="JSONPath expression..."
                                        value={(currentConfig as PostProcessConfig).custom_input_mapping || ''}
                                        onChange={(e) => updateConfig({ custom_input_mapping: e.target.value })}
                                        className="h-9 mt-2"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
