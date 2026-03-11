import { create } from "zustand";
import { persist } from "zustand/middleware";
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
} from "@xyflow/react";
import type { OrchestratorConfig, StepConfig } from "@/lib/types";
import { DEFAULT_STAGE_CONFIG } from "@/lib/constants/defaultStepConfig";

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
	duplicateStep: (id: string) => void;
	updateStepData: (id: string, data: Record<string, unknown>) => void;
	setSelectedNode: (node: Node | null) => void;
	loadConfig: (config: OrchestratorConfig) => void;
	replaceNodesWithSubOrch: (
		selectedIds: Set<string>,
		subOrchNode: Node,
		parentSteps: StepConfig[],
	) => void;
	duplicateOrchestrationToCanvas: (newName: string, suffix: string) => void;
	reset: () => void;
	orchestratorName: string;
	orchestratorDescription: string;
	viewport: { x: number; y: number; zoom: number };
	setOrchestratorMetadata: (name: string, description: string) => void;
	setViewport: (viewport: { x: number; y: number; zoom: number }) => void;

	// Input data state (transient, not persisted)
	inputData: {
		mode: "tsv" | "json";
		fileName: string | null;
		syllabusData: unknown[]; // TSV mode (SyllabusRow[])
		jsonData: unknown | null; // JSON mode
		jsonAnalysis: unknown | null; // JSON analysis result
		fieldSelection: { shared: string[]; perTask: string[] };
		fieldMapping: Record<string, string>;
		selectedTaskIndices: number[];
		execution_delay_seconds: number;
	};
	setInputData: (data: Partial<DesignerState["inputData"]>) => void;
	clearInputData: () => void;
	isDirty: () => boolean;
}

const INITIAL_START_NODE: Node = {
	id: "start",
	type: "startNode",
	position: { x: 250, y: 0 },
	data: { label: "Start" },
	deletable: false,
};

