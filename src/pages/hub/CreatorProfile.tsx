import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    Star,
    Download,
    Boxes,
    Calendar,
    Award,
    Globe,
    ExternalLink,
    Search
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { hubService, HubAsset } from "@/services/hubService";
import { toast } from "sonner";

export function CreatorProfile() {
    const { userId } = useParams<{ userId: string }>();
    const [profile, setProfile] = useState<{
        userId: string;
        assets: HubAsset[];
        stats: {
            totalInstalls: number;
            totalStars: number;
            assetCount: number;
        };
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const data = await hubService.fetchCreatorProfile(userId);
                setProfile(data);
            } catch (error) {
                console.error("Error fetching creator profile:", error);
                toast.error("Failed to load creator profile");
                navigate("/hub");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userId, navigate]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-12">
                <Skeleton className="h-10 w-32 mb-8" />
                <div className="flex flex-col md:flex-row gap-10 items-start">
                    <Skeleton className="w-full md:w-80 h-[400px] rounded-3xl" />
                    <div className="flex-1 space-y-6 w-full">
                        <Skeleton className="h-12 w-1/3" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-[280px] w-full rounded-2xl" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-full bg-background/50 backdrop-blur-3xl pb-20 pt-8 px-6">
            <div className="max-w-7xl mx-auto">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/hub")}
                    className="mb-8 hover:bg-primary/5 group"
                >
                    <ChevronLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                    Back to Hub
                </Button>

                <div className="flex flex-col md:flex-row gap-10 items-start">
                    {/* Creator Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full md:w-80 space-y-6 flex-shrink-0"
                    >
                        <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden rounded-3xl pt-10 pb-6">
                            <div className="flex flex-col items-center text-center px-6">
                                <div className="relative mb-6">
                                    <Avatar className="w-24 h-24 ring-4 ring-primary/20 ring-offset-4 ring-offset-background shadow-2xl">
                                        <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                                            {profile.userId === "orchable" ? "O" : "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background">
                                        <Award className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <CardTitle className="text-2xl font-bold mb-1">
                                    {profile.userId === "orchable" ? "Orchable Team" : "Community Member"}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1.5 mb-6">
                                    <Globe className="w-3.5 h-3.5" />
                                    Public Profile
                                </CardDescription>

                                <div className="w-full grid grid-cols-1 gap-3 text-sm pt-4 border-t border-border/30">
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Boxes className="w-4 h-4" /> Assets
                                        </span>
                                        <span className="font-bold">{profile.stats.assetCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Star className="w-4 h-4" /> Total Stars
                                        </span>
                                        <span className="font-bold">{profile.stats.totalStars}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Download className="w-4 h-4" /> Installs
                                        </span>
                                        <span className="font-bold">{profile.stats.totalInstalls}</span>
                                    </div>
                                </div>

                                <Button className="w-full mt-8 rounded-2xl h-12">
                                    Follow Creator
                                </Button>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Published Assets Grid */}
                    <div className="flex-1 w-full space-y-8">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <h2 className="text-2xl font-bold tracking-tight">
                                Published Assets
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                                    {profile.stats.assetCount} Contributions
                                </Badge>
                            </div>
                        </div>

                        {profile.assets.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {profile.assets.map((asset) => (
                                    <motion.div
                                        key={asset.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -5 }}
                                    >
                                        <Card
                                            onClick={() => navigate(`/hub/c/${asset.asset_type}/${asset.slug}`)}
                                            className="group bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col overflow-hidden relative"
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="outline" className="text-[10px] capitalize">
                                                        {asset.asset_type}
                                                    </Badge>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                                                        {asset.star_count}
                                                    </div>
                                                </div>
                                                <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                                                    {asset.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-1">
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {asset.description || "No description provided."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-border/30 bg-muted/20 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                    <Download className="w-3.5 h-3.5" />
                                                    {asset.install_count} imports
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center bg-card/20 backdrop-blur-xl border border-dashed border-border/50 rounded-3xl">
                                <Search className="w-10 h-10 text-muted-foreground/30 mb-4" />
                                <h3 className="text-xl font-semibold mb-2">No public assets yet</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto">
                                    This creator hasn't published any assets to the community hub yet.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
