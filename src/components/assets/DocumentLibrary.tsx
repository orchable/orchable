// File: src/components/assets/DocumentLibrary.tsx
// Implements: specs/assets/spec.md
// Requirement: Auxiliary Text Document Library Management
// Scenarios: User manages reference documents

import React from 'react';
import {
    FileText,
    Trash2,
    Plus,
    FileCode,
    Database,
    MoreVertical,
    Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { DocumentAsset } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
    documents: DocumentAsset[];
    loading: boolean;
    onUpload: () => void;
    onRefresh: () => void;
}

export const DocumentLibrary: React.FC<Props> = ({
    documents,
    loading,
    onUpload,
    onRefresh
}) => {

    const handleDelete = async (doc: DocumentAsset) => {
        if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) return;

        try {
            // 1. Delete from DB
            const { error } = await supabase
                .from('document_assets')
                .delete()
                .eq('id', doc.id);

            if (error) throw error;

            // 2. Delete from Storage if not indexeddb
            if (doc.storage_type === 'supabase') {
                await supabase.storage
                    .from('documents')
                    .remove([doc.file_path]);
            }

            toast.success('Document deleted');
            onRefresh();
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete document');
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/5">
                <div className="p-4 rounded-full bg-muted mb-4 text-muted-foreground">
                    <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium">No documents yet</h3>
                <p className="text-muted-foreground text-sm">Upload text files to use as auxiliary context in your workflows.</p>
                <Button className="mt-4 gap-2" onClick={onUpload}>
                    <Plus className="w-4 h-4" />
                    Upload Document
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
                <Card key={doc.id} className="group hover:border-primary/50 transition-all duration-300 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <FileCode className="w-5 h-5" />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="gap-2" onClick={() => toast.info('Preview coming soon')}>
                                        <FileText className="w-4 h-4" />
                                        Preview
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2" onClick={() => window.open(doc.file_path)}>
                                        <Download className="w-4 h-4" />
                                        Download
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive gap-2 focus:bg-destructive/10 focus:text-destructive"
                                        onClick={() => handleDelete(doc)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CardTitle className="mt-4 line-clamp-1">{doc.name}</CardTitle>
                        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                            {doc.file_type.toUpperCase()} file • {(doc.size_bytes / 1024).toFixed(1)} KB
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-[10px] bg-background">
                                <Database className="w-3 h-3 mr-1" />
                                {doc.storage_type === 'supabase' ? 'Cloud' : 'Local'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-background">
                                ~{doc.token_count_est.toLocaleString()} tokens
                            </Badge>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0 border-t border-border/10 bg-muted/5 p-3 flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
                    </CardFooter>
                </Card>
            ))}

            {/* Quick Add Card */}
            <button
                onClick={onUpload}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl hover:bg-muted/30 hover:border-primary/50 transition-all text-muted-foreground hover:text-primary min-h-[180px]"
            >
                <Plus className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Add New Document</span>
            </button>
        </div>
    );
};