export const useDesignerStore = create<DesignerState>()(
	persist(
		(set, get) => ({
			nodes: [INITIAL_START_NODE],
			edges: [],
			selectedNode: null,
			config: null,
			inputData: {
				mode: "tsv",
				fileName: null,
				syllabusData: [],
				jsonData: null,
				jsonAnalysis: null,
				fieldSelection: { shared: [], perTask: [] },
				fieldMapping: {},
				selectedTaskIndices: [],
				execution_delay_seconds: 0,
			},
			orchestratorName: "",
			orchestratorDescription: "",
			viewport: { x: 0, y: 0, zoom: 1 },

			setInputData: (data) => {
				set((state) => ({
					inputData: { ...state.inputData, ...data },
				}));
			},

			clearInputData: () => {
				set({
					inputData: {
						mode: "tsv",
						fileName: null,
						syllabusData: [],
						jsonData: null,
						jsonAnalysis: null,
						fieldSelection: { shared: [], perTask: [] },
						fieldMapping: {},
						selectedTaskIndices: [],
						execution_delay_seconds: 0,
					},
				});
			},

			isDirty: () => {
				const {
					nodes,
					edges,
					config,
					orchestratorName,
					orchestratorDescription,
				} = get();

				// Case 1: New orchestration with significant content
				if (!config?.id) {
					return nodes.length > 1 || edges.length > 0;
				}

				// Case 2: Compare with saved config
				// Simple heuristic: check counts and basic metadata first
				if (nodes.length !== config.steps.length + 1) return true; // +1 for start node
				if (orchestratorName !== config.name) return true;
				if (orchestratorDescription !== (config.description || ""))
					return true;

				// Deep comparison of steps (simplified for performance)
				const currentSteps = nodes.filter((n) => n.type === "stepNode");
				const savedSteps = config.steps;

				// Check if any node position or data changed
				for (const node of currentSteps) {
					const saved = savedSteps.find((s) => s.id === node.id);
					if (!saved) return true;
					// Basic check: label or stage_key or task_type
					if (node.data.label !== saved.label) return true;
					if (node.data.stage_key !== saved.stage_key) return true;
					if (node.data.task_type !== saved.task_type) return true;
				}

				return false;
			},

			setOrchestratorMetadata: (name: string, description: string) => {
				set({
					orchestratorName: name,
					orchestratorDescription: description,
				});
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
				const nodes = get().nodes;
				const stepCount = nodes.filter(
					(n) => n.type === "stepNode",
				).length;

				const name =
					stepName.trim() ||
					String.fromCharCode(65 + (stepCount % 26));

				// If stepName was empty, label is "Stage A", otherwise it uses the name provided
				const label = stepName.trim() ? stepName : `Stage ${name}`;
				const stage_key = `stage_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

				// Deep clone the default config to prevent reference issues
				const baseConfig = JSON.parse(
					JSON.stringify(DEFAULT_STAGE_CONFIG),
				);

				// Override with step-specific details
				const newNode: Node = {
					id,
					type: "stepNode",
					position: {
						x: 250,
						y: 150 + (get().nodes.length - 1) * 150,
					}, // Offset from start node
					data: {
						...baseConfig,
						stepId: id,
						name: name,
						label: label,
						stage_key: stage_key,
					},
				};

				set({
					nodes: [...get().nodes, newNode],
					selectedNode: newNode,
				});
			},

			removeStep: (id: string) => {
				if (id === "start") return; // Protect start node
				set({
					nodes: get().nodes.filter((n) => n.id !== id),
					edges: get().edges.filter(
						(e) => e.source !== id && e.target !== id,
					),
					selectedNode:
						get().selectedNode?.id === id
							? null
							: get().selectedNode,
				});
			},

			duplicateStep: (id: string) => {
				const nodes = get().nodes;
				const nodeToDuplicate = nodes.find((n) => n.id === id);
				if (!nodeToDuplicate || nodeToDuplicate.type === "startNode")
					return;

				// Create a new unique ID
				const newId = `step_${Date.now()}`;

				// Deep clone the node data so it's completely independent
				const clonedData = JSON.parse(
					JSON.stringify(nodeToDuplicate.data),
				);

				// Update IDs and names in the cloned data
				clonedData.stepId = newId;

				// Find a unique name
				let baseName = clonedData.name || "Copy";
				// Remove " Copy n" if it already exists
				baseName = baseName
					.replace(/ Copy \d+$/, "")
					.replace(/ Copy$/, "");

				let newName = `${baseName} Copy`;
				let counter = 1;
				while (nodes.some((n) => n.data.name === newName)) {
					counter++;
					newName = `${baseName} Copy ${counter}`;
				}
				clonedData.name = newName;
				clonedData.label = `${clonedData.label} (Copy)`;

				// Calculate a slight offset for position
				const offset = 50;

				const newNode: Node = {
					id: newId,
					type: nodeToDuplicate.type,
					position: {
						x: nodeToDuplicate.position.x + offset,
						y: nodeToDuplicate.position.y + offset,
					},
					data: clonedData,
					deletable: true,
				};

				set({
					nodes: [...nodes, newNode],
					// Optionally select the newly created node:
					selectedNode: newNode,
				});
			},

			updateStepData: (id: string, data: Record<string, unknown>) => {
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
					const updatedNode = get().nodes.find((n) => n.id === id);
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
					type: "stepNode",
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
						custom_component_id: step.custom_component_id,
					},
					deletable: true,
				}));

				// Reconstruct edges
				const edges: Edge[] = [];
				config.steps.forEach((step) => {
					// Create edges based on dependencies
					const dependsOn = step.dependsOn || []; // Ensure dependsOn exists
					dependsOn.forEach((depId) => {
						edges.push({
							id: `e_${depId}-${step.id}`,
							source: depId,
							target: step.id,
						});
					});

					// If a step has NO dependencies, we could optionally connect it to 'start'
					// to make the graph look connected, but strictly speaking 'dependsOn' is empty.
					// Let's connect roots to start for visual flow.
					if (dependsOn.length === 0) { // Use the checked dependsOn
						edges.push({
							id: `e_start-${step.id}`,
							source: "start",
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
					viewport: config.viewport || { x: 0, y: 0, zoom: 1 },
					inputData: config.input_mapping
						? {
								...get().inputData,
								...(config.input_mapping as unknown as Record<
									string,
									unknown
								>),
								// jsonData and syllabusData are not persisted in DB,
								// but the mapping configuration is.
								jsonData: null,
								syllabusData: [],
								jsonAnalysis: null,
								execution_delay_seconds:
									config.execution_delay_seconds || 0,
							}
						: get().inputData,
				});
			},

			reset: () => {
				get().clearInputData();
				set({
					nodes: [INITIAL_START_NODE],
					edges: [],
					selectedNode: null,
					config: null,
					orchestratorName: "",
					orchestratorDescription: "",
					viewport: { x: 0, y: 0, zoom: 1 },
				});
			},
			replaceNodesWithSubOrch: (
				selectedIds: Set<string>,
				subOrchNode: Node,
				parentSteps: StepConfig[],
			) => {
				set((state) => {
					// 1. Filter out removed nodes
					const remainingNodes = state.nodes.filter(
						(n) => !selectedIds.has(n.id),
					);

					// 2. Update remaining nodes' data (for new dependsOn)
					const updatedNodes = remainingNodes.map((n) => {
						const matchingStep = parentSteps.find(
							(s) => s.id === n.id,
						);
						if (matchingStep) {
							return {
								...n,
								data: { ...matchingStep, stepId: n.id },
							};
						}
						return n;
					});

					// 3. Rebuild edges based on parentSteps' dependsOn
					const finalNodes = [...updatedNodes, subOrchNode];
					const newEdges: Edge[] = [];

					// We can iterate through all steps in parentSteps + subOrchNode.data
					const allNewSteps = [
						...parentSteps,
						subOrchNode.data as unknown as StepConfig,
					];

					allNewSteps.forEach((step) => {
						const targetId = step.id;
						(step.dependsOn || []).forEach((sourceId) => {
							newEdges.push({
								id: `e_${sourceId}-${targetId}`,
								source: sourceId,
								target: targetId,
								animated: true,
							});
						});
					});

					// Handle start node edges: any node with 0 dependsOn (that isn't start itself) should connect from start
					allNewSteps.forEach((step) => {
						if (
							(!step.dependsOn || step.dependsOn.length === 0) &&
							step.id !== "start"
						) {
							newEdges.push({
								id: `e_start-${step.id}`,
								source: "start",
								target: step.id,
								animated: true,
							});
						}
					});

					return {
						nodes: finalNodes,
						edges: newEdges,
						selectedNode: null,
					};
				});
			},
			duplicateOrchestrationToCanvas: (
				newName: string,
				suffix: string,
			) => {
				const state = get();
				const now = Date.now();

				// 1. Map old IDs to new IDs to rebuild edges correctly
				const idMap: Record<string, string> = {};
				state.nodes.forEach((node) => {
					if (node.id === "start") {
						idMap[node.id] = "start";
					} else {
						idMap[node.id] =
							`step_${now}_${Math.random().toString(36).substring(2, 9)}`;
					}
				});

				// 2. Clone and update nodes
				const clonedNodes: Node[] = state.nodes.map((node) => {
					const newId = idMap[node.id];
					const clonedData = JSON.parse(JSON.stringify(node.data));

					if (node.type === "stepNode") {
						// Update stage_key if it exists
						if (clonedData.stage_key) {
							clonedData.stage_key = `${clonedData.stage_key}${suffix}`;
						}
						clonedData.stepId = newId;
					}

					return {
						...node,
						id: newId,
						data: clonedData,
						selected: false,
					};
				});

				// 3. Clone and update edges
				const clonedEdges: Edge[] = state.edges.map((edge) => ({
					...edge,
					id: `e_${idMap[edge.source]}-${idMap[edge.target]}`,
					source: idMap[edge.source],
					target: idMap[edge.target],
				}));

				// 4. Reset state with new cloned data and clear config ID
				set({
					nodes: clonedNodes,
					edges: clonedEdges,
					selectedNode: null,
					config: null, // Clear active config to make it a "New" unsaved orchestration
					orchestratorName: newName,
				});
			},
		}),
		{
			name: "designer-storage",
			partialize: (state) => ({
				nodes: state.nodes,
				edges: state.edges,
				config: state.config,
				orchestratorName: state.orchestratorName,
				orchestratorDescription: state.orchestratorDescription,
				viewport: state.viewport,
			}),
		},
	),
);
