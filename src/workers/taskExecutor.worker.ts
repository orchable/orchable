import { db } from "../lib/storage/IndexedDBAdapter";
import { TaskSummary as AiTask } from "../services/executionTrackingService";
import { PromptTemplate } from "../lib/storage/StorageAdapter";
import { StepConfig, AISettings, Execution } from "../lib/types";
import { KeyConfig } from "../services/keyPoolService";

// Types for the worker messages
export type WorkerMessage =
	| { type: "START"; configs: KeyConfig[]; tier: string }
	| { type: "STOP" };

export type WorkerStatus =
	| { type: "PROGRESS"; taskId: string; status: string; progress?: number }
	| { type: "ERROR"; taskId: string; error: string }
	| { type: "BATCH_COMPLETE"; batchId: string };

let isRunning = false;
let currentConfigs: KeyConfig[] = [];
let currentConfigIndex = 0;
let currentTier = "free";

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
	const { data } = e;

	if (data.type === "START") {
		isRunning = true;
		currentConfigs = data.configs || [];
		currentConfigIndex = 0;
		currentTier = data.tier || "free";
		console.log(
			`[Worker] Started processing loop (Tier: ${currentTier}, Keys: ${currentConfigs.length})`,
		);
		runLoop();
	} else if (data.type === "STOP") {
		isRunning = false;
		currentConfigs = [];
		console.log("[Worker] Stopped");
	}
};

async function runLoop() {
	while (isRunning) {
		try {
			// 1. Get next 'plan' task
			const task = await db.ai_tasks
				.where("status")
				.equals("plan")
				.first();

			if (!task) {
				// No more plan tasks, wait a bit
				await new Promise((r) => setTimeout(r, 2000));
				continue;
			}

			// --- USAGE ENFORCEMENT ---
			const canExecute = await checkUsage();
			if (!canExecute) {
				isRunning = false; // Stop the loop
				throw new Error(
					"Monthly task limit reached. Please upgrade to continue.",
				);
			}

			await processTask(task);
			// --- ATOMIC USAGE INCREMENT ---
			await db.incrementMetadata("usage");
		} catch (error) {
			console.error("[Worker] Loop error:", error);
			await new Promise((r) => setTimeout(r, 5000));
		}
	}
}

