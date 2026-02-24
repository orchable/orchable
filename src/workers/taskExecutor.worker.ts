import { db } from "../lib/storage/IndexedDBAdapter";
import { TaskSummary as AiTask } from "../services/executionTrackingService";
import { PromptTemplate } from "../lib/storage/StorageAdapter";
import { StepConfig, AISettings } from "../lib/types";

// Types for the worker messages
export type WorkerMessage =
	| { type: "START"; apiKey: string; tier?: string }
	| { type: "STOP" };

export type WorkerStatus =
	| { type: "PROGRESS"; taskId: string; status: string; progress?: number }
	| { type: "ERROR"; taskId: string; error: string }
	| { type: "BATCH_COMPLETE"; batchId: string };

let isRunning = false;
let currentApiKey = "";
let currentTier = "anonymous";

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
	const { data } = e;

	if (data.type === "START") {
		isRunning = true;
		currentApiKey = data.apiKey;
		currentTier = data.tier || "anonymous";
		console.log(`[Worker] Started processing loop (Tier: ${currentTier})`);
		runLoop();
	} else if (data.type === "STOP") {
		isRunning = false;
		currentApiKey = "";
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

		const stageConfig = template.stage_config || {};
		let currentInputData: Record<string, unknown> = {
			...(task.input_data as Record<string, unknown>),
		};

		// --- PRE-PROCESS WEBHOOK ---
		if (
			stageConfig.pre_process?.enabled &&
			stageConfig.pre_process?.webhook_url
		) {
			try {
				const preResult = await executeWebhook(
					{
						webhook_url: stageConfig.pre_process.webhook_url,
						webhook_method: stageConfig.pre_process.webhook_method,
						webhook_headers:
							stageConfig.pre_process.webhook_headers,
					},
					currentInputData,
				);
				const handling =
					stageConfig.pre_process.output_handling || "merge";

				if (handling === "replace") {
					currentInputData = preResult as Record<string, unknown>;
				} else if (handling === "nested") {
					const field =
						stageConfig.pre_process.nested_field_name ||
						"pre_output";
					currentInputData[field] = preResult;
				} else {
					currentInputData = {
						...currentInputData,
						...(preResult as Record<string, unknown>),
					};
				}
			} catch (e) {
				const error = e as Error;
				if (stageConfig.pre_process.on_failure === "abort") throw error;
				console.warn(
					"[Worker] Pre-process failed, continuing:",
					error.message,
				);
			}
		}

		// 3. Build prompt
		const prompt = buildPrompt(template.prompt_text, currentInputData);

		// 4. Call Gemini
		let result = await callGemini(prompt, stageConfig);

		// --- POST-PROCESS WEBHOOK & MERGING ---
		if (stageConfig.post_process?.enabled) {
			const postConfig = stageConfig.post_process;

			// Handle Merge With Input type
			if (postConfig.type === "merge_with_input") {
				result = applyMergeWithInput(
					result as Record<string, unknown>,
					currentInputData,
					{
						merge_key: postConfig.merge_key,
						merge_array_path: postConfig.merge_array_path,
						input_array_path: postConfig.input_array_path,
					},
				);
			}

			// Execute Webhook if configured
			if (postConfig.webhook_url) {
				try {
					await executeWebhook(
						{
							webhook_url: postConfig.webhook_url,
							webhook_method: postConfig.webhook_method,
							webhook_headers: postConfig.webhook_headers,
						},
						{
							input: currentInputData,
							output: result,
						},
					);
				} catch (e) {
					const error = e as Error;
					if (postConfig.on_failure === "abort") throw error;
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
	// Replace variables
	Object.entries(data).forEach(([key, value]) => {
		const placeholder = new RegExp(`{{${key}}}`, "g");
		const replacement =
			typeof value === "object" ? JSON.stringify(value) : String(value);
		prompt = prompt.replace(placeholder, replacement);
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

async function callGemini(prompt: string, config: Partial<StepConfig>) {
	const aiSettings = config.ai_settings as AISettings | undefined;
	const model = aiSettings?.model_id || "gemini-2.0-flash";
	const api = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentApiKey}`;

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

	// Extract JSON from response (Structured Output mode)
	const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) throw new Error("Empty response from Gemini");

	try {
		// If structured output was requested as JSON, parse it
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
	let nextTemplateIds = template.next_stage_template_ids || [];

	// FIX #5: Fallback to task input_data if template doesn't have next stages
	if (nextTemplateIds.length === 0) {
		nextTemplateIds =
			((task.input_data as Record<string, unknown>)
				._next_stage_template_ids as string[]) || [];
	}

	if (nextTemplateIds.length === 0) return;

	const stageConfig = template.stage_config || {};
	const cardinality = stageConfig.cardinality || "one_to_one";

	if (cardinality === "many_to_one" || cardinality === "N:1") {
		// N:1 logic: Wait for siblings, then aggregate
		await handleManyToOne(task, template);
		return;
	}

	if (cardinality === "one_to_many" || cardinality === "1:N") {
		const splitMode = stageConfig.split_mode || "per_item";
		const splitPath = stageConfig.split_path || "result"; // n8n defaults to 'result' or split_path
		const items = getValueByPath(result, splitPath);

		if (Array.isArray(items)) {
			if (splitMode === "per_item") {
				for (const nextTemplateId of nextTemplateIds) {
					const nextTemplate =
						await db.prompt_templates.get(nextTemplateId);
					if (!nextTemplate) continue;
					const newTasks = items.map((item, idx) => ({
						id: crypto.randomUUID(),
						batch_id: task.batch_id,
						stage_key: nextTemplate.stage_key,
						step_number: (task.step_number || 0) + 1,
						status: "plan",
						input_data: {
							...(task.input_data as Record<string, unknown>),
							item,
							_split_index: idx,
							_split_total: items.length,
						},
						parent_task_id: task.id,
						root_task_id: task.root_task_id || task.id,
						created_at: new Date().toISOString(),
						sequence: idx + 1,
					}));
					await db.ai_tasks.bulkAdd(newTasks as unknown as AiTask[]);
				}
			} else if (splitMode === "per_batch") {
				const batchSize = stageConfig.batch_size || 10;
				for (const nextTemplateId of nextTemplateIds) {
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
							stage_key: nextTemplate.stage_key,
							step_number: (task.step_number || 0) + 1,
							status: "plan",
							input_data: {
								...(task.input_data as Record<string, unknown>),
								items: batchItems,
								_batch_index: bIdx,
							},
							parent_task_id: task.id,
							root_task_id: task.root_task_id || task.id,
							created_at: new Date().toISOString(),
							sequence: bIdx + 1,
						});
					}
					await db.ai_tasks.bulkAdd(newTasks as unknown as AiTask[]);
				}
			}
		}
	} else {
		// 1:1 workflow
		for (const nextTemplateId of nextTemplateIds) {
			const nextTemplate = await db.prompt_templates.get(nextTemplateId);
			if (!nextTemplate) continue;

			const newTask = {
				id: crypto.randomUUID(),
				batch_id: task.batch_id,
				stage_key: nextTemplate.stage_key,
				step_number: (task.step_number || 0) + 1,
				status: "plan",
				input_data: {
					...(task.input_data as Record<string, unknown>),
					...(result as Record<string, unknown>),
					_parent_id: task.id,
				},
				parent_task_id: task.id,
				root_task_id: task.root_task_id || task.id,
				created_at: new Date().toISOString(),
			};

			await db.ai_tasks.add(newTask as unknown as AiTask);
		}
	}
}

async function handleManyToOne(task: AiTask, template: PromptTemplate) {
	const stageConfig = template.stage_config || {};
	const batchId = task.batch_id;
	const stageKey = task.stage_key;

	// 1. Check if all sibling tasks in this stage are done
	const siblings = await db.ai_tasks
		.where("[batch_id+stage_key]")
		.equals([batchId, stageKey])
		.toArray();

	// Safety: siblings might be empty if IndexedDB is still thinking, but we're in the worker so it should be fine.
	const allDone = siblings.every(
		(s) => s.status === "completed" || s.id === task.id,
	);
	if (!allDone) return; // Wait for others

	// 2. Aggregate data
	const mergePath = stageConfig.merge_path || null;
	const allOutputs = siblings
		.map((s) =>
			s.id === task.id
				? (task as unknown as Record<string, unknown>).output_data
				: s.output_data,
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

	const mergedInputData = mergePath
		? { [mergePath]: aggregatedData }
		: { merged_data: aggregatedData };

	// 3. Create next tasks
	const nextTemplateIds = template.next_stage_template_ids || [];
	for (const nextTemplateId of nextTemplateIds) {
		const nextTemplate = await db.prompt_templates.get(nextTemplateId);
		if (!nextTemplateId) continue;

		await db.ai_tasks.add({
			id: crypto.randomUUID(),
			batch_id: batchId,
			stage_key: nextTemplate?.stage_key || "unknown",
			step_number: (task.step_number || 0) + 1,
			status: "plan",
			input_data: {
				...(task.input_data as Record<string, unknown>),
				...mergedInputData,
			},
			parent_task_id: task.id,
			root_task_id: task.root_task_id || task.id,
			created_at: new Date().toISOString(),
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

// --- USAGE HELPERS (Worker context) ---
async function checkUsage(): Promise<boolean> {
	if (currentTier === "premium_byok" || currentTier === "premium_managed")
		return true;

	const usage = await getUsage();
	const limit = currentTier === "anonymous" ? 50 : 200;
	return usage.count < limit;
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
