import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Download, Table as TableIcon, FileText } from 'lucide-react';
import { getStorageAdapterForType } from '@/lib/storage';
import { DocumentAsset } from '@/lib/types';
import { toast } from 'sonner';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    document: DocumentAsset | null;
}

export const DocumentPreviewModal: React.FC<Props> = ({
    open,
    onOpenChange,
    document
}) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const loadContent = async () => {
            if (!document) return;
            setLoading(true);
            try {
                const documentStorage = getStorageAdapterForType(document.storage_type as 'supabase' | 'indexeddb');
                const data = await documentStorage.getAssetContent(document);
                setContent(data);
            } catch (error) {
                console.error('Failed to load document content:', error);
                toast.error('Failed to load preview');
                onOpenChange(false);
            } finally {
                setLoading(false);
            }
        };

        if (open && document) {
            loadContent();
        } else {
            setContent('');
        }
    }, [open, document, onOpenChange]);

    const handleDownload = () => {
        if (!document || !content) return;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.name;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Parser for TSV/CSV based on file extension
    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            );
        }

        if (!content) {
            return (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <p>No content available.</p>
                </div>
            );
        }

        const isTsv = document?.name.toLowerCase().endsWith('.tsv');
        const isCsv = document?.name.toLowerCase().endsWith('.csv');

        if (isTsv || isCsv) {
            const delimiter = isTsv ? '\t' : ',';
            
            // Robust CSV/TSV parser that respects double quotes for newlines and delimiters
            const parseCSV = (text: string, separator: string): string[][] => {
                const parsedRows: string[][] = [];
                let currentRow: string[] = [];
                let currentCell = '';
                let insideQuotes = false;

                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    const nextChar = text[i + 1];

                    if (char === '"') {
                        if (insideQuotes && nextChar === '"') {
                            currentCell += '"';
                            i++; // Skip the escaped quote
                        } else {
                            insideQuotes = !insideQuotes;
                        }
                    } else if (char === separator && !insideQuotes) {
                        currentRow.push(currentCell);
                        currentCell = '';
                    } else if (char === '\n' && !insideQuotes) {
                        if (currentCell.endsWith('\r')) {
                            currentCell = currentCell.slice(0, -1);
                        }
                        currentRow.push(currentCell);
                        parsedRows.push(currentRow);
                        currentRow = [];
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                
                if (currentCell.endsWith('\r')) {
                    currentCell = currentCell.slice(0, -1);
                }
                currentRow.push(currentCell);
                if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === '')) {
                    parsedRows.push(currentRow);
                }

                return parsedRows;
            };

            const allRows = parseCSV(content.trim(), delimiter);
            const previewRows = allRows.slice(0, 100);
            
            if (previewRows.length === 0) return <p className="p-4">File is empty.</p>;

            const headers = previewRows[0];
            const dataRows = previewRows.slice(1);

            return (
                <ScrollArea className="w-full h-full rounded-md border">
                    <div className="min-w-max p-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 sticky top-0 backdrop-blur-sm shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                                <tr>
                                    <th className="font-semibold text-muted-foreground px-4 py-2 opacity-50 w-12 sticky left-0 bg-muted/50 backdrop-blur-sm z-20">#</th>
                                    {headers.map((header, i) => (
                                        <th key={i} className="font-semibold px-4 py-2 whitespace-nowrap z-10 border-b">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dataRows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="border-b last:border-0 hover:bg-muted/30">
                                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground opacity-50 whitespace-nowrap sticky left-0 bg-background group-hover/tr:bg-muted/30">
                                            {rowIndex + 1}
                                        </td>
                                        {row.map((cell, cellIndex) => (
                                            <td key={cellIndex} className="px-4 py-2 whitespace-nowrap max-w-[400px] truncate" title={cell}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {allRows.length > 100 && (
                        <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 border-t">
                            Showing first 100 rows. Download the file to view the full dataset ({allRows.length.toLocaleString()} rows).
                        </div>
                    )}
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            );
        }

        // Fallback for TXT/MD files
        return (
            <ScrollArea className="w-full h-full rounded-md border p-4 bg-muted/10">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                    {content}
                </pre>
            </ScrollArea>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] flex flex-col max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {document?.name.endsWith('.tsv') || document?.name.endsWith('.csv') ? (
                            <TableIcon className="w-5 h-5 text-primary" />
                        ) : (
                            <FileText className="w-5 h-5 text-primary" />
                        )}
                        {document?.name}
                    </DialogTitle>
                    <DialogDescription>
                        {document?.token_count_est?.toLocaleString()} estimated tokens • {(document?.size_bytes ? document.size_bytes / 1024 : 0).toFixed(1)} KB
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 py-4 overflow-hidden">
                    {renderContent()}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button onClick={handleDownload} className="gap-2">
                        <Download className="w-4 h-4" />
                        Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