async function processTask(task: AiTask) {
	try {
		updateTaskStatus(task.id, "processing");

		// 2. Load template
		const template = await db.prompt_templates.get(
			task.prompt_template_id || "",
		);
		if (!template) {
			throw new Error(`Template not found: ${task.prompt_template_id}`);
		}

		const stageConfig = (template.stage_config ||
			{}) as Partial<StepConfig>;
		let currentInputData: Record<string, unknown> = {
			...(task.input_data as Record<string, unknown>),
		};

		// --- PRE-PROCESS WEBHOOK ---
		const preProcess = stageConfig.pre_process;
		if (preProcess?.enabled && preProcess?.webhook_url) {
			try {
				const preResult = await executeWebhook(
					{
						webhook_url: preProcess.webhook_url,
						webhook_method: preProcess.webhook_method,
						webhook_headers: preProcess.webhook_headers,
					},
					currentInputData,
				);
				const handling = preProcess.output_handling || "merge";

				if (handling === "replace") {
					currentInputData = preResult as Record<string, unknown>;
				} else if (handling === "nested") {
					const field = preProcess.nested_field_name || "pre_output";
					currentInputData[field] = preResult;
				} else {
					currentInputData = {
						...currentInputData,
						...(preResult as Record<string, unknown>),
					};
				}
			} catch (e) {
				const error = e as Error;
				if (preProcess.on_failure === "abort") throw error;
				console.warn(
					"[Worker] Pre-process failed, continuing:",
					error.message,
				);
			}
		}

		// 3. Build prompt
		// N8n uses: { ...task, ...task.extra, ...task.input_data }
		const extra = (task.extra || {}) as Record<string, unknown>;
		const enrichmentData = {
			...task,
			...extra,
			...currentInputData,
		};
		const prompt = buildPrompt(
			template.template,
			enrichmentData as Record<string, unknown>,
		);

		// 4. Call Gemini
		const taskAiSettings = (extra.ai_settings as Partial<AISettings>) || {};
		const templateSettings =
			(template.default_ai_settings as Partial<AISettings>) || {};
		const mergedAiSettings = {
			...templateSettings,
			...taskAiSettings,
		} as AISettings;

		let result = await callGemini(prompt, mergedAiSettings);

		// --- SUPPORT: return-along-with ---
		const returnAlongWith = (extra["return-along-with"] as string[]) || [];
		const finalResult = { ...(result as Record<string, unknown>) };

		if (Array.isArray(returnAlongWith) && returnAlongWith.length > 0) {
			for (const key of returnAlongWith) {
				if (
					Object.prototype.hasOwnProperty.call(currentInputData, key)
				) {
					finalResult[key] = currentInputData[key];
				}
			}
		}

		result = finalResult;

		// --- POST-PROCESS WEBHOOK & MERGING ---
		const postProcess = stageConfig.post_process;
		if (postProcess?.enabled) {
			// Handle Merge With Input type
			if (postProcess.type === "merge_with_input") {
				result = applyMergeWithInput(
					result as Record<string, unknown>,
					currentInputData,
					{
						merge_key: postProcess.merge_key,
						merge_array_path: postProcess.merge_array_path,
						input_array_path: postProcess.input_array_path,
					},
				);
			}

			// Execute Webhook if configured
			if (postProcess.webhook_url) {
				try {
					await executeWebhook(
						{
							webhook_url: postProcess.webhook_url,
							webhook_method: postProcess.webhook_method,
							webhook_headers: postProcess.webhook_headers,
						},
						{
							input: currentInputData,
							output: result,
						},
					);
				} catch (e) {
					const error = e as Error;
					if (postProcess.on_failure === "abort") throw error;
					console.warn(
						"[Worker] Post-process failed, continuing:",
						error.message,
					);
				}
			}
		}

		// 5. Save output
		await db.ai_tasks.update(task.id, {
			status: "completed",
			output_data: result,
			completed_at: new Date().toISOString(),
		});

		// 5.1 Update Batch Counters
		if (task.batch_id) {
			await updateBatchCounters(task.batch_id, true);
		}

		self.postMessage({
			type: "PROGRESS",
			taskId: task.id,
			status: "completed",
		});

		// 6. Handle next stages (Routing logic)
		await handleNextStages(task, result, template);
	} catch (error) {
		const err = error as Error;
		console.error(`[Worker] Failed task ${task.id}:`, err);
		await db.ai_tasks.update(task.id, {
			status: "failed",
			error_message: err.message,
		});

		// Update Batch Counters on failure
		if (task.batch_id) {
			await updateBatchCounters(task.batch_id, false);
		}
		self.postMessage({
			type: "ERROR",
			taskId: task.id,
			error: err.message,
		});
	}
}

function updateTaskStatus(id: string, status: string) {
	db.ai_tasks.update(id, { status, started_at: new Date().toISOString() });
	self.postMessage({ type: "PROGRESS", taskId: id, status });
}

function buildPrompt(template: string, data: Record<string, unknown>) {
	let prompt = template;

	// Support both %%key%% (n8n default) and {{key}} (legacy/codebase)
	const regex = /%%\s*([\w_]+)\s*%%|{{\s*([\w_]+)\s*}}/g;

	prompt = prompt.replace(regex, (match, key1, key2) => {
		const key = key1 || key2;
		if (Object.prototype.hasOwnProperty.call(data, key)) {
			const val = data[key];
			return typeof val === "object"
				? JSON.stringify(val, null, 2)
				: String(val);
		}
		return match;
	});

	// Also handle %%input_data%% macro if present (compatibility)
	if (prompt.includes("%%input_data%%")) {
		prompt = prompt.replace(
			"%%input_data%%",
			JSON.stringify(data, null, 2),
		);
	}

	return prompt;
}

