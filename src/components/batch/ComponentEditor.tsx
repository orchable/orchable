import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Code2,
    Play,
    Save,
    Trash2,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    MonitorPlay,
    Activity,
    Layout,
    Maximize2,
    RefreshCw,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { validateSource } from '@/lib/componentSandbox';
import { CustomComponentRenderer } from './CustomComponentRenderer';
import { GeminiJsonSchema } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle
} from '@/components/ui/resizable';

interface ComponentEditorProps {
    initialCode?: string;
    onSave: (code: string, mockData?: Record<string, unknown>) => Promise<void>;
    previewData?: Record<string, unknown>;
    previewSchema?: GeminiJsonSchema;
    isRegistryMode?: boolean;
    initialMockData?: Record<string, unknown>;
    registryComponentId?: string;
    isLinked?: boolean;
}

const DEFAULT_TEMPLATE = `/**
 * Custom View Component
 * 
 * Available globals: 
 * - React, useState, useEffect, useMemo, useCallback
 * - cn (utility for classNames)
 * - Badge, Card, Table, TableHeader, TableBody... (Shadcn UI)
 * - All Lucide icons (e.g. <User />, <Activity />)
 * 
 * Props: { data, schema }
 */

const Component = ({ data, schema }) => {
  const renderValue = (val) => {
    if (val === null || val === undefined) return <span className="text-slate-500 italic text-[11px]">null</span>;
    if (typeof val === 'boolean') return (
        <Badge variant={val ? "default" : "secondary"} className={cn("text-[10px] h-5", val ? "bg-green-500/10 text-green-600 border-green-200" : "bg-white/5 text-slate-500")}>
            {val ? 'YES' : 'NO'}
        </Badge>
    );
    if (typeof val === 'number') return <code className="text-[12px] bg-white/5 px-1.5 py-0.5 rounded font-mono text-primary">{val}</code>;
    if (typeof val === 'object') {
      return (
        <pre className="text-[10px] bg-slate-950/50 p-2 rounded-md border border-white/5 overflow-auto max-h-40 font-mono text-slate-400 mt-1 whitespace-pre-wrap break-words">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="text-slate-200 break-words">{String(val)}</span>;
  };

  const renderArray = (items, key) => {
    if (items.length === 0) return <span className="text-slate-500 italic">Empty array</span>;
    
    // If array of objects, render as Table
    if (typeof items[0] === 'object' && items[0] !== null) {
      const keys = Object.keys(items[0]);
      return (
        <div className="rounded-md border border-white/10 bg-black/20 overflow-hidden w-full mt-2">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-white/5">
                  {keys.map(k => (
                    <TableHead key={k} className="h-9 text-[10px] uppercase font-bold text-slate-500 px-4">
                      {k}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i} className="border-white/5 hover:bg-white/[0.02]">
                    {keys.map(k => (
                      <TableCell key={k} className="py-2 px-4 align-top">
                        {renderValue(item[k])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((it, i) => (
          <Badge key={i} variant="outline" className="text-[10px] bg-white/5 border-white/10">
            {String(it)}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{key}</h4>
          </div>
          
          {Array.isArray(value) ? renderArray(value, key) : (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
               {renderValue(value)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
`;

