// File: src/components/assets/UploadDocumentModal.tsx
// Implements: specs/assets/spec.md
// Requirement: Auxiliary Text Document Library Management
// Scenarios: User uploads a reference document

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { parseDocumentContent } from '@/lib/documentParser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTier } from '@/hooks/useTier';
import { toast } from 'sonner';
import { storage as storageAdapter } from '@/lib/storage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const UploadDocumentModal: React.FC<Props> = ({
    open,
    onOpenChange,
    onSuccess
}) => {
    const { user } = useAuth();
    const { tier } = useTier();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [tokenEstimate, setTokenEstimate] = useState<number>(0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Implements: Scenario "System parses file... token estimations"
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const parsed = parseDocumentContent(content, selectedFile.name);
            setTokenEstimate(parsed.tokenCountEst);
        };
        reader.readAsText(selectedFile);
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file || !user) return;
        setIsUploading(true);

        try {
            const fileName = `${Date.now()}_${file.name}`;
            const fileExt = file.name.split('.').pop()?.toLowerCase();

            // 1. Read content for parsing
            const content = await file.text();
            const parsed = parseDocumentContent(content, file.name);

            // Implements: Scenario "System writes physical blob into Supabase Storage (Premium) or IndexedDB (Free/BYOK)"
            const storageType = tier === 'premium' ? 'supabase' : 'indexeddb';
            let finalPath = '';

            if (storageType === 'supabase') {
                const { data, error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(`${user.id}/${fileName}`, file);

                if (uploadError) throw uploadError;
                finalPath = supabase.storage.from('documents').getPublicUrl(data.path).data.publicUrl;
            } else {
                // Free/BYOK -> Store in IndexedDB
                // saveAsset was for internal use, now we use createAsset which handles the record
                const assetId = `${Date.now()}_${file.name}`;
                // Save the actual content blob for local access
                await storageAdapter.adapter.saveAsset(file.name, content, 'document');
                finalPath = `local://documents/${assetId}`;
            }

            // 2. Create Asset record via Adapter
            await storageAdapter.adapter.createAsset({
                name: file.name,
                file_path: finalPath,
                file_type: parsed.fileType,
                size_bytes: file.size,
                token_count_est: parsed.tokenCountEst,
                user_id: user.id,
                storage_type: storageType
            });

            toast.success('Document uploaded successfully');
            onSuccess();
            onOpenChange(false);
            setFile(null);
            setTokenEstimate(0);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('Upload failed:', error);
            toast.error(message || 'Failed to upload document');
        } finally {
            setIsUploading(false);
        }
    };

    const isOverLimit = tier === 'free' && tokenEstimate > 10000;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                        Attach a reference document for your AI workflows. (Markdown, Text, CSV, TSV)
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="file">Select File</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".md,.txt,.csv,.tsv"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                    </div>

                    {file && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                <FileText className="w-8 h-8 text-primary" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium truncate max-w-[250px]">{file.name}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        ~{tokenEstimate.toLocaleString()} tokens estimated
                                    </span>
                                </div>
                            </div>

                            {isOverLimit && (
                                <Alert variant="destructive" className="py-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle className="text-xs">Token Limit Exceeded</AlertTitle>
                                    <AlertDescription className="text-[10px]">
                                        Free tier documents are limited to 10k tokens (~7.5k words).
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading || isOverLimit}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UploadDocumentModal;
