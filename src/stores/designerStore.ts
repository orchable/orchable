import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import type { OrchestratorConfig } from '@/lib/types';

interface DesignerState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  config: OrchestratorConfig | null;

  // Actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addStep: (stepName: string) => void;
  removeStep: (id: string) => void;
  updateStepData: (id: string, data: any) => void;
  setSelectedNode: (node: Node | null) => void;
  loadConfig: (config: OrchestratorConfig) => void;
  reset: () => void;
}

export const useDesignerStore = create<DesignerState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  config: null,

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  addStep: (stepName: string) => {
    const id = `step_${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'stepNode',
      position: { x: 100, y: 100 + get().nodes.length * 100 },
      data: {
        stepId: id,
        name: stepName, // A, B, C, etc.
        label: `New Step ${stepName}`,
        webhookUrl: '',
        timeout: 300000,
        retryConfig: {
          maxRetries: 3,
          retryDelay: 5000,
        },
      },
    };

    set({
      nodes: [...get().nodes, newNode],
    });
  },

  removeStep: (id: string) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNode: get().selectedNode?.id === id ? null : get().selectedNode,
    });
  },

  updateStepData: (id: string, data: any) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, ...data },
          };
        }
        return node;
      }),
    });
    
    // Update selected node if needed
    if (get().selectedNode?.id === id) {
       const updatedNode = get().nodes.find(n => n.id === id);
       if (updatedNode) {
          set({ selectedNode: updatedNode });
       }
    }
  },

  setSelectedNode: (node: Node | null) => {
    set({ selectedNode: node });
  },

  loadConfig: (config: OrchestratorConfig) => {
    // Determine flow from dependencies
    const nodes: Node[] = config.steps.map((step, index) => ({
      id: step.id,
      type: 'stepNode',
      position: { x: 250, y: index * 150 }, // Simple layout, improvement: use dagre
      data: {
        stepId: step.id,
        name: step.name,
        label: step.label,
        webhookUrl: step.webhookUrl,
        timeout: step.timeout,
        retryConfig: step.retryConfig,
      },
    }));

    const edges: Edge[] = [];
    config.steps.forEach((step) => {
      step.dependsOn.forEach((depId) => {
        edges.push({
          id: `e_${depId}-${step.id}`,
          source: depId,
          target: step.id,
        });
      });
    });

    set({ config, nodes, edges });
  },

  reset: () => {
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
      config: null,
    });
  },
}));
