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
  orchestratorName: string;
  orchestratorDescription: string;
  viewport: { x: number; y: number; zoom: number };
  setOrchestratorMetadata: (name: string, description: string) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
}
  
const INITIAL_START_NODE: Node = {
  id: 'start',
  type: 'startNode',
  position: { x: 250, y: 0 },
  data: { label: 'Start' },
  deletable: false,
};

export const useDesignerStore = create<DesignerState>((set, get) => ({
  nodes: [INITIAL_START_NODE],
  edges: [],
  selectedNode: null,
  config: null,
  orchestratorName: '',
  orchestratorDescription: '',
  viewport: { x: 0, y: 0, zoom: 1 },

  setOrchestratorMetadata: (name: string, description: string) => {
    set({ orchestratorName: name, orchestratorDescription: description });
  },

  setViewport: (viewport) => {
    set({ viewport });
  },

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
      position: { x: 250, y: 150 + (get().nodes.length - 1) * 150 }, // Offset from start node
      data: {
        stepId: id,
        name: stepName, // A, B, C, etc.
        label: `New Step ${stepName}`,
        webhookUrl: '',
        webhookMethod: 'POST',
        authConfig: { type: 'none' },
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
    if (id === 'start') return; // Protect start node
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
    const stepNodes: Node[] = config.steps.map((step, index) => ({
      id: step.id,
      type: 'stepNode',
      position: step.position || { x: 250, y: 150 + index * 150 }, // Use saved position or default stack
      data: {
        stepId: step.id,
        name: step.name,
        label: step.label,
        // Legacy webhook-based fields
        webhookUrl: step.webhookUrl,
        webhookMethod: step.webhookMethod,
        authConfig: step.authConfig,
        timeout: step.timeout,
        retryConfig: step.retryConfig,
        n8nWorkflowId: step.n8nWorkflowId,
        // N-Stage Orchestrator fields
        stage_key: step.stage_key,
        task_type: step.task_type,
        prompt_template_id: step.prompt_template_id,
        cardinality: step.cardinality,
        ai_settings: step.ai_settings,
        // Pre/Post Process Hooks
        pre_process: step.pre_process,
        post_process: step.post_process,
        contract: step.contract,
      },
      deletable: true,
    }));

    // Reconstruct edges
    const edges: Edge[] = [];
    config.steps.forEach((step) => {
      // Config doesn't strictly store "start -> first step" connection, 
      // but we can infer or leave it disconnected.
      // For now, let's just load the steps and dependencies.
      step.dependsOn.forEach((depId) => {
        edges.push({
          id: `e_${depId}-${step.id}`,
          source: depId,
          target: step.id,
        });
      });
      
      // If a step has NO dependencies, we could optionally connect it to 'start'
      // to make the graph look connected, but strictly speaking 'dependsOn' is empty.
      // Let's connect roots to start for visual flow.
      if (step.dependsOn.length === 0) {
         edges.push({
            id: `e_start-${step.id}`,
            source: 'start',
            target: step.id,
            animated: true,
         });
      }
    });

    set({ 
        config, 
        nodes: [INITIAL_START_NODE, ...stepNodes], 
        edges,
        orchestratorName: config.name,
        orchestratorDescription: config.description,
        viewport: config.viewport || { x: 0, y: 0, zoom: 1 }
    });
  },

  reset: () => {
    set({
      nodes: [INITIAL_START_NODE],
      edges: [],
      selectedNode: null,
      config: null,
      orchestratorName: '',
      orchestratorDescription: '',
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  },
}));