async function callGemini(prompt: string, aiSettings: AISettings) {
	if (currentConfigs.length === 0)
		throw new Error("No API keys or pools available.");

	// Rotate keys/pools
	const currentConfig = currentConfigs[currentConfigIndex];
	currentConfigIndex = (currentConfigIndex + 1) % currentConfigs.length;

	if (currentConfig.type === "pool") {
		// Route to platform Key Pool via webhook
		return await executeWebhook(
			{
				webhook_url: currentConfig.webhookUrl,
				webhook_method: "POST",
			},
			{
				prompt,
				settings: aiSettings,
				tier: currentTier,
				// rotation manager will use poolType to filter internal keys
				pool: currentConfig.poolType,
			},
		);
	}

	// Direct BYOK call
	const model = aiSettings?.model_id || "gemini-2.0-flash";
	const apiKey = currentConfig.apiKey;
	const api = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

	const response = await fetch(api, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			contents: [{ parts: [{ text: prompt }] }],
			generationConfig: aiSettings?.generationConfig || {},
		}),
	});

	const json = await response.json();

	if (!response.ok) {
		throw new Error(json.error?.message || "Gemini API Error");
	}

	const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) throw new Error("Empty response from Gemini");

	try {
		if (
			aiSettings?.generationConfig?.responseMimeType ===
			"application/json"
		) {
			return JSON.parse(text);
		}
		return { result: text };
	} catch (e) {
		return { result: text, parse_error: true };
	}
}

async function executeWebhook(
	config: {
		webhook_url?: string;
		webhook_method?: string;
		webhook_headers?: Record<string, string>;
	},
	payload: unknown,
) {
	if (!config.webhook_url) return null;
	const response = await fetch(config.webhook_url, {
		method: config.webhook_method || "POST",
		headers: {
			"Content-Type": "application/json",
			...(config.webhook_headers || {}),
		},
		body: JSON.stringify(payload),
	});
	if (!response.ok) throw new Error(`Webhook failed: ${response.statusText}`);
	return await response.json();
}

function applyMergeWithInput(
	aiOutput: Record<string, unknown>,
	inputData: Record<string, unknown>,
	config: {
		merge_key?: string;
		merge_array_path?: string;
		input_array_path?: string;
	},
) {
	const mergeKey = config.merge_key || "code";
	const outputArrayPath = config.merge_array_path || "output_data";
	const inputArrayPath = config.input_array_path || "output_data";

	const fullArray =
		(getValueByPath(inputData, inputArrayPath) as unknown[]) || [];
	const corrections =
		(getValueByPath(aiOutput, outputArrayPath) as unknown[]) || [];

	const correctionMap = new Map();
	corrections.forEach((item: unknown) => {
		const key = (item as Record<string, unknown>)[mergeKey];
		if (key) correctionMap.set(key, item);
	});

	const merged = fullArray.map((original: unknown) => {
		const key = (original as Record<string, unknown>)[mergeKey];
		return correctionMap.has(key) ? correctionMap.get(key) : original;
	});

	return {
		...aiOutput,
		[outputArrayPath]: merged,
	};
}

