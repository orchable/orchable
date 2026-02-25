import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDesignerStore } from '@/stores/designerStore';
import { StepConfig } from '@/lib/types';
import { toast } from 'sonner';

const EXPORT_VERSION = 1;

export function OrchestratorImportExport() {
    const {
        nodes,
        edges,
        config,
        orchestratorName,
        orchestratorDescription,
        viewport,
    } = useDesignerStore();

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── EXPORT ────────────────────────────────────────────────────────────
    const handleExport = () => {
        // Build the latest config steps dynamically from nodes to guarantee 100% sync
        const stepNodes = nodes.filter(n => n.type === 'stepNode');
        const steps = stepNodes.map(node => {
            const data = node.data as unknown as StepConfig;
            return {
                id: node.id,
                name: data.name,
                label: data.label,
                stage_key: data.stage_key || data.name?.toLowerCase() || node.id,
                task_type: data.task_type || '',
                prompt_template_id: data.prompt_template_id || '',
                cardinality: data.cardinality || '1:1',
                split_path: data.split_path || '',
                split_mode: data.split_mode || 'per_item',
                output_mapping: data.output_mapping || 'result',
                return_along_with: data.return_along_with || [],
                ai_settings: (() => {
                    const raw = data.ai_settings;
                    const genCfg = raw?.generationConfig || {};
                    // Normalize: generate_content_api always at root, never in generationConfig
                    const { generate_content_api: gcaInner, responseMimeType, ...restGenCfg } = genCfg as any;
                    return {
                        model_id: raw?.model_id || 'gemini-2.0-flash',
                        generate_content_api: (raw?.generate_content_api || (gcaInner as string) || 'generateContent') as "generateContent" | "streamGenerateContent",
                        generationConfig: (raw?.generationConfig || {}) as Record<string, unknown>
                    };
                })(),
                timeout: data.timeout || 300000,
                retryConfig: data.retryConfig || { maxRetries: 3, retryDelay: 5000 },
                position: node.position,
                dependsOn: edges.filter(e => e.target === node.id).map(e => e.source).filter(id => id !== 'start'),
                pre_process: data.pre_process,
                post_process: data.post_process,
                contract: data.contract,
                requires_approval: data.requires_approval || false
            };
        });

        const latestConfig = {
            ...(config || {}),
            id: config?.id || 'new-config',
            name: orchestratorName,
            description: orchestratorDescription,
            steps
        };

        const payload = {
            _version: EXPORT_VERSION,
            _exportedAt: new Date().toISOString(),
            orchestratorName,
            orchestratorDescription,
            config: latestConfig,
            nodes,
            edges,
            viewport,
        };

        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const safeName = (orchestratorName || 'orchestration')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const ts = new Date().toISOString().slice(0, 10);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}_${ts}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Orchestration exported!');
    };

    // ── IMPORT ────────────────────────────────────────────────────────────
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target?.result as string);

                // Basic validation
                if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
                    throw new Error('Missing or invalid "nodes" array in file.');
                }
                if (!parsed.edges || !Array.isArray(parsed.edges)) {
                    throw new Error('Missing or invalid "edges" array in file.');
                }

                const {
                    nodes: importedNodes,
                    edges: importedEdges,
                    config: importedConfig,
                    orchestratorName: importedName,
                    orchestratorDescription: importedDesc,
                    viewport: importedViewport,
                } = parsed;

                // Apply to store
                const store = useDesignerStore.getState();
                store.setOrchestratorMetadata(
                    importedName ?? '',
                    importedDesc ?? ''
                );

                // Directly set nodes & edges via the store's internal set
                // We use the loadConfig path if a config object is present,
                // otherwise we manually patch the nodes/edges.
                if (importedConfig) {
                    store.loadConfig({
                        ...importedConfig,
                        name: importedName ?? importedConfig.name,
                        description: importedDesc ?? importedConfig.description,
                        stages: importedConfig.stages ?? [],
                    });
                }

                // Always restore the raw nodes & edges so custom node positions
                // and extra in-memory data survive round-trips
                useDesignerStore.setState({
                    nodes: importedNodes,
                    edges: importedEdges,
                    ...(importedViewport
                        ? { viewport: importedViewport }
                        : {}),
                    ...(importedName !== undefined
                        ? { orchestratorName: importedName }
                        : {}),
                    ...(importedDesc !== undefined
                        ? { orchestratorDescription: importedDesc }
                        : {}),
                });

                toast.success(
                    `Orchestration "${importedName || file.name}" imported!`
                );
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Invalid file';
                toast.error(`Import failed: ${errorMessage}`);
            } finally {
                // Reset input so the same file can be re-imported if needed
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImport}
            />

            <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="bg-card shadow-sm hover:border-primary/50"
                title="Import orchestration from JSON file"
            >
                <Upload className="w-4 h-4 mr-2" />
                Import
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="bg-card shadow-sm hover:border-primary/50"
                title="Export orchestration to JSON file"
            >
                <Download className="w-4 h-4 mr-2" />
                Export
            </Button>
        </>
    );
}
