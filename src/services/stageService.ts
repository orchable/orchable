import { storage, getAssetStorageAdapter } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type {
	AISettings,
	PreProcessConfig,
	PostProcessConfig,
	StageContract,
	ExportConfig,
	OrchestratorConfig,
	StepConfig,
} from "@/lib/types";
import { configService } from "@/services/configService";
import {
	mapContractToInputSchema,
	mapContractToOutputSchema,
} from "@/lib/schemaUtils";
import { DEFAULT_PROMPT_TEMPLATE } from "@/lib/constants/defaultStepConfig";

const MAX_NESTING_DEPTH = 5;

// Types for prompt template sync
interface StageData {
	id: string;
	name: string;
	stage_key: string;
	label: string;
	task_type?: string;
	prompt_template_id?: string;
	ai_settings?: AISettings;
	cardinality?: string;
	split_path?: string;
	split_mode?: "per_item" | "per_batch";
	output_mapping?: string;
	batch_grouping?: "global" | "isolated";
	merge_path?: string;
	dependsOn: string[];
	timeout?: number;
	retryConfig?: { maxRetries: number; retryDelay: number };
	position?: { x: number; y: number };
	// Pre/Post process hooks
	pre_process?: PreProcessConfig;
	post_process?: PostProcessConfig;
	contract?: StageContract;
	requires_approval?: boolean;
	return_along_with?: string[];
	custom_component_id?: string;
	sub_orchestration_id?: string;
	sub_orchestration_output_path?: string;
	export_config?: ExportConfig;
}

export interface CustomComponent {
	id: string;
	name: string;
	description?: string;
	code: string;
	mock_data?: Record<string, unknown>;
	is_public?: boolean;
	hub_asset_id?: string;
	created_at?: string;
	updated_at?: string;
	created_by?: string;
}

export interface PromptTemplateRecord {
	id: string;
	name: string;
	description?: string;
	template: string;
	version: number;
	is_active: boolean;
	is_public?: boolean;
	hub_asset_id?: string;
	default_ai_settings?: Record<string, unknown>;
	next_stage_template_ids?: string[] | null;
	organization_code?: string;
	input_schema?: Record<string, unknown>;
	output_schema?: Record<string, unknown>;
	stage_config?: Record<string, unknown>;
	requires_approval?: boolean;
	custom_component_id?: string;
	custom_component?: CustomComponent; // Joined data
	view_config?: {
		hiddenFields?: string[];
		customComponent?: string; // Legacy/fallback
		[key: string]: unknown;
	};
	stage_key?: string;
	created_by?: string;
}

/**
 * Topological sort of stages based on their dependencies (edges)
 * Returns stages in execution order (parents before children)
 */
export function topologicalSortStages(
	stages: StageData[],
	edges: Array<{ source: string; target: string }>,
): StageData[] {
	const stageMap = new Map(stages.map((s) => [s.id, s]));
	const idByKey = new Map(stages.map((s) => [s.stage_key || s.id, s.id]));
	const inDegree = new Map<string, number>();
	const adjList = new Map<string, string[]>();

	// Initialize
	stages.forEach((s) => {
		inDegree.set(s.id, 0);
		adjList.set(s.id, []);
	});

	// Build graph from explicit edges (if any)
	edges.forEach((edge) => {
		if (edge.source === "start") return;
		if (!stageMap.has(edge.source) || !stageMap.has(edge.target)) return;

		adjList.get(edge.source)?.push(edge.target);
		inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
	});

	// Also build from dependsOn for robustness (especially after inline merge)
	stages.forEach((stage) => {
		stage.dependsOn?.forEach((dep) => {
			const sourceId = idByKey.get(dep);
			if (sourceId && sourceId !== stage.id) {
				// Check if this edge already exists to avoid double-counting inDegree
				const currentAdj = adjList.get(sourceId) || [];
				if (!currentAdj.includes(stage.id)) {
					adjList.get(sourceId)?.push(stage.id);
					inDegree.set(stage.id, (inDegree.get(stage.id) || 0) + 1);
				}
			}
		});
	});

	// Kahn's algorithm
	const queue: string[] = [];
	inDegree.forEach((deg, id) => {
		if (deg === 0) queue.push(id);
	});

	const sorted: StageData[] = [];
	while (queue.length > 0) {
		const current = queue.shift()!;
		const stage = stageMap.get(current);
		if (stage) sorted.push(stage);

		adjList.get(current)?.forEach((neighbor) => {
			const newDegree = (inDegree.get(neighbor) || 1) - 1;
			inDegree.set(neighbor, newDegree);
			if (newDegree === 0) queue.push(neighbor);
		});
	}

	return sorted;
}

