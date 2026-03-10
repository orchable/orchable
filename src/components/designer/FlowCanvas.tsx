import { useMemo, useCallback, useState, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    type EdgeChange,
    BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDesignerStore } from '@/stores/designerStore';
import { StartNode } from './StartNode';
import { StepNode } from './StepNode';
import { resolveInlineMerge, isConnectedSubgraph } from '@/services/stageService';
import type { OrchestratorConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusSquare } from 'lucide-react';
import { toast } from 'sonner';
import { ExtractSubOrchDialog } from './ExtractSubOrchDialog';

interface FlowCanvasProps {
    expandAll?: boolean;
}

export function FlowCanvas({ expandAll }: FlowCanvasProps) {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setSelectedNode,
        removeStep,
        config,
        viewport,
        setViewport
    } = useDesignerStore();

    const [resolvedPipeline, setResolvedPipeline] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
    const [isResolving, setIsResolving] = useState(false);

    // Compute resolved pipeline for expanded view
    useEffect(() => {
        async function updateResolvedPipeline() {
            if (!expandAll || !config) {
                setResolvedPipeline(null);
                return;
            }

            setIsResolving(true);
            try {
                // Use a deep clone to avoid mutating store state during resolution
                const configClone = JSON.parse(JSON.stringify(config)) as OrchestratorConfig;
                const result = await resolveInlineMerge(configClone);

                // Simple vertical layout for expanded view
                const resolvedNodes: Node[] = [
                    {
                        id: 'start',
                        type: 'startNode',
                        position: { x: 250, y: 0 },
                        data: { label: 'Start' },
                        deletable: false
                    },
                    ...result.steps.map((step, index) => ({
                        id: step.id,
                        type: 'stepNode',
                        position: { x: 250, y: 150 + index * 150 },
                        data: {
                            ...step,
                            stepId: step.id,
                        },
                        deletable: false, // Don't allow deleting in expanded view
                        draggable: false  // Don't allow dragging in expanded view
                    }))
                ];

                // Reconstruct edges based on dependsOn
                const resolvedEdges: Edge[] = [];
                result.steps.forEach(step => {
                    if (!step.dependsOn || step.dependsOn.length === 0) {
                        resolvedEdges.push({
                            id: `e_start-${step.id}`,
                            source: 'start',
                            target: step.id,
                            animated: true
                        });
                    } else {
                        step.dependsOn.forEach(depId => {
                            resolvedEdges.push({
                                id: `e_${depId}-${step.id}`,
                                source: depId,
                                target: step.id,
                                animated: true
                            });
                        });
                    }
                });

                setResolvedPipeline({ nodes: resolvedNodes, edges: resolvedEdges });
            } catch (err) {
                console.error("Failed to resolve expanded pipeline:", err);
            } finally {
                setIsResolving(false);
            }
        }

        updateResolvedPipeline();
    }, [expandAll, config]);

    const displayNodes = resolvedPipeline?.nodes || nodes;
    const displayEdges = resolvedPipeline?.edges || edges;

    const nodeTypes = useMemo(() => ({
        stepNode: StepNode,
        startNode: StartNode
    }), []);

    // Handle node selection
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, [setSelectedNode]);

    // Handle pane click to deselect
    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, [setSelectedNode]);

    // Enhanced onEdgesChange to handle deletion properly in store
    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
        onEdgesChange(changes);

        // Sync deletions with dependency logic if needed
        changes.forEach(change => {
            if (change.type === 'remove') {
                // Handle removal logic if needed
            }
        });
    }, [onEdgesChange]);

    // Handle deletion key (Backspace/Delete)
    const onNodesDelete = useCallback((deletedNodes: Node[]) => {
        deletedNodes.forEach(node => {
            removeStep(node.id);
        });
    }, [removeStep]);

    // Handle Extraction Dialog
    const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
    const selectedStepNodeIds = useMemo(() =>
        nodes.filter(n => n.selected && n.type === 'stepNode').map(n => n.id)
        , [nodes]);

    const handleOpenExtractDialog = () => {
        if (selectedStepNodeIds.length < 2) return;

        // Pre-validate connectivity
        const isConnected = isConnectedSubgraph(
            new Set(selectedStepNodeIds),
            edges.map(e => ({ source: e.source, target: e.target }))
        );

        if (!isConnected) {
            toast.error("Extraction requires a connected set of stages (a continuous flow).");
            return;
        }

        setIsExtractDialogOpen(true);
    };

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 flex flex-col">
            {isResolving && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur px-4 py-2 rounded-full border shadow-lg flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    <span className="text-sm font-medium">Resolving nested orchestrations...</span>
                </div>
            )}

            {/* Selection Toolbar */}
            {selectedStepNodeIds.length >= 2 && !expandAll && (
                <div className="absolute top-4 left-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Button
                        onClick={handleOpenExtractDialog}
                        size="sm"
                        className="bg-primary shadow-lg border-2 border-primary-foreground/10 hover:shadow-primary/20"
                    >
                        <PlusSquare className="w-4 h-4 mr-2" />
                        Extract Sub-Orchestration ({selectedStepNodeIds.length})
                    </Button>
                </div>
            )}

            <ExtractSubOrchDialog
                open={isExtractDialogOpen}
                onOpenChange={setIsExtractDialogOpen}
                selectedNodeIds={selectedStepNodeIds}
            />

            <div className="flex-1 min-h-0">
                <ReactFlow
                    key={expandAll ? 'expanded-canvas' : (config?.id || 'default-canvas')}
                    nodes={displayNodes}
                    edges={displayEdges}
                    onNodesChange={expandAll ? undefined : onNodesChange}
                    onEdgesChange={expandAll ? undefined : handleEdgesChange}
                    onConnect={expandAll ? undefined : onConnect}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    onNodesDelete={expandAll ? undefined : onNodesDelete}
                    onMoveEnd={(_, viewport) => setViewport(viewport)}
                    nodeTypes={nodeTypes}
                    defaultViewport={viewport}
                    deleteKeyCode={expandAll ? null : ['Backspace', 'Delete']}
                    defaultEdgeOptions={{
                        animated: true,
                        style: { stroke: '#94a3b8', strokeWidth: 2 }, // slate-400, visible on both
                        type: 'smoothstep'
                    }}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                    <Controls />
                    <MiniMap
                        nodeColor={(n) => {
                            const isConfigured = !!(n.data?.task_type || n.data?.webhookUrl);
                            if (n.type === 'startNode') return '#10b981';
                            return isConfigured ? '#3b82f6' : '#94a3b8';
                        }}
                        className="bg-card border shadow-sm"
                        maskColor="rgba(0, 0, 0, 0.1)"
                    />
                </ReactFlow>
            </div>
        </div>
    );
}