async function handleNextStages(
	task: AiTask,
	result: unknown,
	template: PromptTemplate,
) {
	// 1. Get next stage configs (Load Batch creates it)
	const extra = (task.extra || {}) as Record<string, unknown>;
	let nextStageConfigs = (extra.next_stage_configs as any[]) || [];

	// Hydrate from template if not present (N8n behaviour)
	if (
		nextStageConfigs.length === 0 &&
		template.next_stage_template_ids &&
		template.next_stage_template_ids.length > 0
	) {
		const { db } = await import("../lib/storage/IndexedDBAdapter");
		nextStageConfigs = await Promise.all(
			template.next_stage_template_ids.map(async (id) => {
				const tpl = await db.prompt_templates.get(id);
				const sc = (tpl?.stage_config as any) || {};
				return {
					template_id: id,
					cardinality: sc.cardinality || "one_to_one",
					split_path: sc.split_path || null,
					split_mode: sc.split_mode || "per_item",
					merge_path: sc.merge_path || null,
					output_mapping: sc.output_mapping || "result",
					batch_grouping: sc.batch_grouping || null,
					requires_approval: sc.requires_approval || false,
				};
			}),
		);
	}

	if (nextStageConfigs.length === 0) return;

	const currentStageConfig =
		(extra.current_stage_config as any) || template.stage_config || {};
	const cardinality = currentStageConfig.cardinality || "one_to_one";

	if (cardinality === "many_to_one" || cardinality === "N:1") {
		// N:1 logic: Wait for siblings, then aggregate
		await handleManyToOne(task, result, template);
		return;
	}

	if (cardinality === "one_to_many" || cardinality === "1:N") {
		const splitMode = currentStageConfig.split_mode || "per_item";
		const splitPath: string =
			(currentStageConfig.split_path as string) || "result";
		// n8n treats "result" as identity path (the result itself, not result.result)
		let items: unknown;
		if (splitPath === "result" || splitPath === ".") {
			items = result;
		} else {
			const cleanPath = splitPath.startsWith("result.")
				? splitPath.slice(7)
				: splitPath;
			items = getValueByPath(result, cleanPath);
		}

		if (Array.isArray(items)) {
			if (splitMode === "per_item") {
				for (const nextConfig of nextStageConfigs) {
					const nextTemplateId = nextConfig.template_id;
					const nextTemplate =
						await db.prompt_templates.get(nextTemplateId);
					if (!nextTemplate) continue;

					const newTasks = items.map((item, idx) => ({
						id: crypto.randomUUID(),
						batch_id: task.batch_id,
						stage_key:
							nextTemplate.stage_key ||
							extractStageKey(nextTemplate.id),
						step_number: (task.step_number || 0) + 1,
						status: "plan",
						// 1:N branches carry the parent data down
						input_data: {
							...(task.input_data as Record<string, unknown>),
							item,
							_split_index: idx,
							_split_total: items.length,
						},
						parent_task_id: task.id,
						root_task_id: task.root_task_id || task.id,
						hierarchy_path: [
							...(task.hierarchy_path || []),
							task.id,
						],
						launch_id:
							task.launch_id ||
							((task as unknown as Record<string, unknown>)
								.launch_id as string),
						split_group_id:
							((task as unknown as Record<string, unknown>)
								.split_group_id as string) || task.id,
						task_type: extractStageKey(nextTemplate.id),
						prompt_template_id: nextTemplate.id,
						created_at: new Date().toISOString(),
						sequence: idx + 1,
						extra: {
							current_stage_config: {
								template_id: nextTemplateId,
								cardinality:
									nextConfig.cardinality || "one_to_one",
								split_path: nextConfig.split_path || null,
								split_mode: nextConfig.split_mode || "per_item",
								merge_path: nextConfig.merge_path || null,
								output_mapping:
									nextConfig.output_mapping || "result",
							},
							parent_stage_key: task.stage_key,
							parent_task_id: task.id,
						},
					}));
					await db.ai_tasks.bulkAdd(newTasks as unknown as AiTask[]);
				}
			} else if (splitMode === "per_batch") {
				const batchSize =
					(currentStageConfig.batch_size as number) || 10;
				for (const nextConfig of nextStageConfigs) {
					const nextTemplateId = nextConfig.template_id;
					const nextTemplate =
						await db.prompt_templates.get(nextTemplateId);
					if (!nextTemplate) continue;

					const newTasks = [];
					for (
						let i = 0, bIdx = 0;
						i < items.length;
						i += batchSize, bIdx++
					) {
						const batchItems = items.slice(i, i + batchSize);
						newTasks.push({
							id: crypto.randomUUID(),
							batch_id: task.batch_id,
							stage_key:
								nextTemplate.stage_key ||
								extractStageKey(nextTemplate.id),
							step_number: (task.step_number || 0) + 1,
							status: "plan",
							input_data: {
								...(task.input_data as Record<string, unknown>),
								items: batchItems,
								_batch_index: bIdx,
							},
							parent_task_id: task.id,
							root_task_id: task.root_task_id || task.id,
							hierarchy_path: [
								...(task.hierarchy_path || []),
								task.id,
							],
							launch_id:
								task.launch_id ||
								((task as unknown as Record<string, unknown>)
									.launch_id as string),
							split_group_id:
								((task as unknown as Record<string, unknown>)
									.split_group_id as string) || task.id,
							task_type: extractStageKey(nextTemplate.id),
							prompt_template_id: nextTemplate.id,
							created_at: new Date().toISOString(),
							sequence: bIdx + 1,
							extra: {
								current_stage_config: {
									template_id: nextTemplateId,
									cardinality:
										nextConfig.cardinality || "one_to_one",
									split_path: nextConfig.split_path || null,
									split_mode:
										nextConfig.split_mode || "per_item",
									merge_path: nextConfig.merge_path || null,
									output_mapping:
										nextConfig.output_mapping || "result",
								},
								parent_stage_key: task.stage_key,
								parent_task_id: task.id,
							},
						});
					}
					await db.ai_tasks.bulkAdd(newTasks as unknown as AiTask[]);
				}
			}
		}
	} else {
		// 1:1 workflow
		for (const nextConfig of nextStageConfigs) {
			const nextTemplateId = nextConfig.template_id;
			const nextTemplate = await db.prompt_templates.get(nextTemplateId);
			if (!nextTemplate) continue;

			const newTask = {
				id: crypto.randomUUID(),
				batch_id: task.batch_id,
				stage_key:
					nextTemplate.stage_key || extractStageKey(nextTemplate.id),
				step_number: (task.step_number || 0) + 1,
				status: "plan",
				// 1:1 replaces instead of merging inputs!
				input_data: {
					...(result as Record<string, unknown>),
					_parent_id: task.id,
				},
				parent_task_id: task.id,
				root_task_id: task.root_task_id || task.id,
				hierarchy_path: [...(task.hierarchy_path || []), task.id],
				launch_id:
					task.launch_id ||
					((task as unknown as Record<string, unknown>)
						.launch_id as string),
				split_group_id:
					((task as unknown as Record<string, unknown>)
						.split_group_id as string) || task.id,
				task_type: extractStageKey(nextTemplate.id),
				prompt_template_id: nextTemplate.id,
				created_at: new Date().toISOString(),
				extra: {
					current_stage_config: {
						template_id: nextTemplateId,
						cardinality: nextConfig.cardinality || "one_to_one",
						split_path: nextConfig.split_path || null,
						split_mode: nextConfig.split_mode || "per_item",
						output_mapping: nextConfig.output_mapping || "result",
					},
					parent_stage_key: task.stage_key,
					parent_task_id: task.id,
				},
			};

			await db.ai_tasks.add(newTask as unknown as AiTask);
		}
	}
}

