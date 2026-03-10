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
import { resolveInlineMerge } from '@/services/stageService';
import type { OrchestratorConfig } from '@/lib/types';

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

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 flex flex-col">
            {isResolving && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur px-4 py-2 rounded-full border shadow-lg flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    <span className="text-sm font-medium">Resolving nested orchestrations...</span>
                </div>
            )}
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
                            const name = n.data.name as string;
                            if (name === 'A') return '#3b82f6';
                            if (name === 'B') return '#22c55e';
                            return '#94a3b8';
                        }}
                        className="bg-card border shadow-sm"
                        maskColor="rgba(0, 0, 0, 0.1)"
                    />
                </ReactFlow>
            </div>
        </div>
    );
}