/**
 * Get the next stage(s) for a given stage based on edges
 */
function getNextStages(
	stageId: string,
	edges: Array<{ source: string; target: string }>,
	stageMap: Map<string, StageData>,
): StageData[] {
	return edges
		.filter((e) => e.source === stageId && stageMap.has(e.target))
		.map((e) => stageMap.get(e.target)!)
		.filter(Boolean);
}

/**
 * Sync orchestrator stages to prompt_templates table
 * Creates orchestrator-specific templates with next_stage_template_ids
 * Uses 2-pass approach to avoid FK constraint violations
 */
export async function syncStagesToPromptTemplates(
	orchestratorId: string,
	orchestratorName: string,
	stages: StageData[],
	edges: Array<{ source: string; target: string }>,
): Promise<Map<string, string>> {
	// 1. Resolve nested orchestrations via Inline Merge
	const config: OrchestratorConfig = {
		id: orchestratorId,
		name: orchestratorName,
		steps: stages as unknown as StepConfig[],
	} as OrchestratorConfig;

	const { steps: resolvedSteps } = await resolveInlineMerge(config);
	const resolvedStages = resolvedSteps as unknown as StageData[];

	const stageMap = new Map(resolvedStages.map((s) => [s.id, s]));
	const sortedStages = topologicalSortStages(resolvedStages, edges);

	// Map: stageId -> generated prompt_template_id
	const templateIdMap = new Map<string, string>();
	const recordsToUpsert: PromptTemplateRecord[] = [];

	// PASS 1: Generate records for all stages
	for (const stage of sortedStages) {
		// Fallback or append stage.id so duplicated stages with the same stage_key don't cause a PK conflict
		const uniqueSuffix = stage.stage_key
			? `${stage.stage_key}_${stage.id}`
			: stage.id;
		const templateId = `${orchestratorId}_${uniqueSuffix}`;
		templateIdMap.set(stage.id, templateId);

		// First, check if there's a source template referenced
		let templateContent = DEFAULT_PROMPT_TEMPLATE;
		const assetStorage = await getAssetStorageAdapter();
		const existingSnapshot = await assetStorage.getTemplate(templateId);

		if (stage.prompt_template_id) {
			// Fetch latest source template content from Supabase
			const { data: sourceTemplate, error } = await supabase
				.from("prompt_templates")
				.select("template")
				.eq("id", stage.prompt_template_id)
				.single();

			if (!error && sourceTemplate?.template) {
				templateContent = sourceTemplate.template;
			} else {
				// Fallback to local storage (crucial for Free Tier users who just saved it)
				const localTemplate = await assetStorage.getTemplate(
					stage.prompt_template_id,
				);
				if (localTemplate?.template) {
					templateContent = localTemplate.template;
				} else if (existingSnapshot?.template) {
					// If the source is missing entirely, fallback to the snapshot if it exists
					templateContent = existingSnapshot.template;
				}
			}
		} else if (existingSnapshot?.template) {
			// No source referenced, preserve the existing snapshot content
			templateContent = existingSnapshot.template;
		}
		// Build Input/Output schemas from contract
		const inputSchema = mapContractToInputSchema(stage.contract);
		const outputSchema = mapContractToOutputSchema(stage.contract);
		const hasStructuredOutput = outputSchema && outputSchema.type;

		// Build AI settings (Nested API format)
		const defaultAiSettings = stage.ai_settings
			? {
					model_id: stage.ai_settings.model_id,
					generate_content_api:
						stage.ai_settings.generate_content_api ||
						"generateContent",
					generationConfig: {
						temperature:
							stage.ai_settings.generationConfig.temperature,
						topP: stage.ai_settings.generationConfig.topP,
						topK: stage.ai_settings.generationConfig.topK,
						maxOutputTokens:
							stage.ai_settings.generationConfig.maxOutputTokens,
						// Structured Output: inject schema so Gemini returns JSON directly
						...(hasStructuredOutput
							? {
									responseMimeType: "application/json",
									responseJsonSchema: outputSchema,
								}
							: {}),
					},
				}
			: {
					model_id: "gemini-2.0-flash",
					generate_content_api: "generateContent",
					generationConfig: { temperature: 0.7 },
				};

		// Build stage-specific config
		const stageConfig = {
			cardinality:
				stage.cardinality === "many_to_one" ||
				stage.cardinality === "N:1"
					? "many_to_one"
					: stage.cardinality === "one_to_many" ||
						  stage.cardinality === "1:N"
						? "one_to_many"
						: "one_to_one",
			split_path: stage.split_path,
			split_mode: stage.split_mode,
			batch_grouping: stage.batch_grouping || "global",
			merge_path: stage.merge_path || "output_data",
			output_mapping: stage.output_mapping,
			pre_process: stage.pre_process,
			post_process: stage.post_process,
			timeout: stage.timeout,
			retryConfig: stage.retryConfig,
			return_along_with: stage.return_along_with || [],
			requires_approval: stage.requires_approval || false,
			custom_component_id: stage.custom_component_id,
			export_config: stage.export_config,
			dependsOn:
				stage.dependsOn?.map(
					(id) => stageMap.get(id)?.stage_key || id,
				) || [],
		};

		const record: PromptTemplateRecord = {
			id: templateId,
			name: `[${orchestratorName}] ${stage.label || stage.stage_key}`,
			description: `Stage: ${stage.stage_key} | Task: ${stage.task_type || "generic"}`,
			template: templateContent,
			version: 1,
			is_active: true,
			default_ai_settings: defaultAiSettings,
			input_schema: inputSchema,
			output_schema: outputSchema as unknown as Record<string, unknown>,
			stage_config: stageConfig,
			requires_approval: stage.requires_approval || false,
			organization_code: orchestratorId,
			stage_key: stage.stage_key, // Sync for orchestration routing
			custom_component_id: stage.custom_component_id,
		};

		recordsToUpsert.push(record);
	}

	// 2. Perform Bulk Upsert
	const assetStorage = await getAssetStorageAdapter();
	for (const record of recordsToUpsert) {
		await assetStorage.upsertTemplate(record);
	}

	// PASS 2: Update next_stage_template_ids now that all templates exist
	for (const stage of sortedStages) {
		const templateId = templateIdMap.get(stage.id)!;

		// Find next stage(s)
		const nextStages = getNextStages(stage.id, edges, stageMap);
		const nextTemplateIds = nextStages
			.map((ns) => templateIdMap.get(ns.id))
			.filter(Boolean) as string[];
		const nextTemplateId =
			nextTemplateIds.length > 0 ? nextTemplateIds[0] : null;

		if (nextTemplateIds.length > 0) {
			const existing = await assetStorage.getTemplate(templateId);
			if (existing) {
				await assetStorage.upsertTemplate({
					...existing,
					next_stage_template_ids: nextTemplateIds,
				});
			}
		}
	}

	return templateIdMap;
}

