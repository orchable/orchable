import { useMemo, useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type Node,
    type EdgeChange,
    BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDesignerStore } from '@/stores/designerStore';
import { StepNode } from './StepNode';

export function FlowCanvas() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setSelectedNode,
        removeStep
    } = useDesignerStore();

    const nodeTypes = useMemo(() => ({
        stepNode: StepNode
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
    }, [onEdgesChange, edges]);

    // Handle deletion key (Backspace/Delete)
    const onNodesDelete = useCallback((deletedNodes: Node[]) => {
        deletedNodes.forEach(node => {
            removeStep(node.id);
        });
    }, [removeStep]);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onNodesDelete={onNodesDelete}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode={['Backspace', 'Delete']}
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
    );
}
