import { useTier } from "@/hooks/useTier";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Info, Crown, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function UsageDashboard() {
    const { user } = useAuth();
    const { usage, limits, tier, isPremium } = useTier();

    if (!user) {
        return (
            <Card className="glass-card border-primary/20 bg-background/40 backdrop-blur-md overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BarChart3 className="w-16 h-16" />
                </div>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Zap className="w-5 h-5 text-zinc-500 fill-zinc-500" />
                                Usage Dashboard
                            </CardTitle>
                            <CardDescription>
                                You are currently using the <strong>Anonymous</strong> tier.
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="px-3 py-1 uppercase font-black tracking-tighter text-[10px]">
                            Anonymous (Local Only)
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Monthly Cloud Tasks</p>
                                <h2 className="text-4xl font-black tracking-tighter">
                                    0
                                    <span className="text-xl font-normal text-muted-foreground ml-2">
                                        / 0
                                    </span>
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Zap className="w-4 h-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold">Local Execution Active</p>
                                <p className="text-[10px] text-muted-foreground">
                                    Add your personal API Key below to run unlimited batches locally right in your browser.
                                </p>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Crown className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold">Want Free Cloud Tasks?</p>
                                <p className="text-[10px] text-muted-foreground">
                                    Create a free account to get 100 monthly tasks processed by our servers, without needing your own API key.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const count = usage?.count || 0;
    const limit = limits.tasks;
    // If limit is Infinity (premium), we show a different UI or a high limit for scale
    const displayLimit = limit === Infinity ? 10000 : limit;
    const percentage = Math.min((count / displayLimit) * 100, 100);

    const isNearLimit = !isPremium && count >= limit * 0.9;
    const isOverLimit = !isPremium && count >= limit;

    return (
        <Card className="glass-card border-primary/20 bg-background/40 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <BarChart3 className="w-16 h-16" />
            </div>

            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            Usage Dashboard
                        </CardTitle>
                        <CardDescription>
                            Your monthly task consumption for <strong>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>.
                        </CardDescription>
                    </div>
                    <Badge
                        variant={isPremium ? "default" : "secondary"}
                        className={cn(
                            "px-3 py-1 uppercase font-black tracking-tighter text-[10px]",
                            isPremium ? "bg-gradient-to-r from-yellow-500 to-amber-600 border-none shadow-glow font-black" : ""
                        )}
                    >
                        {isPremium ? (
                            <span className="flex items-center gap-1"><Crown className="w-3 h-3" /> Premium</span>
                        ) : (
                            "Free Tier"
                        )}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-6">
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Monthly Tasks</p>
                            <h2 className="text-4xl font-black tracking-tighter">
                                {count.toLocaleString()}
                                <span className="text-xl font-normal text-muted-foreground ml-2">
                                    / {limit === Infinity ? "Unlimited" : limit.toLocaleString()}
                                </span>
                            </h2>
                        </div>
                        {isNearLimit && !isOverLimit && (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10 flex items-center gap-1.5 animate-pulse">
                                <Info className="w-3 h-3" />
                                Near Limit (Grace active)
                            </Badge>
                        )}
                        {isOverLimit && (
                            <Badge variant="destructive" className="flex items-center gap-1.5 shadow-lg shadow-destructive/20">
                                <AlertTriangle className="w-3 h-3" />
                                Limit Reached
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50">
                            <Progress
                                value={percentage}
                                className={cn(
                                    "h-full transition-all duration-700",
                                    isOverLimit ? "bg-destructive" : isNearLimit ? "bg-amber-500" : "bg-primary"
                                )}
                            />
                            {/* Grace Period Marker (10%) */}
                            {!isPremium && (
                                <div
                                    className="absolute top-0 bottom-0 left-[90%] w-0.5 bg-amber-500/50 z-10"
                                    title="Soft Limit (Grace begins)"
                                />
                            )}
                        </div>

                        <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                            <span>0</span>
                            {!isPremium && <span className="text-amber-500/70">Grace Area</span>}
                            <span>{limit === Infinity ? "No Limit" : limit.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {!isPremium && (
                    <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Crown className="w-4 h-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold">Want more power?</p>
                                <p className="text-[10px] text-muted-foreground">
                                    Upgrade to <strong>Premium</strong> for unlimited tasks, high-speed Key Pools, and advanced collaboration features.
                                </p>
                                <Button size="sm" variant="link" className="p-0 h-auto text-[10px] font-bold">Upgrade Now &rarr;</Button>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Data Lifecycle</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Server tasks expire in 24h.</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-[10px] font-bold border-amber-500/20 hover:bg-amber-500/10"
                                onClick={async () => {
                                    const { freeTierService } = await import("@/services/freeTierService");
                                    const { toast } = await import("sonner");
                                    toast.promise(freeTierService.syncCompletedTasks(), {
                                        loading: "Syncing task data...",
                                        success: (res) => `Synced ${res.synced} tasks to local storage.`,
                                        error: "Sync failed"
                                    });
                                }}
                            >
                                Sync to Local
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
