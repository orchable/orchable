import { useState, useEffect, useCallback, ElementType, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Globe,
    Search,
    Library,
    Code,
    Sparkles,
    Boxes,
    Star,
    Download,
    ExternalLink,
    Filter,
    ArrowRight,
    TrendingUp,
    Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { hubService, HubAsset, HubAssetType } from "@/services/hubService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


const assetTypeConfig: Record<HubAssetType, { label: string; icon: ElementType; color: string; bg: string }> = {
    template: { label: "Template", icon: Library, color: "text-blue-500", bg: "bg-blue-500/10" },
    component: { label: "Component", icon: Code, color: "text-purple-500", bg: "bg-purple-500/10" },
    ai_preset: { label: "AI Preset", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
    orchestration: { label: "Orchestration", icon: Boxes, color: "text-emerald-500", bg: "bg-emerald-500/10" },
};


// Map URL category to internal tab value
const urlToTabMap: Record<string, string> = {
    templates: "template",
    components: "component",
    orchestrations: "orchestration",
    "ai-presets": "ai_preset",
};

// Map internal tab value back to URL category
const tabToUrlMap: Record<string, string> = {
    template: "templates",
    component: "components",
    orchestration: "orchestrations",
    ai_preset: "ai-presets",
};

export function HubBrowse() {
    const { category } = useParams<{ category?: string }>();
    const navigate = useNavigate();

    const currentTabValue = useMemo(() => {
        if (!category) return "all";
        return urlToTabMap[category] || "all";
    }, [category]);

    const [assets, setAssets] = useState<HubAsset[]>([]);
    const [featuredAssets, setFeaturedAssets] = useState<HubAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [featuredLoading, setFeaturedLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");

    // Sync active tab with URL
    const [activeTab, setActiveTab] = useState<string>(currentTabValue);

    useEffect(() => {
        setActiveTab(currentTabValue);
    }, [currentTabValue]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        if (value === "all") {
            navigate("/hub");
        } else {
            const urlCategory = tabToUrlMap[value];
            if (urlCategory) {
                navigate(`/hub/${urlCategory}`);
            }
        }
    };

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        try {
            const type = activeTab === "all" ? undefined : (activeTab as HubAssetType);
            const { data } = await hubService.fetchHubAssets({
                type,
                search: search || undefined,
                sort: sortBy,
            });
            setAssets(data);
        } catch (error) {
            console.error("Error fetching hub assets:", error);
            toast.error("Failed to load community assets");
        } finally {
            setLoading(false);
        }
    }, [activeTab, search, sortBy]);

    const fetchFeatured = useCallback(async () => {
        setFeaturedLoading(true);
        try {
            const data = await hubService.fetchFeaturedAssets(4);
            setFeaturedAssets(data);
        } catch (error) {
            console.error("Error fetching featured assets:", error);
        } finally {
            setFeaturedLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "all" && !search) {
            fetchFeatured();
        }
    }, [activeTab, search, fetchFeatured]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAssets();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, activeTab, fetchAssets]);

    const handleImport = async (e: React.MouseEvent, assetId: string) => {
        e.stopPropagation();
        try {
            await hubService.importAsset(assetId);
            toast.success("Asset imported to your library!");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to import asset";
            toast.error(message);
        }
    };

    return (
        <div className="min-h-full bg-background/50 backdrop-blur-3xl pb-20">
            {/* Hero Section */}
            <div className="relative pt-12 pb-16 px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl blur-[120px] opacity-20 pointer-events-none">
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary rounded-full animate-pulse" />
                    <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent rounded-full animate-pulse delay-700" />
                </div>

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center gap-3 mb-6"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center backdrop-blur-md border border-primary/20">
                            <Globe className="w-7 h-7 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            Community Hub
                        </h1>
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto"
                    >
                        Discover, share, and remix the world’s most powerful AI orchestration assets.
                        Built by the community, for the community.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="max-w-2xl mx-auto relative group"
                    >
                        <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search templates, components, pipelines..."
                            className="pl-12 h-14 bg-card/50 backdrop-blur-xl border-border/50 text-lg shadow-xl ring-offset-background focus-visible:ring-primary/20 transition-all rounded-2xl"
                        />
                    </motion.div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-border/50 pb-2">
                        <TabsList className="bg-transparent h-auto p-0 gap-8 justify-start overflow-x-auto no-scrollbar">
                            {["all", "orchestration", "template", "component", "ai_preset"].map((tab) => (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-base font-medium px-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary rounded-none transition-all uppercase tracking-wider h-auto"
                                >
                                    <span className="flex items-center gap-2">
                                        {tab === "all" ? <TrendingUp className="w-4 h-4" /> : (() => {
                                            const Icon = assetTypeConfig[tab as HubAssetType].icon;
                                            return <Icon className="w-4 h-4" />;
                                        })()}
                                        {tab === "all" ? "Featured" : assetTypeConfig[tab as HubAssetType].label + "s"}
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <div className="flex items-center gap-4">
                            <Button
                                variant={sortBy === "newest" ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setSortBy("newest")}
                                className="bg-card/30 backdrop-blur-md rounded-full border-border/50"
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                Newest
                            </Button>
                            <Button
                                variant={sortBy === "popular" ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setSortBy("popular")}
                                className="bg-card/30 backdrop-blur-md rounded-full border-border/50"
                            >
                                <Star className="w-4 h-4 mr-2 text-primary" />
                                Popular
                            </Button>
                        </div>
                    </div>

                    <TabsContent value={activeTab} className="mt-0 focus-visible:outline-none ring-0 outline-none border-none">
                        <AnimatePresence mode="wait">
                            {activeTab === "all" && !search && featuredAssets.length > 0 && (
                                <section className="mb-16">
                                    <div className="flex items-center justify-between mb-8 px-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                <TrendingUp className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold tracking-tight">Trending & Featured</h2>
                                                <p className="text-sm text-muted-foreground">Highest rated community contributions this week</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {featuredAssets.map((asset) => (
                                            <FeaturedAssetCard
                                                key={asset.id}
                                                asset={asset}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-10 border-t border-border/30 pt-10 px-1">
                                        <h2 className="text-2xl font-bold tracking-tight mb-2">Browse All Assets</h2>
                                        <p className="text-sm text-muted-foreground mb-8">Discover a vast library of templates, components, and presets</p>
                                    </div>
                                </section>
                            )}

                            {loading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                >
                                    {[...Array(8)].map((_, i) => (
                                        <Card key={i} className="bg-card/50 backdrop-blur-xl border-border/40 h-[280px]">
                                            <CardHeader className="gap-2">
                                                <Skeleton className="h-4 w-1/4" />
                                                <Skeleton className="h-8 w-3/4" />
                                            </CardHeader>
                                            <CardContent>
                                                <Skeleton className="h-16 w-full" />
                                            </CardContent>
                                            <CardFooter className="justify-between">
                                                <Skeleton className="h-8 w-1/4" />
                                                <Skeleton className="h-8 w-1/4" />
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </motion.div>
                            ) : assets.length > 0 ? (
                                <motion.div
                                    key="content"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                >
                                    {assets.map((asset) => (
                                        <AssetCard
                                            key={asset.id}
                                            asset={asset}
                                            onImport={handleImport}
                                        />
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-20 text-center bg-card/20 backdrop-blur-xl border border-dashed border-border/50 rounded-3xl"
                                >
                                    <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                                        <Search className="w-10 h-10 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">No assets found</h3>
                                    <p className="text-muted-foreground max-w-xs mx-auto mb-8">
                                        We couldn't find any community assets matching your current search or category.
                                    </p>
                                    <Button variant="outline" onClick={() => { setSearch(""); setActiveTab("all"); }}>
                                        Reset Search
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function AssetCard({ asset, onImport }: { asset: HubAsset; onImport: (e: React.MouseEvent, id: string) => void }) {
    const navigate = useNavigate();
    const config = assetTypeConfig[asset.asset_type];
    const [isStarred, setIsStarred] = useState(false);
    const [starCount, setStarCount] = useState(asset.star_count);

    useEffect(() => {
        hubService.checkIfStarred(asset.id).then(setIsStarred);
    }, [asset.id]);

    const handleStar = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const starred = await hubService.toggleStar(asset.id);
            setIsStarred(starred);
            setStarCount(prev => starred ? prev + 1 : prev - 1);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to star asset";
            toast.error(message);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <Card
                onClick={() => navigate(`/hub/c/${asset.asset_type}/${asset.slug}`)}
                className="group bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col overflow-hidden relative"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className={cn("font-medium", config.bg, config.color)}>
                            <config.icon className="w-3 h-3 mr-1.5" />
                            {config.label}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-7 px-2 text-xs gap-1.5 hover:bg-amber-500/10 hover:text-amber-500 transition-colors",
                                isStarred ? "text-amber-500 bg-amber-500/5" : "text-muted-foreground"
                            )}
                            onClick={handleStar}
                        >
                            <Star className={cn("w-3.5 h-3.5", isStarred && "fill-amber-500")} />
                            {starCount}
                        </Button>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-1">
                        {asset.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px]">
                        {asset.description || "No description provided."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 pb-4">
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-1.5">
                            {asset.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30">
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        {asset.parent_asset_id && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic bg-primary/5 p-1.5 rounded-md border border-primary/10 w-fit">
                                <Clock className="w-3 h-3" />
                                Remixed from community
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="pt-4 border-t border-border/30 bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 ring-2 ring-background">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {asset.creator_id ? "U" : "O"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground max-w-[80px] truncate">
                            {asset.creator_id ? "Community" : "Orchable"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => onImport(e, asset.id)}
                        >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Import
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

function FeaturedAssetCard({ asset }: { asset: HubAsset }) {
    const navigate = useNavigate();
    const config = assetTypeConfig[asset.asset_type];

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => navigate(`/hub/c/${asset.asset_type}/${asset.slug}`)}
            className="cursor-pointer group h-full"
        >
            <Card className="h-full bg-gradient-to-br from-card/80 via-card/50 to-background/30 backdrop-blur-2xl border-primary/20 hover:border-primary/50 transition-all overflow-hidden relative border-2">
                <div className={cn("absolute top-0 left-0 w-1 h-full", config.color.replace('text-', 'bg-'))} />
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className={cn("text-[10px] uppercase tracking-wider py-0.5 px-2", config.bg, config.color)}>
                            {config.label}
                        </Badge>
                        <div className="flex items-center gap-1 text- amber-500 font-bold text-sm">
                            <Star className="w-4 h-4 fill-amber-500" />
                            {asset.star_count}
                        </div>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {asset.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {asset.description || "Top rated community asset."}
                    </p>
                </CardContent>
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

import React from "react";
