import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { hubService, HubAssetType } from "@/services/hubService";
import { toast } from "sonner";
import { Globe, Share2, Tag, Info, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface ShareToHubDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetType: HubAssetType;
    assetId: string;
    initialData?: {
        title: string;
        description?: string;
        tags?: string[];
    };
    onSuccess?: () => void;
}

export const ShareToHubDialog: React.FC<ShareToHubDialogProps> = ({
    open,
    onOpenChange,
    assetType,
    assetId,
    initialData,
    onSuccess,
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(
        initialData?.description || "",
    );
    const [tagsString, setTagsString] = useState(
        initialData?.tags?.join(", ") || "",
    );
    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        if (!user) {
            toast.error("Please log in to share assets to the Hub");
            // Ideally redirect to login or show login dialog
            return;
        }

        if (!title.trim()) {
            toast.error("Please enter a title for your shared asset");
            return;
        }

        setIsPublishing(true);
        try {
            const tags = tagsString
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);

            await hubService.publishAsset({
                type: assetType,
                refId: assetId,
                title,
                description,
                tags,
                isPublic: true,
            });

            toast.success("Successfully published to Community Hub!");
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to publish to Hub:", error);
            toast.error("Failed to publish asset. Please try again.");
        } finally {
            setIsPublishing(false);
        }
    };

    const assetTypeLabels: Record<HubAssetType, string> = {
        orchestration: "Orchestration",
        template: "Prompt Template",
        component: "View Component",
        ai_preset: "AI Setting",
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-full bg-primary/10">
                            <Share2 className="w-4 h-4 text-primary" />
                        </div>
                        <Badge variant="outline" className="capitalize">
                            {assetTypeLabels[assetType]}
                        </Badge>
                    </div>
                    <DialogTitle className="text-xl">Share to Hub</DialogTitle>
                    <DialogDescription>
                        Make this {assetTypeLabels[assetType].toLowerCase()} public for the
                        community to discover and remix.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!user ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold">Authentication Required</h3>
                                <p className="text-sm text-muted-foreground px-4">
                                    You need to be logged in to share your assets with the community.
                                </p>
                            </div>
                            <Button variant="default" onClick={() => navigate("/login")} className="w-full">
                                Go to Login
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    placeholder="Clear and descriptive title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Explain what this does and how to use it..."
                                    className="h-24 resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tags" className="flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5" />
                                    Tags (comma separated)
                                </Label>
                                <Input
                                    id="tags"
                                    placeholder="e.g. nlp, marketing, vision, table"
                                    value={tagsString}
                                    onChange={(e) => setTagsString(e.target.value)}
                                />
                            </div>

                            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-xs border border-muted-foreground/10">
                                <div className="flex items-start gap-2 text-muted-foreground">
                                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <p>
                                        Published assets are visible to all Orchable users and can be
                                        cloned into their own workspaces.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2 text-amber-600 dark:text-amber-500">
                                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <p>
                                        Sensitive information like API keys or private organization codes
                                        will be automatically stripped from the public version.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isPublishing}
                    >
                        {user ? "Cancel" : "Close"}
                    </Button>
                    {user && (
                        <Button
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="gap-2"
                        >
                            {isPublishing ? (
                                "Publishing..."
                            ) : (
                                <>
                                    <Globe className="w-4 h-4" />
                                    Publish Now
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