async function handleManyToOne(
	task: AiTask,
	result: unknown,
	template: PromptTemplate,
) {
	const extra = (task.extra || {}) as Record<string, unknown>;
	const currentStageConfig =
		(extra.current_stage_config as any) || template.stage_config || {};
	const batchId = task.batch_id;
	const stageKey = task.stage_key;

	if (!batchId) return;

	// FIX: To safely aggregate across the entire batch, we must wait until NO other tasks in the batch
	// (that are before this M:1 stage) are still 'plan' or 'processing'.
	// Since stages execute sequentially or level-by-level, simpler check:
	// Are there ANY tasks in this batch still pending/processing EXCEPT for tasks OF this stage?
	// Actually, wait until ALL tasks in this stage are completed, AND there are no active parents.
	const allBatchTasks = await db.ai_tasks
		.where("batch_id")
		.equals(batchId)
		.toArray();

	// Identify if any task is still upstream and could generate more siblings.
	// For simplicity, we assume M:1 aggregates EVERYTHING from the batch for this stage.
	const isStreamFinished = allBatchTasks.every((t) => {
		// Ignore self
		if (t.id === task.id) return true;

		// If it's a future stage (step_number is greater), it's fine.
		// Wait, we don't know the exact order easily.
		// If ANY task in the batch is 'plan' or 'processing' (other than siblings of this exact stage), we might not be done.
		// Only block on UPSTREAM tasks (lower step_number) that could generate more siblings
		if (
			(t.status === "plan" ||
				t.status === "processing" ||
				t.status === "pending") &&
			t.stage_key !== stageKey &&
			(t.step_number || 0) < (task.step_number || 0)
		) {
			return false; // Still processing upstream tasks that could generate more siblings!
		}
		return true;
	});

	if (!isStreamFinished) return; // Wait for all other upstream tasks to finish

	// Check if all siblings in THIS stage are done
	const siblings = allBatchTasks.filter((t) => t.stage_key === stageKey);
	const allSiblingsDone = siblings.every(
		(s) =>
			s.status === "completed" ||
			s.status === "failed" ||
			s.id === task.id,
	);

	if (!allSiblingsDone) return; // Wait for other siblings

	// 2. Aggregate data
	const mergePath = (currentStageConfig.merge_path as string) || null;
	// Only aggregate outputs from COMPLETED siblings (exclude failed)
	const completedSiblings = siblings.filter(
		(s) => s.status === "completed" || s.id === task.id,
	);
	const allOutputs = completedSiblings
		.map((s) =>
			s.id === task.id
				? (result as Record<string, unknown>)
				: (s.output_data as Record<string, unknown>),
		)
		.filter(Boolean);

	let aggregatedData: unknown[] = [];
	if (mergePath) {
		for (const curr of allOutputs) {
			const val = (curr as Record<string, unknown>)?.[mergePath];
			if (Array.isArray(val)) {
				aggregatedData = aggregatedData.concat(val);
			} else if (val != null) {
				aggregatedData.push(val);
			}
		}
	} else {
		aggregatedData = allOutputs as unknown[];
	}

	const mergePathStr = mergePath as string | null;
	const mergedInputData = mergePathStr
		? { [mergePathStr]: aggregatedData }
		: { merged_data: aggregatedData };

	// 3. Create next tasks
	let nextStageConfigs = (extra.next_stage_configs as any[]) || [];
	if (nextStageConfigs.length === 0 && template.next_stage_template_ids) {
		nextStageConfigs = await Promise.all(
			template.next_stage_template_ids.map(async (id) => {
				const tpl = await db.prompt_templates.get(id);
				const sc = (tpl?.stage_config as any) || {};
				return {
					template_id: id,
					cardinality: sc.cardinality || "one_to_one",
					split_path: sc.split_path || null,
					split_mode: sc.split_mode || "per_item",
					merge_path: sc.merge_path || null,
					output_mapping: sc.output_mapping || "result",
					batch_grouping: sc.batch_grouping || null,
					requires_approval: sc.requires_approval || false,
				};
			}),
		);
	}

	for (const nextConfig of nextStageConfigs) {
		const nextTemplateId = nextConfig.template_id;
		const nextTemplate = await db.prompt_templates.get(nextTemplateId);
		if (!nextTemplateId) continue;

		await db.ai_tasks.add({
			id: crypto.randomUUID(),
			batch_id: batchId,
			stage_key:
				nextTemplate?.stage_key || extractStageKey(nextTemplateId),
			step_number: (task.step_number || 0) + 1,
			status: "plan",
			input_data: {
				...mergedInputData,
			},
			parent_task_id: task.id,
			root_task_id: task.root_task_id || task.id,
			hierarchy_path: [...(task.hierarchy_path || []), task.id],
			launch_id:
				task.launch_id ||
				((task as unknown as Record<string, unknown>)
					.launch_id as string),
			split_group_id:
				((task as unknown as Record<string, unknown>)
					.split_group_id as string) || task.id,
			task_type: extractStageKey(nextTemplateId),
			prompt_template_id: nextTemplateId,
			created_at: new Date().toISOString(),
			extra: {
				current_stage_config: {
					template_id: nextTemplateId,
					cardinality: nextConfig.cardinality || "one_to_one",
					split_path: nextConfig.split_path || null,
					split_mode: nextConfig.split_mode || "per_item",
					output_mapping: nextConfig.output_mapping || "result",
					merge_path: nextConfig.merge_path || null,
				},
				parent_stage_key: task.stage_key,
				parent_task_id: task.id,
				_merged_from_count: siblings.length,
			},
		} as unknown as AiTask);
	}
}

