import { useState } from 'react';
import { ChevronDown, ChevronRight, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ExportConfig } from '@/lib/types';

interface ExportSectionProps {
    config?: ExportConfig;
    onChange: (config: ExportConfig | undefined) => void;
}

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
    enabled: false,
    destination: 'webhook',
    settings: {
        format: 'json'
    }
};

export function ExportSection({ config, onChange }: ExportSectionProps) {
    const [isOpen, setIsOpen] = useState(config?.enabled || false);

    const currentConfig = config || DEFAULT_EXPORT_CONFIG;

    const handleEnabledChange = (enabled: boolean) => {
        onChange({ ...currentConfig, enabled });
        setIsOpen(enabled);
    };

    const updateConfig = (updates: Partial<ExportConfig>) => {
        onChange({ ...currentConfig, ...updates });
    };

    const updateSettings = (updates: Record<string, string>) => {
        onChange({
            ...currentConfig,
            settings: {
                ...(currentConfig.settings || {}),
                ...updates
            }
        });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={cn(
                "border rounded-lg transition-colors",
                currentConfig.enabled ? "border-amber-500/30 bg-amber-500/5 shadow-sm" : "border-border bg-muted/20"
            )}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Share2 className="w-4 h-4 text-amber-500" />
                            <span className="font-medium text-sm">Stage Export</span>
                            {currentConfig.enabled ? (
                                <span className="text-[10px] font-bold uppercase tracking-tighter bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/20 shadow-sm animate-in fade-in zoom-in duration-300">
                                    Enabled
                                </span>
                            ) : (
                                <span className="text-[10px] font-medium uppercase tracking-tighter bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border shadow-sm">
                                    Disabled
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
                    <div className="p-3 pt-0 border-t space-y-4">
                        <div className="mt-3 space-y-3">
                            <div>
                                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5 block">Destination</Label>
                                <Select
                                    value={currentConfig.destination || 'webhook'}
                                    onValueChange={(v) => updateConfig({ destination: v as ExportConfig['destination'] })}
                                    disabled={!currentConfig.enabled}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="webhook">Webhook (n8n/Custom)</SelectItem>
                                        <SelectItem value="google_sheets">Google Sheets via Webhook</SelectItem>
                                        <SelectItem value="email" disabled>Email (Coming Soon)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {currentConfig.destination === 'webhook' && (
                                <div>
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5 block">Webhook URL</Label>
                                    <Input
                                        placeholder="https://n8n.example.com/webhook/..."
                                        value={currentConfig.settings?.webhook_url || ''}
                                        onChange={(e) => updateSettings({ webhook_url: e.target.value })}
                                        className="h-9 text-xs font-mono"
                                        disabled={!currentConfig.enabled}
                                    />
                                </div>
                            )}

                            {currentConfig.destination === 'google_sheets' && (
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5 block">Google Sheet Link</Label>
                                        <Input
                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                            value={currentConfig.settings?.sheet_id || ''}
                                            onChange={(e) => updateSettings({ sheet_id: e.target.value })}
                                            className="h-9 text-xs font-mono"
                                            disabled={!currentConfig.enabled}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5 block">Sheet Name</Label>
                                        <Input
                                            placeholder="Sheet1"
                                            value={currentConfig.settings?.worksheet_name || ''}
                                            onChange={(e) => updateSettings({ worksheet_name: e.target.value })}
                                            className="h-9 text-xs"
                                            disabled={!currentConfig.enabled}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5 block">Payload Format</Label>
                                <Select
                                    value={currentConfig.settings?.format || 'json'}
                                    onValueChange={(v) => updateSettings({ format: v })}
                                    disabled={!currentConfig.enabled}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="json">JSON (Full Payload)</SelectItem>
                                        <SelectItem value="csv">CSV (Table only)</SelectItem>
                                        <SelectItem value="tsv">TSV (For Google Sheets)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {currentConfig.destination === 'google_sheets' && currentConfig.settings?.format === 'json' && (
                                    <p className="text-[10px] text-amber-600 mt-1 italic">
                                        Tip: Google Sheets proxy usually requires TSV or CSV format.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