export const ComponentEditor: React.FC<ComponentEditorProps> = ({
    initialCode,
    onSave,
    previewData,
    previewSchema,
    isRegistryMode = false,
    initialMockData = {},
    registryComponentId,
    isLinked = false
}) => {
    const [code, setCode] = useState(initialCode || DEFAULT_TEMPLATE);
    const [mockData, setMockData] = useState(initialMockData);
    const [mockDataRaw, setMockDataRaw] = useState(JSON.stringify(initialMockData, null, 2));
    const [isSaving, setIsSaving] = useState(false);
    const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
    const [layoutMode, setLayoutMode] = useState<'code' | 'split' | 'preview'>('split');
    const [editorTab, setEditorTab] = useState<'code' | 'data'>('code');

    const activePreviewData = isRegistryMode ? mockData : (previewData || {});
    const activePreviewSchema = previewSchema || { type: 'object', properties: {} };

    const handleValidate = () => {
        const result = validateSource(code);
        setValidation(result);
        return result.valid;
    };

    const handleSave = async () => {
        if (!handleValidate()) return;

        setIsSaving(true);
        try {
            await onSave(code, isRegistryMode ? mockData : undefined);
            setValidation({ valid: true, errors: [] });
        } catch (err) {
            setValidation({ valid: false, errors: ['Failed to save to database'] });
        } finally {
            setIsSaving(false);
        }
    };

    const handleMockDataChange = (value: string) => {
        setMockDataRaw(value);
        try {
            const parsed = JSON.parse(value);
            setMockData(parsed);
        } catch (e) {
            // Silently fail parsing, user is still typing
        }
    };

    const renderEditor = () => (
        <div className="flex flex-col h-full bg-slate-950">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 text-[10px] uppercase font-bold px-3 rounded-md", editorTab === 'code' ? "bg-primary/20 text-primary" : "text-slate-500")}
                        onClick={() => setEditorTab('code')}
                    >
                        Code (TSX)
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 text-[10px] uppercase font-bold px-3 rounded-md", editorTab === 'data' ? "bg-primary/20 text-primary" : "text-slate-500")}
                        onClick={() => {
                            if (editorTab !== 'data' && (!mockData || Object.keys(mockData).length === 0 || mockDataRaw === '{}' || mockDataRaw === '{\n  \n}')) {
                                if (previewData && Object.keys(previewData).length > 0) {
                                    setMockData(previewData);
                                    setMockDataRaw(JSON.stringify(previewData, null, 2));
                                }
                            }
                            setEditorTab('data');
                        }}
                    >
                        Mock Data (JSON)
                    </Button>
                </div>
                <div className="flex gap-2 items-center">
                    {editorTab === 'data' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-500 hover:text-primary transition-colors"
                            title="Sync with Live Data"
                            onClick={() => {
                                if (previewData) {
                                    setMockData(previewData);
                                    setMockDataRaw(JSON.stringify(previewData, null, 2));
                                }
                            }}
                        >
                            <RefreshCw className="w-3 h-3" />
                        </Button>
                    )}
                    <Badge variant="outline" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono">React 18</Badge>
                </div>
            </div>
            {editorTab === 'code' ? (
                <Textarea
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value);
                        setValidation(null);
                    }}
                    className="flex-1 w-full bg-slate-950 text-slate-300 font-mono text-sm p-6 border-none focus-visible:ring-0 resize-none selection:bg-primary/30 leading-relaxed rounded-none"
                    spellCheck={false}
                />
            ) : (
                <Textarea
                    value={mockDataRaw}
                    onChange={(e) => handleMockDataChange(e.target.value)}
                    className="flex-1 w-full bg-slate-950 text-emerald-300/80 font-mono text-sm p-6 border-none focus-visible:ring-0 resize-none selection:bg-primary/30 leading-relaxed rounded-none"
                    spellCheck={false}
                    placeholder='{ "key": "value" }'
                />
            )}
        </div>
    );

    const renderPreview = () => (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Validation Status */}
            <div className="p-4 border-b border-white/10 shrink-0">
                {validation ? (
                    validation.valid ? (
                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 p-2 rounded-md border border-emerald-400/20">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Security Check Passed</span>
                        </div>
                    ) : (
                        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 p-2 h-auto flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                <AlertTitle className="text-[10px] m-0 font-bold uppercase">Security Vulnerability Found</AlertTitle>
                            </div>
                            <AlertDescription className="text-[10px] font-mono leading-tight opacity-80 pt-1">
                                {validation.errors[0]}
                            </AlertDescription>
                        </Alert>
                    )
                ) : (
                    <div className="flex items-center gap-2 text-slate-500 bg-white/5 p-2 rounded-md border border-white/10 uppercase">
                        <Code2 className="w-4 h-4 opacity-50" />
                        <span className="text-[10px] font-bold tracking-tight">Waiting for code...</span>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto">
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        <MonitorPlay className="w-3 h-3" />
                        Live Result
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 shadow-2xl p-4 min-h-[300px] overflow-auto">
                        {validation?.valid !== false ? (
                            <CustomComponentRenderer
                                code={code}
                                data={activePreviewData}
                                schema={activePreviewSchema}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[250px] text-slate-600 italic text-xs gap-3">
                                <AlertCircle className="w-8 h-8 opacity-20" />
                                Preview disabled until errors fixed
                            </div>
                        )}
                    </div>

                    {/* Help Section */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mt-6 max-w-[450px]">
                        <h4 className="text-[10px] font-bold uppercase text-primary mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Authoring Tips
                        </h4>
                        <ul className="space-y-1.5 list-none m-0 p-0 text-[10px] text-slate-400">
                            <li>• Define your component as <code className="text-primary/80">const Component = ...</code></li>
                            <li>• Access data via <code className="text-primary/80">data.field_name</code></li>
                            <li>• Use <code className="text-primary/80">cn()</code> for conditional tailwind classes</li>
                            <li>• No <code className="text-rose-400">window</code> or <code className="text-rose-400">fetch</code> allowed</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-50 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Code2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold tracking-tight">
                                {isRegistryMode ? 'Component Registry Editor' : 'View Component Editor'}
                            </h2>
                            {!isRegistryMode && (
                                <Badge
                                    variant={isLinked ? "default" : "secondary"}
                                    className={cn(
                                        "text-[9px] h-4 font-mono uppercase",
                                        isLinked ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                    )}
                                >
                                    {isLinked ? "Linked to Registry" : "Local Override"}
                                </Badge>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                            {isRegistryMode ? 'Refining Standalone Asset' : (isLinked ? 'Syncing with Asset Library' : 'Drafting Local Component')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[11px] gap-2 text-slate-400 hover:text-white"
                        onClick={() => setCode(DEFAULT_TEMPLATE)}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Reset
                    </Button>
                    <div className="w-px h-4 bg-white/10 mx-1" />

                    {/* Layout Toggles */}
                    <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10 mr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-6 px-3 text-[10px] gap-1.5 transition-all",
                                layoutMode === 'code' ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-400 hover:text-slate-200"
                            )}
                            onClick={() => setLayoutMode('code')}
                        >
                            <Code2 className="w-3 h-3" />
                            Editor
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-6 px-3 text-[10px] gap-1.5 transition-all",
                                layoutMode === 'split' ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-400 hover:text-slate-200"
                            )}
                            onClick={() => setLayoutMode('split')}
                        >
                            <Layout className="w-3 h-3" />
                            Split
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-6 px-3 text-[10px] gap-1.5 transition-all",
                                layoutMode === 'preview' ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-400 hover:text-slate-200"
                            )}
                            onClick={() => setLayoutMode('preview')}
                        >
                            <Maximize2 className="w-3 h-3" />
                            Preview
                        </Button>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        size="sm"
                        className="h-8 text-[11px] font-bold gap-2 px-4 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                    >
                        {isSaving ? <Play className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Publish Component
                    </Button>
                </div>
            </div>

            {/* Main Content Area with Resizable Panels */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {layoutMode === 'code' && (
                    <div className="h-full">{renderEditor()}</div>
                )}

                {layoutMode === 'preview' && (
                    <div className="h-full bg-slate-900/40">{renderPreview()}</div>
                )}

                {layoutMode === 'split' && (
                    <ResizablePanelGroup direction="horizontal" className="h-full">
                        <ResizablePanel defaultSize={50} minSize={25}>
                            {renderEditor()}
                        </ResizablePanel>
                        <ResizableHandle withHandle className="bg-white/5 hover:bg-primary/30 transition-colors data-[resize-handle-active]:bg-primary/50" />
                        <ResizablePanel defaultSize={50} minSize={25}>
                            <div className="h-full bg-slate-900/40">
                                {renderPreview()}
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                )}
            </div>

            {/* Footer Status */}
            <div className="px-4 py-1.5 bg-slate-900 border-t border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sucrase Compiler Active
                    </div>
                    <div className="w-px h-2.5 bg-white/10" />
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                        Sandboxed Memory: Local
                    </div>
                </div>
                <div className="text-[9px] font-mono text-slate-600">
                    UTF-8 | TSX | L: {code.split('\n').length}
                </div>
            </div>
        </div>
    );
};