function getValueByPath(obj: unknown, path: string): unknown {
	if (!path || path === ".") return obj;
	return path
		.split(".")
		.reduce(
			(acc, part) =>
				(acc as Record<string, unknown>) &&
				(acc as Record<string, unknown>)[part],
			obj,
		);
}

function extractStageKey(templateId: string): string {
	if (!templateId) return "unknown_stage";

	// 1. Format: uuid_stageName_step_N
	const stepMatch = templateId.match(/^[0-9a-fA-F-]+_(.+)_step_\d+$/);
	if (stepMatch) return stepMatch[1];

	// 2. Format: uuid_stageName
	const match = templateId.match(/^[0-9a-fA-F-]+_(.+)$/);
	return match ? match[1] : templateId;
}

async function updateBatchCounters(batchId: string, success: boolean) {
	try {
		await db.transaction("rw", db.task_batches, async () => {
			const batch = await db.task_batches.get(batchId);
			if (!batch) return;

			const update: Partial<Execution> = {
				updated_at: new Date().toISOString(),
			};

			if (success) {
				update.completed_tasks = (batch.completed_tasks || 0) + 1;
				update.processing_tasks = Math.max(
					0,
					(batch.processing_tasks || 0) - 1,
				);
			} else {
				update.failed_tasks = (batch.failed_tasks || 0) + 1;
				update.processing_tasks = Math.max(
					0,
					(batch.processing_tasks || 0) - 1,
				);
			}

			// Check if all done
			const total = batch.total_tasks || 0;
			const done =
				(update.completed_tasks ?? batch.completed_tasks ?? 0) +
				(update.failed_tasks ?? batch.failed_tasks ?? 0);

			if (done >= total && total > 0) {
				update.status =
					(update.failed_tasks ?? batch.failed_tasks ?? 0) > 0
						? "failed"
						: "completed";
				update.completed_at = new Date().toISOString();
			}

			await db.task_batches.update(batchId, update);
		});
	} catch (err) {
		console.error("[Worker] Failed to update batch counters:", err);
	}
}

// --- USAGE HELPERS (Worker context) ---
async function checkUsage(): Promise<boolean> {
	if (currentTier === "premium") return true;

	const usage = await getUsage();
	const limit = 200; // Decision 6
	const grace = Math.floor(limit * 0.1);
	return usage.count < limit + grace;
}

async function getUsage() {
	const currentMonth = new Date().toISOString().slice(0, 7);
	const data = await db.metadata.get("usage");

	if (data && data.value.month === currentMonth) {
		return data.value;
	}

	const newData = { count: 0, month: currentMonth };
	await db.metadata.put({ key: "usage", value: newData });
	return newData;
}
