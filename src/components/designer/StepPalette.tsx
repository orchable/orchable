import { useDesignerStore } from '@/stores/designerStore';
import { Plus, History, Settings2, FileText, CirclePlus } from 'lucide-react';
import { useConfigs } from '@/hooks/useConfigs';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export function StepPalette() {
    const { addStep, loadConfig, config: currentConfig } = useDesignerStore();
    const { data: savedConfigs } = useConfigs();

    // Sort by updated_at Desc and take top 5
    const recentConfigs = savedConfigs
        ? [...savedConfigs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5)
        : [];

    return (
        <div className="h-full border-r bg-muted/30 flex flex-col">
            {/* Top section: Add Step */}
            <div className="p-4 border-b">
                <div className="flex flex-col gap-3">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => addStep('')}
                        className="w-full shadow-sm bg-primary/90 hover:bg-primary"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Stage
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                            <span className="bg-background px-2 text-muted-foreground font-semibold">Or Quick Add</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Stage Name (e.g. Extraction)"
                            className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const target = e.target as HTMLInputElement;
                                    if (target.value.trim()) {
                                        addStep(target.value.trim());
                                        target.value = '';
                                    }
                                }
                            }}
                        />
                        <p className="text-[10px] text-muted-foreground">Press Enter to add to canvas</p>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Configs */}
            <div className="p-4 flex-1 overflow-y-auto">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Recent Configs
                </h3>

                {recentConfigs.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                        <FileText className="w-6 h-6 mx-auto mb-2 opacity-20" />
                        No recent configs
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentConfigs.map(config => (
                            <div
                                key={config.id}
                                onClick={() => loadConfig(config)}
                                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all flex flex-col gap-2 group ${currentConfig?.id === config.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card hover:border-primary/50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${currentConfig?.id === config.id ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors'}`}>
                                        <Settings2 className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                            {config.name}
                                        </span>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[10px] text-muted-foreground">
                                                {config.steps.length} nodes
                                            </span>
                                            <span className="text-[9px] text-muted-foreground/70 line-clamp-1 truncate block">
                                                {formatDistanceToNow(new Date(config.updated_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
