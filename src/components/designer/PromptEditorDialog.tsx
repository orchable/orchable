import { useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Code, Braces, Zap, Maximize2, RefreshCw } from 'lucide-react';

export interface PromptEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    prompt: string;
    onPromptChange: (value: string) => void;
    onSave: () => void;
    isSaving: boolean;
    title: string;
    delimiters?: { start: string; end: string };
    onDelimitersChange?: (delimiters: { start: string; end: string }) => void;
    availableScope?: string[] | null;
    sidebarMode?: 'available' | 'used';
}

export function PromptEditorDialog({
    open,
    onOpenChange,
    prompt,
    onPromptChange,
    onSave,
    isSaving,
    title,
    delimiters = { start: '{{', end: '}}' },
    onDelimitersChange,
    availableScope,
    sidebarMode = 'available'
}: PromptEditorDialogProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    // Regex builder helper - strictly uses provided delimiters
    const getRegex = () => {
        const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const start = escape(delimiters.start || '{{');
        const end = escape(delimiters.end || '}}');

        // Match only the configured delimiters
        return new RegExp(`${start}[a-zA-Z0-9_.-]+${end}`, 'g');
    };

    // Sync scroll from textarea to backdrop
    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
            backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    // Highlight variables in overlay
    const renderHighlights = (text: string) => {
        if (!text) return null;
        const regex = getRegex();
        let lastIndex = 0;
        let match;
        const parts = [];

        while ((match = regex.exec(text)) !== null) {
            // Text before match
            parts.push(text.substring(lastIndex, match.index));

            // Extract variable name from match[0]
            const matchedText = match[0];
            const varName = matchedText.slice(delimiters.start.length, -delimiters.end.length);

            const isInvalid = availableScope !== null && availableScope !== undefined && !availableScope.includes(varName);

            // Highlighted match
            parts.push(
                <mark
                    key={match.index}
                    className={cn(
                        "rounded-sm bg-blue-500/20 text-blue-700 dark:text-blue-300 border-b border-blue-500/50",
                        isInvalid && "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50"
                    )}
                >
                    {match[0]}
                </mark>
            );
            lastIndex = regex.lastIndex;
        }
        // Text after last match
        parts.push(text.substring(lastIndex));
        return parts;
    };

    const insertVariable = (varName: string) => {
        if (!textareaRef.current) return;
        const startAlt = delimiters?.start || '{{';
        const endAlt = delimiters?.end || '}}';
        const variable = `${startAlt}${varName}${endAlt}`;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        onPromptChange(before + variable + after);

        // Return focus and set cursor (next tick)
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newPos = start + variable.length;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    // Extract used variables with line numbers
    const getUsedVariables = () => {
        if (!prompt) return [];
        const regex = getRegex();
        const lines = prompt.split('\n');
        const usedMap = new Map<string, { name: string, line: number, type: 'used' | 'invalid' }[]>();

        lines.forEach((lineText, index) => {
            let match;
            const lineNum = index + 1;
            while ((match = regex.exec(lineText)) !== null) {
                const matchedText = match[0];
                const varName = matchedText.slice(delimiters.start.length, -delimiters.end.length);

                if (varName) {
                    const isInvalid = availableScope !== null && availableScope !== undefined && !availableScope.includes(varName);
                    const list = usedMap.get(varName) || [];
                    list.push({ name: varName, line: lineNum, type: isInvalid ? 'invalid' : 'used' });
                    usedMap.set(varName, list);
                }
            }
        });

        // Flatten and sort by line number
        return Array.from(usedMap.values()).flat().sort((a, b) => a.line - b.line);
    };

    const usedVariables = getUsedVariables();
    const tokenCount = Math.ceil(prompt.length / 4);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b flex-row items-center justify-between gap-4 space-y-0">
                    <div className="flex-1">
                        <DialogTitle className="flex items-center gap-2">
                            <Code className="w-5 h-5 text-primary" />
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Use {delimiters.start}variable{delimiters.end} to insert variables.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Editor Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-background">
                        <div className="flex-1 relative group font-mono text-sm leading-6">
                            {/* 
                                Backdrop for highlights. 
                                Must match textarea EXACTLY in font, size, leading, padding, and whitespace behavior.
                            */}
                            <div
                                ref={backdropRef}
                                className="absolute inset-0 p-6 pointer-events-none whitespace-pre-wrap break-words overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] highlight-backdrop text-slate-800 dark:text-slate-200 border-0 m-0 font-mono text-sm leading-6 antialiased box-border"
                                aria-hidden="true"
                            >
                                {renderHighlights(prompt || '')}
                            </div>

                            {/* 
                                Actual Textarea. 
                                Transparent text allows backdrop to show through, but caret and selection remain visible.
                            */}
                            <textarea
                                ref={textareaRef}
                                value={prompt || ''}
                                onChange={(e) => onPromptChange(e.target.value)}
                                onScroll={handleScroll}
                                className="absolute inset-0 w-full h-full p-6 bg-transparent resize-none outline-none caret-primary text-transparent whitespace-pre-wrap break-words overflow-auto border-0 focus:ring-0 m-0 font-mono text-sm leading-6 antialiased box-border [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                spellCheck={false}
                                placeholder="Enter prompt template here..."
                            />
                        </div>
                    </div>

                    {/* Available/Used Variables Sidebar */}
                    <div className="w-64 border-l bg-muted/20 flex flex-col overflow-hidden">
                        {/* Delimiter Config - Only in 'used' mode (Asset Library) */}
                        {sidebarMode === 'used' && (
                            <div className="p-4 border-b bg-muted/40 space-y-3">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                    Variable Delimiters
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] text-muted-foreground ml-1">Start</label>
                                        <input
                                            type="text"
                                            value={delimiters.start}
                                            onChange={(e) => onDelimitersChange?.({ ...delimiters, start: e.target.value })}
                                            className="w-full bg-background border rounded h-7 px-2 text-[11px] font-mono focus:ring-1 focus:ring-primary outline-none"
                                            placeholder="{{"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] text-muted-foreground ml-1">End</label>
                                        <input
                                            type="text"
                                            value={delimiters.end}
                                            onChange={(e) => onDelimitersChange?.({ ...delimiters, end: e.target.value })}
                                            className="w-full bg-background border rounded h-7 px-2 text-[11px] font-mono focus:ring-1 focus:ring-primary outline-none"
                                            placeholder="}}"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-3 border-b bg-muted/40 flex items-center gap-2">
                            <Braces className="w-4 h-4 text-primary" />
                            <span className="text-xs font-semibold">
                                {sidebarMode === 'used' ? 'Variables in Prompt' : 'Available Variables'}
                            </span>
                        </div>

                        <ScrollArea className="flex-1 p-2">
                            <div className="space-y-1">
                                {sidebarMode === 'used' ? (
                                    usedVariables.length > 0 ? (
                                        usedVariables.map((v, i) => (
                                            <div
                                                key={`${v.name}-${v.line}-${i}`}
                                                className={cn(
                                                    "flex items-center justify-between p-2 rounded-md font-mono text-[11px] group transition-colors",
                                                    v.type === 'invalid'
                                                        ? "bg-red-500/5 text-red-600 dark:text-red-400"
                                                        : "bg-primary/5 text-primary"
                                                )}
                                            >
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className="opacity-50">L{v.line}</span>
                                                    <span className="truncate">{v.name}</span>
                                                </div>
                                                {v.type === 'invalid' && (
                                                    <Badge variant="destructive" className="h-4 px-1 text-[8px]">Invalid</Badge>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center">
                                            <p className="text-[10px] text-muted-foreground italic">
                                                No variables found in prompt.
                                            </p>
                                        </div>
                                    )
                                ) : (
                                    availableScope === null ? (
                                        <div className="p-3 text-center">
                                            <Badge variant="outline" className="text-[10px] mb-2">Root Stage</Badge>
                                            <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                                                This stage takes data from an external source (File Upload). You can type any field name.
                                            </p>
                                        </div>
                                    ) : availableScope && availableScope.length > 0 ? (
                                        availableScope.map(v => (
                                            <Button
                                                key={v}
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start font-mono text-[11px] h-8 px-2 group hover:bg-primary/10 hover:text-primary transition-colors"
                                                onClick={() => insertVariable(v)}
                                            >
                                                <span className="text-muted-foreground mr-1 opacity-50">{delimiters?.start || '{{'}</span>
                                                {v}
                                                <span className="text-muted-foreground ml-1 opacity-50">{delimiters?.end || '}}'}</span>
                                            </Button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center">
                                            <p className="text-[10px] text-muted-foreground italic">
                                                Parent stage has no output or return_along_with.
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
                        </ScrollArea>
                        <div className="p-3 border-t bg-muted/40">
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {sidebarMode === 'used'
                                    ? "List of variables currently being used in the prompt content."
                                    : "Click to insert variable into prompt at cursor position."
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t flex items-center justify-between sm:justify-between bg-background">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            <span>~{tokenCount} tokens</span>
                        </div>
                        {tokenCount > 8192 && (
                            <span className="text-amber-500 font-medium flex items-center gap-1">
                                <Maximize2 className="w-3 h-3" />
                                Large prompt
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
                            {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                            Save Template
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
