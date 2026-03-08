import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Globe,
    Download,
    Star,
    Flag,
    ChevronLeft,
    Calendar,
    ShieldCheck,
    Tag,
    Eye,
    Copy,
    ChevronRight,
    User,
    ExternalLink,
    Code,
    Library,
    Sparkles,
    Boxes,
    ArrowRight,
    Share2
} from "lucide-react";
import { motion } from "framer-motion";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { hubService, HubAsset, HubAssetType } from "@/services/hubService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ReportDialog } from "@/components/hub/ReportDialog";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";

const assetTypeConfig: Record<HubAssetType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    template: { label: "Prompt Template", icon: Library, color: "text-blue-500", bg: "bg-blue-500/10" },
    component: { label: "View Component", icon: Code, color: "text-purple-500", bg: "bg-purple-500/10" },
    ai_preset: { label: "AI Model Setting", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
    orchestration: { label: "Orchestration Pipeline", icon: Boxes, color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

export function AssetDetail() {
    const { type, slug } = useParams<{ type: string; slug: string }>();
    const [asset, setAsset] = useState<HubAsset | null>(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [isStarred, setIsStarred] = useState(false);
    const [starCount, setStarCount] = useState(0);
    const [remixCount, setRemixCount] = useState(0);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { tier } = useTier();

    useEffect(() => {
        const fetchAsset = async () => {
            if (!slug) return;
            setLoading(true);
            try {
                const data = await hubService.fetchHubAssetBySlug(slug);
                setAsset(data);
                setStarCount(data.star_count);

                // Fetch remix count
                const count = await hubService.countRemixes(data.id);
                setRemixCount(count);

                // Check if starred
                const starred = await hubService.checkIfStarred(data.id);
                setIsStarred(starred);
            } catch (error) {
                console.error("Error fetching asset details:", error);
                toast.error("Failed to load asset details");
                navigate("/hub");
            } finally {
                setLoading(false);
            }
        };

        fetchAsset();
    }, [slug, navigate]);

    const handleImport = async () => {
        if (!asset) return;
        setImporting(true);
        try {
            await hubService.importAsset(asset.id, { mode: "use", tier });
            toast.success("Successfully imported to your library!");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to import asset";
            toast.error(message);
        } finally {
            setImporting(false);
        }
    };

    const handleToggleStar = async () => {
        if (!asset) return;
        if (!user) {
            toast.error("Please login to star assets");
            return;
        }
        try {
            const starred = await hubService.toggleStar(asset.id);
            setIsStarred(starred);
            setStarCount(prev => starred ? prev + 1 : prev - 1);
            toast.success(starred ? "Asset starred!" : "Asset unstarred");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to star asset";
            toast.error(message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <p className="text-muted-foreground animate-pulse">Loading asset details...</p>
                </div>
            </div>
        );
    }

    if (!asset) return null;

    const config = assetTypeConfig[asset.asset_type];

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 pb-20">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/hub")}
                className="mb-8 hover:bg-primary/5 group"
            >
                <ChevronLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                Back to Hub
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Column: Metadata & Actions */}
                <div className="lg:col-span-1 space-y-8">
                    <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden relative">
                        <div className={cn("absolute top-0 left-0 w-full h-2 bg-gradient-to-r uppercase", config.bg.replace('/10', '/30'))} />

                        <CardHeader className="pt-8">
                            <div className="flex justify-between items-start mb-4">
                                <Badge variant="secondary" className={cn("px-3 py-1", config.bg, config.color)}>
                                    <config.icon className="w-4 h-4 mr-2" />
                                    {config.label}
                                </Badge>
                            </div>
                            <CardTitle className="text-3xl font-bold tracking-tight">
                                {asset.title}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4 py-4 px-4 bg-muted/20 rounded-2xl border border-border/30">
                                <div className="flex-1 text-center border-r border-border/50 last:border-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Installs</p>
                                    <p className="text-xl font-bold">{asset.install_count}</p>
                                </div>
                                <div className="flex-1 text-center border-r border-border/50 last:border-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stars</p>
                                    <p className="text-xl font-bold flex items-center justify-center gap-1">
                                        <Star className={cn("w-4 h-4 text-amber-500", isStarred && "fill-amber-500")} />
                                        {starCount}
                                    </p>
                                </div>
                                <div className="flex-1 text-center border-r border-border/50 last:border-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Version</p>
                                    <p className="text-xl font-bold">1.0.0</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4">
                                <Button
                                    onClick={handleImport}
                                    disabled={importing}
                                    className="w-full h-14 text-lg font-semibold shadow-xl shadow-primary/20 transition-all active:scale-95"
                                >
                                    {importing ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    ) : (
                                        <Download className="w-5 h-5 mr-3" />
                                    )}
                                    {importing ? "Importing..." : "Import to Workspace"}
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        variant={isStarred ? "secondary" : "outline"}
                                        className={cn("flex-1 h-12 bg-card/20 border-border/40", isStarred && "text-amber-500 border-amber-500/30")}
                                        onClick={handleToggleStar}
                                    >
                                        <Star className={cn("w-4 h-4 mr-2", isStarred && "fill-amber-500")} />
                                        {isStarred ? "Starred" : "Star"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setIsReportDialogOpen(true)}
                                        className="w-12 h-12 bg-card/20 border-border/40 text-muted-foreground hover:text-destructive"
                                    >
                                        <Flag className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <Separator className="bg-border/30" />

                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <User className="w-4 h-4 text-primary" />
                                    Creator
                                </h4>
                                <Link
                                    to={`/hub/creators/${asset.creator_id}`}
                                    className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10 hover:bg-primary/10 transition-colors group"
                                >
                                    <Avatar>
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {asset.creator_id ? "U" : "O"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-sm">
                                        <p className="font-semibold group-hover:text-primary transition-colors">
                                            {asset.creator_id ? "Community Member" : "Orchable Team"}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            {asset.creator_id ? "View profile" : "Official Asset"}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </Link>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    Details
                                </h4>
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                    <div className="flex justify-between items-center py-2 border-b border-border/20 last:border-0">
                                        <span className="text-muted-foreground">License</span>
                                        <Badge variant="outline" className="font-medium">{asset.license}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border/20 last:border-0">
                                        <span className="text-muted-foreground">Published</span>
                                        <span className="font-medium">{asset.published_at ? format(new Date(asset.published_at), 'PPP') : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {asset.tags.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-primary" />
                                        Tags
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {asset.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="bg-muted/50 font-normal hover:bg-muted/80 transition-colors">
                                                #{tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Asset Content & Preview */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="space-y-4">
                        <h3 className="text-2xl font-bold px-1">Description</h3>
                        <Card className="bg-card/20 backdrop-blur-xl border-border/50">
                            <CardContent className="pt-6">
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {asset.description || "This creator hasn't added a description for this asset yet. Give it a try for yourself to find out how it works."}
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Eye className="w-6 h-6 text-primary" />
                                Asset Preview
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => {
                                navigator.clipboard.writeText("Asset content would go here");
                                toast.success("Content copied to clipboard");
                            }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                            </Button>
                        </div>

                        <Card className="bg-card/20 backdrop-blur-xl border-border/50 overflow-hidden">
                            <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b border-border/30">
                                <div className="flex gap-1.5 font-mono text-xs">
                                    <div className="w-3 h-3 rounded-full bg-destructive/50" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">preview.json</span>
                            </div>
                            <ScrollArea className="h-[400px]">
                                <div className="p-6 font-mono text-sm">
                                    <pre className="text-muted-foreground bg-transparent p-0">
                                        {JSON.stringify(asset.content, null, 2)}
                                    </pre>
                                </div>
                            </ScrollArea>
                        </Card>
                    </section>

                    {/* Featured Collections / Linked Assets (Placeholder) */}
                    <section className="pt-12">
                        <h3 className="text-2xl font-bold mb-6 px-1">Remix Statistics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                                <CardContent className="pt-6">
                                    <h4 className="font-semibold mb-2">Originality</h4>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {asset.parent_asset_id
                                            ? "This asset is a remix of another community contribution."
                                            : "This is an original contribution to the Orchable community."}
                                    </p>
                                    {asset.parent_asset_id && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="p-0 h-auto font-semibold text-primary hover:bg-transparent"
                                            onClick={() => navigate(`/hub/c/${asset.asset_type}/${asset.parent_asset_id}`)}
                                        >
                                            View Parent Asset <ArrowRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                            <Card className="bg-card/20 border-border/40">
                                <CardContent className="pt-6">
                                    <h4 className="font-semibold mb-2 text-primary flex items-center gap-2">
                                        <Share2 className="w-4 h-4" />
                                        Popularity & Reach
                                    </h4>
                                    <div className="flex items-end gap-3 mb-4">
                                        <div className="text-3xl font-bold">{remixCount}</div>
                                        <div className="text-xs text-muted-foreground mb-1">Community Remixes</div>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        This asset has been remixed {remixCount} times by other creators,
                                        contributing to the overall network knowledge.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                </div>
            </div>
            <ReportDialog
                open={isReportDialogOpen}
                onOpenChange={setIsReportDialogOpen}
                assetId={asset.id}
                assetTitle={asset.title}
            />
        </div>
    );
}
