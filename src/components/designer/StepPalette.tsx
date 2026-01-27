import { StepBadge } from '@/components/common/StepBadge';
import { useDesignerStore } from '@/stores/designerStore';
import { Plus, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StepPalette() {
    const { addStep } = useDesignerStore();
    const stepTypes = ['A', 'B', 'C', 'D', 'E'];

    return (
        <div className="h-full border-r bg-muted/30 p-4 space-y-6">
            <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Thêm Step
                </h3>
                <div className="space-y-2">
                    {stepTypes.map((step) => (
                        <div
                            key={step}
                            className="p-3 rounded-lg border bg-card cursor-pointer hover:shadow-md transition-all flex items-center gap-3 hover:border-primary/50 group"
                            onClick={() => addStep(step)}
                        >
                            <StepBadge name={step} size="sm" />
                            <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                Step {step}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Custom Step
                </h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Name (e.g. F)"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Press Enter to add</p>
            </div>

            <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Templates
                </h3>
                <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start bg-card hover:border-primary/50 hover:text-primary transition-colors">
                        Standard Course
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start bg-card hover:border-primary/50 hover:text-primary transition-colors">
                        Quick Lesson
                    </Button>
                </div>
            </div>
        </div>
    );
}