/**
 * Get all templates for an orchestrator
 */
export async function getOrchestratorTemplates(orchestratorId: string) {
	const assetStorage = await getAssetStorageAdapter();
	const allTemplates = await assetStorage.listTemplates();
	return allTemplates.filter((t) => t.organization_code === orchestratorId);
}

/**
 * Delete all templates for an orchestrator
 */
export async function deleteOrchestratorTemplates(orchestratorId: string) {
	const assetStorage = await getAssetStorageAdapter();
	const allTemplates = await assetStorage.listTemplates();
	const toDelete = allTemplates.filter(
		(t) => t.organization_code === orchestratorId,
	);
	for (const t of toDelete) {
		// Note: No batch delete in IStorageAdapter yet, so we delete one by one
		// This is sub-optimal but works for a few templates per config
		// If we had deleteTemplate we'd use it here.
		// For now, partial delete is not implemented in StorageAdapter interface.
	}
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(
	id: string,
): Promise<PromptTemplateRecord | null> {
	const assetStorage = await getAssetStorageAdapter();
	const data = await assetStorage.getTemplate(id);
	return data as PromptTemplateRecord;
}

/**
 * Get all custom components from the registry
 */
export async function getCustomComponents(): Promise<CustomComponent[]> {
	const assetStorage = await getAssetStorageAdapter();
	return assetStorage.listComponents();
}

/**
 * Get a single custom component by ID
 */
export async function getCustomComponentById(
	id: string,
): Promise<CustomComponent | null> {
	const assetStorage = await getAssetStorageAdapter();
	return assetStorage.getComponent(id);
}

/**
 * Create a new custom component in the registry
 */
export async function createCustomComponent(
	component: Partial<CustomComponent>,
): Promise<CustomComponent> {
	// Need to handle partial here or add createComponent to Adapter
	const newComponent: CustomComponent = {
		id: crypto.randomUUID(),
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		is_public: false,
		name: component.name || "Untitled Component",
		code: component.code || "",
		...component,
	} as CustomComponent;
	const assetStorage = await getAssetStorageAdapter();
	await assetStorage.upsertComponent(newComponent);
	return newComponent;
}

/**
 * Update an existing custom component
 */
export async function updateCustomComponent(
	id: string,
	updates: Partial<CustomComponent>,
): Promise<void> {
	const assetStorage = await getAssetStorageAdapter();
	const existing = await assetStorage.getComponent(id);
	if (!existing) throw new Error("Component not found");
	await assetStorage.upsertComponent({
		...existing,
		...updates,
		updated_at: new Date().toISOString(),
	});
}

/**
 * Delete a custom component
 */
export async function deleteCustomComponent(id: string): Promise<void> {
	const assetStorage = await getAssetStorageAdapter();
	await assetStorage.deleteComponent(id);
}

/**
 * Link a prompt template to a custom component from the registry
 */
export async function linkTemplateToComponent(
	templateId: string,
	componentId: string | null,
): Promise<void> {
	const assetStorage = await getAssetStorageAdapter();
	const template = await assetStorage.getTemplate(templateId);
	if (!template) throw new Error("Template not found");
	await assetStorage.upsertTemplate({
		...template,
		custom_component_id: componentId || undefined,
	});
}

/**
 * Update the view_config of a prompt template
 */
export async function updateTemplateViewConfig(
	id: string,
	viewConfig: Record<string, unknown>,
) {
	const assetStorage = await getAssetStorageAdapter();
	const template = await assetStorage.getTemplate(id);
	if (!template) throw new Error("Template not found");
	await assetStorage.upsertTemplate({
		...template,
		view_config: viewConfig,
	});
}

/**
 * Update the custom component code of a prompt template's view_config
 */
export async function updateTemplateCustomComponent(id: string, code: string) {
	const assetStorage = await getAssetStorageAdapter();
	const template = await assetStorage.getTemplate(id);
	if (!template) throw new Error("Template not found");
	const currentViewConfig = template.view_config || {};
	await assetStorage.upsertTemplate({
		...template,
		view_config: {
			...currentViewConfig,
			customComponent: code,
		},
	});
}

/**
 * Detect circular dependencies in nested orchestrations
 */
export async function detectCircularDependency(
	configId: string,
	path: Set<string> = new Set(),
): Promise<boolean> {
	if (path.has(configId)) return true;
	path.add(configId);

	try {
		const config = await configService.getConfig(configId);
		for (const step of config.steps) {
			if (
				step.task_type === "sub_orchestration" &&
				step.sub_orchestration_id
			) {
				if (
					await detectCircularDependency(
						step.sub_orchestration_id,
						new Set(path),
					)
				) {
					return true;
				}
			}
		}
	} catch (e) {
		console.error("Lỗi khi kiểm tra dependency cho config:", configId, e);
	}

	return false;
}

/**
 * Resolve a nested orchestration by flattening (inline merge) its stages
 */
export async function resolveInlineMerge(
	config: OrchestratorConfig,
	depth = 0,
): Promise<{ steps: StepConfig[]; edges: any[] }> {
	if (depth > MAX_NESTING_DEPTH) {
		console.warn("Độ sâu lồng nhau vượt quá giới hạn", MAX_NESTING_DEPTH);
		return { steps: config.steps, edges: [] };
	}

	// Deep clone steps to avoid mutating the original config object
	const steps = JSON.parse(JSON.stringify(config.steps)) as StepConfig[];
	const resolvedSteps: StepConfig[] = [];

	for (const step of steps) {
		if (
			step.task_type === "sub_orchestration" &&
			step.sub_orchestration_id
		) {
			try {
				const subConfig = await configService.getConfig(
					step.sub_orchestration_id,
				);
				const { steps: subSteps } = await resolveInlineMerge(
					subConfig,
					depth + 1,
				);

				if (subSteps.length === 0) continue;

				// Prefix sub-stage keys to avoid collision: sub_{parentStageKey}__{childStageKey}
				const prefix = `sub_${step.stage_key || step.id}__`;
				const mappedSubSteps = subSteps.map((ss) => ({
					...ss,
					id: `${prefix}${ss.id}`,
					stage_key: ss.stage_key
						? `${prefix}${ss.stage_key}`
						: undefined,
					dependsOn: (ss.dependsOn || []).map((d) => `${prefix}${d}`),
				}));

				// The first stages of sub-orch (those with no internal dependencies)
				// should depend on the parent stage's dependencies.
				const internalIds = new Set(subSteps.map((s) => s.id));
				const internalKeys = new Set(
					subSteps.map((s) => s.stage_key).filter(Boolean),
				);

				const firstStages = mappedSubSteps.filter((ss) => {
					// Check if original dependsOn contained any internal Ids or Keys
					const originalStep = subSteps.find(
						(os) => `${prefix}${os.id}` === ss.id,
					);
					if (!originalStep) return true;
					return !originalStep.dependsOn?.some(
						(d) => internalIds.has(d) || internalKeys.has(d),
					);
				});

				for (const fs of firstStages) {
					fs.dependsOn = [...(step.dependsOn || [])];
				}

				// Find "last" stages of the sub-orch to bridge back to the parent pipeline
				const dependentIdsOrKeys = new Set(
					mappedSubSteps.flatMap((ss) => ss.dependsOn || []),
				);
				const lastStages = mappedSubSteps.filter(
					(ss) =>
						!dependentIdsOrKeys.has(ss.id) &&
						(!ss.stage_key ||
							!dependentIdsOrKeys.has(ss.stage_key)),
				);
				const lastStageIdentifiers = lastStages.map(
					(ss) => ss.stage_key || ss.id,
				);

				// Update subsequent stages in parent orch that depended on this sub-orch stage
				for (const otherStep of steps) {
					if (
						otherStep.dependsOn?.includes(step.stage_key || step.id)
					) {
						otherStep.dependsOn = otherStep.dependsOn.filter(
							(d) => d !== (step.stage_key || step.id),
						);
						otherStep.dependsOn.push(...lastStageIdentifiers);
					}
				}

				resolvedSteps.push(...mappedSubSteps);
			} catch (e) {
				console.error(
					"Lỗi khi resolve sub-orchestration:",
					step.sub_orchestration_id,
					e,
				);
				resolvedSteps.push(step);
			}
		} else {
			resolvedSteps.push(step);
		}
	}

	return { steps: resolvedSteps, edges: [] };
}

/**
 * Check if the selected nodes form a connected subgraph
 */
export function isConnectedSubgraph(
	selectedIds: Set<string>,
	edges: { source: string; target: string }[],
): boolean {
	if (selectedIds.size <= 1) return true;

	// Build adjacency list for selection
	const adj = new Map<string, string[]>();
	for (const id of selectedIds) adj.set(id, []);

	for (const e of edges) {
		if (selectedIds.has(e.source) && selectedIds.has(e.target)) {
			adj.get(e.source)!.push(e.target);
			adj.get(e.target)!.push(e.source); // undirected for connectivity
		}
	}

	// BFS from first node
	const firstNode = Array.from(selectedIds)[0];
	const visited = new Set<string>();
	const queue = [firstNode];

	while (queue.length > 0) {
		const curr = queue.shift()!;
		if (!curr || visited.has(curr)) continue;
		visited.add(curr);
		for (const neighbor of adj.get(curr) || []) {
			if (!visited.has(neighbor)) queue.push(neighbor);
		}
	}

	return visited.size === selectedIds.size;
}

/**
 * Perform a "Extract Sub-Orchestration" refactor.
 * Given a selection of nodes, creates a new Orchestration config and
 * returns mappings for the designer to update its canvas.
 */
export function extractSubOrchestration(
	selectedNodeIds: string[],
	allSteps: StepConfig[],
	allEdges: { source: string; target: string }[],
	newOrchConfig: {
		id: string;
		name: string;
		description?: string;
		stage_key: string;
	},
): {
	subOrch: OrchestratorConfig;
	parentSteps: StepConfig[];
	subOrchNode: StepConfig;
} {
	const selectedIds = new Set(selectedNodeIds);
	const selectedSteps = allSteps.filter((s) => selectedIds.has(s.id));

	// 1. Partition edges
	const internalEdges = allEdges.filter(
		(e) => selectedIds.has(e.source) && selectedIds.has(e.target),
	);
	const incomingEdges = allEdges.filter(
		(e) => !selectedIds.has(e.source) && selectedIds.has(e.target),
	);
	// const outgoingEdges = allEdges.filter(e => selectedIds.has(e.source) && !selectedIds.has(e.target));

	// 2. Build subOrch (Orch B)
	const subOrchSteps: StepConfig[] = selectedSteps.map((s) => {
		const originalDependsOn = s.dependsOn || [];
		// Only keep internal dependencies
		const internalDependsOn = originalDependsOn.filter((d) =>
			selectedIds.has(d),
		);
		return {
			...s,
			dependsOn: internalDependsOn,
		};
	});

	const subOrch: OrchestratorConfig = {
		id: newOrchConfig.id,
		name: newOrchConfig.name,
		description: newOrchConfig.description || "",
		steps: subOrchSteps,
	};

	// 3. Create sub-orch replacement node for Parent
	const subOrchNodeId = `step_${Date.now()}`;
	const subOrchNode: StepConfig = {
		id: subOrchNodeId,
		name: newOrchConfig.name,
		label: newOrchConfig.name,
		stage_key: newOrchConfig.stage_key,
		task_type: "sub_orchestration",
		sub_orchestration_id: subOrch.id,
		dependsOn: Array.from(
			new Set(incomingEdges.map((e) => e.source)),
		).filter((id) => id !== "start"),
		position: {
			// Basic heuristic: average center of selected nodes
			x:
				selectedSteps.reduce(
					(acc, s) => acc + (s.position?.x || 0),
					0,
				) / selectedSteps.length,
			y:
				selectedSteps.reduce(
					(acc, s) => acc + (s.position?.y || 0),
					0,
				) / selectedSteps.length,
		},
	};

	// 4. Transform Parent Steps
	const parentSteps: StepConfig[] = allSteps
		.filter((s) => !selectedIds.has(s.id)) // Remove old steps
		.map((s) => {
			const deps = s.dependsOn || [];
			// If this step depended on any of the extracted stages, it now depends on the sub-orch node
			const hasExtractedDep = deps.some((d) => selectedIds.has(d));
			if (hasExtractedDep) {
				const filteredDeps = deps.filter((d) => !selectedIds.has(d));
				return {
					...s,
					dependsOn: Array.from(
						new Set([...filteredDeps, subOrchNodeId]),
					),
				};
			}
			return s;
		});

	// The subOrchNode is not yet inside parentSteps, it will be added by the caller/store action
	return {
		subOrch,
		parentSteps,
		subOrchNode,
	};
}
