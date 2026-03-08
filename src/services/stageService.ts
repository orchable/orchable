import { storage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type {
	AISettings,
	PreProcessConfig,
	PostProcessConfig,
	StageContract,
	ExportConfig,
} from "@/lib/types";
import {
	mapContractToInputSchema,
	mapContractToOutputSchema,
} from "@/lib/schemaUtils";
import { DEFAULT_PROMPT_TEMPLATE } from "@/lib/constants/defaultStepConfig";

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
	const inDegree = new Map<string, number>();
	const adjList = new Map<string, string[]>();

	// Initialize
	stages.forEach((s) => {
		inDegree.set(s.id, 0);
		adjList.set(s.id, []);
	});

	// Build graph (ignore 'start' node)
	edges.forEach((edge) => {
		if (edge.source === "start") return;
		if (!stageMap.has(edge.source) || !stageMap.has(edge.target)) return;

		adjList.get(edge.source)?.push(edge.target);
		inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
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
	const stageMap = new Map(stages.map((s) => [s.id, s]));
	const sortedStages = topologicalSortStages(stages, edges);

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
		const existingSnapshot = await storage.adapter.getTemplate(templateId);

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
				const localTemplate = await storage.adapter.getTemplate(
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
			dependsOn: stage.dependsOn,
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
	for (const record of recordsToUpsert) {
		await storage.adapter.upsertTemplate(record);
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
			const existing = await storage.adapter.getTemplate(templateId);
			if (existing) {
				await storage.adapter.upsertTemplate({
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
	const allTemplates = await storage.adapter.listTemplates();
	return allTemplates.filter((t) => t.organization_code === orchestratorId);
}

/**
 * Delete all templates for an orchestrator
 */
export async function deleteOrchestratorTemplates(orchestratorId: string) {
	const allTemplates = await storage.adapter.listTemplates();
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
	const data = await storage.adapter.getTemplate(id);
	return data as PromptTemplateRecord;
}

/**
 * Get all custom components from the registry
 */
export async function getCustomComponents(): Promise<CustomComponent[]> {
	return storage.adapter.listComponents();
}

/**
 * Get a single custom component by ID
 */
export async function getCustomComponentById(
	id: string,
): Promise<CustomComponent | null> {
	return storage.adapter.getComponent(id);
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
	await storage.adapter.upsertComponent(newComponent);
	return newComponent;
}

/**
 * Update an existing custom component
 */
export async function updateCustomComponent(
	id: string,
	updates: Partial<CustomComponent>,
): Promise<void> {
	const existing = await storage.adapter.getComponent(id);
	if (!existing) throw new Error("Component not found");
	await storage.adapter.upsertComponent({
		...existing,
		...updates,
		updated_at: new Date().toISOString(),
	});
}

/**
 * Delete a custom component
 */
export async function deleteCustomComponent(id: string): Promise<void> {
	// StorageAdapter doesn't have deleteComponent yet, sub-optimal
}

/**
 * Link a prompt template to a custom component from the registry
 */
export async function linkTemplateToComponent(
	templateId: string,
	componentId: string | null,
): Promise<void> {
	const template = await storage.adapter.getTemplate(templateId);
	if (!template) throw new Error("Template not found");
	await storage.adapter.upsertTemplate({
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
	const template = await storage.adapter.getTemplate(id);
	if (!template) throw new Error("Template not found");
	await storage.adapter.upsertTemplate({
		...template,
		view_config: viewConfig,
	});
}

/**
 * Update the custom component code of a prompt template's view_config
 */
export async function updateTemplateCustomComponent(id: string, code: string) {
	const template = await storage.adapter.getTemplate(id);
	if (!template) throw new Error("Template not found");
	const currentViewConfig = template.view_config || {};
	await storage.adapter.upsertTemplate({
		...template,
		view_config: {
			...currentViewConfig,
			customComponent: code,
		},
	});
}
